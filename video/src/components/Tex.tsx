// Fórmulas con KaTeX. Las partes marcadas con \hl{nombre}{...} pueden colorearse o
// aparecer por separado mediante la prop `hl`.
import katex from "katex";
import type { CSSProperties } from "react";
import { clamp } from "../core/anim";

const cache = new Map<string, string>();
const nombres = new Set<string>();
let hoja: HTMLStyleElement | null = null;

function registrar(tex: string) {
  let cambio = false;
  for (const m of tex.matchAll(/\\hl\{([A-Za-z0-9]+)\}/g)) {
    if (!nombres.has(m[1])) {
      nombres.add(m[1]);
      cambio = true;
    }
  }
  if (!cambio) return;
  if (!hoja) {
    hoja = document.createElement("style");
    document.head.appendChild(hoja);
  }
  hoja.textContent = [...nombres]
    .map((n) => `.hl-${n}{color:var(--hl-${n}-c,inherit);opacity:var(--hl-${n}-o,1);text-shadow:var(--hl-${n}-g,none)}`)
    .join("\n");
}

export function texHTML(tex: string, display = false) {
  const k = (display ? "D" : "I") + tex;
  let html = cache.get(k);
  if (!html) {
    registrar(tex);
    html = katex.renderToString(tex, {
      displayMode: display,
      throwOnError: true,
      strict: "ignore",
      trust: true,
      output: "html",
      macros: { "\\hl": "\\htmlClass{hl-#1}{#2}", "\\dd": "\\mathrm{d}" },
    });
    cache.set(k, html);
  }
  return html;
}

export type HL = Record<string, { c?: string; o?: number; glow?: string }>;

export function Tex({
  tex, size = 48, color, display = false, hl, style, reveal, rise = 14,
}: {
  tex: string; size?: number; color?: string; display?: boolean; hl?: HL; style?: CSSProperties;
  /** 0..1: aparición (opacidad + barrido de izquierda a derecha + leve ascenso). */
  reveal?: number; rise?: number;
}) {
  const vars: Record<string, string | number> = {};
  if (hl)
    for (const [n, v] of Object.entries(hl)) {
      if (v.c) vars[`--hl-${n}-c`] = v.c;
      if (v.o !== undefined) vars[`--hl-${n}-o`] = clamp(v.o);
      if (v.glow) vars[`--hl-${n}-g`] = `0 0 22px ${v.glow}`;
    }
  const r = reveal === undefined ? 1 : clamp(reveal);
  const st: CSSProperties = {
    display: "inline-block", fontSize: size, color, lineHeight: 1.2, whiteSpace: "nowrap",
    ...(reveal === undefined ? {} : {
      opacity: clamp(r * 1.6),
      transform: `translateY(${(1 - r) * rise}px)`,
      clipPath: r >= 1 ? undefined : `inset(-30% ${((1 - r) * 100).toFixed(2)}% -30% -5%)`,
    }),
    ...(vars as CSSProperties), ...style,
  };
  return <span style={st} dangerouslySetInnerHTML={{ __html: texHTML(tex, display) }} />;
}
