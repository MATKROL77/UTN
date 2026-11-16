// Genera timeline.json con tiempos ESTIMADOS (sin audio), repartiendo cada parte según el largo del texto.
// Uso: npm run timeline -- [--segundos-por-parte 150] [--si-falta]
// Cuando existan las voces reales, usar "npm run sync" (scripts/sync-audio.mjs), que reemplaza esta estimación.
import fs from "node:fs";
import { TIMELINE, argumentos, escribirTimeline, estimarParte, leerGuion, redondear } from "./lib.mjs";

const { flags } = argumentos();
if (flags["si-falta"] && fs.existsSync(TIMELINE)) process.exit(0);

export const PARAMETROS = {
  entrada: 3.4, // segundos de introducción visual antes de que empiece a hablar Matías
  pausaRelevo: 1.0, // silencio entre el final de Matías y el comienzo de Felipe
  colchonFinal: 1.2, // respiro entre la última palabra y la pantalla final
  pantallaFinal: 9.0, // duración de la pantalla final con el QR
};

const guion = leerGuion();
const porParte = Number(flags["segundos-por-parte"] || 150);

const frases = [];
let cursor = PARAMETROS.entrada;
const voces = {};
for (const quien of ["M", "F"]) {
  const est = estimarParte(guion.parrafos.filter((p) => p.id.startsWith(quien)), cursor, porParte);
  frases.push(...est.frases);
  voces[quien] = { archivo: null, metodo: "estimacion", desfase: redondear(cursor), recorteInicio: 0, inicioVoz: redondear(cursor), finVoz: est.fin };
  cursor = est.fin + PARAMETROS.pausaRelevo;
}
const finVoz = voces.F.finVoz;
escribirTimeline({
  _ayuda: "Tiempos (en segundos de video) de cada frase del guion. 'fuente' indica si son estimados o medidos sobre las voces reales. Se puede corregir a mano cualquier 'inicio'/'fin', o fijar un cue puntual en 'cuesManuales' (por ejemplo \"M5.e0\": 61.4).",
  fuente: "estimacion",
  fps: 30,
  parametros: { ...PARAMETROS, segundosPorParte: porParte },
  voces,
  frases,
  cuesMedidos: {},
  cuesManuales: {},
  inicioPantallaFinal: redondear(finVoz + PARAMETROS.colchonFinal),
  duracion: redondear(finVoz + PARAMETROS.colchonFinal + PARAMETROS.pantallaFinal),
});
console.log(`✓ timeline.json (estimación): Matías ${voces.M.inicioVoz}–${voces.M.finVoz} s · Felipe ${voces.F.inicioVoz}–${voces.F.finVoz} s · total ${redondear(finVoz + PARAMETROS.colchonFinal + PARAMETROS.pantallaFinal, 1)} s`);
