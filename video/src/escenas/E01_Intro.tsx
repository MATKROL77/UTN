// ESCENA 1 — Introducción: órbita que se dibuja, título, entrada de Mati y Feli.
import { E, clamp, inOut, lerp, prog, pulse } from "../core/anim";
import { TAU, mapa, orbitalPoint, pathOrbita, trueAnomaly, type Orbit } from "../core/orbit";
import { C, FONT } from "../core/theme";
import { cue } from "../core/tl";
import { Cuerpo, Foco, Lienzo, Trazo } from "../components/Plano";
import { Punto } from "../components/ui";
import { Escena } from "./comun";

const A: Orbit = { p: 3, e: 0.62, alpha: 172, h: 0, k: 0 };
const B: Orbit = { p: 4.3, e: 0.42, alpha: -22, h: 0, k: 0 };

export function Intro({ t, ini, fin }: { t: number; ini: number; fin: number }) {
  const m = mapa(960, 632, 92);
  const tB = cue("M1.somos") - 1.0; // el título sube y deja lugar a los personajes
  const sube = prog(t, tB, 1.1);
  const zoom = prog(t, fin - 1.5, 1.5, E.in); // la cámara se acerca a la órbita
  const esc = 1 + zoom * 1.7;
  const a = orbitalPoint(trueAnomaly((TAU * t) / 11 + 2.4, A.e), A)!;
  const b = orbitalPoint(trueAnomaly((TAU * t) / 19 + 0.6, B.e), B)!;
  const tema = cue("M1.tema");
  const g1 = pulse(t, tema - 0.1, 1.3), g2 = pulse(t, tema + (cue("M1.fin") - tema) * 0.45, 1.6);
  const grupo = pulse(t, cue("M1.grupo") - 0.1, 1.4);
  const proy = prog(t, cue("M1.proyecto") - 0.2, 0.6, E.out);
  const tituloO = (1 - prog(t, fin - 1.4, 0.7)) * 1;
  return (
    <Escena t={t} ini={ini} fin={fin} dIn={0.01} dOut={0.6} zoom={false}>
      <div className="full" style={{ transform: `scale(${esc.toFixed(4)})`, transformOrigin: `${m.ox}px ${m.oy}px`, opacity: 1 - zoom * 0.25 }}>
        <Lienzo>
          <Trazo d={pathOrbita(B, m)} p={prog(t, 0.7, 2.4)} color={C.blue} w={2} o={0.38} />
          <Trazo d={pathOrbita(A, m)} p={prog(t, 0.15, 2.2)} color={C.orbit} w={3.2} brillo />
          <Foco x={m.ox} y={m.oy} r={15 * prog(t, 0, 0.9, E.outBack)} t={t} />
          <Cuerpo x={m.X(b.x)} y={m.Y(b.y)} r={7} o={prog(t, 2.6, 0.7) * 0.75} />
          <Cuerpo x={m.X(a.x)} y={m.Y(a.y)} r={10} o={prog(t, 1.5, 0.7)} />
        </Lienzo>
      </div>
      <div className="abs" style={{ left: 960, top: lerp(352, 176, sube), transform: `translate(-50%,-50%) scale(${lerp(1, 0.64, sube)})`, textAlign: "center", fontFamily: FONT, opacity: tituloO, whiteSpace: "nowrap" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 14, fontSize: 24, letterSpacing: 6, fontWeight: 650, color: C.cyan, opacity: prog(t, 0.6, 0.8), transform: `translateY(${(1 - prog(t, 0.6, 0.8, E.out)) * 12}px)`, marginBottom: 20, padding: "8px 20px", borderRadius: 999, border: `1.5px solid rgba(110,223,232,${0.25 + proy * 0.55})`, background: `rgba(110,223,232,${0.04 + proy * 0.1})` }}>
          <Punto /> PROYECTO INTEGRADOR
        </div>
        <div style={{ fontSize: 66, fontWeight: 600, letterSpacing: lerp(26, 10, prog(t, 0.9, 1.4, E.out)), color: C.text, opacity: prog(t, 0.9, 0.9), textShadow: `0 0 ${30 * g1}px rgba(220,230,244,${0.7 * g1})` }}>
          MOVIMIENTO PLANO Y
        </div>
        <div style={{ fontSize: 124, fontWeight: 800, letterSpacing: lerp(14, 1, prog(t, 1.25, 1.5, E.out)), lineHeight: 1.12, opacity: prog(t, 1.25, 1.0),
          background: `linear-gradient(90deg, #9ff0f5, ${C.cyan} 35%, ${C.blue})`, WebkitBackgroundClip: "text", color: "transparent", filter: `drop-shadow(0 0 ${10 + 34 * g2}px rgba(110,223,232,${0.25 + 0.55 * g2}))` }}>
          ÓRBITAS KEPLERIANAS
        </div>
        <div style={{ marginTop: 22, fontSize: 34, color: C.muted, letterSpacing: 2.5, opacity: prog(t, 2.0, 0.9), transform: `translateY(${(1 - prog(t, 2.0, 0.9, E.out)) * 14}px)` }}>
          Análisis Matemático II <span style={{ color: C.dim, padding: "0 12px" }}>·</span> UTN <span style={{ color: C.dim, padding: "0 12px" }}>·</span>
          <span style={{ color: grupo > 0.02 ? `color-mix(in srgb, ${C.cyan} ${Math.round(grupo * 100)}%, ${C.muted})` : C.muted, fontWeight: 650, textShadow: `0 0 ${24 * grupo}px rgba(110,223,232,${grupo})` }}>Grupo 14</span>
        </div>
      </div>
    </Escena>
  );
}
