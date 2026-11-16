// Composición completa: fondo, escenas activas, presentadores y rótulo de capítulo.
import { Background } from "./components/Background";
import { Defs } from "./components/Plano";
import { E, prog } from "./core/anim";
import { C, FONT, MONO } from "./core/theme";
import { SOLO } from "./core/modo";
import { DUR, T_FINAL, cue } from "./core/tl";
import { Presentadores } from "./presentadores";
import { D_OUT, type DefEscena } from "./escenas/comun";
import { Intro } from "./escenas/E01_Intro";
import { Modelo } from "./escenas/E02_Modelo";
import { Tipos } from "./escenas/E03_Tipos";
import { Coordenadas } from "./escenas/E04_Coordenadas";
import { Jacobiano } from "./escenas/E05_Jacobiano";
import { Kepler } from "./escenas/E07_Kepler";
import { Potencial } from "./escenas/E08_Potencial";
import { Python } from "./escenas/E10_Python";
import { Ajuste } from "./escenas/E11_Ajuste";
import { Conclusion } from "./escenas/E12_Conclusion";
import { Final } from "./escenas/E13_Final";

const cortes: [string, number, string, DefEscena["C"]][] = [
  ["intro", 0, "Presentación", Intro],
  ["modelo", cue("M2") - 0.75, "Modelo orbital", Modelo],
  ["tipos", cue("M5") - 0.45, "Tipos de órbitas", Tipos],
  ["coordenadas", cue("M6") - 0.45, "Coordenadas y transformaciones", Coordenadas],
  ["jacobiano", cue("M8") - 0.45, "Jacobiano", Jacobiano],
  ["kepler", cue("F1") - 0.5, "Segunda ley de Kepler", Kepler],
  ["potencial", cue("F5") - 0.45, "Potencial y campo gravitatorio", Potencial],
  ["python", cue("F9") - 0.45, "Visualizaciones en Python", Python],
  ["ajuste", cue("F10") - 0.45, "Ajuste de parámetros", Ajuste],
  ["conclusion", cue("F11") - 0.45, "Conclusión", Conclusion],
  ["final", T_FINAL - 0.3, "Cierre", Final],
];

export const ESCENAS: DefEscena[] = cortes.map(([id, ini, titulo, Comp], i) => ({
  id, ini, titulo, C: Comp, fin: i + 1 < cortes.length ? cortes[i + 1][1] + D_OUT : DUR + 1,
}));

function Capitulo({ t }: { t: number }) {
  const kep = ESCENAS.findIndex((x) => x.id === "kepler");
  let i = ESCENAS.findIndex((e, k) => t >= e.ini && (k === ESCENAS.length - 1 || t < ESCENAS[k + 1].ini));
  if (SOLO === "F") i = Math.max(i, kep);
  const e = ESCENAS[Math.max(0, i)];
  if (e.id === "intro" || e.id === "final") return null;
  const entra = SOLO === "F" && i === kep ? 1 : prog(t, e.ini + 0.25, 0.5, E.out);
  const p = Math.min(entra, 1 - prog(t, (ESCENAS[i + 1]?.ini ?? DUR) - 0.3, 0.3));
  const numero = SOLO === "F" ? i - kep + 1 : i; // en el video de una parte, los capítulos se numeran desde 01
  return (
    <div className="abs" style={{ left: 64, top: 30, opacity: p, transform: `translateX(${(1 - p) * -14}px)`, display: "flex", alignItems: "center", gap: 14, fontFamily: FONT, whiteSpace: "nowrap" }}>
      <span style={{ fontFamily: MONO, fontSize: 17, color: C.cyan, fontWeight: 600, padding: "5px 10px", borderRadius: 8, background: "rgba(110,223,232,.09)", border: "1px solid rgba(110,223,232,.3)" }}>
        {String(numero).padStart(2, "0")}
      </span>
      <span style={{ fontSize: 17, letterSpacing: 3.4, fontWeight: 650, color: "#a9bbd3", textTransform: "uppercase" }}>{e.titulo}</span>
    </div>
  );
}

export function Video({ t }: { t: number; v?: number }) {
  return (
    <div className="stage">
      <Background t={t} />
      <Defs />
      {ESCENAS.map((e, i) => {
        // En el video de una sola parte no se muestran las escenas del otro presentador.
        const deFelipe = i >= ESCENAS.findIndex((x) => x.id === "kepler");
        if ((SOLO === "F" && !deFelipe) || (SOLO === "M" && deFelipe)) return null;
        // El video de Felipe abre con su primera escena ya presente (el fundido de entrada lo hace el render).
        const ini = SOLO === "F" && e.id === "kepler" ? e.ini - 1.5 : e.ini;
        return t >= ini - 0.05 && t <= e.fin + 0.05 ? <e.C key={e.id} t={t} ini={ini} fin={e.fin} /> : null;
      })}
      <Presentadores t={t} />
      <Capitulo t={t} />
    </div>
  );
}
