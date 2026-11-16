// Lógica compartida (navegador y Node) para convertir guion + tiempos de frases en cues.
// Un "cue" es el instante en que se pronuncia una palabra marcada con {{nombre}} en guion.json.

/** Texto hablado, sin marcas {{cue}}. */
export const limpiar = (texto) => texto.replace(/\{\{[^}]+\}\}/g, "");

/** Peso de lectura: letras y números cuentan 1; coma, punto y coma y dos puntos agregan una pausa breve. */
export function peso(texto) {
  let w = 0;
  for (const ch of limpiar(texto)) {
    if (/[\p{L}\p{N}]/u.test(ch)) w += 1;
    else if (ch === "," || ch === ";" || ch === ":") w += 3;
  }
  return w;
}

/** Divide un párrafo en frases (terminan en punto) conservando las marcas. */
export function frasesDe(parrafo) {
  const partes = parrafo.texto.match(/[^.]+\.?/g).map((s) => s.trim()).filter(Boolean);
  return partes.map((texto, i) => ({ id: `${parrafo.id}.${i + 1}`, parrafo: parrafo.id, texto }));
}

export function todasLasFrases(guion) {
  return guion.parrafos.flatMap(frasesDe);
}

/**
 * Devuelve { cues, parrafos, frases }.
 *  - cues["M5.e0"]  → segundo exacto de la palabra marcada.
 *  - cues["M5"]     → inicio del párrafo;  cues["M5.fin"] → fin del párrafo.
 *  - cues["M5.s2"]  → inicio de la segunda frase del párrafo.
 * timeline.frases: [{ id, inicio, fin }];  timeline.cuesManuales: { "M5.e0": segundos } (opcional).
 */
export function calcularCues(guion, timeline) {
  const tiempos = new Map(timeline.frases.map((f) => [f.id, f]));
  const cues = {};
  const parrafos = {};
  const frases = [];
  for (const p of guion.parrafos) {
    const fs = frasesDe(p);
    fs.forEach((f, i) => {
      const t = tiempos.get(f.id);
      if (!t) throw new Error(`timeline.json no tiene la frase ${f.id}. Ejecutá "npm run timeline" o "npm run sync".`);
      const total = peso(f.texto) || 1;
      cues[`${p.id}.s${i + 1}`] = t.inicio;
      const re = /\{\{([^}]+)\}\}/g;
      let m;
      while ((m = re.exec(f.texto))) {
        const antes = peso(f.texto.slice(0, m.index));
        cues[`${p.id}.${m[1]}`] = t.inicio + (antes / total) * (t.fin - t.inicio);
      }
      frases.push({ id: f.id, parrafo: p.id, texto: limpiar(f.texto), inicio: t.inicio, fin: t.fin });
    });
    const ini = tiempos.get(fs[0].id).inicio;
    const fin = tiempos.get(fs[fs.length - 1].id).fin;
    cues[p.id] = ini;
    cues[`${p.id}.fin`] = fin;
    parrafos[p.id] = { inicio: ini, fin };
  }
  for (const [id, t] of Object.entries(timeline.cuesManuales || {})) {
    if (typeof t === "number") cues[id] = t;
  }
  return { cues, parrafos, frases };
}

/** Corta una frase en renglones cortos de subtítulo, repartiendo el tiempo según el peso de lectura. */
export function subtitulos(frases, maxLargo = 62) {
  const out = [];
  for (const f of frases) {
    const palabras = f.texto.split(/\s+/);
    const trozos = [];
    let actual = "";
    for (const w of palabras) {
      const candidato = actual ? `${actual} ${w}` : w;
      if (candidato.length > maxLargo && actual) {
        trozos.push(actual);
        actual = w;
      } else actual = candidato;
      // Corte natural en una coma si el renglón ya es razonablemente largo.
      if (/[,;:]$/.test(w) && actual.length > maxLargo * 0.55) {
        trozos.push(actual);
        actual = "";
      }
    }
    if (actual) trozos.push(actual);
    // Evita un último renglón demasiado corto.
    if (trozos.length > 1 && trozos[trozos.length - 1].length < 14) {
      const ultimo = trozos.pop();
      trozos[trozos.length - 1] += ` ${ultimo}`;
    }
    const total = trozos.reduce((a, s) => a + peso(s), 0) || 1;
    let t = f.inicio;
    for (const s of trozos) {
      const d = ((f.fin - f.inicio) * peso(s)) / total;
      out.push({ parrafo: f.parrafo, texto: s, inicio: t, fin: t + d });
      t += d;
    }
  }
  return out;
}
