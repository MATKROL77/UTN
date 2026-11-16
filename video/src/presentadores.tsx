// Pistas de los dos presentadores: dónde están, qué gesto hacen y cuándo hablan.
import { E, clamp, lerp, prog } from "./core/anim";
import { C } from "./core/theme";
import { FRASES, T_FINAL, cue } from "./core/tl";
import { NombreTag, Presenter, poseEn, type Gesto } from "./components/Presenter";
import { SOLO } from "./core/modo";
import { T, T_CONCL_APP } from "./tiempos";

type Lugar = { t: number; x: number; y: number; s: number; dur?: number };
const fuera = { izq: -340, der: 2260 };

function lugarEn(t: number, pista: Lugar[]) {
  let p = { x: pista[0].x, y: pista[0].y, s: pista[0].s };
  for (const k of pista) {
    if (t < k.t) break;
    const u = E.inOut(clamp((t - k.t) / (k.dur ?? 0.9)));
    p = { x: lerp(p.x, k.x, u), y: lerp(p.y, k.y, u), s: lerp(p.s, k.s, u) };
  }
  return p;
}

// Posiciones de referencia
export const MATI_IZQ = { x: 255, y: 706, s: 1 };
export const MATI_ESQ = { x: 178, y: 902, s: 0.58 };
export const FELI_DER = { x: 1665, y: 706, s: 1 };
export const FELI_ESQ = { x: 1752, y: 902, s: 0.58 };

const lugarMati: Lugar[] = [
  { t: 0, x: fuera.izq, y: 736, s: 1.05 },
  { t: cue("M1.somos") - 0.9, x: 430, y: 736, s: 1.05, dur: 1.0 },
  { t: cue("M2") - 1.6, ...MATI_IZQ, dur: 1.3 },
  { t: T.tiposApp - 0.15, x: 198, y: 916, s: 0.54 },
  { t: cue("M6") - 0.5, ...MATI_IZQ },
  { t: T.coordsApp - 0.1, ...MATI_ESQ },
  { t: cue("M8") - 0.5, ...MATI_IZQ },
  { t: cue("M10.fin") - 0.1, x: fuera.izq, y: 706, s: 1, dur: 1.1 },
  { t: cue("F12") - 0.6, x: 236, y: 720, s: 0.96, dur: 1.0 },
  { t: T_FINAL - 0.5, x: fuera.izq, y: 720, s: 0.96, dur: 0.9 },
];
const lugarFeli: Lugar[] = [
  { t: 0, x: fuera.der, y: 736, s: 1.05 },
  { t: cue("M1.somos") - 0.9, x: 1490, y: 736, s: 1.05, dur: 1.0 },
  { t: cue("M2") - 1.7, x: fuera.der, y: 736, s: 1.05, dur: 1.2 },
  { t: cue("F1") - 1.1, ...FELI_DER, dur: 1.1 },
  { t: T.keplerApp - 0.1, ...FELI_ESQ },
  { t: cue("F5") - 0.5, ...FELI_DER },
  { t: T.campoApp - 0.1, ...FELI_ESQ },
  { t: cue("F9") - 0.5, ...FELI_DER },
  { t: T_CONCL_APP - 0.1, ...FELI_ESQ },
  { t: cue("F12") - 0.6, x: 1686, y: 720, s: 0.96, dur: 1.0 },
  { t: T_FINAL - 0.5, x: fuera.der, y: 720, s: 0.96, dur: 0.9 },
];

const gestosMati: Gesto[] = [
  { t: cue("M1.mati") - 0.25, pose: "saludarDer", dur: 0.45 },
  { t: cue("M1.feli") + 0.1, pose: "presentarDer" },
  { t: cue("M1.grupo") + 0.2, pose: "explicar" },
  { t: cue("M1.tema") + 0.3, pose: "reposo" },
  { t: cue("M2") + 0.3, pose: "explicar" },
  { t: cue("M2.tray") - 0.2, pose: "presentarDer" },
  { t: cue("M2.polares") - 0.2, pose: "explicar" },
  { t: cue("M2.jac") + 0.9, pose: "reposo" },
  { t: cue("M3.ec") - 0.4, pose: "senalarDerArriba" },
  { t: cue("M4") - 0.1, pose: "explicarDer" },
  { t: cue("M4.escala") - 0.2, pose: "presentarDer" },
  { t: cue("M4.e") - 0.1, pose: "senalarDerArriba" },
  { t: cue("M4.forma"), pose: "presentarDer" },
  { t: cue("M5") - 0.3, pose: "explicar" },
  { t: cue("M5.sim") - 0.2, pose: "senalarDerArriba" },
  { t: cue("M5.e01") - 0.2, pose: "explicarDer" },
  { t: cue("M5.e1") - 0.2, pose: "senalarDerArriba" },
  { t: cue("M5.hiper") + 0.8, pose: "reposo" },
  { t: cue("M6") + 0.2, pose: "explicar" },
  { t: cue("M6.x") - 0.3, pose: "senalarDerArriba" },
  { t: cue("M7") - 0.1, pose: "explicarDer" },
  { t: cue("M7.rot") - 0.2, pose: "presentarDer" },
  { t: cue("M7.orient") - 0.2, pose: "senalarDerArriba" },
  { t: cue("M7.forma") + 0.9, pose: "reposo" },
  { t: cue("M8") + 0.2, pose: "explicar" },
  { t: cue("M8.deriv") - 0.2, pose: "senalarDerArriba" },
  { t: cue("M8.det") - 0.1, pose: "explicarDer" },
  { t: cue("M8.r") - 0.1, pose: "senalarDer" },
  { t: cue("M9") - 0.1, pose: "explicar" },
  { t: cue("M9.dA") - 0.2, pose: "senalarDerArriba" },
  { t: cue("M9.geo") - 0.1, pose: "explicar" },
  { t: cue("M9.grande") - 0.3, pose: "presentarDer" },
  { t: cue("M10") - 0.1, pose: "explicar" },
  { t: cue("M10.areas") - 0.2, pose: "presentarDer" },
  { t: cue("M10.kepler") - 0.2, pose: "senalarDer" },
  { t: cue("M10.fin") - 0.5, pose: "saludarDer", dur: 0.45 },
  { t: cue("F12") - 0.2, pose: "reposo", dur: 0.1 },
  { t: cue("F12.temas"), pose: "explicarDer" },
  { t: cue("F12.fis") - 0.2, pose: "reposo" },
  { t: cue("F12.fin") - 0.4, pose: "saludarDer", dur: 0.5 },
];
const gestosFeli: Gesto[] = [
  { t: cue("M1.feli") - 0.25, pose: "saludarIzq", dur: 0.45 },
  { t: cue("M1.grupo") + 0.3, pose: "reposo" },
  { t: cue("F1") - 0.6, pose: "saludarIzq", dur: 0.45 },
  { t: cue("F1") + 0.9, pose: "explicar" },
  { t: cue("F1.area") - 0.2, pose: "presentarIzq" },
  { t: cue("F2") - 0.1, pose: "explicar" },
  { t: cue("F2.int") - 0.2, pose: "senalarIzqArriba" },
  { t: cue("F3") - 0.1, pose: "explicarIzq" },
  { t: cue("F3.iguales") - 0.3, pose: "explicar" },
  { t: cue("F4.pag") - 0.2, pose: "senalarIzqArriba" },
  { t: cue("F4.amp") - 0.2, pose: "explicarIzq" },
  { t: cue("F4.areas") - 0.2, pose: "senalarIzq" },
  { t: cue("F4.radio") - 0.1, pose: "explicarIzq" },
  { t: cue("F5") - 0.2, pose: "explicar" },
  { t: cue("F5.mu") - 0.3, pose: "senalarIzqArriba" },
  { t: cue("F5.dist") - 0.1, pose: "presentarIzq" },
  { t: cue("F6") - 0.1, pose: "explicar" },
  { t: cue("F6.grad") - 0.2, pose: "senalarIzqArriba" },
  { t: cue("F6.neg") - 0.1, pose: "explicarIzq" },
  { t: cue("F6.campo") - 0.2, pose: "presentarIzq" },
  { t: cue("F7.pag") - 0.2, pose: "senalarIzqArriba" },
  { t: cue("F7.nivel") - 0.1, pose: "explicarIzq" },
  { t: cue("F7.flechas") - 0.2, pose: "senalarIzq" },
  { t: cue("F8") - 0.1, pose: "explicarIzq" },
  { t: cue("F8.cero") - 0.2, pose: "senalarIzqArriba" },
  { t: cue("F8.foco") - 0.2, pose: "explicarIzq" },
  { t: cue("F9") - 0.2, pose: "explicar" },
  { t: cue("F9.orb") - 0.3, pose: "presentarIzq" },
  { t: cue("F9.sup") - 0.2, pose: "explicar" },
  { t: cue("F9.campo") - 0.2, pose: "presentarIzq" },
  { t: cue("F10") - 0.2, pose: "explicar" },
  { t: cue("F10.error") - 0.2, pose: "presentarIzq" },
  { t: cue("F10.param") - 0.1, pose: "explicarIzq" },
  { t: cue("F10.datos") - 0.2, pose: "explicar" },
  { t: cue("F10.ref") - 0.1, pose: "explicarIzq" },
  { t: cue("F11") - 0.2, pose: "senalarIzqArriba" },
  { t: cue("F11.mod") - 0.2, pose: "explicarIzq" },
  { t: cue("F12") - 0.3, pose: "explicar" },
  { t: cue("F12.temas") - 0.2, pose: "explicarIzq" },
  { t: cue("F12.obs") - 0.1, pose: "explicar" },
  { t: cue("F12.fin") - 0.4, pose: "saludarIzq", dur: 0.5 },
];

/** 0..1: cuánto está hablando `quien` en el instante t (con ataque y caída suaves). */
function hablaEn(t: number, quien: "M" | "F") {
  let v = 0;
  for (const f of FRASES) {
    if (f.parrafo[0] !== quien) continue;
    v = Math.max(v, Math.min(prog(t, f.inicio - 0.05, 0.18, E.lin), 1 - prog(t, f.fin - 0.05, 0.22, E.lin)));
  }
  return v;
}

export function Presentadores({ t }: { t: number }) {
  const pm = lugarEn(t, lugarMati), pf = lugarEn(t, lugarFeli);
  const visible = (x: number) => x > -330 && x < 2250;
  // Video de una sola parte: el otro presentador solo aparece donde corresponde (la conclusión compartida).
  const verMati = SOLO !== "F" || t >= cue("F12") - 1.2;
  const verFeli = SOLO !== "M" || t < cue("M2");
  const intro = cue("M2") - 1.6;
  const tagM = Math.min(prog(t, cue("M1.mati") - 0.3, 0.5, E.out), 1 - prog(t, cue("M10.fin") + 0.2, 0.4)) + Math.min(prog(t, cue("F12") + 0.2, 0.5), 1 - prog(t, T_FINAL - 0.6, 0.4));
  const tagF = Math.min(prog(t, cue("M1.feli") - 0.3, 0.5, E.out), 1 - prog(t, intro, 0.4)) + Math.min(prog(t, cue("F1") - 0.4, 0.5), 1 - prog(t, T_FINAL - 0.6, 0.4));
  const largoM = 1 - prog(t, intro - 0.2, 0.6), largoF = largoM;
  return (
    <>
      {verFeli && visible(pf.x) && <Presenter quien="feli" t={t} x={pf.x} y={pf.y} escala={pf.s} pose={poseEn(t, gestosFeli)} habla={hablaEn(t, "F")} />}
      {verMati && visible(pm.x) && <Presenter quien="mati" t={t} x={pm.x} y={pm.y} escala={pm.s} pose={poseEn(t, gestosMati)} habla={hablaEn(t, "M")} />}
      {verMati && visible(pm.x) && <NombreTag x={pm.x} y={pm.y - 318 * pm.s - 58} corto="MATI" nombre="Matías Colimodio" color={C.cyan} p={clamp(tagM)} largo={largoM} />}
      {verFeli && visible(pf.x) && <NombreTag x={pf.x} y={pf.y - 318 * pf.s - 58} corto="FELI" nombre="Felipe de Ortúzar" color={C.orange} p={clamp(tagF)} largo={largoF} />}
    </>
  );
}
