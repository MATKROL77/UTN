// ESCENA 4 — Coordenadas cartesianas, rotación y traslación; luego la web real con p=3, e=0,65, α=30°, h=1, k=−0,5.
import { E, clamp, fmt, inOut, kf, lerp, prog, pulse } from "../core/anim";
import { TAU, arcoOrbita, mapa, orbitalPoint, pathArco, pathDe, pathOrbita, rad, radius, type Map2, type Orbit } from "../core/orbit";
import { C, FONT, MONO } from "../core/theme";
import { cue } from "../core/tl";
import { T } from "../tiempos";
import { AppWindow, type Toma } from "../components/AppWindow";
import { Cuerpo, Ejes, Flecha, Foco, Lienzo, Rejilla, Rotulo, Trazo } from "../components/Plano";
import { Tex } from "../components/Tex";
import { Caja, Tarjeta } from "../components/ui";
import { Escena } from "./comun";

const mezclaMapa = (a: Map2, b: Map2, u: number) => mapa(lerp(a.ox, b.ox, u), lerp(a.oy, b.oy, u), lerp(a.s, b.s, u));

export function Coordenadas({ t, ini, fin }: { t: number; ini: number; fin: number }) {
  const c = (id: string) => cue(id);
  const tApp = T.coordsApp;
  const plano = 1 - prog(t, tApp - 0.1, 0.6); // el plano propio deja paso a la web
  const win = prog(t, tApp + 0.1, 0.7, E.out);

  // Cámara del plano: general → acercamiento al triángulo → general
  const mA = mapa(1300, 596, 62), mZ = mapa(1030, 706, 120), mB = mapa(1215, 574, 54);
  const z1 = prog(t, c("M6.x") - 0.9, 1.2), z2 = prog(t, c("M7") - 0.2, 1.1);
  const m = z2 > 0 ? mezclaMapa(mZ, mB, z2) : mezclaMapa(mA, mZ, z1);

  // Rotación y traslación (M7)
  const alpha = 30 * prog(t, c("M7.rot") - 0.15, Math.min(1.5, Math.max(0.8, c("M7.tras") - c("M7.rot"))));
  const tr = prog(t, c("M7.tras") - 0.1, Math.min(1.4, Math.max(0.8, tApp - c("M7.tras") - 0.1)));
  const h = 1 * tr, k = -0.5 * tr;
  const o: Orbit = { p: 3, e: 0.65, alpha, h, k };
  const o0: Orbit = { p: 3, e: 0.65, alpha: 0, h: 0, k: 0 };

  // La órbita se dibuja desde el foco: el radio vector barre una vuelta completa.
  const barrido = prog(t, ini + 0.55, 2.5, E.inOut);
  const th0 = rad(50);
  const th = barrido < 1 ? barrido * (TAU + th0) : th0 + rad(13) * Math.sin((t - (ini + 3.05)) * 1.05);
  const b = orbitalPoint(th, o)!;
  const bx = m.X(b.x), by = m.Y(b.y), fx = m.X(h), fy = m.Y(k);
  const r = radius(th, 3, 0.65);
  const tri = inOut(t, c("M6.cart") + 0.2, c("M7.rot") - 0.1, 0.6, 0.5); // triángulo rectángulo
  const legX = prog(t, c("M6.x") - 0.2, 0.6, E.out), legY = prog(t, c("M6.y") - 0.2, 0.6, E.out);
  const gx = pulse(t, c("M6.x") - 0.1, 1.5), gy = pulse(t, c("M6.y") - 0.1, 1.5);
  const thN = ((th % TAU) + TAU) % TAU;

  const fA = inOut(t, c("M6.x") - 0.55, c("M7.rot") - 0.3, 0.5, 0.4);
  const fB = inOut(t, c("M7.rot") - 0.25, tApp, 0.5, 0.5);
  const ga = pulse(t, c("M7.rot") - 0.1, 1.6), gh = pulse(t, c("M7.tras") - 0.1, 1.6);
  const hkOn = prog(t, c("M7.tras") - 0.2, 0.4);

  // Toma de la web real
  const dPos = Math.max(1.4, c("M7.forma") - c("M7.pos"));
  const toma: Toma = {
    id: "coords", inicio: tApp, fin,
    acciones: [
      { en: tApp, tipo: "fijar", label: "Excentricidad", valor: 0.65 },
      { en: tApp, tipo: "fijar", label: "Rotación", valor: 0 },
      { en: c("M7.orient") + 0.05, tipo: "slider", label: "Rotación", a: 30, dur: clamp(c("M7.pos") - c("M7.orient") - 0.15, 0.8, 1.6) },
      { en: c("M7.pos") + 0.05, tipo: "slider", label: "Horizontal", a: 1, dur: dPos * 0.4 },
      { en: c("M7.pos") + 0.05 + dPos * 0.5, tipo: "slider", label: "Vertical", a: -0.5, dur: dPos * 0.4 },
    ],
  };
  const rect = { x: 360 + (1 - win) * 80, y: 70, w: 1520, h: 878 };
  const forma = prog(t, c("M7.forma") - 0.1, 0.5, E.out);

  return (
    <Escena t={t} ini={ini} fin={fin}>
      {plano > 0 && (
        <div className="full" style={{ opacity: plano, maskImage: "linear-gradient(to right, transparent 440px, #000 620px), linear-gradient(to bottom, #000 870px, transparent 950px)", maskComposite: "intersect" }}>
          <Lienzo>
            <Rejilla m={m} xr={[-10, 5]} yr={[-6, 6]} o={0.9} />
            <Ejes m={m} xr={[-9.7, 3.6]} yr={[-5.3, 5.1]} p={prog(t, ini + 0.15, 0.9, E.out)} />
            {/* órbita original como referencia cuando se rota y traslada */}
            {(alpha > 0 || tr > 0) && <Trazo d={pathOrbita(o0, m)} color={C.orbit} w={1.6} o={0.3} dash="6 8" />}
            {/* ejes locales x′, y′ */}
            {alpha > 0 && (
              <g opacity={clamp(alpha / 6)}>
                {[0, 90].map((d) => {
                  const a = rad(alpha + d), L = d ? 5.2 : 9.6, L2 = d ? 5.2 : 3.4;
                  return <line key={d} x1={m.X(h - L * Math.cos(a))} y1={m.Y(k - L * Math.sin(a))} x2={m.X(h + L2 * Math.cos(a))} y2={m.Y(k + L2 * Math.sin(a))} stroke={C.violet} strokeWidth={2} strokeDasharray="8 8" strokeOpacity={0.9} />;
                })}
                <Rotulo x={m.X(h + 3.4 * Math.cos(rad(alpha))) + 20} y={m.Y(k + 3.4 * Math.sin(rad(alpha))) - 6} color={C.violetSoft} italic size={30}>x′</Rotulo>
                <Rotulo x={m.X(h - 5.2 * Math.sin(rad(alpha))) - 22} y={m.Y(k + 5.2 * Math.cos(rad(alpha))) + 4} color={C.violetSoft} italic size={30}>y′</Rotulo>
                <path d={pathArco(h, k, 1.9, 0, rad(alpha), m)} fill="none" stroke={C.violet} strokeWidth={3} />
                <Rotulo x={m.X(h + 2.25 * Math.cos(rad(alpha / 2)))} y={m.Y(k + 2.25 * Math.sin(rad(alpha / 2))) + 9} color={C.violetSoft} size={25} anchor="start">α = {Math.round(alpha)}°</Rotulo>
              </g>
            )}
            {/* traslación del foco */}
            {tr > 0.02 && (
              <g>
                <Flecha x1={m.X(0)} y1={m.Y(0)} x2={fx} y2={fy} color={C.orange} w={3.5} punta={12} />
                <Rotulo x={fx + 4} y={fy + 58} color={C.orangeSoft} size={25} anchor="start">(h, k) = ({fmt(h, 1)}; {fmt(k, 1)})</Rotulo>
              </g>
            )}
            <Trazo d={barrido < 1 ? pathDe(arcoOrbita(o, 0, th, 220), m) : pathOrbita(o, m)} color={C.orbit} w={3.2} brillo />
            {/* radio vector */}
            <line x1={fx} y1={fy} x2={bx} y2={by} stroke={C.cyan} strokeWidth={3} strokeDasharray={tri > 0.5 ? undefined : "7 7"} strokeOpacity={0.9} />
            {tri > 0 && alpha === 0 && (
              <g opacity={tri}>
                <line x1={fx} y1={fy} x2={fx + (bx - fx) * legX} y2={fy} stroke={C.blue} strokeWidth={5 + gx * 3} strokeLinecap="round" />
                <line x1={bx} y1={fy} x2={bx} y2={fy + (by - fy) * legY} stroke={C.orange} strokeWidth={5 + gy * 3} strokeLinecap="round" opacity={legX} />
                <path d={`M${bx - 16},${fy} v-16 h16`} fill="none" stroke={C.muted} strokeWidth={2} opacity={legY} />
                <path d={pathArco(0, 0, 0.52, 0, thN, m)} fill="none" stroke={C.violetSoft} strokeWidth={3} />
                <Rotulo x={fx + m.s * 0.78 * Math.cos(thN / 2)} y={fy - m.s * 0.78 * Math.sin(thN / 2) + 11} color={C.violetSoft} italic size={34}>θ</Rotulo>
                <Rotulo x={(fx + bx) / 2 - 22} y={(fy + by) / 2 - 12} color={C.cyan} italic size={40}>r</Rotulo>
                <Rotulo x={(fx + bx) / 2} y={fy + 46} color={C.blueSoft} size={30} o={legX * (1 - z2)}>x = r cos θ</Rotulo>
                <Rotulo x={bx + 22} y={(fy + by) / 2 + 10} color={C.orangeSoft} size={30} anchor="start" o={legY * (1 - z2)}>y = r sin θ</Rotulo>
              </g>
            )}
            <Foco x={fx} y={fy} r={13} t={t} />
            <Cuerpo x={bx} y={by} r={10} />
            <Rotulo x={bx + 18} y={by - 18} color="#cfeaf2" size={24} anchor="start" italic o={tri * (1 - legY * 0) * 0.95}>(x, y)</Rotulo>
          </Lienzo>
        </div>
      )}

      {/* Fórmulas */}
      <Caja x={1462} y={132} w={400} p={fA * plano} dx={20} dy={0}>
        <Tarjeta style={{ padding: "26px 30px" }}>
          <div><Tex tex={"\\hl{x}{x} = r\\cos\\theta"} size={58} reveal={prog(t, c("M6.x") - 0.3, 0.8, E.out)} hl={{ x: { c: C.blue, glow: gx > 0.05 ? `rgba(89,169,255,${gx})` : undefined } }} /></div>
          <div style={{ marginTop: 14 }}><Tex tex={"\\hl{y}{y} = r\\sin\\theta"} size={58} reveal={prog(t, c("M6.y") - 0.3, 0.8, E.out)} hl={{ y: { c: C.orange, glow: gy > 0.05 ? `rgba(255,177,102,${gy})` : undefined } }} /></div>
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border2}`, fontFamily: MONO, fontSize: 23, color: C.muted, lineHeight: 1.55, opacity: prog(t, c("M6.x") + 0.3, 0.6) }}>
            <div>r = {fmt(r)}  ·  θ = {fmt((thN * 180) / Math.PI, 1)}°</div>
            <div><span style={{ color: C.blueSoft }}>x = {fmt(r * Math.cos(thN))}</span>  ·  <span style={{ color: C.orangeSoft }}>y = {fmt(r * Math.sin(thN))}</span></div>
          </div>
        </Tarjeta>
      </Caja>
      <Caja x={1330} y={116} w={540} p={fB * plano} dx={20} dy={0}>
        <Tarjeta style={{ padding: "24px 28px" }}>
          <div style={{ fontFamily: FONT, fontSize: 19, letterSpacing: 3.2, fontWeight: 650, color: C.muted, marginBottom: 14 }}>
            <span style={{ color: C.violetSoft }}>ROTACIÓN α</span> <span style={{ opacity: 0.35 + 0.65 * hkOn }}>· <span style={{ color: C.orangeSoft }}>TRASLACIÓN (h, k)</span></span>
          </div>
          {["x = \\hl{h}{h\\,+\\,} r\\cos(\\theta + \\hl{a}{\\alpha})", "y = \\hl{k}{k\\,+\\,} r\\sin(\\theta + \\hl{a}{\\alpha})"].map((tex, i) => (
            <div key={i} style={{ marginTop: i ? 10 : 0 }}>
              <Tex tex={tex} size={47} hl={{
                a: { c: C.violetSoft, glow: ga > 0.05 ? `rgba(165,154,231,${ga})` : undefined },
                h: { c: C.orange, o: 0.18 + 0.82 * hkOn, glow: gh > 0.05 ? `rgba(255,177,102,${gh})` : undefined },
                k: { c: C.orange, o: 0.18 + 0.82 * hkOn, glow: gh > 0.05 ? `rgba(255,177,102,${gh})` : undefined },
              }} />
            </div>
          ))}
        </Tarjeta>
      </Caja>

      {/* Web real: rotación y traslación con los deslizadores */}
      {win > 0 && (
        <AppWindow t={t} toma={toma} rect={rect} recorte={{ x: 49, y: 340, w: 1342, h: 735 }} opacidad={win}
          leer={{ p: 'input[aria-label="Parámetro orbital"]', e: 'input[aria-label="Excentricidad"]', a: 'input[aria-label="Rotación"]', h: 'input[aria-label="Horizontal"]', k: 'input[aria-label="Vertical"]' }}
          medir={["label.switch-row", ".preset-grid"]}>
          {(api) => {
            const v = api.metricas.textos;
            const n = (x: string | undefined, d: number) => fmt(Number(x ?? 0), d);
            const pos = api.aEscena(86, 425);
            const sw = api.metricas.rects["label.switch-row"];
            const a0 = sw ? api.aEscena(sw.x - 10, sw.y - 8) : null;
            const items: [string, string, string, number][] = [
              ["p", n(v.p, 0), C.blue, forma], ["e", n(v.e, 2), C.orange, forma],
              ["α", `${n(v.a, 0)}°`, C.violetSoft, pulse(t, c("M7.orient"), 2)], ["h", n(v.h, 1), C.orangeSoft, pulse(t, c("M7.pos"), 1.4)], ["k", n(v.k, 1), C.orangeSoft, pulse(t, c("M7.pos") + dPos * 0.5, 1.4)],
            ];
            return (
              <>
                <div className="abs" style={{ left: pos.x, top: pos.y, opacity: win * prog(t, tApp + 0.5, 0.5), display: "flex", gap: 12, fontFamily: MONO, fontSize: 27 }}>
                  {items.map(([s, val, col, g]) => (
                    <span key={s} style={{ padding: "8px 16px", borderRadius: 12, background: "rgba(8,15,29,.9)", border: `2px solid color-mix(in srgb, ${col} ${40 + Math.round(g * 60)}%, #223047)`, boxShadow: g > 0.05 ? `0 0 ${26 * g}px color-mix(in srgb, ${col} 45%, transparent)` : undefined, color: "#eaf2fb", whiteSpace: "nowrap" }}>
                      <i style={{ color: col, fontFamily: "KaTeX_Math, serif", fontSize: 30 }}>{s}</i> = {val}
                    </span>
                  ))}
                </div>
                {a0 && sw && (
                  <div className="abs" style={{ left: a0.x, top: a0.y, width: (sw.w + 20) * api.escala, height: (sw.h + 16) * api.escala, borderRadius: 12, border: `2.5px solid ${C.violet}`, opacity: win * inOut(t, c("M7.orient") - 0.2, c("M7.pos") + 0.4, 0.4, 0.5), boxShadow: "0 0 24px rgba(165,154,231,.5)" }} />
                )}
                <Caja x={api.aEscena(86, 0).x} y={api.aEscena(0, 985).y} p={forma * win} dy={14}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 14, padding: "12px 22px", borderRadius: 14, background: "rgba(8,15,29,.94)", border: `2px solid ${C.cyan}`, fontFamily: FONT, fontSize: 29, fontWeight: 650, color: "#fff", boxShadow: "0 0 30px rgba(110,223,232,.3)" }}>
                    Misma forma <span style={{ color: C.muted, fontWeight: 500 }}>·</span> <span style={{ color: C.muted, fontWeight: 500 }}>p y e no cambian</span>
                  </div>
                </Caja>
              </>
            );
          }}
        </AppWindow>
      )}
    </Escena>
  );
}
