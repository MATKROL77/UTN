// Geometría orbital. Reutiliza las funciones matemáticas de la web (../../../src/math.ts)
// para que las animaciones del video coincidan exactamente con el simulador.
export {
  TAU, rad, deg, radius, orbitalPoint, orbitPoints, sweptArea, equalAreaEnd, trueAnomaly, potential, field, DEFAULT_ORBIT,
  type Orbit, type Point,
} from "../../../src/math";
import { orbitPoints, orbitalPoint, radius, rad, type Orbit, type Point } from "../../../src/math";

/** Transformación plano matemático → píxeles (y hacia arriba). */
export type Map2 = { X: (x: number) => number; Y: (y: number) => number; s: number; ox: number; oy: number };
export const mapa = (ox: number, oy: number, s: number): Map2 => ({ X: (x) => ox + x * s, Y: (y) => oy - y * s, s, ox, oy });

export const pathDe = (pts: Point[], m: Map2, cerrar = false) =>
  pts.map((p, i) => `${i ? "L" : "M"}${m.X(p.x).toFixed(2)},${m.Y(p.y).toFixed(2)}`).join(" ") + (cerrar ? "Z" : "");

/** Trayectoria completa de la cónica (rama física). */
export const pathOrbita = (o: Orbit, m: Map2, muestras = 720) => pathDe(orbitPoints(o, muestras), m, o.e < 1);

/** Arco de órbita entre dos anomalías verdaderas (radianes). */
export function arcoOrbita(o: Orbit, a: number, b: number, n = 160): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const p = orbitalPoint(a + ((b - a) * i) / n, o);
    if (p) pts.push(p);
  }
  return pts;
}

/** Sector desde el foco entre dos anomalías. */
export const pathSector = (o: Orbit, a: number, b: number, m: Map2, n = 160) =>
  pathDe([{ x: o.h, y: o.k }, ...arcoOrbita(o, a, b, n)], m, true);

/** Arco de circunferencia (para marcar ángulos). Ángulos en radianes, sentido antihorario. */
export function pathArco(cx: number, cy: number, r: number, a: number, b: number, m: Map2, n = 48) {
  const pts: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const u = a + ((b - a) * i) / n;
    pts.push({ x: cx + r * Math.cos(u), y: cy + r * Math.sin(u) });
  }
  return pathDe(pts, m);
}

/** Cámara del gráfico de la web (copia de la lógica de src/Plot.tsx, pantalla de escritorio). */
export function camaraWeb(o: Orbit, W = 900, H = 570) {
  let pts: Point[] = [{ x: 0, y: 0 }, { x: o.h, y: o.k }];
  if (o.e < 1) pts = pts.concat(orbitPoints(o, 180));
  else pts.push({ x: o.h - 7, y: o.k - 6 }, { x: o.h + 7, y: o.k + 6 });
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min((W - 145) / Math.max(12, maxX - minX), (H - 110) / Math.max(9, maxY - minY));
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  return { cx, cy, scale, W, H, X: (x: number) => W / 2 + (x - cx) * scale, Y: (y: number) => H / 2 - (y - cy) * scale };
}

export const semiejes = (p: number, e: number) => {
  const a = p / (1 - e * e);
  return { a, b: a * Math.sqrt(1 - e * e), c: a * e, peri: p / (1 + e), apo: p / (1 - e) };
};
export { radius as r, rad as radianes };
