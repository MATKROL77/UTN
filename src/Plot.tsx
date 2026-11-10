import { useId, useMemo, useEffect, useState, type ReactNode } from "react";
import {
  orbitPoints,
  orbitalPoint,
  rad,
  field,
  type Orbit,
  type Point,
} from "./math";
export type Mode = "orbit" | "areas" | "potential";
type Props = {
  mode: Mode;
  orbit: Orbit;
  theta: number;
  localAxes: boolean;
  observations: Point[];
  sectors?: [number, number, number, number];
  contours: boolean;
  arrows: boolean;
  onProbe?: (point: Point) => void;
};
export default function Plot({
  mode,
  orbit,
  theta,
  localAxes,
  observations,
  sectors,
  contours,
  arrows,
  onProbe,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const { p, e, h, k, alpha } = orbit;
  const [narrow, setNarrow] = useState(
    () => window.matchMedia("(max-width: 700px)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(max-width: 700px)");
    const change = () => setNarrow(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  const W = narrow ? 480 : 900,
    H = narrow ? 390 : 570;
  const camera = useMemo(() => {
    let points: Point[] = [
      { x: 0, y: 0 },
      { x: h, y: k },
    ];
    if (e < 1) points = points.concat(orbitPoints(orbit, 180));
    else points.push({ x: h - 7, y: k - 6 }, { x: h + 7, y: k + 6 });
    points = points.concat(observations);
    const xs = points.map((pt) => pt.x),
      ys = points.map((pt) => pt.y);
    const minX = Math.min(...xs),
      maxX = Math.max(...xs),
      minY = Math.min(...ys),
      maxY = Math.max(...ys);
    const scale = Math.min(
      (W - 145) / Math.max(12, maxX - minX),
      (H - 110) / Math.max(9, maxY - minY),
    );
    return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, scale };
  }, [p, e, h, k, alpha, observations, W, H]);
  const { cx, cy, scale } = camera;
  const X = (x: number) => W / 2 + (x - cx) * scale;
  const Y = (y: number) => H / 2 - (y - cy) * scale;
  const line = (
    a: Point,
    b: Point,
    props: React.SVGProps<SVGLineElement> = {},
  ) => <line x1={X(a.x)} y1={Y(a.y)} x2={X(b.x)} y2={Y(b.y)} {...props} />;
  const path = (pts: Point[], close = false) =>
    pts
      .map(
        (pt, i) =>
          `${i ? "L" : "M"}${X(pt.x).toFixed(2)},${Y(pt.y).toFixed(2)}`,
      )
      .join(" ") + (close ? "Z" : "");
  const trajectory = path(orbitPoints(orbit), e < 1);
  const body = orbitalPoint(theta, orbit);
  const peri = orbitalPoint(0, orbit)!;
  const fx = X(h),
    fy = Y(k);
  const spanX = W / scale,
    spanY = H / scale;
  const idealStep = 80 / scale;
  const step =
    10 ** Math.floor(Math.log10(idealStep)) *
    ([1, 2, 5, 10].find(
      (n) => n * 10 ** Math.floor(Math.log10(idealStep)) >= idealStep,
    ) ?? 10);
  const ticks = (center: number, span: number) =>
    Array.from(
      { length: Math.ceil(span / step) + 1 },
      (_, i) => (Math.ceil((center - span / 2) / step) + i) * step,
    );
  const xticks = ticks(cx, spanX),
    yticks = ticks(cy, spanY);
  const label = (n: number) =>
    Math.abs(n) < 1e-8 ? "0" : Number(n.toPrecision(3)).toString();
  const sector = (
    start: number,
    end: number,
    color: string,
    key: string,
  ): ReactNode => {
    const pts = Array.from(
      { length: 200 },
      (_, i) => orbitalPoint(start + ((end - start) * i) / 199, orbit)!,
    );
    return (
      <path
        key={key}
        data-testid={`sector-${key}`}
        d={path([{ x: h, y: k }, ...pts], true)}
        fill={color}
        fillOpacity="0.22"
        stroke={color}
        strokeWidth="1.5"
      />
    );
  };
  const arrowPoints: ReactNode[] = [];
  if (mode === "potential" && arrows) {
    // Field vectors have normalized display lengths, preserving their true direction.
    for (let ix = -5; ix <= 5; ix++)
      for (let iy = -3; iy <= 3; iy++) {
        const pt = { x: cx + (ix * spanX) / 13, y: cy + (iy * spanY) / 9 },
          vector = field(pt.x, pt.y, h, k);
        const distance = Math.hypot(pt.x - h, pt.y - k);
        if (!vector || distance < 0.5) continue;
        const length = Math.min(24, 10 + 18 / (distance + 0.6));
        const norm = Math.hypot(vector.x, vector.y);
        arrowPoints.push(
          <line
            key={`${ix}-${iy}`}
            x1={X(pt.x)}
            y1={Y(pt.y)}
            x2={X(pt.x) + (vector.x / norm) * length}
            y2={Y(pt.y) - (vector.y / norm) * length}
            stroke="#7392bb"
            strokeWidth="1.25"
            markerEnd={`url(#arrow-${uid})`}
            opacity="0.75"
          />,
        );
      }
  }
  return (
    <svg
      className="orbit-plot"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={
        mode === "areas"
          ? "Elipse con dos sectores de igual área desde el foco"
          : mode === "potential"
            ? "Curvas de nivel y campo gravitatorio alrededor del foco"
            : "Órbita en coordenadas cartesianas con foco, ejes y cuerpo orbitante"
      }
      onClick={(event) => {
        if (mode !== "potential" || !onProbe) return;
        // Invert the SVG transform, including letterboxing on narrow screens.
        const matrix = event.currentTarget.getScreenCTM();
        if (!matrix) return;
        const point = new DOMPoint(
          event.clientX,
          event.clientY,
        ).matrixTransform(matrix.inverse());
        onProbe({
          x: cx + (point.x - W / 2) / scale,
          y: cy - (point.y - H / 2) / scale,
        });
      }}
    >
      <defs>
        <radialGradient id={`bg-${uid}`}>
          <stop stopColor="#142943" stopOpacity=".45" />
          <stop offset="1" stopColor="#0a1325" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`sun-${uid}`}>
          <stop stopColor="#fff4cd" />
          <stop offset=".5" stopColor="#ffd18c" />
          <stop offset="1" stopColor="#e6a555" />
        </radialGradient>
        <radialGradient id={`halo-${uid}`}>
          <stop stopColor="#ffc678" stopOpacity=".18" />
          <stop offset="1" stopColor="#ffc678" stopOpacity="0" />
        </radialGradient>
        <marker
          id={`arrow-${uid}`}
          viewBox="0 0 8 8"
          refX="6"
          refY="4"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path
            d="m1 1 5 3-5 3"
            fill="none"
            stroke="#7392bb"
            strokeWidth="1.4"
          />
        </marker>
        <clipPath id={`clip-${uid}`}>
          <rect width={W} height={H} />
        </clipPath>
      </defs>
      <rect width={W} height={H} fill={`url(#bg-${uid})`} />
      <g clipPath={`url(#clip-${uid})`}>
        <g stroke="#607caa" strokeOpacity=".11" strokeWidth="1">
          {xticks.map((x) => (
            <line key={`x${x}`} x1={X(x)} x2={X(x)} y1="0" y2={H} />
          ))}
          {yticks.map((y) => (
            <line key={`y${y}`} x1="0" x2={W} y1={Y(y)} y2={Y(y)} />
          ))}
        </g>
        <g stroke="#627796" strokeOpacity=".5" strokeWidth="1">
          {line({ x: cx - spanX, y: 0 }, { x: cx + spanX, y: 0 })}
          {line({ x: 0, y: cy - spanY }, { x: 0, y: cy + spanY })}
        </g>
        <g className="tick-label">
          {xticks
            .filter((x) => x !== 0)
            .map((x) => (
              <text
                key={`tx${x}`}
                x={X(x)}
                y={Math.min(H - 12, Math.max(20, Y(0) + 20))}
                textAnchor="middle"
              >
                {label(x)}
              </text>
            ))}
          {yticks
            .filter((y) => y !== 0)
            .map((y) => (
              <text
                key={`ty${y}`}
                x={Math.min(W - 35, Math.max(15, X(0) + 10))}
                y={Y(y) - 6}
              >
                {label(y)}
              </text>
            ))}
          <text x={W - 20} y={Math.min(H - 15, Math.max(20, Y(0) - 12))}>
            x
          </text>
          <text x={Math.min(W - 20, Math.max(20, X(0) + 12))} y="20">
            y
          </text>
        </g>
        {localAxes && mode !== "potential" && (
          <g
            stroke="#a59ae7"
            strokeOpacity=".6"
            strokeWidth="1"
            strokeDasharray="6 7"
          >
            {line(
              {
                x: h - spanX * Math.cos(rad(alpha)),
                y: k - spanX * Math.sin(rad(alpha)),
              },
              {
                x: h + spanX * Math.cos(rad(alpha)),
                y: k + spanX * Math.sin(rad(alpha)),
              },
            )}
            {line(
              {
                x: h + spanX * Math.sin(rad(alpha)),
                y: k - spanX * Math.cos(rad(alpha)),
              },
              {
                x: h - spanX * Math.sin(rad(alpha)),
                y: k + spanX * Math.cos(rad(alpha)),
              },
            )}
            <text
              x={fx + 85 * Math.cos(rad(alpha))}
              y={fy - 85 * Math.sin(rad(alpha)) - 9}
              stroke="none"
              fill="#b0a4ec"
              fontSize="13"
            >
              x′
            </text>
            <text
              x={fx - 75 * Math.sin(rad(alpha)) + 9}
              y={fy - 75 * Math.cos(rad(alpha))}
              stroke="none"
              fill="#b0a4ec"
              fontSize="13"
            >
              y′
            </text>
          </g>
        )}
        {mode === "potential" && contours && (
          <g fill="none" stroke="#46c4df">
            {[0.75, 1.5, 2.5, 4, 6, 9, 13, 20, 30].map((r, i) => (
              <g key={r}>
                <circle
                  cx={fx}
                  cy={fy}
                  r={r * scale}
                  opacity={0.7 - i * 0.055}
                  strokeWidth="1"
                />
                <text
                  x={fx + r * scale * 0.707 + 4}
                  y={fy - r * scale * 0.707 - 4}
                  fill="#7dd3df"
                  stroke="none"
                  fontSize="11"
                  opacity=".85"
                >
                  {(-1 / r).toFixed(2)}
                </text>
              </g>
            ))}
          </g>
        )}
        {arrowPoints}
        {mode !== "potential" && (
          <>
            <path
              d={trajectory}
              fill="none"
              stroke="#4bd9e9"
              strokeWidth="7"
              strokeOpacity=".04"
            />
            <path
              data-testid="orbit-path"
              d={trajectory}
              fill="none"
              stroke="#5cdaea"
              strokeWidth="2.2"
            />
            {mode === "areas" && sectors && (
              <>
                {sector(sectors[0], sectors[1], "#59a9ff", "blue")}
                {sector(sectors[2], sectors[3], "#ffb166", "orange")}
              </>
            )}
            {mode === "orbit" && body && (
              <>
                {line({ x: h, y: k }, body, {
                  stroke: "#58b9cf",
                  strokeOpacity: ".55",
                  strokeDasharray: "4 5",
                })}
                <circle
                  cx={X(body.x)}
                  cy={Y(body.y)}
                  r="16"
                  fill="#53d8ed"
                  fillOpacity=".08"
                />
                <circle
                  cx={X(body.x)}
                  cy={Y(body.y)}
                  r="6"
                  fill="#81e6f3"
                  stroke="#c7f8ff"
                  strokeWidth="1.5"
                />
                <text
                  x={X(body.x) + 14}
                  y={Y(body.y) - 12}
                  fill="#bbdbe9"
                  fontSize="12"
                >
                  Cuerpo orbitante
                </text>
              </>
            )}
            <circle cx={X(peri.x)} cy={Y(peri.y)} r="3" fill="#8be7e6" />
            <text
              x={X(peri.x) + 8}
              y={Y(peri.y) + 18}
              fill="#7098ab"
              fontSize="11"
            >
              Periapsis
            </text>
          </>
        )}
        {observations.map((pt, i) => (
          <circle
            key={i}
            cx={X(pt.x)}
            cy={Y(pt.y)}
            r="3.5"
            fill="#d1b0ff"
            stroke="#10192d"
            strokeWidth="1"
          >
            <title>
              Observación {i + 1}: ({pt.x}, {pt.y})
            </title>
          </circle>
        ))}
        <circle cx={fx} cy={fy} r="35" fill={`url(#halo-${uid})`} />
        <circle cx={fx} cy={fy} r="8" fill={`url(#sun-${uid})`} />
        <text x={fx + 15} y={fy + 27} fill="#deb984" fontSize="12">
          Foco F ({label(h)}, {label(k)})
        </text>
      </g>
      <text
        x="24"
        y={H - 22}
        fill="#59718f"
        fontSize="10.5"
        letterSpacing="1.5"
      >
        {mode === "potential"
          ? "μ = 1 · POTENCIAL NORMALIZADO"
          : "PLANO CARTESIANO · UNIDADES ARBITRARIAS"}
      </text>
      {mode === "areas" && (
        <g fontSize="13" fontWeight="600">
          <text x="25" y="32" fill="#74b8ff">
            A₁ · Sector azul
          </text>
          <text x="25" y="54" fill="#ffbb7d">
            A₂ · Sector naranja
          </text>
        </g>
      )}
    </svg>
  );
}
