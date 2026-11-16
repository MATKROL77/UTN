// Personajes ilustrados originales (Mati y Feli): vectores animados por código.
// Comparten el mismo esqueleto y estilo; cambian pelo, barba, ropa y colores.
import { useMemo } from "react";
import { E, clamp, lerp, rng, wobble } from "../core/anim";
import { FONT } from "../core/theme";

export type Quien = "mati" | "feli";
/** 0 = mano relajada · 1 = señalar · 2 = mano abierta */
export type Mano = 0 | 1 | 2;
export type Pose = {
  izq: [number, number]; // posición de la mano del lado izquierdo de la pantalla (coordenadas locales)
  der: [number, number];
  manoIzq: Mano;
  manoDer: Mano;
  cabeza: number; // inclinación en grados
  mirar: [number, number]; // dirección de la mirada, -1..1
  inclinar: number; // inclinación del torso en grados
  cejas: number; // -1..1
  sonrisa: number; // 0..1
  saludo: number; // 0..1: agita la mano levantada
};

export const POSES = {
  reposo: { izq: [-160, 318], der: [160, 318], manoIzq: 0, manoDer: 0, cabeza: 0, mirar: [0, 0], inclinar: 0, cejas: 0, sonrisa: 0.6, saludo: 0 },
  explicar: { izq: [-246, 132], der: [252, 118], manoIzq: 2, manoDer: 2, cabeza: -2, mirar: [0, 0], inclinar: 0, cejas: 0.25, sonrisa: 0.7, saludo: 0 },
  explicarDer: { izq: [-160, 318], der: [258, 112], manoIzq: 0, manoDer: 2, cabeza: 3, mirar: [0.5, 0], inclinar: 1.5, cejas: 0.2, sonrisa: 0.7, saludo: 0 },
  explicarIzq: { izq: [-258, 112], der: [160, 318], manoIzq: 2, manoDer: 0, cabeza: -3, mirar: [-0.5, 0], inclinar: -1.5, cejas: 0.2, sonrisa: 0.7, saludo: 0 },
  senalarDer: { izq: [-160, 318], der: [374, 22], manoIzq: 0, manoDer: 1, cabeza: 5, mirar: [0.9, -0.15], inclinar: 2.5, cejas: 0.35, sonrisa: 0.75, saludo: 0 },
  senalarDerArriba: { izq: [-160, 318], der: [346, -96], manoIzq: 0, manoDer: 1, cabeza: 6, mirar: [0.85, -0.5], inclinar: 2.5, cejas: 0.45, sonrisa: 0.75, saludo: 0 },
  senalarDerAbajo: { izq: [-160, 318], der: [362, 176], manoIzq: 0, manoDer: 1, cabeza: 6, mirar: [0.8, 0.45], inclinar: 2, cejas: 0.2, sonrisa: 0.7, saludo: 0 },
  senalarIzq: { izq: [-374, 22], der: [160, 318], manoIzq: 1, manoDer: 0, cabeza: -5, mirar: [-0.9, -0.15], inclinar: -2.5, cejas: 0.35, sonrisa: 0.75, saludo: 0 },
  senalarIzqArriba: { izq: [-346, -96], der: [160, 318], manoIzq: 1, manoDer: 0, cabeza: -6, mirar: [-0.85, -0.5], inclinar: -2.5, cejas: 0.45, sonrisa: 0.75, saludo: 0 },
  senalarIzqAbajo: { izq: [-362, 176], der: [160, 318], manoIzq: 1, manoDer: 0, cabeza: -6, mirar: [-0.8, 0.45], inclinar: -2, cejas: 0.2, sonrisa: 0.7, saludo: 0 },
  presentarDer: { izq: [-160, 318], der: [336, 128], manoIzq: 0, manoDer: 2, cabeza: 4, mirar: [0.7, 0.1], inclinar: 2, cejas: 0.3, sonrisa: 0.85, saludo: 0 },
  presentarIzq: { izq: [-336, 128], der: [160, 318], manoIzq: 2, manoDer: 0, cabeza: -4, mirar: [-0.7, 0.1], inclinar: -2, cejas: 0.3, sonrisa: 0.85, saludo: 0 },
  saludarDer: { izq: [-160, 318], der: [258, -132], manoIzq: 0, manoDer: 2, cabeza: 4, mirar: [0, 0], inclinar: 1.5, cejas: 0.5, sonrisa: 1, saludo: 1 },
  saludarIzq: { izq: [-258, -132], der: [160, 318], manoIzq: 2, manoDer: 0, cabeza: -4, mirar: [0, 0], inclinar: -1.5, cejas: 0.5, sonrisa: 1, saludo: 1 },
  pensar: { izq: [-160, 318], der: [60, -30], manoIzq: 0, manoDer: 0, cabeza: -4, mirar: [-0.4, -0.5], inclinar: -1, cejas: 0.5, sonrisa: 0.35, saludo: 0 },
  mirarDer: { izq: [-160, 318], der: [160, 318], manoIzq: 0, manoDer: 0, cabeza: 4, mirar: [0.9, -0.1], inclinar: 1, cejas: 0.15, sonrisa: 0.6, saludo: 0 },
  mirarIzq: { izq: [-160, 318], der: [160, 318], manoIzq: 0, manoDer: 0, cabeza: -4, mirar: [-0.9, -0.1], inclinar: -1, cejas: 0.15, sonrisa: 0.6, saludo: 0 },
} satisfies Record<string, Pose>;
export type NombrePose = keyof typeof POSES;
export type Gesto = { t: number; pose: NombrePose | Partial<Pose>; dur?: number };

const mezclar = (a: Pose, b: Pose, u: number): Pose => ({
  izq: [lerp(a.izq[0], b.izq[0], u), lerp(a.izq[1], b.izq[1], u)],
  der: [lerp(a.der[0], b.der[0], u), lerp(a.der[1], b.der[1], u)],
  manoIzq: u < 0.5 ? a.manoIzq : b.manoIzq,
  manoDer: u < 0.5 ? a.manoDer : b.manoDer,
  cabeza: lerp(a.cabeza, b.cabeza, u),
  mirar: [lerp(a.mirar[0], b.mirar[0], u), lerp(a.mirar[1], b.mirar[1], u)],
  inclinar: lerp(a.inclinar, b.inclinar, u),
  cejas: lerp(a.cejas, b.cejas, u),
  sonrisa: lerp(a.sonrisa, b.sonrisa, u),
  saludo: lerp(a.saludo, b.saludo, u),
});

/** Evalúa una pista de gestos: cada gesto comienza en su t y tarda `dur` segundos en completarse. */
export function poseEn(t: number, gestos: Gesto[]): Pose {
  let p: Pose = POSES.reposo;
  for (const g of gestos) {
    if (t < g.t) break;
    const destino: Pose = typeof g.pose === "string" ? POSES[g.pose] : { ...p, ...g.pose };
    p = mezclar(p, destino, E.inOut(clamp((t - g.t) / (g.dur ?? 0.55))));
  }
  return p;
}

const ESTILO = {
  mati: {
    piel: "#e9b995", pielSombra: "#d49d79", pelo: "#33241d", peloLuz: "#5b4234", ceja: "#33241d",
    ropa: "#35a3b4", ropaSombra: "#27818f", ropaLuz: "#52bccb", interior: "#eef3f8", detalle: "#e9f6f8",
  },
  feli: {
    piel: "#eec3a2", pielSombra: "#d9a583", pelo: "#4b3528", peloLuz: "#6b4d3a", ceja: "#3d2b20",
    ropa: "#3f5680", ropaSombra: "#31456a", ropaLuz: "#52699a", interior: "#f0a35e", detalle: "#d98845",
  },
};

const HOMBRO = { izq: [-136, 36] as const, der: [136, 36] as const };
const L1 = 150, L2 = 138;

/** Cinemática inversa de dos huesos con escorzo: cuando la mano está cerca del hombro el brazo se acorta
 *  (como si se doblara hacia el espectador) y el codo queda abajo y hacia afuera. */
function resolverBrazo(h: readonly [number, number], mano: [number, number], s: -1 | 1) {
  const dx = mano[0] - h[0], dy = mano[1] - h[1];
  const d0 = Math.hypot(dx, dy);
  const k = clamp(0.36 + 0.8 * (d0 / (L1 + L2)), 0.6, 1);
  const l1 = L1 * k, l2 = L2 * k;
  const d = clamp(d0, Math.abs(l1 - l2) + 2, l1 + l2 - 3);
  const m: [number, number] = [h[0] + (dx * d) / (d0 || 1), h[1] + (dy * d) / (d0 || 1)];
  const base = Math.atan2(dy, dx);
  const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const cand = [base + a, base - a].map((ang) => [h[0] + l1 * Math.cos(ang), h[1] + l1 * Math.sin(ang)] as [number, number]);
  const puntaje = (c: [number, number]) => c[1] + s * c[0] * 0.35;
  const c = puntaje(cand[0]) >= puntaje(cand[1]) ? cand[0] : cand[1];
  return { c, m, l2 };
}

function Brazo({ lado, mano, tipo, e }: { lado: "izq" | "der"; mano: [number, number]; tipo: Mano; e: (typeof ESTILO)[Quien] }) {
  const h = HOMBRO[lado];
  const s = lado === "izq" ? -1 : 1;
  const { c, m, l2 } = resolverBrazo(h, mano, s);
  const rad = Math.atan2(m[1] - c[1], m[0] - c[0]);
  const ang = (rad * 180) / Math.PI;
  const d = `M${h[0]},${h[1]} L${c[0].toFixed(1)},${c[1].toFixed(1)} L${m[0].toFixed(1)},${m[1].toFixed(1)}`;
  const ux = (m[0] - c[0]) / l2, uy = (m[1] - c[1]) / l2;
  const p1 = [m[0] - ux * 26, m[1] - uy * 26], p2 = [m[0] - ux * 6, m[1] - uy * 6];
  // Lado del pulgar: el que queda hacia arriba y hacia el cuerpo.
  const u = -0.5 * s * Math.sin(rad) + Math.cos(rad) >= 0 ? -1 : 1;
  return (
    <g>
      <path d={d} fill="none" stroke={e.ropaSombra} strokeWidth={66} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={e.ropa} strokeWidth={58} strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M${p1[0].toFixed(1)},${p1[1].toFixed(1)} L${p2[0].toFixed(1)},${p2[1].toFixed(1)}`} stroke={e.ropaSombra} strokeWidth={58} strokeLinecap="butt" />
      <g transform={`translate(${m[0].toFixed(1)},${m[1].toFixed(1)}) rotate(${ang.toFixed(1)})`}>
        {tipo === 1 ? (
          <>
            <rect x={18} y={u * 11 - 8} width={54} height={16} rx={8} fill={e.piel} />
            <rect x={-6} y={-24} width={44} height={48} rx={20} fill={e.piel} />
            <path d={`M34,${u * -2} q-7,${u * -4} -15,${u * -1} M35,${u * -10} q-8,${u * -4} -16,${u * -1}`} stroke={e.pielSombra} strokeWidth={2.6} fill="none" strokeLinecap="round" opacity={0.8} />
            <rect x={2} y={u * 24 - 7} width={30} height={14} rx={7} fill={e.piel} stroke={e.pielSombra} strokeWidth={1.8} transform={`rotate(${u * -14} 4 ${u * 24})`} />
          </>
        ) : tipo === 2 ? (
          <>
            {[0, 1, 2, 3].map((i) => {
              const y = u * [15.5, 5.2, -5.2, -15.5][i];
              return <rect key={i} x={24} y={y - 6} width={[32, 38, 36, 28][i]} height={12} rx={6} fill={e.piel} transform={`rotate(${u * [9, 3, -3, -9][i]} 24 ${y})`} />;
            })}
            <rect x={-6} y={-25} width={44} height={50} rx={18} fill={e.piel} />
            <rect x={6} y={u * 30 - 6.5} width={32} height={13} rx={6.5} fill={e.piel} transform={`rotate(${u * 38} 8 ${u * 26})`} />
            <path d={`M8,${u * 12} q12,${u * -8} 22,${u * -2}`} stroke={e.pielSombra} strokeWidth={2.4} fill="none" strokeLinecap="round" opacity={0.6} />
          </>
        ) : (
          <>
            <rect x={-6} y={-23} width={48} height={46} rx={21} fill={e.piel} />
            <ellipse cx={17} cy={u * 20} rx={13} ry={7.5} fill={e.piel} stroke={e.pielSombra} strokeWidth={1.6} />
            <path d={`M26,${u * -12} q8,${u * 4} 8,${u * 12}`} stroke={e.pielSombra} strokeWidth={2.6} fill="none" strokeLinecap="round" opacity={0.7} />
          </>
        )}
      </g>
    </g>
  );
}

const CABEZA = "M-75,-166 C-76,-226 -42,-252 0,-252 C42,-252 76,-226 75,-166 C74,-124 60,-84 32,-64 C14,-52 -14,-52 -32,-64 C-60,-84 -74,-124 -75,-166 Z";

function PeloMati({ capa, e }: { capa: "atras" | "frente"; e: (typeof ESTILO)["mati"] }) {
  const rulos = useMemo(() => {
    const r = rng(7);
    const lista: { x: number; y: number; r: number; rot: number; capa: "atras" | "frente" }[] = [];
    // Corona exterior (volumen alrededor de la cabeza)
    for (let i = 0; i < 15; i++) {
      const a = ((198 - i * 15.4) * Math.PI) / 180;
      lista.push({ x: 94 * Math.cos(a) + (r() - 0.5) * 6, y: -172 - 100 * Math.sin(a) + (r() - 0.5) * 6, r: 27 + r() * 5, rot: r() * 360, capa: "atras" });
    }
    // Segunda fila (parte alta)
    for (let i = 0; i < 9; i++) {
      const a = ((166 - i * 19) * Math.PI) / 180;
      lista.push({ x: 66 * Math.cos(a) + (r() - 0.5) * 6, y: -180 - 76 * Math.sin(a) + (r() - 0.5) * 5, r: 25 + r() * 4, rot: r() * 360, capa: "frente" });
    }
    // Flequillo de rulos sobre la frente
    [-56, -30, -3, 25, 52].forEach((x, i) => lista.push({ x, y: [-221, -229, -233, -230, -222][i] + (r() - 0.5) * 3, r: 21 + r() * 3, rot: r() * 360, capa: "frente" }));
    return lista;
  }, []);
  return (
    <g>
      {capa === "atras" && <ellipse cx={0} cy={-186} rx={96} ry={84} fill={e.pelo} />}
      {capa === "frente" && <path d="M-74,-190 C-70,-240 -36,-256 0,-256 C36,-256 70,-240 74,-190 C60,-214 30,-226 0,-226 C-30,-226 -60,-214 -74,-190 Z" fill={e.pelo} />}
      {rulos.filter((c) => c.capa === capa).map((c, i) => (
        <g key={i} transform={`translate(${c.x.toFixed(1)},${c.y.toFixed(1)})`}>
          <circle r={c.r} fill={e.pelo} />
          <path d={`M${-c.r * 0.5},${c.r * 0.08} A${c.r * 0.52},${c.r * 0.52} 0 1 1 ${c.r * 0.2},${c.r * 0.5} M${-c.r * 0.12},${c.r * 0.02} A${c.r * 0.2},${c.r * 0.2} 0 1 1 ${c.r * 0.12},${c.r * 0.16}`}
            fill="none" stroke={e.peloLuz} strokeWidth={3.2} strokeLinecap="round" opacity={0.85} transform={`rotate(${c.rot.toFixed(0)})`} />
        </g>
      ))}
    </g>
  );
}

function PeloFeli({ capa, e }: { capa: "atras" | "frente"; e: (typeof ESTILO)["feli"] }) {
  if (capa === "atras") return <path d="M-80,-150 C-88,-222 -52,-264 0,-266 C52,-264 88,-222 80,-150 L70,-120 L-70,-120 Z" fill={e.pelo} />;
  return (
    <g>
      {/* costados cortos */}
      <path d="M-77,-150 C-80,-176 -78,-196 -70,-212 L-58,-200 C-64,-184 -66,-168 -66,-150 Z" fill={e.pelo} opacity={0.82} />
      <path d="M77,-150 C80,-176 78,-196 70,-212 L58,-200 C64,-184 66,-168 66,-150 Z" fill={e.pelo} opacity={0.82} />
      {/* copete corto, apenas despeinado */}
      <path d="M-74,-196 C-80,-232 -56,-262 -22,-268 L-14,-279 L-4,-268 C2,-276 14,-278 20,-268 L32,-277 L38,-264 C62,-256 82,-230 74,-196 C68,-210 58,-220 46,-222 C36,-208 14,-204 -4,-212 C-12,-202 -34,-200 -46,-210 C-58,-212 -68,-206 -74,-196 Z" fill={e.pelo} />
      <path d="M-40,-246 q10,-12 26,-12 M2,-250 q12,-8 26,-2 M-58,-228 q4,-12 14,-18 M40,-240 q12,4 18,16" fill="none" stroke={e.peloLuz} strokeWidth={3.4} strokeLinecap="round" opacity={0.8} />
    </g>
  );
}

export function Presenter({
  quien, t, x, y, escala = 1, pose, habla = 0, opacidad = 1, espejo = false, semilla = 0,
}: {
  quien: Quien; t: number; x: number; y: number; escala?: number; pose: Pose;
  /** 0..1: cuánto está hablando (mueve boca, cabeza y manos). */
  habla?: number; opacidad?: number; espejo?: boolean; semilla?: number;
}) {
  const e = ESTILO[quien];
  const sd = quien === "mati" ? 1.7 + semilla : 5.3 + semilla;
  if (opacidad <= 0.001) return null;

  // Vida propia: respiración, balanceo leve, parpadeo.
  const resp = Math.sin(t * 1.75 + sd);
  const balanceo = wobble(t, sd, 0.55) * 0.9;
  const cabeceo = wobble(t, sd + 3, 0.8) * 1.6 + habla * Math.sin(t * 3.1 + sd) * 1.6;
  const ciclo = 3.7 + (sd % 1.3);
  const fase = (t + sd * 2.1) % ciclo;
  const doble = Math.floor((t + sd * 2.1) / ciclo) % 4 === 2;
  const cierre = (f: number) => (f < 0.16 ? Math.sin((f / 0.16) * Math.PI) : 0);
  const parpadeo = Math.max(cierre(fase), doble ? cierre(fase - 0.3) : 0);
  const ojoY = 1 - 0.92 * parpadeo;

  // Boca: sonrisa en reposo; al hablar se abre y cierra con ritmo irregular (sin lipsync).
  const silaba = 0.5 + 0.5 * Math.sin(t * 13.5 + sd) * Math.sin(t * 5.3 + sd * 2) + 0.25 * Math.sin(t * 21 + sd);
  const boca = clamp(habla * clamp(silaba, 0.05, 1));
  const sonr = pose.sonrisa;

  // Manos: al hablar con las manos levantadas, pequeños énfasis.
  const enf = (m: [number, number], k: number): [number, number] => {
    const alta = clamp((300 - m[1]) / 120);
    return [m[0] + wobble(t, sd + k, 1.9) * 9 * alta * (0.4 + habla), m[1] + wobble(t, sd + k + 7, 2.3) * 11 * alta * (0.4 + habla) + resp * 1.5];
  };
  const agitar = Math.sin(t * 9.5) * 26 * pose.saludo;
  const mIzq = enf([pose.izq[0] + (pose.izq[1] < 0 ? agitar : 0), pose.izq[1]], 1);
  const mDer = enf([pose.der[0] + (pose.der[1] < 0 ? agitar : 0), pose.der[1]], 2);
  const mx = pose.mirar[0] * 4.2, my = pose.mirar[1] * 3.2;
  const ceja = pose.cejas * 5 + habla * Math.max(0, Math.sin(t * 2.3 + sd)) * 2;

  return (
    <svg className="abs" width={1} height={1} style={{ left: x, top: y, opacity: opacidad }}>
      <g transform={`scale(${espejo ? -escala : escala},${escala})`} fontFamily={FONT}>
        <g transform={`rotate(${(pose.inclinar + balanceo).toFixed(2)} 0 430)`}>
          {/* Torso */}
          <g transform={`translate(0,${(-resp * 1.2).toFixed(2)})`}>
            {quien === "mati" ? (
              <>
                {/* capucha detrás del cuello */}
                <path d="M-92,6 C-100,-52 -62,-74 0,-74 C62,-74 100,-52 92,6 C60,-14 -60,-14 -92,6 Z" fill={e.ropaSombra} />
                <path d="M-172,60 C-176,16 -128,-2 -74,-16 L-34,-30 L0,24 L34,-30 L74,-16 C128,-2 176,16 172,60 L184,470 L-184,470 Z" fill={e.ropa} />
                <path d="M96,-10 C140,4 176,22 172,60 L184,470 L112,470 C126,330 124,150 96,-10 Z" fill={e.ropaSombra} opacity={0.55} />
                {/* cuello de la capucha y remera interior */}
                <path d="M-34,-30 L0,26 L34,-30 L26,-36 L0,-6 L-26,-36 Z" fill={e.interior} />
                <path d="M-74,-16 L-34,-30 L0,26 L-10,44 C-40,24 -64,6 -74,-16 Z" fill={e.ropaLuz} />
                <path d="M74,-16 L34,-30 L0,26 L10,44 C40,24 64,6 74,-16 Z" fill={e.ropaSombra} />
                {/* cordones */}
                <path d="M-14,34 L-18,118 M14,34 L18,104" stroke={e.detalle} strokeWidth={5} strokeLinecap="round" />
                <path d="M-18,112 L-18,126 M18,98 L18,112" stroke="#9fb4c2" strokeWidth={7} strokeLinecap="round" />
                {/* bolsillo canguro */}
                <path d="M-88,330 C-80,292 -50,280 0,280 C50,280 80,292 88,330 L96,470 L-96,470 Z" fill={e.ropaSombra} opacity={0.5} />
              </>
            ) : (
              <>
                {/* remera */}
                <path d="M-160,60 C-164,16 -120,-2 -70,-16 L-34,-28 C-18,-8 18,-8 34,-28 L70,-16 C120,-2 164,16 160,60 L172,470 L-172,470 Z" fill={e.interior} />
                <path d="M-34,-28 C-18,-6 18,-6 34,-28 L40,-22 C22,6 -22,6 -40,-22 Z" fill={e.detalle} />
                <path d="M30,60 C60,160 60,330 46,470 L110,470 L110,40 Z" fill={e.detalle} opacity={0.35} />
                {/* camisa abierta encima */}
                <path d="M-172,62 C-176,16 -128,-2 -74,-17 L-44,-27 C-56,60 -60,260 -52,470 L-184,470 Z" fill={e.ropa} />
                <path d="M172,62 C176,16 128,-2 74,-17 L44,-27 C56,60 60,260 52,470 L184,470 Z" fill={e.ropa} />
                <path d="M100,-9 C142,4 176,22 172,62 L184,470 L120,470 C132,330 128,150 100,-9 Z" fill={e.ropaSombra} opacity={0.6} />
                {/* solapas */}
                <path d="M-74,-17 L-44,-27 C-50,10 -52,50 -52,84 C-70,52 -82,18 -74,-17 Z" fill={e.ropaLuz} />
                <path d="M74,-17 L44,-27 C50,10 52,50 52,84 C70,52 82,18 74,-17 Z" fill={e.ropaSombra} />
                <path d="M-52,84 C-56,220 -56,340 -52,470 M52,84 C56,220 56,340 52,470" stroke={e.ropaSombra} strokeWidth={3} fill="none" opacity={0.8} />
                {[150, 250, 350].map((yy) => <circle key={yy} cx={-66} cy={yy} r={4.5} fill={e.ropaSombra} />)}
              </>
            )}
            {/* Cuello */}
            <path d="M-31,-84 L-31,-24 C-16,-2 16,-2 31,-24 L31,-84 Z" fill={e.piel} />
            <path d="M-31,-76 C-12,-48 16,-46 31,-70 L31,-84 L-31,-84 Z" fill={e.pielSombra} opacity={0.75} />
          </g>

          {/* Cabeza */}
          <g transform={`translate(${(pose.mirar[0] * 2.5).toFixed(2)},${(-resp * 2 + habla * Math.abs(Math.sin(t * 3.1 + sd)) * 1.5).toFixed(2)}) rotate(${(pose.cabeza + cabeceo).toFixed(2)} 0 -60)`}>
            {quien === "mati" ? <PeloMati capa="atras" e={ESTILO.mati} /> : <PeloFeli capa="atras" e={ESTILO.feli} />}
            {/* orejas */}
            <ellipse cx={-77} cy={-150} rx={12} ry={19} fill={e.piel} />
            <ellipse cx={77} cy={-150} rx={12} ry={19} fill={e.pielSombra} />
            <path d="M-80,-158 q-5,8 1,18" stroke={e.pielSombra} strokeWidth={2.5} fill="none" strokeLinecap="round" />
            <path d={CABEZA} fill={e.piel} />
            <clipPath id={`cara-${quien}`}><path d={CABEZA} /></clipPath>
            <g clipPath={`url(#cara-${quien})`}>
              {/* sombra lateral sencilla */}
              <path d="M40,-260 C92,-230 96,-120 40,-56 L90,-40 L100,-270 Z" fill={e.pielSombra} opacity={0.5} />
              {quien === "feli" && (
                <>
                  {/* barbita corta y discreta */}
                  <path d="M-80,-152 C-70,-128 -56,-112 -34,-112 C-24,-122 -12,-126 0,-126 C12,-126 24,-122 34,-112 C56,-112 70,-128 80,-152 L84,-40 L-84,-40 Z" fill={e.pelo} opacity={0.3} />
                  <path d="M-30,-96 C-14,-84 14,-84 30,-96 C22,-70 -22,-70 -30,-96 Z" fill={e.pelo} opacity={0.16} />
                </>
              )}
              <ellipse cx={-44} cy={-128} rx={15} ry={9} fill="#e8836f" opacity={0.16} />
              <ellipse cx={44} cy={-128} rx={15} ry={9} fill="#e8836f" opacity={0.14} />
            </g>
            {/* cejas */}
            <path d={`M-43,${-181 - ceja} Q-29,${-189 - ceja * 1.4} -14,${-183 - ceja * 0.6}`} stroke={e.ceja} strokeWidth={quien === "feli" ? 6.6 : 5.6} fill="none" strokeLinecap="round" />
            <path d={`M43,${-181 - ceja} Q29,${-189 - ceja * 1.4} 14,${-183 - ceja * 0.6}`} stroke={e.ceja} strokeWidth={quien === "feli" ? 6.6 : 5.6} fill="none" strokeLinecap="round" />
            {/* ojos */}
            {[-28, 28].map((ox) => (
              <g key={ox} transform={`translate(${ox + mx},${-160 + my})`}>
                {ojoY > 0.25 ? (
                  <g transform={`scale(1,${ojoY.toFixed(3)})`}>
                    <ellipse rx={7.2} ry={9.4} fill="#2a1d18" />
                    <circle cx={-2.2} cy={-3.2} r={2.4} fill="#fff" opacity={0.92} />
                  </g>
                ) : (
                  <path d="M-8,0 Q0,4 8,0" stroke="#2a1d18" strokeWidth={3.4} fill="none" strokeLinecap="round" />
                )}
              </g>
            ))}
            {/* nariz */}
            <path d="M2,-152 C7,-142 9,-134 3,-130 C0,-128 -3,-129 -5,-131" stroke={e.pielSombra} strokeWidth={3.6} fill="none" strokeLinecap="round" />
            {/* boca */}
            {boca > 0.12 ? (
              <g>
                <path d={`M-17,-103 Q0,${-99 - sonr * 2} 17,-103 Q0,${-103 + 8 + boca * 20} -17,-103 Z`} fill="#6e2a2c" />
                <path d={`M-12,-102 Q0,-99 12,-102 L11,${-98 + boca * 2} Q0,${-96 + boca * 2} -11,${-98 + boca * 2} Z`} fill="#fff" opacity={0.9} />
              </g>
            ) : (
              <path d={`M${-13 - sonr * 5},${-105 - sonr * 2} Q0,${-103 + sonr * 12} ${13 + sonr * 5},${-105 - sonr * 2}`} stroke="#8e463e" strokeWidth={4.2} fill="none" strokeLinecap="round" />
            )}
            {quien === "mati" ? <PeloMati capa="frente" e={ESTILO.mati} /> : <PeloFeli capa="frente" e={ESTILO.feli} />}
          </g>

          {/* Brazos (por delante del torso) */}
          <Brazo lado="izq" mano={mIzq} tipo={pose.manoIzq} e={e} />
          <Brazo lado="der" mano={mDer} tipo={pose.manoDer} e={e} />
        </g>
      </g>
    </svg>
  );
}

/** Etiqueta con el nombre del personaje. */
export function NombreTag({ x, y, corto, nombre, color, p = 1, largo = 1 }: { x: number; y: number; corto: string; nombre?: string; color: string; p?: number; largo?: number }) {
  if (p <= 0.001) return null;
  return (
    <div className="abs" style={{ left: x, top: y, transform: `translate(-50%,0) translateY(${(1 - p) * 14}px)`, opacity: p, display: "flex", alignItems: "center", gap: 12, padding: "9px 18px 9px 12px", borderRadius: 999, background: "rgba(11,19,34,.88)", border: `1.5px solid ${color}66`, boxShadow: "0 10px 30px rgba(0,0,0,.4)", whiteSpace: "nowrap", fontFamily: FONT }}>
      <span style={{ width: 12, height: 12, borderRadius: 6, background: color, boxShadow: `0 0 12px ${color}` }} />
      <span style={{ fontWeight: 750, letterSpacing: 2.6, fontSize: 21, color: "#fff" }}>{corto}</span>
      {nombre && largo > 0.01 && (
        <span style={{ fontSize: 20, color: "#b5c4d8", maxWidth: 320 * largo, opacity: largo, overflow: "hidden", borderLeft: "1px solid #34445c", paddingLeft: 12 * largo }}>{nombre}</span>
      )}
    </div>
  );
}
