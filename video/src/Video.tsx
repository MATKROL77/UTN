// Composición completa: fondo, escenas activas, presentadores y rótulo de capítulo.
import { Background } from "./components/Background";
import { Defs } from "./components/Plano";
import { E, prog } from "./core/anim";
import { C, FONT, MONO } from "./core/theme";
import { DUR, T_FINAL, cue } from "./core/tl";
import { Presentadores } from "./presentadores";
import { D_OUT, type DefEscena } from "./escenas/comun";
import { Intro } from "./escenas/E01_Intro";
import { Modelo } from "./escenas/E02_Modelo";
import { Tipos } from "./escenas/E03_Tipos";
import { Coordenadas } from "./escenas/E04_Coordenadas";
import { Jacobiano } from "./escenas/E05_Jacobiano";
import { Kepler } from "./escenas/E07_Kepler";

const cortes: [string, number, string, DefEscena["C"]][] = [
  ["intro", 0, "Presentación", Intro],
  ["modelo", cue("M2") - 0.75, "Modelo orbital", Modelo],
  ["tipos", cue("M5") - 0.45, "Tipos de órbitas", Tipos],
  ["coordenadas", cue("M6") - 0.45, "Coordenadas y transformaciones", Coordenadas],
  ["jacobiano", cue("M8") - 0.45, "Jacobiano", Jacobiano],
  ["kepler", cue("F1") - 0.5, "Segunda ley de Kepler", Kepler],
];

export const ESCENAS: DefEscena[] = cortes.map(([id, ini, titulo, Comp], i) => ({
  id, ini, titulo, C: Comp, fin: i + 1 < cortes.length ? cortes[i + 1][1] + D_OUT : DUR + 1,
}));

function Capitulo({ t }: { t: number }) {
  const i = ESCENAS.findIndex((e, k) => t >= e.ini && (k === ESCENAS.length - 1 || t < ESCENAS[k + 1].ini));
  const e = ESCENAS[Math.max(0, i)];
  if (e.id === "intro" || e.id === "final") return null;
  const p = Math.min(prog(t, e.ini + 0.25, 0.5, E.out), 1 - prog(t, (ESCENAS[i + 1]?.ini ?? DUR) - 0.3, 0.3));
  return (
    <div className="abs" style={{ left: 64, top: 40, opacity: p, transform: `translateX(${(1 - p) * -14}px)`, display: "flex", alignItems: "center", gap: 14, fontFamily: FONT, whiteSpace: "nowrap" }}>
      <span style={{ fontFamily: MONO, fontSize: 17, color: C.cyan, fontWeight: 600, padding: "5px 10px", borderRadius: 8, background: "rgba(110,223,232,.09)", border: "1px solid rgba(110,223,232,.3)" }}>
        {String(i).padStart(2, "0")}
      </span>
      <span style={{ fontSize: 17, letterSpacing: 3.4, fontWeight: 650, color: "#a9bbd3", textTransform: "uppercase" }}>{e.titulo}</span>
    </div>
  );
}

export function Video({ t }: { t: number; v?: number }) {
  void T_FINAL; void cue;
  return (
    <div className="stage">
      <Background t={t} />
      <Defs />
      {ESCENAS.map((e) => (t >= e.ini - 0.05 && t <= e.fin + 0.05 ? <e.C key={e.id} t={t} ini={e.ini} fin={e.fin} /> : null))}
      <Presentadores t={t} />
      <Capitulo t={t} />
    </div>
  );
}
