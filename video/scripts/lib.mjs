// Utilidades compartidas por los scripts de Node.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
export { limpiar, peso, frasesDe, todasLasFrases, calcularCues, subtitulos } from "../guion/cues.js";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const REPO = path.resolve(ROOT, "..");
export const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
export const FFPROBE = process.env.FFPROBE_PATH || "ffprobe";
export const TIMELINE = path.join(ROOT, "timeline.json");

export const leerJSON = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
export const leerGuion = () => leerJSON(path.join(ROOT, "guion/guion.json"));
export const leerTimeline = () => leerJSON(TIMELINE);
export const redondear = (x, d = 3) => Math.round(x * 10 ** d) / 10 ** d;

export function escribirTimeline(tl) {
  fs.writeFileSync(TIMELINE, JSON.stringify(tl, null, 2) + "\n");
}

export function duracionAudio(archivo) {
  const r = spawnSync(FFPROBE, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", archivo], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`ffprobe falló con ${archivo}: ${r.stderr}`);
  return Number(r.stdout.trim());
}

/** Busca audio/voz_x.wav (o .m4a/.mp3/...). Devuelve la ruta o null. */
export function buscarAudio(nombre) {
  const base = nombre.replace(/\.[a-z0-9]+$/i, "");
  for (const ext of ["wav", "WAV", "m4a", "mp3", "ogg", "flac", "aac"]) {
    const f = path.join(ROOT, "audio", `${base}.${ext}`);
    if (fs.existsSync(f)) return f;
  }
  return null;
}

export function argumentos(argv = process.argv.slice(2)) {
  const flags = {};
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      if (v !== undefined) flags[k] = v;
      else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith("--")) flags[k] = argv[++i];
      else flags[k] = true;
    } else pos.push(a);
  }
  return { flags, pos };
}

export function correr(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (r.status !== 0) throw new Error(`Falló: ${cmd} ${args.join(" ")}`);
}
