// Render completo: captura cuadro a cuadro con Chromium (en paralelo) y codifica con FFmpeg.
//
//   npm run render                     → video completo (con y sin subtítulos) + .srt
//   npm run render -- --desde 60 --hasta 82      → solo un tramo (segundos), para revisar
//   npm run render -- --trabajadores 3 --crf 20  → ajustes de velocidad / calidad
//   npm run render -- --sin-sync       → no volver a alinear aunque haya voces en audio/
//
// Si existen audio/voz_matias.wav y audio/voz_felipe.wav se alinea la línea de tiempo con las voces
// (scripts/sync-audio.mjs) y se mezclan en el MP4 sin modificarlas: no se cortan ni se aceleran.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { FFMPEG, ROOT, argumentos, buscarAudio, calcularCues, correr, duracionAudio, leerGuion, leerTimeline, subtitulos } from "./lib.mjs";
import { abrirNavegador, abrirPagina, prepararSitio } from "./servidor.mjs";

const { flags } = argumentos();
const NOMBRE = flags.salida || "Kepler_Grupo14_Presentacion";
const TMP = path.join(ROOT, "out/render");
const parcial = flags.desde !== undefined || flags.hasta !== undefined;
const t0 = Date.now();
const seg = () => `${((Date.now() - t0) / 1000).toFixed(0)} s`;

// 1) Voces: si están, alinear la línea de tiempo antes de compilar.
const guion = leerGuion();
const voces = { M: buscarAudio(guion.hablantes.M.audio), F: buscarAudio(guion.hablantes.F.audio) };
const hayVoces = Boolean(voces.M && voces.F);
if (hayVoces && !flags["sin-sync"]) correr("node", [path.join(ROOT, "scripts/sync-audio.mjs")]);
else if (voces.M || voces.F) console.log("⚠ Falta una de las dos voces en audio/: se genera el video sin audio.");

// 2) Compilar y servir la composición.
const sitio = await prepararSitio();
const tl = leerTimeline();
const navegador0 = await abrirNavegador();
const { info } = await abrirPagina(navegador0, sitio.url);
await navegador0.close();
const fps = info.fps;
const f0 = Math.max(0, Math.round(Number(flags.desde ?? 0) * fps));
const f1 = Math.min(info.frames, Math.round(Number(flags.hasta ?? info.duracion) * fps));
const total = f1 - f0;
console.log(`Render: cuadros ${f0}–${f1 - 1} (${(total / fps).toFixed(1)} s a ${fps} fps) · tiempos: ${tl.fuente}`);

// 3) Captura en paralelo por tramos; cada tramo se codifica en su propio archivo intermedio.
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
const TRAMO = Number(flags.tramo || 240);
const tramos = [];
for (let a = f0; a < f1; a += TRAMO) tramos.push({ i: tramos.length, a, b: Math.min(f1, a + TRAMO) });
const nTrab = Math.max(1, Math.min(tramos.length, Number(flags.trabajadores || Math.min(4, os.cpus().length))));
let hechos = 0, siguiente = 0, ultimoAviso = 0;

const codificador = (archivo) => spawn(FFMPEG, [
  "-v", "error", "-y", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "png", "-i", "-",
  "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
  "-c:v", "libx264", "-preset", "veryfast", "-crf", "13", "-g", String(fps * 2), "-bf", "0",
  "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", archivo,
], { stdio: ["pipe", "inherit", "inherit"] });

async function trabajador() {
  const navegador = await abrirNavegador();
  let pagina = await abrirPagina(navegador, sitio.url);
  while (siguiente < tramos.length) {
    const tr = tramos[siguiente++];
    const archivo = path.join(TMP, `tramo_${String(tr.i).padStart(4, "0")}.mp4`);
    for (let intento = 1; ; intento++) {
      const ff = codificador(archivo);
      const fin = new Promise((ok, mal) => ff.on("close", (c) => (c === 0 ? ok() : mal(new Error(`ffmpeg terminó con código ${c}`)))));
      try {
        for (let f = tr.a; f < tr.b; f++) {
          const png = await pagina.capturar(f);
          if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once("drain", r));
          hechos++;
          if (Date.now() - ultimoAviso > 15000) {
            ultimoAviso = Date.now();
            const v = hechos / ((Date.now() - t0) / 1000);
            console.log(`  ${((100 * hechos) / total).toFixed(0)} % · ${hechos}/${total} cuadros · ${v.toFixed(1)} cuadros/s · faltan ~${((total - hechos) / v / 60).toFixed(1)} min`);
          }
        }
        ff.stdin.end();
        await fin;
        break;
      } catch (e) {
        ff.stdin.destroy();
        ff.kill();
        await fin.catch(() => undefined);
        if (intento >= 2) throw e;
        console.log(`  ↻ reintento del tramo ${tr.i}: ${String(e.message).slice(0, 160)}`);
        hechos -= hechos % 1; // el contador es aproximado tras un reintento
        await pagina.cerrar().catch(() => undefined);
        pagina = await abrirPagina(navegador, sitio.url);
      }
    }
  }
  await navegador.close();
}
await Promise.all(Array.from({ length: nTrab }, trabajador));
await sitio.cerrar();
console.log(`✓ Captura terminada (${seg()})`);

// 4) Unir tramos (copia directa, sin recodificar).
const lista = path.join(TMP, "lista.txt");
fs.writeFileSync(lista, tramos.map((tr) => `file '${path.join(TMP, `tramo_${String(tr.i).padStart(4, "0")}.mp4`)}'`).join("\n"));
const maestro = path.join(TMP, "maestro.mp4");
correr(FFMPEG, ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lista, "-c", "copy", maestro]);

// 5) Subtítulos (.srt para reproductores y .ass para grabarlos en la imagen).
const desfaseT = f0 / fps;
const { frases } = calcularCues(guion, tl);
const subs = subtitulos(frases, 54).map((s) => ({ ...s, inicio: s.inicio - desfaseT, fin: s.fin - desfaseT })).filter((s) => s.fin > 0 && s.inicio < total / fps);
// Cada renglón queda un instante más en pantalla, pero nunca se pisa con el siguiente.
subs.forEach((s, i) => { s.fin = Math.min(s.fin + 0.3, i + 1 < subs.length ? subs[i + 1].inicio - 0.04 : s.fin + 0.3); });
const hms = (t, sep) => {
  const x = Math.max(0, t), h = Math.floor(x / 3600), m = Math.floor((x % 3600) / 60), s = Math.floor(x % 60), ms = Math.round((x - Math.floor(x)) * 1000);
  return sep === ","
    ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(Math.min(999, ms)).padStart(3, "0")}`
    : `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(Math.min(99, Math.round(ms / 10))).padStart(2, "0")}`;
};
const salidaDir = ROOT;
const base = path.join(salidaDir, parcial ? `${NOMBRE}_tramo` : NOMBRE);
fs.writeFileSync(`${base}.srt`, subs.map((s, i) => `${i + 1}\n${hms(s.inicio, ",")} --> ${hms(s.fin, ",")}\n${s.texto}\n`).join("\n"));
const ass = path.join(TMP, "subtitulos.ass");
fs.writeFileSync(ass, `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Inter,37,&H00F7EEE6,&H00F7EEE6,&H00140A05,&H96000000,0,0,0,0,100,100,0.4,0,1,2.6,1.2,2,430,430,44,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${subs.map((s) => `Dialogue: 0,${hms(s.inicio, ".")},${hms(s.fin, ".")},Sub,,0,0,0,,{\\fad(90,90)}${s.texto}`).join("\n")}
`);

// 6) Codificación final H.264 (1920×1080, 30 fps) con o sin subtítulos; audio si hay voces.
const crf = String(flags.crf || 19);
const audioArgs = [], audioMapa = [];
if (hayVoces && tl.fuente === "audio") {
  const filtros = ["M", "F"].map((q, i) => {
    const v = tl.voces[q];
    const inicio = Math.max(0, v.desfase - desfaseT), recorte = (v.recorteInicio || 0) + Math.max(0, desfaseT - v.desfase);
    audioArgs.push("-i", voces[q]);
    return `[${i + 1}:a]atrim=start=${recorte.toFixed(3)},asetpts=PTS-STARTPTS,aresample=48000,adelay=${Math.round(inicio * 1000)}:all=1[v${i}]`;
  });
  audioMapa.push("-filter_complex", `${filtros.join(";")};[v0][v1]amix=inputs=2:normalize=0:dropout_transition=0,apad[a]`, "-map", "[a]", "-c:a", "aac", "-b:a", "192k", "-ac", "2", "-shortest");
  console.log(`Audio: Matías ${duracionAudio(voces.M).toFixed(1)} s desde ${tl.voces.M.desfase} s · Felipe ${duracionAudio(voces.F).toFixed(1)} s desde ${tl.voces.F.desfase} s`);
}
function codificar(destino, conSubs) {
  const vf = conSubs ? ["-vf", `ass='${ass.replace(/\\/g, "/").replace(/:/g, "\\:")}'`] : [];
  correr(FFMPEG, [
    "-v", "error", "-nostats", "-y", "-i", maestro, ...audioArgs, "-map", "0:v", ...audioMapa, ...vf,
    "-c:v", "libx264", "-preset", flags.preset || "slow", "-crf", crf, "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.1", "-r", String(fps),
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", "-movflags", "+faststart", destino,
  ]);
  console.log(`✓ ${path.relative(ROOT, destino)} · ${(fs.statSync(destino).size / 1e6).toFixed(1)} MB`);
}
if (!flags["sin-subtitulos"]) codificar(`${base}.mp4`, true);
if (!flags["solo-subtitulos"]) codificar(flags["sin-subtitulos"] ? `${base}.mp4` : `${base}_sin_subtitulos.mp4`, false);
if (!flags["conservar"]) fs.rmSync(TMP, { recursive: true, force: true });
console.log(`✓ Listo en ${seg()}${hayVoces && tl.fuente === "audio" ? " (con las voces mezcladas)" : " (sin audio: todavía no hay voces en audio/)"}`);
