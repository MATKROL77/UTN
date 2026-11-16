// ESCENA 12 — Conclusión: la web interactiva funcionando y montaje de los cuatro ejes del trabajo.
import type { ReactNode } from "react";
import { E, clamp, lerp, prog, pulse } from "../core/anim";
import { TAU, mapa, orbitalPoint, pathOrbita, pathSector, rad, trueAnomaly, type Orbit } from "../core/orbit";
import { C, FONT } from "../core/theme";
import { T_FINAL, cue } from "../core/tl";
import { T_CONCL_APP } from "../tiempos";
import { AppWindow, empujar, recorteEn, type Toma } from "../components/AppWindow";
import { Cuerpo, Flecha, Foco } from "../components/Plano";
import { Antetitulo, Caja, Chip } from "../components/ui";
import { Escena } from "./comun";
import { A1_FIN, A1_INI, A2_FIN, A2_INI, KO } from "./kepler-geo";

const TW = 452, TH = 270; // tamaño de cada mosaico
const POS = [{ x: 498, y: 132 }, { x: 970, y: 132 }, { x: 498, y: 452 }, { x: 970, y: 452 }];
const VENTANA = { x: 150, y: 66, w: 1420, h: 845 };

function Mosaico({ i, t, t0, titulo, color, children }: { i: number; t: number; t0: number; titulo: string; color: string; children: ReactNode }) {
  const p = prog(t, t0 + i * 0.22, 0.6, E.out);
  if (p <= 0) return null;
  return (
    <div className="abs" style={{ left: POS[i].x, top: POS[i].y + (1 - p) * 26, width: TW, opacity: p, transform: `scale(${lerp(0.94, 1, p)})`, fontFamily: FONT }}>
      <div style={{ width: TW, height: TH, borderRadius: 16, overflow: "hidden", background: "linear-gradient(180deg, rgba(17,29,47,.96), rgba(10,18,32,.96))", border: `1.5px solid ${C.border2}`, boxShadow: "0 20px 50px rgba(0,0,0,.45)" }}>
        <svg width={TW} height={TH} viewBox={`0 0 ${TW} ${TH}`}>{children}</svg>
      </div>
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, fontSize: 24, fontWeight: 650, color: "#fff", whiteSpace: "nowrap" }}>
        <i style={{ width: 10, height: 10, borderRadius: 5, background: color, boxShadow: `0 0 10px ${color}` }} />{titulo}
      </div>
    </div>
  );
}

export function Conclusion({ t, ini, fin }: { t: number; ini: number; fin: number }) {
  const c = (id: string) => cue(id);
  const win = prog(t, T_CONCL_APP + 0.1, 0.7, E.out);
  const tM = c("F12") - 0.5; // comienza el montaje: la web se reduce a un mosaico
  const u = prog(t, tM, 1.0);
  const tMod = c("F11.mod");
  const toma: Toma = {
    id: "conclusion", inicio: T_CONCL_APP, fin,
    acciones: [
      { en: c("F11") + 0.7, tipo: "animar", hasta: fin + 5 },
      { en: tMod - 0.1, tipo: "slider", label: "Parámetro orbital", a: 4.2, dur: 0.9 },
      { en: tMod + 1.05, tipo: "slider", label: "Rotación", a: -35, dur: 1.0 },
    ],
  };
  const recorte = recorteEn(t, [
    { t: 0, r: { x: 49, y: 262, w: 1342, h: 755 } },
    { t: tMod + 2.25, r: { x: 49, y: 545, w: 1342, h: 755 }, dur: 0.9 },
    { t: tM - 0.1, r: { x: 49, y: 300, w: 1342, h: 755 }, dur: 0.9 },
  ]);
  // La ventana completa se encoge hasta ocupar el cuarto mosaico.
  const k = lerp(1, TW / VENTANA.w, u);
  const dx = lerp(0, POS[3].x - VENTANA.x, u), dy = lerp(0, POS[3].y - VENTANA.y, u);

  // Mini-animaciones del montaje
  const o1: Orbit = { p: 1.5, e: 0.6, alpha: 25, h: 0, k: 0 };
  const m1 = mapa(296, 120, 50);
  const b1 = orbitalPoint(trueAnomaly((TAU * t) / 7, o1.e), o1)!;
  const m2 = mapa(333, 135, 95);
  const ciclo = ((t - tM) / 3.2) % 1;
  const barrido = clamp(ciclo * 1.5);
  const m3 = { x: TW / 2, y: TH / 2 };
  const temas = ["Coordenadas polares", "Jacobiano", "Integrales", "Gradiente"];
  const cierre = 1 - prog(t, T_FINAL - 0.45, 0.45);
  const gFis = pulse(t, c("F12.fis") - 0.2, 2.4);
  return (
    <Escena t={t} ini={ini} fin={fin} dOut={0.5}>
      {win > 0 && (
        <AppWindow t={t} toma={toma} rect={VENTANA} recorte={empujar(recorte, 1 + 0.03 * prog(t, T_CONCL_APP, tM - T_CONCL_APP, E.lin))} opacidad={win * cierre} cursor={u < 0.05}
          style={{ transform: `translate(${dx}px, ${dy + (1 - win) * 40}px) scale(${k})`, transformOrigin: "0 0", borderRadius: lerp(18, 40, u) }} />
      )}
      <div style={{ opacity: cierre }}>
        <Caja x={POS[3].x} y={POS[3].y + TH + 10} p={prog(t, tM + 0.8, 0.5)} dy={0}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: FONT, fontSize: 24, fontWeight: 650, color: "#fff", whiteSpace: "nowrap" }}>
            <i style={{ width: 10, height: 10, borderRadius: 5, background: C.cyan, boxShadow: `0 0 10px ${C.cyan}` }} />Página interactiva
          </div>
        </Caja>
        <Mosaico i={0} t={t} t0={tM + 0.15} titulo="Órbita cartesiana" color={C.orbit}>
          <line x1={20} x2={TW - 20} y1={m1.oy} y2={m1.oy} stroke={C.axis} strokeOpacity={0.6} />
          <line x1={m1.ox} x2={m1.ox} y1={16} y2={TH - 16} stroke={C.axis} strokeOpacity={0.6} />
          <path d={pathOrbita(o1, m1, 240)} fill="none" stroke={C.orbit} strokeWidth={2.6} />
          <path d={`M${m1.X(b1.x)},${m1.Y(b1.y)} V${m1.oy} M${m1.X(b1.x)},${m1.Y(b1.y)} H${m1.ox}`} stroke={C.blueSoft} strokeDasharray="4 5" strokeWidth={1.5} fill="none" />
          <line x1={m1.ox} y1={m1.oy} x2={m1.X(b1.x)} y2={m1.Y(b1.y)} stroke={C.cyan} strokeOpacity={0.7} strokeWidth={1.8} />
          <Foco x={m1.ox} y={m1.oy} r={7} t={t} />
          <Cuerpo x={m1.X(b1.x)} y={m1.Y(b1.y)} r={6} />
        </Mosaico>
        <Mosaico i={1} t={t} t0={tM + 0.15} titulo="Sectores de igual área" color={C.blue}>
          <path d={pathOrbita({ ...KO, p: 1 }, m2, 240)} fill="none" stroke={C.orbit} strokeWidth={2.6} />
          <path d={pathSector({ ...KO, p: 1 }, A1_INI, lerp(A1_INI, A1_FIN, barrido), m2, 60)} fill={C.blue} fillOpacity={0.3} stroke={C.blue} strokeWidth={2} />
          <path d={pathSector({ ...KO, p: 1 }, A2_INI, lerp(A2_INI, A2_FIN, barrido), m2, 30)} fill={C.orange} fillOpacity={0.38} stroke={C.orange} strokeWidth={2} />
          <Foco x={m2.ox} y={m2.oy} r={7} t={t} />
          <text x={22} y={TH - 20} fontSize={21} fill="#cfe0f2" fontFamily="KaTeX_Main, serif">A₁ = A₂</text>
        </Mosaico>
        <Mosaico i={2} t={t} t0={tM + 0.15} titulo="Campo gravitatorio" color={C.orange}>
          {[36, 68, 108].map((r) => <circle key={r} cx={m3.x} cy={m3.y} r={r} fill="none" stroke="#46c4df" strokeOpacity={0.65} strokeWidth={1.6} />)}
          {[52, 88, 124].flatMap((R, j) => Array.from({ length: 10 + j * 2 }, (_, n) => {
            const a = (TAU * n) / (10 + j * 2) + j * 0.3, f = ((t * 0.8 + n * 0.17) % 1) * 9;
            const L = [22, 13, 8][j], x0 = m3.x + (R + L / 2 - f) * Math.cos(a), y0 = m3.y + (R + L / 2 - f) * Math.sin(a);
            return <Flecha key={`${j}-${n}`} x1={x0} y1={y0} x2={x0 - L * Math.cos(a)} y2={y0 - L * Math.sin(a)} color="#dcecff" w={2} punta={6} o={0.9} />;
          }))}
          <Foco x={m3.x} y={m3.y} r={8} t={t} />
        </Mosaico>
        <Caja x={960} y={66} p={prog(t, tM + 0.5, 0.6, E.out)} centro style={{ textAlign: "center" }}>
          <Antetitulo tam={19}>Conclusión</Antetitulo>
        </Caja>
        <div className="abs" style={{ left: 610, top: 802, width: 700, display: "flex", gap: 10, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
          {temas.map((s, i) => {
            const q = prog(t, c("F12.temas") - 0.2 + i * 0.16, 0.5, E.outBack);
            return <span key={s} style={{ opacity: clamp(q * 1.4), transform: `translateY(${(1 - q) * 14}px)` }}><Chip color={[C.cyan, C.orange, C.blue, C.violetSoft][i]} tam={21}>{s}</Chip></span>;
          })}
        </div>
        <Caja x={960} y={898} p={prog(t, c("F12.obs") - 0.2, 0.7, E.out)} centro style={{ textAlign: "center", whiteSpace: "nowrap" }}>
          <span style={{ fontFamily: FONT, fontSize: 33, fontWeight: 650, color: C.text }}>
            Análisis Matemático II <span style={{ color: C.cyan, padding: "0 12px" }}>→</span>
            <span style={{ color: "#fff", textShadow: `0 0 ${30 * gFis}px rgba(255,177,102,${gFis})` }}>un <span style={{ color: C.orange }}>fenómeno físico</span></span>
          </span>
        </Caja>
      </div>
    </Escena>
  );
}
