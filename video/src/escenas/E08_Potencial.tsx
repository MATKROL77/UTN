// ESCENAS 8 y 9 — Potencial gravitatorio, gradiente y campo; luego la web real (curvas de nivel, flechas, evaluación).
import { E, clamp, fmt, inOut, lerp, prog, pulse } from "../core/anim";
import { DEFAULT_ORBIT, camaraWeb, mapa, potential, rad } from "../core/orbit";
import { C, FONT, MONO } from "../core/theme";
import { cue } from "../core/tl";
import { T } from "../tiempos";
import { AppWindow, empujar, recorteEn, type AppAPI, type Recorte, type Toma } from "../components/AppWindow";
import { Flecha, Foco, Lienzo, Rotulo } from "../components/Plano";
import { Tex } from "../components/Tex";
import { Antetitulo, Caja, Chip } from "../components/ui";
import { Escena } from "./comun";

const NIVELES = [0.75, 1.5, 2.5, 4]; // los mismos radios que dibuja la web
const ANILLOS = [0.9, 1.5, 2.3, 3.3];

function Propia({ t, ini }: { t: number; ini: number }) {
  const c = (id: string) => cue(id);
  const a = 1 - prog(t, T.campoApp - 0.1, 0.6);
  if (a <= 0) return null;
  const m = mapa(760, 576, 78);
  const curvas = (i: number) => prog(t, Math.min(c("F5.pot") - 0.3, ini + 0.9) + i * 0.22, 0.9, E.out);
  const formula = prog(t, c("F5.mu") - 0.35, 1.0, E.out);
  const gMu = pulse(t, c("F5.mu") - 0.1, 1.4), gD = pulse(t, c("F5.dist") - 0.1, 2.2);
  const dist = inOut(t, c("F5.dist") - 0.2, c("F6.grad") - 0.3, 0.6, 0.5);
  const P = { x: 2.25, y: 1.45 };
  const px = m.X(P.x), py = m.Y(P.y);
  // Gradiente (hacia afuera) y campo −∇U (hacia el foco)
  const grad = prog(t, c("F6.grad") - 0.25, 0.7, E.out);
  const giro = prog(t, c("F6.neg") - 0.1, Math.min(1.1, Math.max(0.6, c("F6.campo") - c("F6.neg"))), E.inOut); // 0 = ∇U, 1 = −∇U
  const campo = prog(t, c("F6.campo") - 0.2, 0.6, E.out);
  const parciales = inOut(t, c("F6.deriv") - 0.25, c("F6.neg") - 0.3, 0.6, 0.4);
  const fCampo = prog(t, c("F6.neg") - 0.2, 0.9, E.out);
  const flechas: { x: number; y: number; ang: number; R: number }[] = [];
  ANILLOS.forEach((R, i) => { for (let k = 0; k < 12; k++) { const ang = rad(k * 30 + (i % 2) * 15); flechas.push({ x: R * Math.cos(ang), y: R * Math.sin(ang), ang, R }); } });
  const colF = giro < 0.5 ? C.violetSoft : "#dcecff";
  return (
    <div className="full" style={{ opacity: a }}>
      <Lienzo>
        {/* ondas suaves que salen del cuerpo central */}
        {[0, 1, 2].map((k) => { const u = ((t - ini) * 0.22 + k / 3) % 1; return <circle key={k} cx={m.ox} cy={m.oy} r={40 + u * 330} fill="none" stroke={C.cyan} strokeWidth={1.2} opacity={0.14 * (1 - u) * curvas(0)} />; })}
        {NIVELES.map((R, i) => (
          <g key={R} opacity={curvas(i)}>
            <circle cx={m.ox} cy={m.oy} r={R * m.s * (0.86 + 0.14 * curvas(i))} fill="none" stroke="#46c4df" strokeWidth={2.2} opacity={0.85 - i * 0.12} />
            <Rotulo x={m.ox - R * m.s * 0.766 - 8} y={m.oy - R * m.s * 0.643 - 6} color="#7dd3df" size={21} anchor="end" mono peso={500}>U = {fmt(-1 / R)}</Rotulo>
          </g>
        ))}
        {/* distancia al foco */}
        {dist > 0 && (
          <g opacity={dist}>
            <path d={`M${px},${py} L${px},${m.oy} L${m.ox},${m.oy}`} fill="none" stroke={C.muted} strokeWidth={2} strokeDasharray="6 6" />
            <line x1={m.ox} y1={m.oy} x2={m.ox + (px - m.ox) * prog(t, c("F5.dist") - 0.2, 0.7, E.out)} y2={m.oy + (py - m.oy) * prog(t, c("F5.dist") - 0.2, 0.7, E.out)} stroke={C.orange} strokeWidth={4 + gD * 3} strokeLinecap="round" />
            <circle cx={px} cy={py} r={9} fill="#fff" />
            <Rotulo x={px + 16} y={py - 14} color="#fff" italic size={28} anchor="start">P (x, y)</Rotulo>
            <Rotulo x={px + 30} y={py + 34} color={C.orangeSoft} size={25} anchor="start">R = distancia al foco</Rotulo>
            <Rotulo x={(m.ox + px) / 2 - 20} y={(m.oy + py) / 2 - 20} color={C.orangeSoft} italic size={32}>R</Rotulo>
            <Rotulo x={(m.ox + px) / 2} y={m.oy + 34} color={C.muted} italic size={25}>x</Rotulo>
            <Rotulo x={px + 20} y={(m.oy + py) / 2 + 8} color={C.muted} italic size={25}>y</Rotulo>
          </g>
        )}
        {/* flechas: su longitud es proporcional a la intensidad μ/R² */}
        {grad > 0 && flechas.map((f, i) => {
          const L = Math.max(7, 62 / (f.R * f.R)) * grad;
          const dir = lerp(1, -1, giro); // +1 hacia afuera (∇U), −1 hacia el foco (−∇U)
          const cxp = m.X(f.x), cyp = m.Y(f.y);
          const fluye = campo > 0 ? ((t * 0.9 + i * 0.13) % 1) * 10 * campo : 0;
          const ux = Math.cos(f.ang), uy = -Math.sin(f.ang);
          const x0 = cxp - ux * (L / 2) * Math.sign(dir || 1) - ux * fluye, y0 = cyp - uy * (L / 2) * Math.sign(dir || 1) - uy * fluye;
          return <Flecha key={i} x1={x0} y1={y0} x2={x0 + ux * L * dir} y2={y0 + uy * L * dir} color={colF} w={2.6} punta={Math.min(10, 4 + L * 0.25)} o={0.92} />;
        })}
        <Foco x={m.ox} y={m.oy} r={16 * prog(t, ini + 0.2, 0.8, E.outBack)} t={t} halo={1.2} />
      </Lienzo>

      <Caja x={346} y={96} p={prog(t, ini + 0.4, 0.6, E.out)} dy={10}><Antetitulo color={C.orange} tam={19}>Potencial gravitatorio</Antetitulo></Caja>
      <Caja x={346} y={130} p={formula > 0 ? 1 : 0} dy={0}>
        <Tex tex={"U(x,y)=-\\dfrac{\\hl{mu}{\\mu}}{\\hl{d}{\\sqrt{x^2+y^2}}}"} size={54} color={C.text} reveal={formula}
          hl={{ mu: { c: gMu > 0.05 ? C.cyan : undefined, glow: gMu > 0.05 ? `rgba(110,223,232,${gMu})` : undefined }, d: { c: gD > 0.05 || dist > 0.5 ? C.orange : undefined, glow: gD > 0.05 ? `rgba(255,177,102,${gD})` : undefined } }} />
      </Caja>
      {/* derivadas parciales → gradiente → campo */}
      <Caja x={990} y={86} p={parciales} dy={12}>
        <Antetitulo color={C.violetSoft} tam={19}>Derivadas parciales</Antetitulo>
        <div style={{ marginTop: 10 }}><Tex tex={"\\dfrac{\\partial U}{\\partial x}=\\dfrac{\\mu\\,x}{(x^2+y^2)^{3/2}}\\qquad\\dfrac{\\partial U}{\\partial y}=\\dfrac{\\mu\\,y}{(x^2+y^2)^{3/2}}"} size={34} color={C.text} reveal={prog(t, c("F6.deriv") - 0.25, 1.1, E.out)} /></div>
        <div style={{ marginTop: 14, opacity: prog(t, c("F6.grad") - 0.2, 0.5) }}>
          <Tex tex={"\\hl{g}{\\nabla U}=\\left(\\dfrac{\\partial U}{\\partial x},\\ \\dfrac{\\partial U}{\\partial y}\\right)"} size={36} color={C.text} hl={{ g: { c: C.violetSoft } }} />
        </div>
      </Caja>
      <Caja x={990} y={86} p={fCampo} dy={12}>
        <Antetitulo color={C.cyan} tam={19}>Campo gravitatorio</Antetitulo>
        <div style={{ marginTop: 12 }}><Tex tex={"-\\nabla U=-\\dfrac{\\mu\\,(x,\\,y)}{(x^2+y^2)^{3/2}}"} size={52} color="#fff" reveal={fCampo} /></div>
      </Caja>
      <Caja x={990} y={236} p={campo} dy={12}>
        <Chip color={C.cyan} tam={24} activo={1}>Apunta al centro de atracción</Chip>
      </Caja>
      <Caja x={346} y={890} p={grad} dy={12}>
        <span style={{ fontFamily: FONT, fontSize: 22, color: C.muted }}>largo de cada flecha ∝ intensidad μ/R²</span>
      </Caja>
      <div className="abs" style={{ left: 940, top: 96, width: 2, height: 120, background: C.border2, opacity: Math.max(parciales, fCampo) }} />
    </div>
  );
}

const R_TABS: Recorte = { x: 49, y: 262, w: 1342, h: 762 };
const R_POT: Recorte = { x: 49, y: 356, w: 1342, h: 762 };
const R_SONDA: Recorte = { x: 380, y: 412, w: 1012, h: 574 };
// La web convierte cada clic (en píxeles enteros) a coordenadas del plano. Para que los puntos de prueba caigan
// casi exactamente en R = 1; 2,5 y 5 se elige, cerca de 18°, el píxel cuyo radio resultante es el más próximo.
const CAM = camaraWeb(DEFAULT_ORBIT);
const CTM_NOMINAL = { a: 1.087719298245614, e: 80.5263157894737, f: 411.59375 };
type CTM = { a: number; e: number; f: number };
/** Punto que la web evalúa realmente al hacer clic apuntando a (x, y). */
function puntoReal(x: number, y: number, m: CTM, centro = 0) {
  const px = Math.floor(m.a * CAM.X(x) + m.e) + centro, py = Math.floor(m.a * CAM.Y(y) + m.f) + centro;
  return { x: CAM.cx + ((px - m.e) / m.a - CAM.W / 2) / CAM.scale, y: CAM.cy - ((py - m.f) / m.a - CAM.H / 2) / CAM.scale };
}
const SONDAS = [1, 2.5, 5].map((R) => {
  let mejor = { x: R, y: 0 }, err = Infinity;
  for (let g = 12; g <= 26; g += 0.02) {
    const q = puntoReal(R * Math.cos(rad(g)), R * Math.sin(rad(g)), CTM_NOMINAL);
    const e = Math.abs(Math.hypot(q.x, q.y) - R);
    if (e < err) { err = e; mejor = puntoReal(R * Math.cos(rad(g)), R * Math.sin(rad(g)), CTM_NOMINAL, 0.3); }
  }
  return { R, ...mejor };
});

function Web({ t, fin }: { t: number; fin: number }) {
  const c = (id: string) => cue(id);
  const win = prog(t, T.campoApp + 0.1, 0.7, E.out);
  if (win <= 0) return null;
  const cam = CAM;
  const tP = c("F7.pag");
  const tAmbas = c("F7.flechas") + 0.62 * (c("F7.fin") - c("F7.flechas"));
  const tS = [c("F8.lejos") + 0.1, (c("F8.lejos") + c("F8.cero")) / 2 + 0.3, c("F8.cero") + 0.45];
  const toma: Toma = {
    id: "campo", inicio: T.campoApp, fin,
    acciones: [
      { en: tP + 0.35, tipo: "tab", tab: "Potencial gravitatorio" },
      { en: c("F7.nivel") - 0.15, tipo: "switch", texto: "Flechas del campo" },
      { en: c("F7.flechas") - 0.25, tipo: "switch", texto: "Flechas del campo" },
      { en: c("F7.flechas") + 0.25, tipo: "switch", texto: "Curvas de nivel" },
      { en: tAmbas, tipo: "switch", texto: "Curvas de nivel" },
      ...SONDAS.map((s, i) => ({ en: tS[i], tipo: "probe" as const, x: s.x, y: s.y, cam })),
      { en: c("F8.foco") + 0.25, tipo: "boton", texto: "Evaluar en el foco" },
    ],
  };
  const recorte = recorteEn(t, [
    { t: 0, r: R_TABS },
    { t: tP + 0.9, r: R_POT, dur: 0.9 },
    { t: c("F8") - 0.2, r: R_SONDA, dur: 1.0 },
  ]);
  const rect = { x: 40 - (1 - win) * 80, y: 78, w: 1480, h: 878 };
  const nivel = inOut(t, c("F7.nivel") + 0.1, c("F7.flechas") - 0.3, 0.5, 0.4);
  const flech = inOut(t, c("F7.flechas") + 0.3, tAmbas - 0.1, 0.5, 0.4);
  const perp = inOut(t, tAmbas + 0.2, c("F8") - 0.2, 0.5, 0.4);
  const inten = prog(t, c("F8.int") - 0.2, 0.6, E.out) * (1 - prog(t, c("F8.foco") - 0.3, 0.4));
  const foco = prog(t, c("F8.foco") + 0.3, 0.5, E.out);
  return (
    <AppWindow t={t} toma={toma} rect={rect} recorte={empujar(recorte, 1 + 0.03 * prog(t, T.campoApp, fin - T.campoApp, E.lin))} opacidad={win} leer={{ u: ".probe-card strong" }} medir={[".probe-card"]}>
      {(api: AppAPI) => {
        const P = (x: number, y: number) => api.plotAEscena(cam.X(x), cam.Y(y));
        const F = P(0, 0);
        if (!F) return null;
        const esc = cam.scale * (api.metricas.plot?.a ?? 1) * api.escala; // píxeles de pantalla por unidad
        const a135 = rad(135), q = P(2.5 * Math.cos(a135), 2.5 * Math.sin(a135))!;
        const tx = -Math.sin(a135), ty = -Math.cos(a135); // tangente en pantalla (y hacia abajo)
        const nx = -Math.cos(a135), ny = Math.sin(a135); // hacia el foco, en pantalla
        const tarj = api.metricas.rects[".probe-card"];
        const tp = tarj ? api.aEscena(tarj.x, tarj.y) : null;
        return (
          <>
            <Lienzo style={{ opacity: win }}>
              {nivel > 0 && <circle cx={F.x} cy={F.y} r={2.5 * esc} fill="none" stroke={C.cyan} strokeWidth={5} opacity={nivel * (0.55 + 0.45 * Math.sin(t * 5))} />}
              {flech > 0 && [0, 1, 2].map((k) => { const u = (t * 0.7 + k / 3) % 1; return <circle key={k} cx={F.x} cy={F.y} r={(1 - u) * 5.2 * esc + 14} fill="none" stroke={C.orange} strokeWidth={3} opacity={flech * 0.55 * Math.sin(Math.PI * u)} />; })}
              {perp > 0 && (
                <g opacity={perp}>
                  <line x1={q.x - tx * 86} y1={q.y - ty * 86} x2={q.x + tx * 86} y2={q.y + ty * 86} stroke={C.cyan} strokeWidth={5} strokeLinecap="round" />
                  <Flecha x1={q.x} y1={q.y} x2={q.x + nx * 100} y2={q.y + ny * 100} color="#fff" w={5} punta={16} />
                  <path d={`M${q.x + tx * 22},${q.y + ty * 22} l${nx * 22},${ny * 22} l${-tx * 22},${-ty * 22}`} fill="none" stroke="#fff" strokeWidth={3} />
                </g>
              )}
              {SONDAS.map((s, i) => {
                const ap = prog(t, tS[i] + 0.05, 0.4, E.out) * (1 - foco);
                if (ap <= 0) return null;
                const p = P(s.x, s.y)!;
                const L = Math.max(7, 104 / (s.R * s.R)) * inten;
                const ux = (F.x - p.x) / Math.hypot(F.x - p.x, F.y - p.y), uy = (F.y - p.y) / Math.hypot(F.x - p.x, F.y - p.y);
                return (
                  <g key={i} opacity={ap}>
                    <circle cx={p.x} cy={p.y} r={10} fill="#fff" stroke={C.bg} strokeWidth={3} />
                    {inten > 0 && <Flecha x1={p.x + ux * 14} y1={p.y + uy * 14} x2={p.x + ux * (14 + L)} y2={p.y + uy * (14 + L)} color={C.orange} w={6} punta={Math.min(17, 6 + L * 0.3)} />}
                  </g>
                );
              })}
              {foco > 0 && <circle cx={F.x} cy={F.y} r={30 + 8 * Math.sin(t * 6)} fill="none" stroke="#ff8a7a" strokeWidth={5} opacity={foco} />}
            </Lienzo>
            <Caja x={F.x + 2.5 * esc * 0.72 + 12} y={F.y - 2.5 * esc * 0.72 - 66} p={nivel * win} dy={10}>
              <span style={{ fontFamily: FONT, fontSize: 30, fontWeight: 700, color: "#fff", padding: "9px 18px", borderRadius: 12, background: "rgba(8,15,29,.94)", border: `2px solid ${C.cyan}`, whiteSpace: "nowrap" }}>U constante <span style={{ color: C.cyan }}>→ circunferencia</span></span>
            </Caja>
            <Caja x={F.x + 60} y={F.y - 150} p={flech * win} dy={10}>
              <span style={{ fontFamily: FONT, fontSize: 30, fontWeight: 700, color: "#fff", padding: "9px 18px", borderRadius: 12, background: "rgba(8,15,29,.94)", border: `2px solid ${C.orange}`, whiteSpace: "nowrap" }}>−∇U <span style={{ color: C.orangeSoft }}>apunta al foco</span></span>
            </Caja>
            <Caja x={q.x - 40} y={q.y - 120} p={perp * win} dy={10} style={{ transform: undefined }}>
              <span style={{ fontFamily: FONT, fontSize: 30, fontWeight: 700, color: "#fff", padding: "9px 18px", borderRadius: 12, background: "rgba(8,15,29,.94)", border: "2px solid #fff", whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-55%)" }}>Campo ⟂ curvas de nivel</span>
            </Caja>
            {SONDAS.map((s, i) => {
              const ap = prog(t, tS[i] + 0.1, 0.4, E.out) * (1 - foco) * win;
              if (ap <= 0) return null;
              const p = P(s.x, s.y)!;
              return <div key={i} className="abs" style={{ left: p.x - 15, top: p.y - 50, width: 30, height: 30, borderRadius: 15, background: C.cyan, color: "#06121c", fontFamily: FONT, fontWeight: 800, fontSize: 20, textAlign: "center", lineHeight: "30px", opacity: ap }}>{i + 1}</div>;
            })}
            <Caja x={rect.x + 30} y={rect.y + 76} p={prog(t, tS[0] - 0.2, 0.5, E.out) * (1 - foco) * win} dy={10}>
              <div style={{ fontFamily: MONO, fontSize: 27, color: "#fff", padding: "14px 20px", borderRadius: 14, background: "rgba(8,15,29,.95)", border: `2px solid ${C.cyan}`, boxShadow: "0 16px 44px rgba(0,0,0,.5)" }}>
                <div style={{ display: "grid", gridTemplateColumns: `34px 132px 150px ${inten > 0.01 ? "190px" : "0px"}`, columnGap: 14, rowGap: 9, alignItems: "center", whiteSpace: "nowrap" }}>
                  <span /><span style={{ color: C.muted, fontSize: 21 }}>distancia</span><span style={{ color: C.cyan, fontSize: 21 }}>potencial U</span>
                  <span style={{ color: C.orangeSoft, fontSize: 21, opacity: inten, overflow: "hidden" }}>intensidad μ/R²</span>
                  {SONDAS.map((s0, i) => {
                    const ap = prog(t, tS[i] + 0.1, 0.4, E.out);
                    const pl = api.metricas.plot;
                    const pr = pl ? puntoReal(s0.x, s0.y, pl) : s0; // lo que la web calcula de verdad
                    const s = { x: pr.x, y: pr.y, R: Math.hypot(pr.x, pr.y) };
                    return [
                      <span key={`n${i}`} style={{ opacity: ap, width: 28, height: 28, borderRadius: 14, background: C.cyan, color: "#06121c", fontFamily: FONT, fontWeight: 800, fontSize: 19, textAlign: "center", lineHeight: "28px" }}>{i + 1}</span>,
                      <span key={`r${i}`} style={{ opacity: ap }}>R = {fmt(s.R, 2)}</span>,
                      <span key={`u${i}`} style={{ opacity: ap, color: C.cyan, fontWeight: 700 }}>{fmt(potential(s.x, s.y)!, 2)}</span>,
                      <span key={`g${i}`} style={{ opacity: ap * inten, color: C.orangeSoft, fontWeight: 700, overflow: "hidden" }}>{fmt(1 / (s.R * s.R), 2)}</span>,
                    ];
                  })}
                </div>
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border2}`, fontFamily: FONT, fontSize: 24, fontWeight: 650, display: "flex", gap: 22 }}>
                  <span style={{ color: C.cyan, opacity: prog(t, c("F8.cero") + 0.6, 0.5) }}>U → 0</span>
                  <span style={{ color: C.orangeSoft, opacity: inten }}>intensidad → 0</span>
                </div>
              </div>
            </Caja>
            <Caja x={rect.x + 30} y={rect.y + rect.h - 118} p={inten * win} dy={10}>
              <div style={{ fontFamily: FONT, fontSize: 21, color: C.muted, padding: "10px 16px", borderRadius: 12, background: "rgba(8,15,29,.95)", border: `1.5px solid ${C.orange}`, lineHeight: 1.4, whiteSpace: "nowrap" }}>
                <b style={{ color: C.orangeSoft }}>Flechas naranjas:</b> largo ∝ intensidad.<br />Las de la web tienen largo fijo: solo indican dirección.
              </div>
            </Caja>
            {foco > 0 && tp && tarj && (
              <>
                <div className="abs" style={{ left: tp.x - 6, top: tp.y - 6, width: tarj.w * api.escala + 12, height: tarj.h * api.escala + 12, borderRadius: 14, border: "3px solid #ff8a7a", opacity: foco * win, boxShadow: "0 0 40px rgba(255,138,122,.5)" }} />
                <Caja x={F.x + 46} y={F.y - 96} p={foco * win} dy={10}>
                  <span style={{ fontFamily: FONT, fontSize: 31, fontWeight: 700, color: "#fff", padding: "10px 18px", borderRadius: 12, background: "rgba(8,15,29,.95)", border: "2px solid #ff8a7a", whiteSpace: "nowrap" }}>En el foco, R = 0 <span style={{ color: "#ffb3a8" }}>→ U no definido</span></span>
                </Caja>
              </>
            )}
          </>
        );
      }}
    </AppWindow>
  );
}

export function Potencial({ t, ini, fin }: { t: number; ini: number; fin: number }) {
  void clamp;
  return (
    <Escena t={t} ini={ini} fin={fin}>
      <Propia t={t} ini={ini} />
      <Web t={t} fin={fin} />
    </Escena>
  );
}
