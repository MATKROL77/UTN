// ESCENA 2 — Modelo matemático: objetivo, ecuación orbital r(θ) = p / (1 + e cos θ), papel de p y de e.
import { E, clamp, fmt, inOut, kf, lerp, prog, pulse } from "../core/anim";
import { TAU, mapa, orbitalPoint, pathArco, pathOrbita, radius, trueAnomaly, type Orbit } from "../core/orbit";
import { C } from "../core/theme";
import { cue } from "../core/tl";
import { Cuerpo, Flecha, Foco, Lienzo, Rotulo, Trazo } from "../components/Plano";
import { Tex } from "../components/Tex";
import { Antetitulo, Caja, Chip, Lectura } from "../components/ui";
import { Escena } from "./comun";

const CX = 1190; // eje vertical de la zona de contenido (a la derecha de Mati)

export function Modelo({ t, ini, fin }: { t: number; ini: number; fin: number }) {
  const m = mapa(1500, 636, 68);
  const c = (id: string) => cue(id);

  // p y e cambian cuando Mati los nombra (M4); el resto del tiempo valen 3 y 0,6.
  const dP = Math.max(1.2, c("M4.e") - c("M4.escala") - 0.15);
  const p = kf(t, [[c("M4.escala"), 3], [c("M4.escala") + dP * 0.34, 3.6], [c("M4.escala") + dP * 0.74, 2.15], [c("M4.escala") + dP, 3]]);
  const dE = Math.max(1.6, c("M4.fin") + 0.5 - c("M4.forma"));
  const e = kf(t, [[c("M4.forma"), 0.6], [c("M4.forma") + dE * 0.32, 0.72], [c("M4.forma") + dE * 0.72, 0.12], [c("M4.forma") + dE, 0.6]]);
  const o: Orbit = { p, e, alpha: 0, h: 0, k: 0 };

  const th = trueAnomaly((TAU * (t - ini)) / 10 + 0.9, e);
  const b = orbitalPoint(th, o)!;
  const bx = m.X(b.x), by = m.Y(b.y);
  const r = radius(th, p, e);

  const dibujo = prog(t, ini + 0.1, 1.6);
  const fuerza = inOut(t, c("M2.fuerza") - 0.2, c("M3") - 0.3, 0.5, 0.5);
  const polar = prog(t, c("M2.polares") - 0.2, 0.6, E.out);
  const cart = inOut(t, c("M2.cart") - 0.15, c("M3.ec") + 0.4, 0.5, 0.6);
  const objetivo = inOut(t, ini + 0.5, c("M3") - 0.5, 0.6, 0.5);
  const chips = [
    { id: "M2.polares", txt: "Coordenadas polares", sim: "(r,\\,\\theta)", col: C.cyan },
    { id: "M2.cart", txt: "Cartesianas", sim: "(x,\\,y)", col: C.blue },
    { id: "M2.deriv", txt: "Derivadas parciales", sim: "\\partial", col: C.violetSoft },
    { id: "M2.jac", txt: "Jacobiano", sim: "|J|", col: C.orange },
  ];

  // Ecuación
  const ec = prog(t, c("M3.ec") - 0.25, 1.0, E.out);
  const gr = pulse(t, c("M3.r") - 0.15, 1.3);
  const gp = Math.max(pulse(t, c("M3.p") - 0.15, 1.2), pulse(t, c("M4.p") - 0.15, 1.4));
  const gden = pulse(t, c("M3.den") - 0.1, 1.9);
  const ge = pulse(t, c("M4.e") - 0.15, 1.6);
  const pOn = prog(t, c("M3.p") - 0.15, 0.4), eOn = prog(t, c("M3.den") + 0.5, 0.5);
  const lecturas = prog(t, c("M4") - 0.2, 0.6, E.out);
  const semilato = inOut(t, c("M4.p") - 0.1, c("M4.e") + 0.2, 0.6, 0.5);
  const pTop = orbitalPoint(Math.PI / 2, o)!;

  // Ángulo θ medido desde el eje polar (hacia el periapsis, a la derecha)
  const thPos = ((th % TAU) + TAU) % TAU;
  const rArc = 54;
  return (
    <Escena t={t} ini={ini} fin={fin} dIn={0.7}>
      <Lienzo>
        {/* eje polar */}
        <line x1={m.X(-9.6)} x2={m.X(3.1)} y1={m.oy} y2={m.oy} stroke={C.axis} strokeOpacity={0.45} strokeDasharray="5 8" strokeWidth={1.5} />
        {/* ejes cartesianos (solo cuando se los nombra) */}
        {cart > 0 && (
          <g opacity={cart}>
            <Flecha x1={m.X(-9.6)} y1={m.oy} x2={m.X(3.4)} y2={m.oy} color={C.blue} w={2} o={0.7} punta={11} />
            <Flecha x1={m.ox} y1={m.Y(-4.6)} x2={m.ox} y2={m.Y(4.6)} color={C.blue} w={2} o={0.7} punta={11} />
            <Rotulo x={m.X(3.4) + 16} y={m.oy + 8} color={C.blueSoft} italic size={28}>x</Rotulo>
            <Rotulo x={m.ox + 18} y={m.Y(4.6) + 4} color={C.blueSoft} italic size={28}>y</Rotulo>
            <path d={`M${bx},${by} L${bx},${m.oy} M${bx},${by} L${m.ox},${by}`} stroke={C.blueSoft} strokeWidth={1.8} strokeDasharray="5 6" fill="none" />
            <Rotulo x={bx + (b.x < -1 ? -44 : 46)} y={by - 16} color={C.blueSoft} italic size={25}>(x, y)</Rotulo>
          </g>
        )}
        <Trazo d={pathOrbita(o, m)} p={dibujo} color={C.orbit} w={3.2} brillo />
        {/* semilado recto: p = r(90°) */}
        {semilato > 0 && (
          <g opacity={semilato}>
            <line x1={m.ox} y1={m.oy} x2={m.X(pTop.x)} y2={m.Y(pTop.y)} stroke={C.blue} strokeWidth={4.5} strokeLinecap="round" />
            <circle cx={m.X(pTop.x)} cy={m.Y(pTop.y)} r={6} fill={C.blue} />
            <Rotulo x={m.ox + 26} y={(m.oy + m.Y(pTop.y)) / 2 + 8} color={C.blueSoft} italic size={36}>p</Rotulo>
          </g>
        )}
        {/* radio vector y ángulo */}
        <g opacity={polar}>
          <line x1={m.ox} y1={m.oy} x2={bx} y2={by} stroke={C.cyan} strokeWidth={2.4 + gr * 2.5} strokeOpacity={0.8} strokeDasharray="7 7" />
          <path d={pathArco(0, 0, rArc / m.s, 0, thPos, m)} fill="none" stroke={C.orange} strokeWidth={2.6} />
          <Rotulo x={m.ox + (rArc + 26) * Math.cos(thPos / 2)} y={m.oy - (rArc + 26) * Math.sin(thPos / 2) + 11} color={C.orangeSoft} italic size={38}>θ</Rotulo>
          <Rotulo x={(m.ox + bx) / 2 - 20 * Math.sin(thPos)} y={(m.oy + by) / 2 - 22 * Math.cos(thPos) + 8} color={C.cyan} italic size={40 + gr * 8}>r</Rotulo>
        </g>
        {/* fuerza central atractiva: del cuerpo hacia el foco */}
        {fuerza > 0 && (() => {
          const L = clamp(260 / (r * r), 46, 150), ux = (m.ox - bx) / (r * m.s), uy = (m.oy - by) / (r * m.s);
          return (
            <g opacity={fuerza}>
              <Flecha x1={bx + ux * 16} y1={by + uy * 16} x2={bx + ux * (16 + L)} y2={by + uy * (16 + L)} color={C.orange} w={5} punta={17} p={prog(t, c("M2.fuerza") - 0.2, 0.5, E.out)} />
              <Rotulo x={bx + ux * (L * 0.5 + 16) - uy * 30} y={by + uy * (L * 0.5 + 16) + ux * 30 + 9} color={C.orangeSoft} italic size={32}>F</Rotulo>
            </g>
          );
        })()}
        <Foco x={m.ox} y={m.oy} r={14} t={t} />
        <Rotulo x={m.ox + 14} y={m.oy + 44} color="#deb984" size={20} anchor="start" peso={500} o={0.9}>Foco</Rotulo>
        <Cuerpo x={bx} y={by} r={10} o={prog(t, ini + 0.9, 0.5)} />
      </Lienzo>

      {/* Objetivo y conceptos (M2) */}
      <Caja x={CX} y={104} p={objetivo} centro style={{ textAlign: "center", whiteSpace: "nowrap" }}>
        <Antetitulo>Objetivo</Antetitulo>
        <div style={{ fontSize: 40, fontWeight: 600, marginTop: 10, color: C.text }}>
          Trayectoria de un cuerpo bajo una <span style={{ color: C.orange }}>fuerza central atractiva</span>
        </div>
      </Caja>
      <div className="abs" style={{ left: 520, top: 176, width: 1340, display: "flex", gap: 16, justifyContent: "center", opacity: 1 - prog(t, c("M3") - 0.5, 0.5) }}>
        {chips.map((ch) => {
          const q = prog(t, c(ch.id) - 0.2, 0.5, E.outBack);
          const act = 1 - prog(t, c(ch.id) + 1.6, 0.8);
          return (
            <span key={ch.id} style={{ opacity: clamp(q * 1.4), transform: `translateY(${(1 - q) * 18}px) scale(${0.9 + 0.1 * q})` }}>
              <Chip color={ch.col} activo={act} tam={26}>
                <Tex tex={ch.sim} size={28} color={ch.col} /> {ch.txt}
              </Chip>
            </span>
          );
        })}
      </div>

      {/* Ecuación orbital (M3–M4) */}
      <Caja x={1010} y={156} p={ec > 0 ? 1 : 0} centro>
        <Tex tex={"\\hl{r}{r(\\theta)}=\\dfrac{\\hl{p}{p}}{\\hl{den}{1+\\hl{e}{e}\\cos\\theta}}"} size={86} reveal={ec} color={C.text}
          hl={{
            r: { c: gr > 0.05 ? C.cyan : undefined, glow: gr > 0.05 ? `rgba(110,223,232,${gr})` : undefined },
            p: { c: pOn > 0 ? `color-mix(in srgb, ${C.blue} ${Math.round(pOn * 100)}%, ${C.text})` : undefined, glow: gp > 0.05 ? `rgba(89,169,255,${gp})` : undefined },
            den: { glow: gden > 0.05 ? `rgba(220,230,244,${gden * 0.8})` : undefined },
            e: { c: eOn > 0 ? `color-mix(in srgb, ${C.orange} ${Math.round(eOn * 100)}%, ${C.text})` : undefined, glow: ge > 0.05 ? `rgba(255,177,102,${ge})` : undefined },
          }} />
      </Caja>
      <Caja x={1424} y={88} p={lecturas} dx={-16} dy={0}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, transform: `scale(${1 + 0.05 * gp})`, transformOrigin: "0 50%" }}>
            <Lectura etiqueta="p" valor={fmt(p)} color={C.blue} tam={31} ancho={200} />
            <span style={{ fontSize: 22, color: C.blueSoft, letterSpacing: 2.4, fontWeight: 650, opacity: prog(t, c("M4.escala") - 0.2, 0.5) }}>ESCALA</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 18, transform: `scale(${1 + 0.05 * ge})`, transformOrigin: "0 50%" }}>
            <Lectura etiqueta="e" valor={fmt(e)} color={C.orange} tam={31} ancho={200} />
            <span style={{ fontSize: 22, color: C.orangeSoft, letterSpacing: 2.4, fontWeight: 650, opacity: prog(t, c("M4.e") + 0.3, 0.5) }}>FORMA</span>
          </div>
        </div>
      </Caja>
    </Escena>
  );
}
