// Alinea la línea de tiempo con las voces reales y reescribe timeline.json.
//
//   1) Copiar las grabaciones a  video/audio/voz_matias.wav  y  video/audio/voz_felipe.wav
//      (también sirve .m4a o .mp3 con el mismo nombre).
//   2) npm run sync        → mide las frases en cada grabación y actualiza timeline.json
//   3) npm run render      → vuelve a generar el video, ya sincronizado y con las voces mezcladas
//
// Cómo funciona (sin servicios externos): se calcula la envolvente de volumen de cada grabación, se detectan
// las pausas y, con programación dinámica, se elige qué pausa separa cada frase del guion de modo que la
// duración de cada frase sea proporcional a su cantidad de letras. Las pausas largas pesan más como fin de
// frase y de párrafo. Las voces no se cortan, no se aceleran ni se modifican.
//
// Si alguna frase quedara mal ubicada, se corrige a mano en timeline.json ("frases": inicio/fin en segundos de
// video) o fijando un cue puntual en "cuesManuales"; luego: npm run render -- --sin-sync
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FFMPEG, ROOT, buscarAudio, escribirTimeline, estimarParte, frasesDe, leerGuion, leerTimeline, limpiar, redondear } from "./lib.mjs";

const PASO = 0.01; // 10 ms
const letras = (texto) => [...limpiar(texto)].filter((ch) => /[\p{L}\p{N}]/u.test(ch)).length;

/** Volumen (dB) cada 10 ms. */
export function envolvente(archivo) {
  const r = spawnSync(FFMPEG, ["-v", "error", "-i", archivo, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(`No se pudo leer ${archivo}: ${r.stderr}`);
  const pcm = new Int16Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.length / 2));
  const n = Math.floor(pcm.length / 160), db = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = 0; k < 160; k++) { const v = pcm[i * 160 + k] / 32768; s += v * v; }
    db[i] = 10 * Math.log10(s / 160 + 1e-10);
  }
  return db;
}

/** Tramos con voz y pausas entre ellos. */
export function detectarVoz(db) {
  const orden = Float64Array.from(db).sort();
  const piso = orden[Math.floor(orden.length * 0.12)], techo = orden[Math.floor(orden.length * 0.95)];
  const umbral = piso + Math.max(6, 0.35 * (techo - piso));
  const voz = Array.from(db, (v) => v > umbral);
  const rellenar = (valor, max) => {
    for (let i = 0; i < voz.length; ) {
      if (voz[i] === valor) { i++; continue; }
      let j = i;
      while (j < voz.length && voz[j] !== valor) j++;
      if (i > 0 && j < voz.length && (j - i) * PASO <= max) for (let k = i; k < j; k++) voz[k] = valor;
      i = j;
    }
  };
  rellenar(true, 0.09); // une micro-cortes dentro de una palabra
  rellenar(false, 0.05); // descarta chasquidos aislados
  const tramos = [];
  for (let i = 0; i < voz.length; ) {
    if (!voz[i]) { i++; continue; }
    let j = i;
    while (j < voz.length && voz[j]) j++;
    tramos.push({ ini: i * PASO, fin: j * PASO });
    i = j;
  }
  if (!tramos.length) throw new Error("No se detectó voz en la grabación.");
  return { tramos, umbral, piso, techo };
}

/**
 * Alinea las frases (con su texto) a una grabación. Devuelve [{ id, inicio, fin }] en segundos del archivo.
 * `frases` debe traer { id, texto, finParrafo }.
 */
export function alinear(archivo, frases) {
  const { tramos } = detectarVoz(envolvente(archivo));
  const inicio = tramos[0].ini, final = tramos[tramos.length - 1].fin;
  // Tiempo "con voz" acumulado: las pausas no cuentan para estimar el largo de una frase.
  const acum = [0];
  for (const t of tramos) acum.push(acum[acum.length - 1] + (t.fin - t.ini));
  const V = acum[acum.length - 1];
  const w = frases.map((f) => Math.max(1, letras(f.texto)));
  const W = w.reduce((a, b) => a + b, 0), ritmo = V / W;
  // Candidatos: cada pausa real (≥ 0,15 s) y, por si faltan pausas, cortes "virtuales" en la posición esperada.
  const cand = [];
  for (let i = 0; i + 1 < tramos.length; i++) {
    const dur = tramos[i + 1].ini - tramos[i].fin;
    if (dur >= 0.15) cand.push({ v: acum[i + 1], ini: tramos[i].fin, fin: tramos[i + 1].ini, dur, virtual: false });
  }
  const aTiempo = (v) => {
    for (let i = 0; i < tramos.length; i++) if (v <= acum[i + 1] + 1e-9) return tramos[i].ini + (v - acum[i]);
    return final;
  };
  let suma = 0;
  for (let k = 0; k < frases.length - 1; k++) {
    suma += w[k];
    const t = aTiempo(ritmo * suma);
    cand.push({ v: ritmo * suma, ini: t, fin: t, dur: 0, virtual: true });
  }
  cand.sort((a, b) => a.v - b.v || a.ini - b.ini);
  const N = frases.length, M = cand.length;
  const costo = (k, v0, v1) => { const esperado = ritmo * w[k], d = v1 - v0 - esperado; return (d * d) / esperado; };
  const premio = (k, c) => (c.virtual ? -0.6 : 0.16 * Math.min(c.dur, 1.3) * (frases[k].finParrafo ? 1.6 : 1));
  // dp[k][j]: mejor costo con el fin de la frase k en el candidato j.
  const dp = Array.from({ length: N - 1 }, () => new Float64Array(M).fill(Infinity));
  const ant = Array.from({ length: N - 1 }, () => new Int32Array(M).fill(-1));
  for (let j = 0; j < M; j++) if (cand[j].v > 0.05) dp[0][j] = costo(0, 0, cand[j].v) - premio(0, cand[j]);
  for (let k = 1; k < N - 1; k++)
    for (let j = 0; j < M; j++)
      for (let i = 0; i < j; i++) {
        if (dp[k - 1][i] === Infinity || cand[j].v - cand[i].v < 0.05) continue;
        const c = dp[k - 1][i] + costo(k, cand[i].v, cand[j].v) - premio(k, cand[j]);
        if (c < dp[k][j]) { dp[k][j] = c; ant[k][j] = i; }
      }
  let mejor = -1, mejorC = Infinity;
  if (N === 1) mejor = -1;
  else for (let j = 0; j < M; j++) {
    const c = dp[N - 2][j] + costo(N - 1, cand[j].v, V);
    if (c < mejorC) { mejorC = c; mejor = j; }
  }
  const cortes = new Array(Math.max(0, N - 1));
  for (let k = N - 2, j = mejor; k >= 0; k--) { cortes[k] = cand[j]; j = ant[k][j]; }
  const out = frases.map((f, k) => ({
    id: f.id,
    inicio: k === 0 ? inicio : cortes[k - 1].fin,
    fin: k === N - 1 ? final : cortes[k].ini,
    virtual: k < N - 1 && cortes[k].virtual,
  }));
  return { frases: out, inicio, final, pausas: cand.filter((c) => !c.virtual).length };
}

export function frasesDeHablante(guion, quien) {
  return guion.parrafos.filter((p) => p.id.startsWith(quien)).flatMap((p) => {
    const fs_ = frasesDe(p);
    return fs_.map((f, i) => ({ ...f, finParrafo: i === fs_.length - 1 }));
  });
}

/** Tiempos por palabra medidos por scripts/alinear_palabras.py (si existen y corresponden al guion actual). */
function leerPalabras(archivo, guion, quien) {
  const f = archivo.replace(/\.[a-z0-9]+$/i, ".palabras.json");
  if (!fs.existsSync(f)) return null;
  const datos = JSON.parse(fs.readFileSync(f, "utf8"));
  const guionPalabras = guion.parrafos.filter((p) => p.id.startsWith(quien)).map((p) => limpiar(p.texto)).join(" ").split(/\s+/).filter(Boolean);
  if (datos.palabras.length !== guionPalabras.length || datos.palabras.some((w, i) => w.p !== guionPalabras[i])) {
    console.log(`  ⚠ ${path.basename(f)} no corresponde al guion actual: se ignora (volvé a ejecutar scripts/alinear_palabras.py).`);
    return null;
  }
  if (datos.sha1 !== createHash("sha1").update(fs.readFileSync(archivo)).digest("hex")) {
    console.log(`  ⚠ ${path.basename(f)} se midió sobre otra grabación: se ignora (volvé a ejecutar scripts/alinear_palabras.py).`);
    return null;
  }
  return datos;
}

/**
 * Afina los tiempos del reconocedor con el sonido real. El reconocedor acierta qué palabra va en cada lugar,
 * pero suele adelantar (o atrasar) unas décimas el inicio de la palabra que sigue a una pausa: ese inicio se
 * lleva al instante exacto en que vuelve la voz, y el final de cada palabra no se extiende dentro del silencio.
 */
function afinarConSonido(palabras, archivo) {
  const { tramos } = detectarVoz(envolvente(archivo));
  const silencios = [];
  for (let i = 0; i + 1 < tramos.length; i++) if (tramos[i + 1].ini - tramos[i].fin >= 0.18) silencios.push({ ini: tramos[i].fin, fin: tramos[i + 1].ini });
  const w = palabras.map((x) => ({ ...x }));
  for (let k = 0; k < w.length; k++) {
    let t = w[k].inicio;
    const trasPausa = k > 0 && /[.,;:]$/.test(w[k - 1].p);
    const dentro = silencios.find((sl) => t >= sl.ini - 0.12 && t < sl.fin);
    if (dentro) t = dentro.fin;
    else if (trasPausa) {
      const cerca = silencios.filter((sl) => Math.abs(sl.fin - t) <= 0.5).sort((a, b) => Math.abs(a.fin - t) - Math.abs(b.fin - t))[0];
      if (cerca) t = cerca.fin;
    }
    w[k].inicio = k > 0 ? Math.max(t, w[k - 1].inicio + 0.03) : t;
  }
  for (let k = 0; k < w.length; k++) {
    let f = k + 1 < w.length ? Math.min(w[k].fin, w[k + 1].inicio) : w[k].fin;
    const sl = silencios.find((x) => f > x.ini && f <= x.fin + 1e-6);
    if (sl) f = sl.ini;
    w[k].fin = Math.max(f, w[k].inicio + 0.05);
  }
  return w;
}

/** Frases y cues a partir de los tiempos de cada palabra. Tiempos en segundos del archivo de audio. */
function desdePalabras(datos, guion, quien, lista, archivo) {
  const w = afinarConSonido(datos.palabras, archivo);
  const frases = [];
  let i = 0;
  for (const f of lista) {
    const n = limpiar(f.texto).split(/\s+/).filter(Boolean).length;
    frases.push({ id: f.id, inicio: w[i].inicio, fin: w[i + n - 1].fin, virtual: false });
    i += n;
  }
  const cues = {};
  let base = 0;
  for (const p of guion.parrafos.filter((x) => x.id.startsWith(quien))) {
    for (const m of p.texto.matchAll(/\{\{([^}]+)\}\}/g)) {
      const antes = limpiar(p.texto.slice(0, m.index)).split(/\s+/).filter(Boolean).length;
      cues[`${p.id}.${m[1]}`] = w[Math.min(w.length - 1, base + antes)].inicio;
    }
    base += limpiar(p.texto).split(/\s+/).filter(Boolean).length;
  }
  return { frases, cues, inicio: w[0].inicio, final: w[w.length - 1].fin, palabras: w.map((x) => [x.inicio, x.fin]) };
}

function principal() {
  const guion = leerGuion();
  const previo = leerTimeline();
  const P = { entrada: 3.4, pausaRelevo: 1.0, colchonFinal: 1.2, pantallaFinal: 9.0, segundosPorParte: 150, ...(previo.parametros || {}) };
  const voces = {}, frases = [], cuesMedidos = {}, palabras = {};
  let cursor = P.entrada, conAudio = 0;
  for (const quien of ["M", "F"]) {
    const nombre = guion.hablantes[quien].nombre;
    const archivo = buscarAudio(guion.hablantes[quien].audio);
    if (!archivo) {
      // Sin grabación todavía: su parte conserva tiempos estimados y queda en silencio.
      const est = estimarParte(guion.parrafos.filter((p) => p.id.startsWith(quien)), cursor, P.segundosPorParte);
      frases.push(...est.frases);
      voces[quien] = { archivo: null, metodo: "estimacion", desfase: redondear(cursor), recorteInicio: 0, inicioVoz: redondear(cursor), finVoz: est.fin };
      console.log(`\n${nombre} — sin grabación en audio/: tiempos estimados (${P.segundosPorParte} s), sin sonido.`);
      cursor = est.fin + P.pausaRelevo;
      continue;
    }
    conAudio++;
    const lista = frasesDeHablante(guion, quien);
    const medidas = leerPalabras(archivo, guion, quien);
    const r = medidas ? desdePalabras(medidas, guion, quien, lista, archivo) : alinear(archivo, lista);
    // El archivo se ubica de modo que su primera palabra caiga en `cursor`; si trae más silencio inicial
    // del necesario, se recorta ese silencio (nunca la voz).
    const desfase = Math.max(0, cursor - r.inicio), recorteInicio = Math.max(0, r.inicio - cursor);
    const aVideo = (t) => redondear(t + desfase - recorteInicio);
    const ritmos = r.frases.map((f, i) => letras(lista[i].texto) / Math.max(0.2, f.fin - f.inicio));
    const mediana = [...ritmos].sort((a, b) => a - b)[Math.floor(ritmos.length / 2)];
    console.log(`\n${nombre} — ${path.basename(archivo)} · ${medidas ? `alineación palabra por palabra (coincidencia con el guion ${(medidas.coincidencia * 100).toFixed(0)} %)` : `alineación por pausas (${r.pausas} pausas detectadas)`} · ${mediana.toFixed(1)} letras/s`);
    r.frases.forEach((f, i) => {
      const raro = ritmos[i] < mediana * 0.62 || ritmos[i] > mediana * 1.6 || f.virtual;
      frases.push({ id: f.id, inicio: aVideo(f.inicio), fin: aVideo(f.fin) });
      console.log(`  ${f.id.padEnd(6)} ${aVideo(f.inicio).toFixed(2).padStart(7)} – ${aVideo(f.fin).toFixed(2).padStart(7)} s  ${raro ? "⚠ revisar " : "          "}${limpiar(lista[i].texto).slice(0, 58)}`);
    });
    if (medidas) {
      for (const [id, t] of Object.entries(r.cues)) cuesMedidos[id] = aVideo(t);
      palabras[quien] = r.palabras.map(([a, b]) => [aVideo(a), aVideo(b)]);
    }
    voces[quien] = { archivo: path.relative(ROOT, archivo), metodo: medidas ? "palabras" : "pausas", desfase: redondear(desfase), recorteInicio: redondear(recorteInicio), inicioVoz: aVideo(r.inicio), finVoz: aVideo(r.final) };
    cursor = aVideo(r.final) + P.pausaRelevo;
  }
  if (!conAudio) {
    console.error(`✗ No hay grabaciones en video/audio/. Copiá voz_matias.wav y/o voz_felipe.wav y volvé a ejecutar "npm run sync".`);
    process.exit(1);
  }
  const finVoz = voces.F.finVoz;
  escribirTimeline({
    _ayuda: previo._ayuda,
    fuente: "audio",
    fps: previo.fps || 30,
    parametros: P,
    voces,
    frases,
    cuesMedidos,
    cuesManuales: previo.fuente === "audio" ? previo.cuesManuales || {} : {},
    palabras,
    inicioPantallaFinal: redondear(finVoz + P.colchonFinal),
    duracion: redondear(finVoz + P.colchonFinal + P.pantallaFinal),
  });
  const total = finVoz + P.colchonFinal + P.pantallaFinal;
  console.log(`\n✓ timeline.json actualizado con ${conAudio === 2 ? "las dos voces" : "la voz disponible"}: duración total ${Math.floor(total / 60)}:${(total % 60).toFixed(1).padStart(4, "0")}`);
  console.log(`  Revisá la sincronía con "npm run dev" (vista previa con audio) y luego "npm run render".`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) principal();
