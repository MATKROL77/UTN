// Autoprueba del alineador de audio (npm run prueba-sync).
// Genera dos SEÑALES SINTÉTICAS DE RUIDO (no son voces y nunca se usan en el video) que imitan el ritmo de
// lectura del guion, con pausas y velocidad variables, y mide el error del alineador frente a la verdad conocida.
// Los archivos quedan en .cache/prueba-sync/, fuera de audio/.
import fs from "node:fs";
import path from "node:path";
import { ROOT, leerGuion, limpiar } from "./lib.mjs";
import { alinear, frasesDeHablante } from "./sync-audio.mjs";

function azar(semilla) {
  let s = semilla >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let x = Math.imul(s ^ (s >>> 15), 1 | s); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
}
const SR = 16000;
const dir = path.join(ROOT, ".cache/prueba-sync");
fs.mkdirSync(dir, { recursive: true });

function sintetizar(frases, semilla, letrasPorSeg) {
  const r = azar(semilla);
  const muestras = [];
  const ruido = (n, amp) => { for (let i = 0; i < n; i++) muestras.push((r() * 2 - 1) * amp); };
  const habla = (dur) => {
    const n = Math.round(dur * SR), f = 4 + r() * 2.5, fase = r() * 6.28;
    for (let i = 0; i < n; i++) {
      const env = 0.35 + 0.65 * Math.abs(Math.sin(Math.PI * f * (i / SR) + fase));
      muestras.push((r() * 2 - 1) * 0.3 * env + (r() * 2 - 1) * 0.002);
    }
  };
  ruido(Math.round((0.6 + r() * 1.2) * SR), 0.002);
  const verdad = [];
  frases.forEach((f, k) => {
    const ritmo = letrasPorSeg * (0.86 + r() * 0.28); // cada frase a una velocidad algo distinta
    const inicio = muestras.length / SR;
    const trozos = limpiar(f.texto).split(/[,;:]/);
    trozos.forEach((tz, i) => {
      habla([...tz].filter((ch) => /[\p{L}\p{N}]/u.test(ch)).length / ritmo);
      if (i < trozos.length - 1) ruido(Math.round((0.16 + r() * 0.2) * SR), 0.002); // coma
    });
    verdad.push({ id: f.id, inicio, fin: muestras.length / SR });
    if (k < frases.length - 1) ruido(Math.round((f.finParrafo ? 0.75 + r() * 0.7 : 0.4 + r() * 0.35) * SR), 0.002);
  });
  ruido(Math.round(0.8 * SR), 0.002);
  return { muestras, verdad };
}

function escribirWav(archivo, muestras) {
  const datos = Buffer.alloc(muestras.length * 2);
  muestras.forEach((v, i) => datos.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * 32767))), i * 2));
  const cab = Buffer.alloc(44);
  cab.write("RIFF", 0); cab.writeUInt32LE(36 + datos.length, 4); cab.write("WAVEfmt ", 8); cab.writeUInt32LE(16, 16); cab.writeUInt16LE(1, 20);
  cab.writeUInt16LE(1, 22); cab.writeUInt32LE(SR, 24); cab.writeUInt32LE(SR * 2, 28); cab.writeUInt16LE(2, 32); cab.writeUInt16LE(16, 34);
  cab.write("data", 36); cab.writeUInt32LE(datos.length, 40);
  fs.writeFileSync(archivo, Buffer.concat([cab, datos]));
}

const guion = leerGuion();
let peor = 0, fallas = 0;
for (const [quien, semilla, ritmo] of [["M", 11, 13.5], ["F", 23, 15.5], ["M", 37, 10.5], ["F", 41, 17]]) {
  const frases = frasesDeHablante(guion, quien);
  const { muestras, verdad } = sintetizar(frases, semilla, ritmo);
  const archivo = path.join(dir, `ruido_${quien}_${semilla}.wav`);
  escribirWav(archivo, muestras);
  const r = alinear(archivo, frases);
  const errores = r.frases.map((f, i) => Math.max(Math.abs(f.inicio - verdad[i].inicio), Math.abs(f.fin - verdad[i].fin)));
  const max = Math.max(...errores), malas = errores.filter((e) => e > 0.25).length;
  peor = Math.max(peor, max);
  fallas += malas;
  console.log(`${quien} · semilla ${semilla} · ${ritmo} letras/s · ${(muestras.length / SR).toFixed(0)} s · ${frases.length} frases → error máx. ${(max * 1000).toFixed(0)} ms · frases con error > 250 ms: ${malas}`);
}
console.log(fallas === 0 ? `✓ Alineador correcto en las 4 pruebas (peor error ${(peor * 1000).toFixed(0)} ms).` : `✗ ${fallas} frases mal alineadas.`);
process.exit(fallas === 0 ? 0 : 1);
