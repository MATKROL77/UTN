/** Normalized orbital model. Angles are radians; distances are arbitrary units. */
export const TAU = Math.PI * 2;
export const rad = (degrees: number) => (degrees * Math.PI) / 180;
export const deg = (radians: number) => (radians * 180) / Math.PI;
export type Point = { x: number; y: number };
export type Orbit = {
  p: number;
  e: number;
  alpha: number;
  h: number;
  k: number;
};
export const DEFAULT_ORBIT: Orbit = { p: 3, e: 0.6, alpha: 25, h: 0, k: 0 };
export function radius(theta: number, p: number, e: number) {
  const denominator = 1 + e * Math.cos(theta);
  return denominator > 1e-10 ? p / denominator : NaN;
}
export function orbitalPoint(theta: number, orbit: Orbit): Point | null {
  const r = radius(theta, orbit.p, orbit.e);
  if (!Number.isFinite(r)) return null;
  const angle = theta + rad(orbit.alpha);
  return { x: orbit.h + r * Math.cos(angle), y: orbit.k + r * Math.sin(angle) };
}
/** Physical conic branch: positive radius only. Open conics are never closed
 * and never sampled across their asymptotes. Oversized endpoints are clipped by SVG. */
export function orbitPoints(orbit: Orbit, samples = 900): Point[] {
  const limit = orbit.e < 1 ? Math.PI : Math.acos(-1 / orbit.e) - 0.005;
  return Array.from({ length: samples + 1 }, (_, i) =>
    orbitalPoint(-limit + (2 * limit * i) / samples, orbit),
  ).filter((p): p is Point => p !== null);
}
/** Composite Simpson integration of A = 1/2 ∫ r² dθ, for bounded ellipses.
 * Even subdivision count; this also works across 2π because r is periodic. */
export function sweptArea(
  p: number,
  e: number,
  start: number,
  end: number,
  steps = 1024,
): number {
  if (
    !(p > 0 && e >= 0 && e < 1) ||
    end < start ||
    ![p, e, start, end].every(Number.isFinite)
  )
    throw new Error(
      "El área requiere p > 0, 0 ≤ e < 1 y un intervalo creciente.",
    );
  const n = Math.max(2, Math.ceil(steps / 2) * 2);
  const width = (end - start) / n;
  const f = (theta: number) => 0.5 * radius(theta, p, e) ** 2;
  let sum = f(start) + f(end);
  for (let i = 1; i < n; i++) sum += (i % 2 ? 4 : 2) * f(start + i * width);
  return (sum * width) / 3;
}
/** The integral is strictly increasing in the upper bound. Bisection therefore
 * finds the unique interval with the target area, without equating angles. */
export function equalAreaEnd(
  p: number,
  e: number,
  start: number,
  target: number,
): number {
  const total = (Math.PI * p * p) / (1 - e * e) ** 1.5;
  if (!Number.isFinite(target) || target < 0 || target > total * (1 + 1e-10))
    throw new Error(
      "El área debe estar entre cero y el área total de la elipse.",
    );
  let low = start,
    high = start + TAU;
  for (let i = 0; i < 48; i++) {
    const mid = (low + high) / 2;
    if (sweptArea(p, e, start, mid) < target) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}
/** Kepler equation M = E - e sin E; mean anomaly M advances uniformly in time. */
export function trueAnomaly(meanAnomaly: number, e: number): number {
  if (e < 0 || e >= 1)
    throw new Error("La animación temporal requiere una elipse.");
  const m = ((meanAnomaly % TAU) + TAU) % TAU;
  let eccentric = e < 0.8 ? m : Math.PI;
  for (let i = 0; i < 20; i++) {
    const step =
      (eccentric - e * Math.sin(eccentric) - m) / (1 - e * Math.cos(eccentric));
    eccentric -= step;
    if (Math.abs(step) < 1e-13) break;
  }
  return (
    2 *
    Math.atan2(
      Math.sqrt(1 + e) * Math.sin(eccentric / 2),
      Math.sqrt(1 - e) * Math.cos(eccentric / 2),
    )
  );
}
export function potential(x: number, y: number, h = 0, k = 0): number | null {
  const distance = Math.hypot(x - h, y - k);
  return distance > 1e-9 ? -1 / distance : null;
}
export function field(x: number, y: number, h = 0, k = 0): Point | null {
  const dx = x - h,
    dy = y - k,
    distance = Math.hypot(dx, dy);
  return distance > 1e-9
    ? { x: -dx / distance ** 3, y: -dy / distance ** 3 }
    : null;
}
/** Strict two-column CSV, with an optional x,y header. Accepts comma or
 * semicolon separators and decimal comma with semicolon. No observations invented. */
export function parseCSV(text: string): Point[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/);
  if (!text.trim()) throw new Error("El archivo está vacío.");
  if (lines.length > 5001)
    throw new Error("El límite es de 5000 observaciones.");
  const delimiter = lines[0].includes(";") ? ";" : ",";
  const rows = lines.map((line) =>
    line
      .trim()
      .split(delimiter)
      .map((cell) => cell.trim().replace(/^"(.*)"$/, "$1")),
  );
  const header =
    rows[0].length === 2 &&
    rows[0][0].toLowerCase() === "x" &&
    rows[0][1].toLowerCase() === "y";
  const data = header ? rows.slice(1) : rows;
  if (!data.length) throw new Error("El archivo no contiene observaciones.");
  return data.map((row, index) => {
    const numbers = row.map((cell) =>
      delimiter === ";" ? cell.replace(",", ".") : cell,
    );
    if (
      numbers.length !== 2 ||
      numbers.some(
        (cell) => !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(cell),
      )
    )
      throw new Error(
        `Fila ${index + (header ? 2 : 1)}: se esperan dos números (x,y).`,
      );
    const [x, y] = numbers.map(Number);
    if (
      ![x, y].every(Number.isFinite) ||
      Math.abs(x) > 1e6 ||
      Math.abs(y) > 1e6
    )
      throw new Error(
        `Fila ${index + (header ? 2 : 1)}: coordenadas fuera de rango (±10⁶).`,
      );
    return { x, y };
  });
}
