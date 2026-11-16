// Utilidades de animación: todo es función pura del tiempo t (segundos de video).
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

export type Ease = (u: number) => number;
export const E = {
  lin: (u: number) => u,
  in: (u: number) => u * u * u,
  out: (u: number) => 1 - (1 - u) ** 3,
  inOut: (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2),
  soft: (u: number) => u * u * (3 - 2 * u),
  outQuint: (u: number) => 1 - (1 - u) ** 5,
  outBack: (u: number) => 1 + 2.2 * (u - 1) ** 3 + 1.2 * (u - 1) ** 2,
  sine: (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * u),
} satisfies Record<string, Ease>;

/** Progreso 0..1 que arranca en t0 y dura dur segundos. */
export const prog = (t: number, t0: number, dur: number, ease: Ease = E.inOut) =>
  ease(clamp((t - t0) / Math.max(dur, 1e-6)));

/** Progreso 0..1 entre dos instantes. */
export const span = (t: number, a: number, b: number, ease: Ease = E.inOut) => prog(t, a, b - a, ease);

/** Entra en t0 (durIn) y sale en t1 (durOut). Devuelve 0..1. */
export const inOut = (t: number, t0: number, t1: number, durIn = 0.5, durOut = 0.4, ease: Ease = E.out) =>
  Math.min(prog(t, t0, durIn, ease), 1 - prog(t, t1 - durOut, durOut, E.in));

/** Interpolación por claves: [[t, valor, ease?], ...]. El ease de una clave se aplica al tramo que LLEGA a ella. */
export function kf(t: number, keys: [number, number, Ease?][]): number {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, ease] = keys[i];
    const [t0, v0] = keys[i - 1];
    if (t <= t1) return lerp(v0, v1, (ease ?? E.inOut)(clamp((t - t0) / Math.max(t1 - t0, 1e-6))));
  }
  return keys[keys.length - 1][1];
}

/** Pulso 0→1→0 centrado en t0. */
export const pulse = (t: number, t0: number, dur: number) => {
  const u = clamp((t - t0) / dur);
  return Math.sin(Math.PI * u);
};

/** Ruido determinista suave (suma de senos) para movimientos orgánicos. */
export const wobble = (t: number, seed = 0, speed = 1) =>
  (Math.sin(t * 1.3 * speed + seed * 12.9898) + Math.sin(t * 0.71 * speed + seed * 78.233) * 0.6 + Math.sin(t * 2.17 * speed + seed * 3.7) * 0.25) / 1.85;

/** Generador pseudoaleatorio determinista. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = Math.imul(s ^ (s >>> 15), 1 | s);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export const mixColor = (a: string, b: string, u: number) => {
  const pa = hex(a), pb = hex(b);
  const c = pa.map((v, i) => Math.round(lerp(v, pb[i], clamp(u))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};
const hex = (h: string) => {
  const s = h.replace("#", "");
  const f = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
};

export const fmt = (v: number, d = 2) => v.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });
