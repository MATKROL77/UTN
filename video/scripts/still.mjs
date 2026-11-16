// Captura cuadros sueltos para revisar el diseño.
// Uso: npm run still -- 12.5 30 "M5.e0+0.5" [--out out/stills] [--hoja nombre]  (tiempos en segundos o cues)
import fs from "node:fs";
import path from "node:path";
import { FFMPEG, ROOT, argumentos, calcularCues, correr, leerGuion, leerTimeline } from "./lib.mjs";
import { abrirNavegador, abrirPagina, prepararSitio } from "./servidor.mjs";

const { flags, pos } = argumentos();
const salida = path.resolve(ROOT, flags.out || "out/stills");
fs.mkdirSync(salida, { recursive: true });
const sitio = await prepararSitio();
const { cues } = calcularCues(leerGuion(), leerTimeline());
const tiempos = pos.flatMap((x) => {
  const rango = x.match(/^([\d.]+)-([\d.]+)\/([\d.]+)$/); // inicio-fin/paso
  if (rango) {
    const [a, b, paso] = rango.slice(1).map(Number);
    const out = [];
    for (let t = a; t <= b + 1e-9; t += paso) out.push(t);
    return out;
  }
  const m = x.match(/^([A-Z]\d+(?:\.[A-Za-z0-9]+)?)([+-][\d.]+)?$/);
  if (m) {
    if (cues[m[1]] === undefined) throw new Error(`Cue inexistente: ${m[1]}`);
    return [cues[m[1]] + Number(m[2] || 0)];
  }
  return [Number(x)];
});
const navegador = await abrirNavegador();
const { info, capturar } = await abrirPagina(navegador, sitio.url, flags.solo ? `&solo=${flags.solo}` : "");
const archivos = [];
for (const t of tiempos) {
  const frame = Math.max(0, Math.min(info.frames - 1, Math.round(t * info.fps)));
  const png = await capturar(frame);
  const f = path.join(salida, `t${t.toFixed(2).padStart(7, "0")}.png`);
  fs.writeFileSync(f, png);
  archivos.push(f);
}
await navegador.close();
await sitio.cerrar();
if (flags.hoja && archivos.length > 1) {
  const cols = Number(flags.cols || 3);
  const filas = Math.ceil(archivos.length / cols);
  const lista = path.join(salida, "_lista.txt");
  fs.writeFileSync(lista, archivos.map((f) => `file '${f}'\nduration 1`).join("\n"));
  const hoja = path.join(salida, `${flags.hoja}.jpg`);
  correr(FFMPEG, ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lista, "-vf", `scale=${Number(flags.ancho || 640)}:-1,tile=${cols}x${filas}:padding=6:color=0x223047`, "-frames:v", "1", "-q:v", "3", hoja]);
  fs.rmSync(lista);
  console.log(hoja);
} else console.log(archivos.join("\n"));
