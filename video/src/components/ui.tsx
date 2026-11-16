// Piezas de interfaz reutilizables: chips, tarjetas, títulos y rótulos.
import type { CSSProperties, ReactNode } from "react";
import { clamp } from "../core/anim";
import { C, FONT, MONO } from "../core/theme";

/** Contenedor absoluto con aparición (opacidad + desplazamiento). p: 0..1 */
export function Caja({ x, y, w, h, p = 1, dy = 18, dx = 0, escala = 0, centro = false, children, style }: {
  x: number; y: number; w?: number; h?: number; p?: number; dy?: number; dx?: number; escala?: number; centro?: boolean; children?: ReactNode; style?: CSSProperties;
}) {
  if (p <= 0.001) return null;
  const q = clamp(p);
  return (
    <div className="abs" style={{
      left: x, top: y, width: w, height: h, opacity: q,
      transform: `${centro ? "translate(-50%,-50%) " : ""}translate(${(1 - q) * dx}px, ${(1 - q) * dy}px) scale(${1 - (1 - q) * escala})`, ...style,
    }}>{children}</div>
  );
}

export function Chip({ children, color = C.cyan, activo = 1, tam = 22, relleno = false, style }: { children: ReactNode; color?: string; activo?: number; tam?: number; relleno?: boolean; style?: CSSProperties }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: tam * 0.45, padding: `${tam * 0.42}px ${tam * 0.82}px`, borderRadius: 999, fontFamily: FONT, fontSize: tam, fontWeight: 600, whiteSpace: "nowrap",
      color: relleno ? "#06121c" : "#eaf2fb", background: relleno ? color : `color-mix(in srgb, ${color} ${10 + activo * 12}%, #0c1626)`,
      border: `1.5px solid color-mix(in srgb, ${color} ${35 + activo * 55}%, #223047)`, boxShadow: activo > 0.5 ? `0 0 ${24 * activo}px color-mix(in srgb, ${color} 30%, transparent)` : undefined, ...style,
    }}>{children}</span>
  );
}

export function Tarjeta({ children, style, borde = C.border2, brillo }: { children?: ReactNode; style?: CSSProperties; borde?: string; brillo?: string }) {
  return (
    <div style={{
      background: "linear-gradient(180deg, rgba(17,29,47,.94), rgba(11,19,34,.94))", border: `1.5px solid ${borde}`, borderRadius: 20,
      boxShadow: `0 24px 60px rgba(0,0,0,.42)${brillo ? `, 0 0 44px ${brillo}` : ""}`, fontFamily: FONT, ...style,
    }}>{children}</div>
  );
}

/** Rótulo pequeño en mayúsculas espaciadas (como los "eyebrow" de la web). */
export const Antetitulo = ({ children, color = C.cyan, tam = 17, style }: { children: ReactNode; color?: string; tam?: number; style?: CSSProperties }) => (
  <div style={{ fontFamily: FONT, fontSize: tam, fontWeight: 650, letterSpacing: tam * 0.2, textTransform: "uppercase", color, whiteSpace: "nowrap", ...style }}>{children}</div>
);

export const Punto = ({ color = C.cyan, tam = 10 }: { color?: string; tam?: number }) => (
  <i style={{ display: "inline-block", width: tam, height: tam, borderRadius: tam, background: color, boxShadow: `0 0 ${tam}px ${color}` }} />
);

/** Valor numérico destacado (tipo lectura de instrumento). */
export function Lectura({ etiqueta, valor, color = C.cyan, tam = 30, ancho }: { etiqueta: ReactNode; valor: ReactNode; color?: string; tam?: number; ancho?: number }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "baseline", gap: tam * 0.4, padding: `${tam * 0.32}px ${tam * 0.6}px`, borderRadius: 14, background: "rgba(11,19,34,.9)", border: `1.5px solid color-mix(in srgb, ${color} 55%, #223047)`, fontFamily: MONO, fontSize: tam, color: "#eaf2fb", whiteSpace: "nowrap", minWidth: ancho }}>
      <span style={{ color, fontWeight: 700, fontFamily: "KaTeX_Math, serif", fontStyle: "italic", fontSize: tam * 1.1 }}>{etiqueta}</span>
      <span style={{ color: C.muted }}>=</span>
      <span style={{ fontWeight: 600 }}>{valor}</span>
    </div>
  );
}
