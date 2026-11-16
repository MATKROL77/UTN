// Geometría compartida entre el final de la escena 5 y la escena 7: la misma elipse y los mismos
// sectores que muestra la web en "Segunda ley de Kepler" (p = 3, e = 0,65, θ₁ = −35°, Δθ₁ = 70°, θ₂ = 145°).
import { E, lerp, prog } from "../core/anim";
import { equalAreaEnd, mapa, rad, sweptArea, type Orbit } from "../core/orbit";
import { cue } from "../core/tl";

export const KO: Orbit = { p: 3, e: 0.65, alpha: 0, h: 0, k: 0 };
export const A1_INI = rad(-35);
export const A1_FIN = rad(35);
export const A2_INI = rad(145);
export const AREA1 = sweptArea(KO.p, KO.e, A1_INI, A1_FIN);
export const A2_FIN = equalAreaEnd(KO.p, KO.e, A2_INI, AREA1);
export const AREA2 = sweptArea(KO.p, KO.e, A2_INI, A2_FIN);

const M_JAC = mapa(1430, 610, 70); // posición al final de la escena del jacobiano
const M_KEP = mapa(1050, 566, 84); // posición durante la segunda ley

/** La elipse se desliza de la escena 5 a la 7 mientras Mati se va y entra Feli. */
export function mapaKepler(t: number) {
  const u = prog(t, cue("M10.fin") - 0.45, 1.5, E.inOut);
  return mapa(lerp(M_JAC.ox, M_KEP.ox, u), lerp(M_JAC.oy, M_KEP.oy, u), lerp(M_JAC.s, M_KEP.s, u));
}

/** Anomalía media a partir de la anomalía verdadera (ecuación de Kepler). */
export function mediaDeVerdadera(theta: number, e: number) {
  const E_ = 2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(theta / 2), Math.sqrt(1 + e) * Math.cos(theta / 2));
  return E_ - e * Math.sin(E_);
}
