// ESCENA 3 — Tipos de órbitas según la excentricidad, con la web real cambiando e.
import { E, clamp, lerp, prog } from "../core/anim";
import { mapa, pathOrbita } from "../core/orbit";
import { C, FONT, MONO } from "../core/theme";
import { cue } from "../core/tl";
import { T } from "../tiempos";
import { AppWindow, type Toma } from "../components/AppWindow";
import { Antetitulo, Caja } from "../components/ui";
import { Escena } from "./comun";

const TIPOS = [
  { e: 0, cond: "e = 0", nombre: "Circunferencia", s: 1 },
  { e: 0.6, cond: "0 < e < 1", nombre: "Elipse", s: 0.74 },
  { e: 1, cond: "e = 1", nombre: "Parábola", s: 0.62 },
  { e: 1.5, cond: "e > 1", nombre: "Hipérbola", s: 0.62 },
];

function Mini({ i, w, h, esc, dibujo, activo }: { i: number; w: number; h: number; esc: number; dibujo: number; activo: number }) {
  const tp = TIPOS[i];
  const fx = w / 2 + (i === 0 ? 0 : i === 1 ? esc * tp.s * 0.94 : esc * 0.55);
  const m = mapa(fx, h / 2, esc * tp.s);
  const col = activo > 0.5 ? C.orbit : "#4aa9bb";
  return (
    <svg width={w} height={h} style={{ display: "block", overflow: "hidden" }}>
      <line x1={8} x2={w - 8} y1={h / 2} y2={h / 2} stroke={C.axis} strokeOpacity={0.35} strokeDasharray="4 6" />
      <path d={pathOrbita({ p: 1, e: tp.e, alpha: 0, h: 0, k: 0 }, m, 400)} fill="none" stroke={col} strokeWidth={lerp(2.4, 3.4, activo)} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - dibujo} strokeLinecap="round" />
      <circle cx={fx} cy={h / 2} r={esc * 0.2} fill="url(#g-halo)" />
      <circle cx={fx} cy={h / 2} r={Math.max(4.5, esc * 0.075)} fill="url(#g-sol)" />
    </svg>
  );
}

export function Tipos({ t, ini, fin }: { t: number; ini: number; fin: number }) {
  const c = (id: string) => cue(id);
  const tSim = T.tiposApp;
  const u = prog(t, tSim - 0.1, 0.9); // las tarjetas pasan de fila a columna
  const win = prog(t, tSim + 0.1, 0.75, E.out);
  const cambios = [c("M5.e0") - 0.15, c("M5.e01") - 0.05, c("M5.e1") - 0.05, c("M5.e2") - 0.05];
  const activa = (i: number) => clamp(Math.min(prog(t, cambios[i], 0.35, E.out), i < 3 ? 1 - prog(t, cambios[i + 1], 0.35) : 1));

  const toma: Toma = {
    id: "tipos", inicio: tSim, fin,
    acciones: [
      { en: c("M5.e0") - 0.25, tipo: "slider", label: "Excentricidad", a: 0, dur: Math.max(0.8, c("M5.circ") - c("M5.e0") + 0.1) },
      { en: c("M5.e01") + 0.1, tipo: "slider", label: "Excentricidad", a: 0.62, dur: Math.max(1.0, c("M5.elipse") - c("M5.e01") + 0.5), ease: E.soft },
      { en: Math.max(c("M5.e1") + 0.3, c("M5.parab") - 0.35), tipo: "boton", texto: "Parábola" },
      { en: c("M5.e2") + 0.1, tipo: "slider", label: "Excentricidad", a: 1.45, dur: Math.max(1.0, c("M5.hiper") - c("M5.e2") + 0.7), ease: E.soft },
    ],
  };
  const rect = { x: 372 + (1 - win) * 90, y: 70, w: 1508, h: 873 };

  return (
    <Escena t={t} ini={ini} fin={fin}>
      <Caja x={1190} y={236} p={Math.min(prog(t, ini + 0.3, 0.6, E.out), 1 - prog(t, tSim - 0.3, 0.4))} centro style={{ textAlign: "center" }}>
        <Antetitulo tam={20}>La excentricidad decide la forma</Antetitulo>
      </Caja>
      {win > 0 && (
        <AppWindow t={t} toma={toma} rect={rect} recorte={{ x: 49, y: 340, w: 1342, h: 735 }} opacidad={win}
          leer={{ e: 'input[aria-label="Excentricidad"]', conica: ".conic-badge" }}>
          {(api) => {
            const e = Number(api.metricas.textos.e ?? "0.6");
            const nombre = api.metricas.textos.conica ?? "";
            const pos = api.aEscena(1063, 404);
            const ap = prog(t, c("M5.e0") - 0.4, 0.5, E.out) * win;
            const cambio = Math.max(...cambios.map((tc) => 1 - clamp(Math.abs(t - tc - 0.25) / 0.45)));
            return (
              <div className="abs" style={{ left: pos.x, top: pos.y, transform: `translate(-100%, 0) scale(${1 + 0.06 * cambio})`, transformOrigin: "100% 0", opacity: ap, display: "flex", alignItems: "center", gap: 16, padding: "12px 22px", borderRadius: 16, background: "rgba(8,15,29,.92)", border: `2px solid ${C.cyan}`, boxShadow: `0 0 ${26 + 30 * cambio}px rgba(110,223,232,${0.25 + 0.35 * cambio})`, fontFamily: FONT, whiteSpace: "nowrap" }}>
                <span style={{ fontFamily: MONO, fontSize: 34, color: C.orange, fontWeight: 600 }}>e = {e.toFixed(2).replace(".", ",")}</span>
                <span style={{ width: 2, height: 34, background: C.border2 }} />
                <span style={{ fontSize: 34, fontWeight: 700, color: "#fff" }}>{nombre}</span>
              </div>
            );
          }}
        </AppWindow>
      )}
      {TIPOS.map((tp, i) => {
        const fila = { x: 540 + i * 336, y: 300, w: 312, h: 340 };
        const col = { x: 64, y: 112 + i * 144, w: 268, h: 132 };
        const r = { x: lerp(fila.x, col.x, u), y: lerp(fila.y, col.y, u), w: lerp(fila.w, col.w, u), h: lerp(fila.h, col.h, u) };
        const ap = prog(t, ini + 0.3 + i * 0.2, 0.5, E.out);
        const dib = prog(t, ini + 0.45 + i * 0.2, 0.95);
        const act = u < 1 ? 0 : activa(i);
        const neutro = u < 1 ? 1 : 0;
        const borde = act > 0.02 ? `color-mix(in srgb, ${C.cyan} ${Math.round(act * 100)}%, ${C.border2})` : C.border2;
        return (
          <div key={i} className="abs" style={{
            left: r.x, top: r.y + (1 - ap) * 24, width: r.w, height: r.h, opacity: ap * lerp(1, 0.62 + 0.38 * act, u), borderRadius: 18, overflow: "hidden",
            background: "linear-gradient(180deg, rgba(17,29,47,.95), rgba(11,19,34,.95))", border: `2px solid ${borde}`,
            boxShadow: `0 18px 44px rgba(0,0,0,.4)${act > 0.02 ? `, 0 0 ${34 * act}px rgba(110,223,232,${0.35 * act})` : ""}`, transform: `scale(${1 + 0.035 * act})`, fontFamily: FONT,
          }}>
            {/* disposición en fila */}
            <div className="abs" style={{ inset: 0, opacity: 1 - u }}>
              <Mini i={i} w={312} h={226} esc={86} dibujo={dib} activo={neutro} />
              <div style={{ textAlign: "center", marginTop: 6 }}>
                <div style={{ fontFamily: MONO, fontSize: 30, color: C.orange, fontWeight: 600 }}>{tp.cond}</div>
                <div style={{ fontSize: 31, fontWeight: 700, color: "#fff", marginTop: 6 }}>{tp.nombre}</div>
              </div>
            </div>
            {/* disposición en columna */}
            <div className="abs" style={{ inset: 0, opacity: u, display: "flex", alignItems: "center" }}>
              <Mini i={i} w={118} h={128} esc={40} dibujo={1} activo={act} />
              <div style={{ paddingLeft: 4 }}>
                <div style={{ fontFamily: MONO, fontSize: 21, color: C.orange, fontWeight: 600 }}>{tp.cond}</div>
                <div style={{ fontSize: 23, fontWeight: 700, color: "#fff", marginTop: 5 }}>{tp.nombre}</div>
              </div>
            </div>
          </div>
        );
      })}
    </Escena>
  );
}
