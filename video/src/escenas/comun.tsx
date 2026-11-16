// Envoltorio común de escena: aparición/desaparición con un leve empuje de cámara.
import type { CSSProperties, ReactNode } from "react";
import { E, lerp, prog } from "../core/anim";

export type DefEscena = { id: string; ini: number; fin: number; titulo: string; C: (p: { t: number; ini: number; fin: number }) => ReactNode };

export const D_IN = 0.6;
export const D_OUT = 0.5;

/** Devuelve la opacidad y los progresos de entrada/salida de una escena. */
export function ventana(t: number, ini: number, fin: number, dIn = D_IN, dOut = D_OUT) {
  const pin = prog(t, ini, dIn, E.out);
  const pout = prog(t, fin - dOut, dOut, E.in);
  return { a: Math.min(pin, 1 - pout), pin, pout };
}

export function Escena({ t, ini, fin, children, zoom = true, dIn = D_IN, dOut = D_OUT, origen = "50% 46%", zOut = 1.06, style }: {
  t: number; ini: number; fin: number; children: ReactNode; zoom?: boolean; dIn?: number; dOut?: number; origen?: string; zOut?: number; style?: CSSProperties;
}) {
  const { a, pin, pout } = ventana(t, ini, fin, dIn, dOut);
  if (a <= 0.001) return null;
  const s = zoom ? lerp(0.965, 1, pin) * lerp(1, zOut, pout) : 1;
  return <div className="full" style={{ opacity: a, transform: s === 1 ? undefined : `scale(${s.toFixed(5)})`, transformOrigin: origen, ...style }}>{children}</div>;
}
