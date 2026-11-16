// Línea de tiempo: une el guion (con sus marcas) con timeline.json y expone los cues en segundos.
import guion from "../../guion/guion.json";
import timeline from "../../timeline.json";
// @ts-ignore — módulo JS compartido con los scripts de Node
import { calcularCues, subtitulos } from "../../guion/cues.js";

type Frase = { id: string; parrafo: string; texto: string; inicio: number; fin: number };
const datos = calcularCues(guion, timeline) as {
  cues: Record<string, number>;
  parrafos: Record<string, { inicio: number; fin: number }>;
  frases: Frase[];
};

export const FPS: number = timeline.fps;
export const DUR: number = timeline.duracion;
export const FRAMES = Math.round(DUR * FPS);
export const T_FINAL: number = timeline.inicioPantallaFinal;
export const FUENTE: string = timeline.fuente;
export const VOCES = timeline.voces as Record<"M" | "F", { archivo: string | null; desfase: number; inicioVoz: number; finVoz: number }>;
export const FRASES = datos.frases;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SUBS = (subtitulos as any)(datos.frases, 62, (timeline as { palabras?: unknown }).palabras ?? null) as { parrafo: string; texto: string; inicio: number; fin: number }[];
export const HABLANTES = guion.hablantes;

/** Segundo en que se dice la palabra marcada. Ej.: cue("M5.e0"), cue("M5") = inicio del párrafo, cue("M5.fin"). */
export function cue(id: string): number {
  const v = datos.cues[id];
  if (v === undefined) throw new Error(`Cue inexistente: ${id}`);
  return v;
}
export const par = (id: string) => datos.parrafos[id];
export const CUES = datos.cues;

/** ¿Quién está hablando en t? Devuelve "M", "F" o null (pausas incluidas dentro de cada parte). */
export function hablando(t: number): "M" | "F" | null {
  for (const f of FRASES) if (t >= f.inicio - 0.05 && t <= f.fin + 0.05) return f.parrafo[0] as "M" | "F";
  return null;
}
