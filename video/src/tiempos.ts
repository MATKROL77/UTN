// Instantes derivados de los cues que comparten varias piezas (escenas y presentadores).
import { cue } from "./core/tl";

export const T = {
  /** Las cuatro tarjetas pasan a columna y aparece la web (escena 3). */
  tiposApp: cue("M5.e0") - 1.3,
  /** Aparece la web con rotación y traslación (escena 4). */
  coordsApp: cue("M7.orient") - 0.5,
  /** Aparece la web con la segunda ley (escena 7). */
  keplerApp: cue("F4.pag") - 0.3,
  /** Aparece la web con el potencial (escena 9). */
  campoApp: cue("F7.pag") - 0.3,
};

/** Aparece la web en la conclusión (escena 12). */
export const T_CONCL_APP = cue("F11") - 0.25;
