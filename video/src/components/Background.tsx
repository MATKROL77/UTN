// Fondo común: degradado azul oscuro, estrellas muy sutiles y cuadrícula cartesiana tenue.
import { useMemo } from "react";
import { rng } from "../core/anim";
import { C, H, W } from "../core/theme";

export function Background({ t, grid = 0.5, drift = 1 }: { t: number; grid?: number; drift?: number }) {
  const stars = useMemo(() => {
    const r = rng(14);
    return Array.from({ length: 150 }, () => ({ x: r() * W, y: r() * H, s: 0.5 + r() * 1.3, f: 0.3 + r() * 1.2, p: r() * 6.28, d: 0.3 + r() * 0.7 }));
  }, []);
  const gx = ((t * 3 * drift) % 80) - 80;
  return (
    <svg className="full" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <radialGradient id="bg-glow" cx="50%" cy="42%" r="75%">
          <stop offset="0" stopColor="#12233c" />
          <stop offset="0.55" stopColor="#0a1425" />
          <stop offset="1" stopColor="#060b16" />
        </radialGradient>
        <radialGradient id="bg-vig" cx="50%" cy="50%" r="72%">
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.42" />
        </radialGradient>
        <pattern id="bg-grid" width="80" height="80" patternUnits="userSpaceOnUse" x={gx} y={gx * 0.4}>
          <path d="M80 0H0V80" fill="none" stroke={C.grid} strokeWidth="1" strokeOpacity="0.5" />
        </pattern>
        <radialGradient id="bg-gridmask-g" cx="50%" cy="45%" r="62%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.1" />
        </radialGradient>
        <mask id="bg-gridmask"><rect width={W} height={H} fill="url(#bg-gridmask-g)" /></mask>
      </defs>
      <rect width={W} height={H} fill="url(#bg-glow)" />
      {grid > 0 && <rect width={W} height={H} fill="url(#bg-grid)" opacity={0.2 * grid} mask="url(#bg-gridmask)" />}
      <g>
        {stars.map((s, i) => (
          <circle key={i} cx={(s.x + t * 1.6 * s.d * drift) % W} cy={s.y} r={s.s}
            fill={i % 9 === 0 ? "#ffe2b8" : "#cfe6ff"} opacity={0.16 + 0.2 * (0.5 + 0.5 * Math.sin(t * s.f + s.p))} />
        ))}
      </g>
      <rect width={W} height={H} fill="url(#bg-vig)" />
    </svg>
  );
}
