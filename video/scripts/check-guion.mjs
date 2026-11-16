// Verifica que el guion con marcas coincide, palabra por palabra, con el texto original.
import fs from "node:fs";
import path from "node:path";
import { ROOT, leerGuion, limpiar } from "./lib.mjs";

const original = fs.readFileSync(path.join(ROOT, "guion/guion_original.txt"), "utf8");
const bloques = { M: [], F: [] };
let actual = null;
for (const linea of original.split(/\r?\n/)) {
  if (linea.startsWith("# MATIAS")) actual = "M";
  else if (linea.startsWith("# FELIPE")) actual = "F";
  else if (linea.trim() && actual) bloques[actual].push(linea.trim());
}
const guion = leerGuion();
let errores = 0;
for (const quien of ["M", "F"]) {
  const mios = guion.parrafos.filter((p) => p.id.startsWith(quien)).map((p) => limpiar(p.texto));
  if (mios.length !== bloques[quien].length) {
    console.error(`✗ ${quien}: ${mios.length} párrafos en guion.json, ${bloques[quien].length} en el original`);
    errores++;
  }
  mios.forEach((texto, i) => {
    if (texto !== bloques[quien][i]) {
      console.error(`✗ ${quien}${i + 1} difiere del original:\n   guion.json: ${texto}\n   original:   ${bloques[quien][i]}`);
      errores++;
    }
  });
}
const orden = guion.parrafos.map((p) => p.id[0]).join("");
if (!/^M+F+$/.test(orden)) { console.error("✗ El orden debe ser: todos los párrafos de Matías y luego los de Felipe."); errores++; }
const ids = new Set();
for (const p of guion.parrafos) for (const m of p.texto.matchAll(/\{\{([^}]+)\}\}/g)) {
  const id = `${p.id}.${m[1]}`;
  if (ids.has(id)) { console.error(`✗ cue repetido: ${id}`); errores++; }
  ids.add(id);
}
if (errores) process.exit(1);
console.log(`✓ Guion idéntico al original: ${guion.parrafos.length} párrafos (Matías ${bloques.M.length}, Felipe ${bloques.F.length}), ${ids.size} cues.`);
