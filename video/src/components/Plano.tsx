// Primitivas SVG para los gráficos matemáticos: ejes, foco, cuerpo, trazos que se dibujan, flechas y arcos.
import type { CSSProperties, ReactNode } from "react";
import { clamp } from "../core/anim";
import { C, FONT, H, W } from "../core/theme";
import type { Map2 } from "../core/orbit";

/** Definiciones compartidas (degradados y filtros). Se incluyen una sola vez en el escenario. */
export function Defs() {
  return (
    <svg className="abs" width={0} height={0}>
      <defs>
        <radialGradient id="g-sol"><stop stopColor="#fff4cd" /><stop offset=".5" stopColor="#ffd18c" /><stop offset="1" stopColor="#e6a555" /></radialGradient>
        <radialGradient id="g-halo"><stop stopColor="#ffc678" stopOpacity=".42" /><stop offset=".45" stopColor="#ffc678" stopOpacity=".12" /><stop offset="1" stopColor="#ffc678" stopOpacity="0" /></radialGradient>
        <radialGradient id="g-cuerpo"><stop stopColor="#e8fdff" /><stop offset=".6" stopColor="#81e6f3" /><stop offset="1" stopColor="#4fc6da" /></radialGradient>
        <radialGradient id="g-cuerpo-halo"><stop stopColor="#53d8ed" stopOpacity=".5" /><stop offset="1" stopColor="#53d8ed" stopOpacity="0" /></radialGradient>
        <filter id="f-brillo" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="f-suave" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" /></filter>
      </defs>
    </svg>
  );
}

/** Lienzo SVG a pantalla completa. */
export const Lienzo = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <svg className="full" width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={style} fontFamily={FONT}>{children}</svg>
);

/** Trazo que se dibuja progresivamente (p de 0 a 1). */
export function Trazo({ d, p = 1, color = C.orbit, w = 3, o = 1, dash, brillo = false, cap = "round" }: {
  d: string; p?: number; color?: string; w?: number; o?: number; dash?: string; brillo?: boolean; cap?: "round" | "butt";
}) {
  if (p <= 0 || o <= 0) return null;
  const parcial = p < 1 && !dash;
  return (
    <>
      {brillo && <path d={d} fill="none" stroke={color} strokeWidth={w * 3.4} strokeOpacity={0.09 * o} pathLength={parcial ? 1 : undefined} strokeDasharray={parcial ? "1" : undefined} strokeDashoffset={parcial ? 1 - p : undefined} />}
      <path d={d} fill="none" stroke={color} strokeWidth={w} strokeOpacity={dash ? o * clamp(p * 1.5) : o} strokeLinecap={cap} strokeLinejoin="round"
        pathLength={parcial ? 1 : undefined} strokeDasharray={parcial ? "1" : dash} strokeDashoffset={parcial ? 1 - p : undefined} />
    </>
  );
}

export function Foco({ x, y, r = 13, t = 0, o = 1, halo = 1 }: { x: number; y: number; r?: number; t?: number; o?: number; halo?: number }) {
  if (o <= 0) return null;
  const pulso = 1 + 0.07 * Math.sin(t * 2.2);
  return (
    <g opacity={o}>
      <circle cx={x} cy={y} r={r * 5.2 * pulso * halo} fill="url(#g-halo)" />
      <circle cx={x} cy={y} r={r} fill="url(#g-sol)" />
    </g>
  );
}

export function Cuerpo({ x, y, r = 9, o = 1 }: { x: number; y: number; r?: number; o?: number }) {
  if (o <= 0) return null;
  return (
    <g opacity={o}>
      <circle cx={x} cy={y} r={r * 3} fill="url(#g-cuerpo-halo)" />
      <circle cx={x} cy={y} r={r} fill="url(#g-cuerpo)" stroke="#c7f8ff" strokeWidth={1.5} />
    </g>
  );
}

/** Flecha recta con punta. p acorta la flecha (crece desde el origen). */
export function Flecha({ x1, y1, x2, y2, color = C.text, w = 3, p = 1, o = 1, punta = 13, dash }: {
  x1: number; y1: number; x2: number; y2: number; color?: string; w?: number; p?: number; o?: number; punta?: number; dash?: string;
}) {
  if (p <= 0.01 || o <= 0) return null;
  const ex = x1 + (x2 - x1) * p, ey = y1 + (y2 - y1) * p;
  const L = Math.hypot(ex - x1, ey - y1);
  if (L < 2) return null;
  const ux = (ex - x1) / L, uy = (ey - y1) / L;
  const k = Math.min(punta, L * 0.6);
  const bx = ex - ux * k, by = ey - uy * k;
  return (
    <g opacity={o}>
      <line x1={x1} y1={y1} x2={bx + ux * 1} y2={by + uy * 1} stroke={color} strokeWidth={w} strokeLinecap="round" strokeDasharray={dash} />
      <path d={`M${ex},${ey} L${bx - uy * k * 0.5},${by + ux * k * 0.5} L${bx + uy * k * 0.5},${by - ux * k * 0.5} Z`} fill={color} />
    </g>
  );
}

/** Ejes cartesianos con marcas. */
export function Ejes({ m, xr, yr, p = 1, o = 1, paso = 1, numeros = true, nx = "x", ny = "y", cada = 2 }: {
  m: Map2; xr: [number, number]; yr: [number, number]; p?: number; o?: number; paso?: number; numeros?: boolean; nx?: string; ny?: string; cada?: number;
}) {
  if (o <= 0 || p <= 0) return null;
  const x0 = m.X(xr[0]), x1 = m.X(xr[1]), y0 = m.Y(yr[0]), y1 = m.Y(yr[1]);
  const ticks = (a: number, b: number) => {
    const out: number[] = [];
    for (let v = Math.ceil(a / paso) * paso; v <= b + 1e-9; v += paso) if (Math.abs(v) > 1e-9) out.push(Math.round(v / paso) * paso);
    return out;
  };
  const cx = m.X(0), cy = m.Y(0);
  return (
    <g opacity={o}>
      <Flecha x1={x0} y1={cy} x2={x1} y2={cy} color={C.axis} w={2} p={p} punta={11} />
      <Flecha x1={cx} y1={y0} x2={cx} y2={y1} color={C.axis} w={2} p={p} punta={11} />
      <g opacity={clamp(p * 2 - 1)}>
        {ticks(xr[0], xr[1] - 0.3).map((v) => (
          <g key={`x${v}`}>
            <line x1={m.X(v)} x2={m.X(v)} y1={cy - 5} y2={cy + 5} stroke={C.axis} strokeWidth={1.5} />
            {numeros && v % cada === 0 && <text x={m.X(v)} y={cy + 28} textAnchor="middle" fontSize={17} fill={C.dim} className="mono">{v}</text>}
          </g>
        ))}
        {ticks(yr[0], yr[1] - 0.3).map((v) => (
          <g key={`y${v}`}>
            <line y1={m.Y(v)} y2={m.Y(v)} x1={cx - 5} x2={cx + 5} stroke={C.axis} strokeWidth={1.5} />
            {numeros && v % cada === 0 && <text x={cx - 14} y={m.Y(v) + 6} textAnchor="end" fontSize={17} fill={C.dim} className="mono">{v}</text>}
          </g>
        ))}
        <text x={x1 + 4} y={cy - 14} fontSize={24} fontStyle="italic" fill={C.muted} fontFamily="KaTeX_Math, serif">{nx}</text>
        <text x={cx + 14} y={y1 + 6} fontSize={24} fontStyle="italic" fill={C.muted} fontFamily="KaTeX_Math, serif">{ny}</text>
      </g>
    </g>
  );
}

/** Cuadrícula del plano. */
export function Rejilla({ m, xr, yr, paso = 1, o = 1 }: { m: Map2; xr: [number, number]; yr: [number, number]; paso?: number; o?: number }) {
  if (o <= 0) return null;
  const xs: number[] = [], ys: number[] = [];
  for (let v = Math.ceil(xr[0] / paso) * paso; v <= xr[1] + 1e-9; v += paso) xs.push(v);
  for (let v = Math.ceil(yr[0] / paso) * paso; v <= yr[1] + 1e-9; v += paso) ys.push(v);
  return (
    <g stroke={C.grid} strokeOpacity={0.13 * o} strokeWidth={1}>
      {xs.map((v) => <line key={`x${v}`} x1={m.X(v)} x2={m.X(v)} y1={m.Y(yr[0])} y2={m.Y(yr[1])} />)}
      {ys.map((v) => <line key={`y${v}`} y1={m.Y(v)} y2={m.Y(v)} x1={m.X(xr[0])} x2={m.X(xr[1])} />)}
    </g>
  );
}

/** Texto SVG con borde oscuro para que se lea sobre líneas. */
export function Rotulo({ x, y, children, color = C.text, size = 24, o = 1, anchor = "middle", peso = 600, italic = false, mono = false }: {
  x: number; y: number; children: ReactNode; color?: string; size?: number; o?: number; anchor?: "start" | "middle" | "end"; peso?: number; italic?: boolean; mono?: boolean;
}) {
  if (o <= 0) return null;
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={size} fontWeight={peso} fill={color} opacity={o} fontStyle={italic ? "italic" : undefined}
      fontFamily={italic ? "KaTeX_Math, KaTeX_Main, serif" : undefined} className={mono ? "mono" : undefined}
      stroke="#080f1d" strokeWidth={size * 0.28} paintOrder="stroke" strokeLinejoin="round">{children}</text>
  );
}
