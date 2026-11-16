// ESCENAS 6 y 7 — Cambio de presentador y segunda ley de Kepler (áreas iguales en tiempos iguales).
import { E, clamp, fmt, inOut, lerp, prog, pulse } from "../core/anim";
import { TAU, camaraWeb, deg, orbitalPoint, pathOrbita, pathSector, rad, radius, trueAnomaly } from "../core/orbit";
import { C, FONT, MONO } from "../core/theme";
import { cue } from "../core/tl";
import { T } from "../tiempos";
import { AppWindow, type AppAPI, type Recorte, type Toma } from "../components/AppWindow";
import { Cuerpo, Foco, Lienzo, Rotulo, Trazo } from "../components/Plano";
import { Tex } from "../components/Tex";
import { Antetitulo, Caja, Tarjeta } from "../components/ui";
import { Escena } from "./comun";
import { A1_FIN, A1_INI, A2_FIN, A2_INI, AREA1, AREA2, KO, mapaKepler, mediaDeVerdadera } from "./kepler-geo";

const M1a = mediaDeVerdadera(A1_INI, KO.e), M1b = mediaDeVerdadera(A1_FIN, KO.e);
const M2a = mediaDeVerdadera(A2_INI, KO.e), M2b = mediaDeVerdadera(A2_FIN, KO.e);
/** Ángulo verdadero cuando ha transcurrido la fracción u del intervalo de tiempo (movimiento kepleriano). */
const angulo = (Ma: number, Mb: number, u: number, ref: number) => {
  let th = trueAnomaly(lerp(Ma, Mb, u), KO.e);
  while (th - ref > Math.PI) th -= TAU;
  while (th - ref < -Math.PI) th += TAU;
  return th;
};

type ClaveRecorte = { t: number; r: Recorte; dur?: number };
function recorteEn(t: number, claves: ClaveRecorte[]): Recorte {
  let r = claves[0].r;
  for (const k of claves) {
    if (t < k.t) break;
    const u = E.inOut(clamp((t - k.t) / (k.dur ?? 1)));
    r = { x: lerp(r.x, k.r.x, u), y: lerp(r.y, k.r.y, u), w: lerp(r.w, k.r.w, u), h: lerp(r.h, k.r.h, u) };
  }
  return r;
}

function Propia({ t }: { t: number }) {
  const c = (id: string) => cue(id);
  const a = 1 - prog(t, T.keplerApp - 0.1, 0.6);
  if (a <= 0) return null;
  const m = mapaKepler(t);
  // 1) Los sectores heredados de la escena anterior se apagan; 2) el radio vector barre el sector azul;
  // 3) con la segunda ley, ambos sectores se barren a la vez, en el mismo tiempo.
  const heredado = 1 - prog(t, c("F1") + 0.2, 0.7);
  const tB1 = c("F1.area") - 0.1, dB1 = clamp(c("F1.fin") - tB1 + 0.3, 1.6, 3.4);
  const u1 = prog(t, tB1, dB1, E.lin);
  const tB2 = c("F3.ley") + 0.1, dB2 = clamp(c("F3.iguales") - tB2 - 0.1, 1.8, 3.6);
  const reinicio = prog(t, tB2 - 0.5, 0.4);
  const u2 = prog(t, tB2, dB2, E.lin);
  const azulU = reinicio > 0 ? u2 : u1;
  const azulO = reinicio > 0 && u2 <= 0 ? 0 : 1;
  const thA = angulo(M1a, M1b, azulU, 0);
  const thN = angulo(M2a, M2b, u2, Math.PI);
  const pA = orbitalPoint(thA, KO)!, pN = orbitalPoint(thN, KO)!;
  const iguales = prog(t, c("F3.iguales") - 0.2, 0.6, E.out);
  const gIg = pulse(t, c("F3.iguales") - 0.1, 2.4);
  // Rebanada ½ r² dθ
  const reb = inOut(t, c("F2.medio") - 0.2, c("F3") - 0.2, 0.5, 0.5);
  const thR = lerp(rad(-26), rad(26), prog(t, c("F2.dtheta") - 0.2, Math.max(1.2, c("F2.fin") - c("F2.dtheta") + 0.6), E.inOut));
  const dR = rad(5);
  const cx = m.ox - KO.p * KO.e / (1 - KO.e * KO.e) * m.s; // centro geométrico de la elipse
  const formula = prog(t, c("F2.int") - 0.3, 1.0, E.out);
  const gM = pulse(t, c("F2.medio") - 0.1, 1.6), gD = pulse(t, c("F2.dtheta") - 0.1, 1.6);
  const ley = prog(t, c("F3.ley") - 0.3, 0.6, E.out);
  const tarjeta = inOut(t, c("F1") - 0.5, c("F1.area") + 1.3, 0.6, 0.5);
  const chip = inOut(t, c("F1.jac") - 0.3, c("F2.int") - 0.4, 0.5, 0.4);
  return (
    <div className="full" style={{ opacity: a }}>
      <Lienzo>
        <line x1={m.X(-8.9)} x2={m.X(2.1)} y1={m.oy} y2={m.oy} stroke={C.axis} strokeOpacity={0.4} strokeDasharray="5 8" strokeWidth={1.5} />
        <Trazo d={pathOrbita(KO, m)} color={C.orbit} w={3.2} brillo />
        {heredado > 0 && (
          <g opacity={heredado}>
            <path d={pathSector(KO, A1_INI, A1_FIN, m)} fill={C.blue} fillOpacity={0.22} stroke={C.blue} strokeWidth={2.4} />
            <path d={pathSector(KO, A2_INI, A2_FIN, m)} fill={C.orange} fillOpacity={0.3} stroke={C.orange} strokeWidth={2.4} />
          </g>
        )}
        {azulU > 0 && azulO > 0 && <path d={pathSector(KO, A1_INI, thA, m)} fill={C.blue} fillOpacity={0.24 + 0.14 * gIg} stroke={C.blue} strokeWidth={2.6} />}
        {u2 > 0 && <path d={pathSector(KO, A2_INI, thN, m)} fill={C.orange} fillOpacity={0.32 + 0.14 * gIg} stroke={C.orange} strokeWidth={2.6} />}
        {/* rebanada ½ r² dθ */}
        {reb > 0 && (
          <g opacity={reb}>
            <path d={pathSector(KO, thR - dR / 2, thR + dR / 2, m, 6)} fill="#fff" fillOpacity={0.5} stroke="#fff" strokeWidth={2} />
            <line x1={m.X(1.95 * Math.cos(thR))} y1={m.Y(1.95 * Math.sin(thR))} x2={m.X(2.75)} y2={m.Y(1.75)} stroke="#fff" strokeOpacity={0.6} strokeWidth={1.5} />
          </g>
        )}
        {/* radios vectores y cuerpos */}
        {azulU > 0 && azulU < 1 && azulO > 0 && <line x1={m.ox} y1={m.oy} x2={m.X(pA.x)} y2={m.Y(pA.y)} stroke={C.blueSoft} strokeWidth={3} />}
        {u2 > 0 && u2 < 1 && <line x1={m.ox} y1={m.oy} x2={m.X(pN.x)} y2={m.Y(pN.y)} stroke={C.orangeSoft} strokeWidth={3} />}
        <Foco x={m.ox} y={m.oy} r={13} t={t} />
        <Rotulo x={m.ox + 6} y={m.oy + 50} color="#deb984" size={21} anchor="start" peso={500} o={0.9}>Foco</Rotulo>
        {azulU > 0 && azulO > 0 && <Cuerpo x={m.X(pA.x)} y={m.Y(pA.y)} r={9} o={azulU < 1 ? 1 : 0.55} />}
        {u2 > 0 && <Cuerpo x={m.X(pN.x)} y={m.Y(pN.y)} r={9} o={u2 < 1 ? 1 : 0.55} />}
        {/* reloj: el mismo intervalo de tiempo para los dos sectores */}
        {ley > 0 && (
          <g opacity={ley} transform={`translate(${cx - 40},${m.oy + 8})`}>
            <circle r={50} fill="rgba(8,15,29,.6)" stroke={C.border2} strokeWidth={5} />
            <circle r={50} fill="none" stroke={C.cyan} strokeWidth={6} strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - u2} transform="rotate(-90)" />
            <text textAnchor="middle" y={13} fontSize={38} fill="#fff" fontFamily="KaTeX_Math, serif" fontStyle="italic">Δt</text>
            <text textAnchor="middle" y={92} fontSize={24} fill={C.muted} fontWeight={600}>mismo tiempo</text>
          </g>
        )}
        <Rotulo x={m.X(2.8)} y={m.Y(1.75) - 8} color="#fff" size={28} anchor="start" o={reb}>½ r² dθ</Rotulo>
      </Lienzo>

      {/* ESCENA 6: presentación de Feli */}
      <Caja x={1430} y={92} w={440} p={tarjeta} dx={30} dy={0}>
        <Tarjeta borde={`${C.orange}88`} style={{ padding: "18px 24px", borderLeft: `6px solid ${C.orange}` }}>
          <div style={{ fontSize: 31, fontWeight: 750, letterSpacing: 2.6, color: "#fff", whiteSpace: "nowrap" }}>FELIPE DE ORTÚZAR</div>
          <div style={{ fontSize: 22.5, color: C.orangeSoft, marginTop: 6, fontWeight: 550, lineHeight: 1.25 }}>Áreas barridas y potencial gravitatorio</div>
        </Tarjeta>
      </Caja>
      <Caja x={346} y={112} p={chip} dy={12}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 16, padding: "12px 22px", borderRadius: 14, background: "rgba(11,19,34,.9)", border: `1.5px solid ${C.border2}`, fontFamily: FONT, fontSize: 23, color: C.muted, fontWeight: 600, letterSpacing: 1 }}>
          DEL JACOBIANO <Tex tex={"dA=\\hl{r}{r}\\,dr\\,d\\theta"} size={34} color={C.text} hl={{ r: { c: C.cyan } }} />
        </div>
      </Caja>
      <Caja x={346} y={92} p={formula > 0 ? 1 : 0} dy={0}>
        <Tex tex={"A=\\hl{m}{\\dfrac{1}{2}}\\displaystyle\\int_{\\theta_1}^{\\theta_2}\\hl{m}{r(\\theta)^2}\\,\\hl{d}{d\\theta}"} size={62} color={C.text} reveal={formula}
          hl={{ m: { glow: gM > 0.05 ? `rgba(255,255,255,${gM})` : undefined, c: gM > 0.05 ? "#fff" : undefined }, d: { glow: gD > 0.05 ? `rgba(165,154,231,${gD})` : undefined, c: gD > 0.05 ? C.violetSoft : undefined } }} />
      </Caja>
      <Caja x={920} y={98} p={ley} dy={14}>
        <Antetitulo color={C.orange} tam={19}>Segunda ley de Kepler</Antetitulo>
        <div style={{ marginTop: 10, fontFamily: FONT, fontSize: 43, fontWeight: 800, letterSpacing: 1.5, lineHeight: 1.12, color: "#fff", opacity: 0.3 + 0.7 * iguales, textShadow: `0 0 ${34 * gIg}px rgba(110,223,232,${0.8 * gIg})`, whiteSpace: "nowrap" }}>
          <span style={{ color: C.cyan }}>ÁREAS IGUALES</span><br />EN TIEMPOS IGUALES
        </div>
      </Caja>
      {/* valores calculados con las mismas funciones que usa la web */}
      <Caja x={m.X(2.05)} y={m.Y(-1.35)} p={iguales} dy={10}>
        <span style={{ fontFamily: MONO, fontSize: 27, color: C.blueSoft, fontWeight: 600, whiteSpace: "nowrap" }}>A₁ = {fmt(AREA1, 6)} u²</span>
      </Caja>
      <Caja x={m.X(-8.75)} y={m.Y(3.55)} p={iguales} dy={10}>
        <span style={{ fontFamily: MONO, fontSize: 27, color: C.orangeSoft, fontWeight: 600, whiteSpace: "nowrap" }}>A₂ = {fmt(AREA2, 6)} u²</span>
      </Caja>
    </div>
  );
}

const R_TABS: Recorte = { x: 49, y: 262, w: 1342, h: 762 };
const R_PLOT: Recorte = { x: 150, y: 470, w: 900, h: 511 };
const R_TODO: Recorte = { x: 49, y: 512, w: 1342, h: 762 };

function Web({ t, fin }: { t: number; fin: number }) {
  const c = (id: string) => cue(id);
  const win = prog(t, T.keplerApp + 0.1, 0.7, E.out);
  if (win <= 0) return null;
  const tP = c("F4.pag"), D1 = Math.max(2.6, c("F4.amp") - tP);
  const toma: Toma = {
    id: "kepler", inicio: T.keplerApp, fin,
    acciones: [
      { en: tP + Math.max(0.3, 0.08 * D1), tipo: "tab", tab: "Segunda ley de Kepler" },
      { en: tP + 0.26 * D1, tipo: "slider", label: "Excentricidad de la elipse", a: 0.35, dur: 0.2 * D1 },
      { en: tP + 0.5 * D1, tipo: "slider", label: "Excentricidad de la elipse", a: 0.65, dur: 0.2 * D1 },
    ],
  };
  const recorte = recorteEn(t, [
    { t: 0, r: R_TABS },
    { t: tP + 0.74 * D1, r: R_PLOT, dur: Math.min(1.1, 0.26 * D1 + 0.2) },
    { t: c("F4.areas") - 0.5, r: R_TODO, dur: 1.0 },
    { t: c("F4.radio") - 0.2, r: R_PLOT, dur: 1.0 },
  ]);
  const rect = { x: 40 - (1 - win) * 80, y: 64, w: 1480, h: 886 };
  const cam = camaraWeb(KO);
  const arcos = inOut(t, c("F4.amp") - 0.15, c("F4.radio") - 0.3, 0.5, 0.5);
  const tarj = inOut(t, c("F4.areas") - 0.1, c("F4.radio") - 0.2, 0.5, 0.4);
  const radios = prog(t, c("F4.radio") + 0.2, 0.6, E.out);
  const gMay = pulse(t, c("F4.mayor") - 0.1, 2.0), gMen = pulse(t, c("F4.menor") - 0.1, 2.0);
  return (
    <AppWindow t={t} toma={toma} rect={rect} recorte={recorte} opacidad={win}
      leer={{ a1: '[data-testid="blue-area"]', a2: '[data-testid="orange-area"]', err: '[data-testid="area-error"]', d2: '[data-testid="orange-angle"]', d1: 'input[aria-label="Amplitud del sector azul"]', e: 'input[aria-label="Excentricidad de la elipse"]' }}
      medir={[".equations-section"]}>
      {(api: AppAPI) => {
        const P = (x: number, y: number) => api.plotAEscena(cam.X(x), cam.Y(y));
        if (!P(0, 0)) return null;
        const arco = (r: number, a0: number, a1: number) => {
          const pts: string[] = [];
          for (let i = 0; i <= 40; i++) { const u = a0 + ((a1 - a0) * i) / 40; const q = P(r * Math.cos(u), r * Math.sin(u))!; pts.push(`${i ? "L" : "M"}${q.x.toFixed(1)},${q.y.toFixed(1)}`); }
          return pts.join(" ");
        };
        const v = api.metricas.textos;
        const F = P(0, 0)!;
        const lA = P(1.35 * Math.cos(rad(52)), 1.35 * Math.sin(rad(52)))!;
        const lN = P(3.4 * Math.cos((A2_INI + A2_FIN) / 2 + 0.2), 3.4 * Math.sin((A2_INI + A2_FIN) / 2 + 0.2))!;
        const peri = P(radius(0, KO.p, KO.e), 0)!;
        const thApo = (A2_INI + A2_FIN) / 2, rApo = radius(thApo, KO.p, KO.e);
        const apo = P(rApo * Math.cos(thApo), rApo * Math.sin(thApo))!;
        const eq = api.metricas.rects[".equations-section"];
        const eqP = eq ? api.aEscena(eq.x, eq.y) : null;
        const enE065 = Math.abs(Number(v.e ?? 0.65) - 0.65) < 0.005;
        return (
          <>
            <Lienzo style={{ opacity: win }}>
              {arcos > 0 && enE065 && (
                <g opacity={arcos}>
                  <path d={arco(0.95, A1_INI, A1_FIN)} fill="none" stroke={C.blue} strokeWidth={5} strokeLinecap="round" />
                  <path d={arco(2.7, A2_INI, A2_FIN)} fill="none" stroke={C.orange} strokeWidth={6} strokeLinecap="round" />
                  <line x1={P(2.7 * Math.cos(thApo), 2.7 * Math.sin(thApo))!.x} y1={P(2.7 * Math.cos(thApo), 2.7 * Math.sin(thApo))!.y} x2={lN.x} y2={lN.y + 14} stroke={C.orange} strokeWidth={2} strokeOpacity={0.8} />
                </g>
              )}
              {radios > 0 && (
                <g opacity={radios}>
                  <line x1={F.x} y1={F.y} x2={apo.x} y2={apo.y} stroke={C.orange} strokeWidth={4 + 4 * gMay} strokeLinecap="round" />
                  <line x1={F.x} y1={F.y} x2={peri.x} y2={peri.y} stroke={C.blueSoft} strokeWidth={4 + 4 * gMen} strokeLinecap="round" />
                  <circle cx={apo.x} cy={apo.y} r={8} fill={C.orange} />
                  <circle cx={peri.x} cy={peri.y} r={8} fill={C.blueSoft} />
                </g>
              )}
            </Lienzo>
            {arcos > 0 && enE065 && (
              <>
                <div className="abs" style={{ left: lA.x + 8, top: lA.y - 54, opacity: arcos * win, fontFamily: MONO, fontSize: 31, fontWeight: 700, color: "#fff", padding: "7px 16px", borderRadius: 12, background: "rgba(8,15,29,.92)", border: `2px solid ${C.blue}`, whiteSpace: "nowrap" }}>
                  Δθ₁ = {fmt(Number(v.d1 ?? 70), 0)}°
                </div>
                <div className="abs" style={{ left: lN.x - 20, top: lN.y - 40, transform: "translate(-100%,0)", opacity: arcos * win, fontFamily: MONO, fontSize: 31, fontWeight: 700, color: "#fff", padding: "7px 16px", borderRadius: 12, background: "rgba(8,15,29,.92)", border: `2px solid ${C.orange}`, whiteSpace: "nowrap" }}>
                  Δθ₂ = {v.d2 ?? ""}
                </div>
              </>
            )}
            {tarj > 0 && eqP && eq && (
              <>
                <div className="abs" style={{ left: eqP.x, top: eqP.y, width: eq.w * api.escala, height: eq.h * api.escala, border: `3px solid ${C.cyan}`, borderRadius: 14, opacity: tarj * win, boxShadow: "0 0 40px rgba(110,223,232,.45)" }} />
                <Caja x={eqP.x + (eq.w * api.escala) / 2} y={eqP.y - 60} p={tarj * win} centro dy={16}>
                  <div style={{ display: "flex", alignItems: "center", gap: 22, padding: "16px 30px", borderRadius: 18, background: "rgba(8,15,29,.96)", border: `2px solid ${C.cyan}`, fontFamily: MONO, fontSize: 38, fontWeight: 700, whiteSpace: "nowrap", boxShadow: "0 16px 50px rgba(0,0,0,.6)" }}>
                    <span style={{ color: C.blueSoft }}>A₁ = {v.a1}</span>
                    <span style={{ color: "#fff", fontFamily: FONT }}>=</span>
                    <span style={{ color: C.orangeSoft }}>A₂ = {v.a2}</span>
                    <span style={{ color: C.green, fontSize: 27, fontWeight: 600, borderLeft: `2px solid ${C.border2}`, paddingLeft: 22 }}>diferencia {v.err}</span>
                  </div>
                </Caja>
              </>
            )}
            {radios > 0 && (
              <>
                <div className="abs" style={{ left: apo.x + 30, top: apo.y - 74, opacity: radios * win, fontFamily: FONT, fontSize: 29, fontWeight: 700, color: "#fff", padding: "9px 18px", borderRadius: 12, background: "rgba(8,15,29,.92)", border: `2px solid ${C.orange}`, whiteSpace: "nowrap", boxShadow: `0 0 ${30 * gMay}px rgba(255,177,102,${0.7 * gMay})` }}>
                  radio mayor <span style={{ color: C.orangeSoft, fontWeight: 600 }}>→ ángulo menor</span>
                </div>
                <div className="abs" style={{ left: peri.x - 4, top: peri.y + 86, transform: "translate(-62%,0)", opacity: radios * win, fontFamily: FONT, fontSize: 29, fontWeight: 700, color: "#fff", padding: "9px 18px", borderRadius: 12, background: "rgba(8,15,29,.92)", border: `2px solid ${C.blue}`, whiteSpace: "nowrap", boxShadow: `0 0 ${30 * gMen}px rgba(89,169,255,${0.7 * gMen})` }}>
                  radio menor <span style={{ color: C.blueSoft, fontWeight: 600 }}>→ ángulo mayor</span>
                </div>
              </>
            )}
          </>
        );
      }}
    </AppWindow>
  );
}

export function Kepler({ t, ini, fin }: { t: number; ini: number; fin: number }) {
  void deg;
  return (
    <Escena t={t} ini={ini} fin={fin} zoom={false} dIn={0.5}>
      <Propia t={t} />
      <Web t={t} fin={fin} />
    </Escena>
  );
}
