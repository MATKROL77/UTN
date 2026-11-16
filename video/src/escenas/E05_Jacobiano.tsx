// ESCENA 5 — Jacobiano: derivadas parciales, det(J) = r, elemento de área dA = r dr dθ y paso a los sectores.
import { E, clamp, fmt, inOut, kf, lerp, prog, pulse } from "../core/anim";
import { mapa, pathDe, pathOrbita, pathSector, rad, radius, type Map2, type Point } from "../core/orbit";
import { C, FONT, MONO } from "../core/theme";
import { cue } from "../core/tl";
import { Flecha, Foco, Lienzo, Rotulo, Trazo } from "../components/Plano";
import { Tex } from "../components/Tex";
import { Antetitulo, Caja, Tarjeta } from "../components/ui";
import { Escena } from "./comun";
import { A1_FIN, A1_INI, A2_FIN, A2_INI, KO, mapaKepler } from "./kepler-geo";

/** Celda polar r∈[r0,r1], θ∈[a0,a1] (radianes) como polígono. */
function celda(r0: number, r1: number, a0: number, a1: number, m: Map2, n = 14) {
  const pts: Point[] = [];
  for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; pts.push({ x: r1 * Math.cos(a), y: r1 * Math.sin(a) }); }
  for (let i = n; i >= 0; i--) { const a = a0 + ((a1 - a0) * i) / n; pts.push({ x: r0 * Math.cos(a), y: r0 * Math.sin(a) }); }
  return pathDe(pts, m, true);
}

const CX = 1190;

function Matriz({ t }: { t: number }) {
  const c = (id: string) => cue(id);
  const sale = 1 - prog(t, c("M9") - 0.45, 0.45);
  if (sale <= 0) return null;
  const tD = c("M8.deriv"), tDet = c("M8.det"), tR = c("M8.r");
  const paso = Math.min(0.42, Math.max(0.2, (tDet - tD - 1.6) / 8));
  const izq = (i: number) => prog(t, tD - 0.1 + i * paso, 0.45, E.out);
  const der = (i: number) => prog(t, tD + 0.5 + (4 + i) * paso, 0.45, E.out);
  const res = prog(t, tR - 0.15, 0.6, E.outBack);
  const gres = pulse(t, tR - 0.1, 2.2);
  return (
    <div className="full" style={{ opacity: sale }}>
      <Caja x={CX} y={138} p={prog(t, c("M8") + 0.2, 0.7, E.out)} centro style={{ textAlign: "center" }}>
        <Antetitulo>Transformación de coordenadas</Antetitulo>
        <div style={{ marginTop: 14 }}><Tex tex={"(r,\\,\\theta)\\ \\longmapsto\\ (x,\\,y)=(r\\cos\\theta,\\ r\\sin\\theta)"} size={52} color={C.text} /></div>
      </Caja>
      <Caja x={CX} y={400} p={prog(t, c("M8.jac") - 0.2, 0.7, E.out)} centro>
        <Tex size={60} color={C.text}
          tex={"\\hl{J}{J}=\\begin{pmatrix}\\hl{a}{\\dfrac{\\partial x}{\\partial r}} & \\hl{b}{\\dfrac{\\partial x}{\\partial\\theta}}\\\\[2.4ex] \\hl{c}{\\dfrac{\\partial y}{\\partial r}} & \\hl{d}{\\dfrac{\\partial y}{\\partial\\theta}}\\end{pmatrix}\\hl{eq}{=}\\hl{eq}{\\begin{pmatrix}\\hl{A}{\\cos\\theta} & \\hl{B}{-r\\sin\\theta}\\\\[1.6ex] \\hl{Cc}{\\sin\\theta} & \\hl{D}{r\\cos\\theta}\\end{pmatrix}}"}
          hl={{
            J: { c: C.orange },
            a: { o: izq(0), c: C.violetSoft }, b: { o: izq(1), c: C.violetSoft }, c: { o: izq(2), c: C.violetSoft }, d: { o: izq(3), c: C.violetSoft },
            eq: { o: prog(t, tD + 0.3 + 3.4 * paso, 0.5) },
            A: { o: der(0) }, B: { o: der(1) }, Cc: { o: der(2) }, D: { o: der(3) },
          }} />
      </Caja>
      <Caja x={CX} y={640} p={prog(t, tDet - 0.2, 0.9, E.out)} centro>
        <Tex tex={"\\det J = r\\cos^2\\theta + r\\sin^2\\theta"} size={52} color={C.text} reveal={prog(t, tDet - 0.2, 1.1, E.out)} />
      </Caja>
      <Caja x={CX} y={800} p={res} centro escala={0.12} dy={0}>
        <Tarjeta borde={C.cyan} brillo={`rgba(110,223,232,${0.25 + 0.4 * gres})`} style={{ padding: "16px 54px" }}>
          <Tex tex={"\\det(J)=\\hl{r}{r}"} size={92} color="#fff" hl={{ r: { c: C.cyan, glow: `rgba(110,223,232,${0.5 + 0.5 * gres})` } }} />
        </Tarjeta>
      </Caja>
    </div>
  );
}

function Elemento({ t }: { t: number }) {
  const c = (id: string) => cue(id);
  const a = inOut(t, c("M9") - 0.25, c("M10") - 0.1, 0.6, 0.6);
  if (a <= 0) return null;
  const dr = 0.6, dth = 20, th0 = 30;
  const tG = c("M9.grande") - 0.2, dG = Math.max(2.2, c("M9.fin") + 0.3 - tG);
  const r0 = kf(t, [[tG, 1], [tG + dG * 0.42, 2], [tG + dG * 0.5, 2], [tG + dG * 0.92, 3]]);
  // Plano de parámetros (r, θ): r horizontal, θ vertical
  const P = { ox: 620, oy: 842, sr: 104, st: 5.4 };
  const PX = (r: number) => P.ox + r * P.sr, PY = (g: number) => P.oy - g * P.st;
  // Plano físico (x, y)
  const m = mapa(1262, 842, 142);
  const a0 = rad(th0), a1 = rad(th0 + dth);
  const mismo = prog(t, c("M9.ang") - 0.2, 0.6, E.out);
  const etq = prog(t, c("M9.rdrdt") - 0.2, 0.5, E.out);
  const gR = Math.max(pulse(t, c("M9.rdrdt") - 0.1, 1.6), pulse(t, c("M9.dist") - 0.2, 2.2));
  const dist = prog(t, c("M9.dist") - 0.3, 0.6, E.out);
  const fantasmas = [1, 2].filter((r) => r0 > r + 0.02);
  const area = (r: number) => (r + dr / 2) * dr * rad(dth);
  const aparece = prog(t, c("M9") + 0.1, 0.9, E.out);
  const rm = r0 + dr / 2, am = (a0 + a1) / 2;
  return (
    <div className="full" style={{ opacity: a }}>
      <Caja x={CX} y={150} p={prog(t, c("M9.dA") - 0.3, 0.8, E.out)} centro>
        <Tex tex={"dA=\\hl{r}{r}\\,dr\\,d\\theta"} size={88} color={C.text} reveal={prog(t, c("M9.dA") - 0.3, 1.0, E.out)}
          hl={{ r: { c: C.cyan, glow: gR > 0.05 ? `rgba(110,223,232,${gR})` : undefined } }} />
      </Caja>
      <Lienzo style={{ opacity: aparece }}>
        {/* ---------- Plano de parámetros ---------- */}
        <Flecha x1={P.ox - 20} y1={P.oy} x2={PX(4.35)} y2={P.oy} color={C.axis} w={2} punta={11} />
        <Flecha x1={P.ox} y1={P.oy + 20} x2={P.ox} y2={PY(100)} color={C.axis} w={2} punta={11} />
        {[1, 2, 3, 4].map((r) => <g key={r}><line x1={PX(r)} x2={PX(r)} y1={P.oy} y2={PY(92)} stroke={C.grid} strokeOpacity={0.16} /><text x={PX(r)} y={P.oy + 30} textAnchor="middle" fontSize={19} fill={C.dim} className="mono">{r}</text></g>)}
        {[30, 60, 90].map((g) => <g key={g}><line x1={P.ox} x2={PX(4.2)} y1={PY(g)} y2={PY(g)} stroke={C.grid} strokeOpacity={0.16} /><text x={P.ox - 14} y={PY(g) + 6} textAnchor="end" fontSize={19} fill={C.dim} className="mono">{g}°</text></g>)}
        <Rotulo x={PX(4.35) + 22} y={P.oy + 8} color={C.muted} italic size={30}>r</Rotulo>
        <Rotulo x={P.ox} y={PY(100) - 14} color={C.muted} italic size={30}>θ</Rotulo>
        {mismo > 0 && <rect x={P.ox} y={PY(th0 + dth)} width={4.2 * P.sr} height={dth * P.st} fill={C.violet} opacity={0.16 * mismo} />}
        {fantasmas.map((r) => <rect key={r} x={PX(r)} y={PY(th0 + dth)} width={dr * P.sr} height={dth * P.st} fill={C.cyan} fillOpacity={0.1} stroke={C.cyan} strokeOpacity={0.45} strokeWidth={1.5} strokeDasharray="5 5" />)}
        <rect x={PX(r0)} y={PY(th0 + dth)} width={dr * P.sr} height={dth * P.st} fill={C.cyan} fillOpacity={0.3} stroke={C.cyan} strokeWidth={3} />
        <Rotulo x={PX(r0 + dr / 2)} y={PY(th0) + 30} color={C.cyan} italic size={27} o={etq}>dr</Rotulo>
        <Rotulo x={PX(r0 + dr) + 14} y={PY(th0 + dth / 2) + 9} color={C.violetSoft} italic size={27} anchor="start" o={etq}>dθ</Rotulo>

        {/* ---------- Plano físico ---------- */}
        <Flecha x1={m.ox - 20} y1={m.oy} x2={m.X(4.25)} y2={m.oy} color={C.axis} w={2} punta={11} />
        <Flecha x1={m.ox} y1={m.oy + 20} x2={m.ox} y2={m.Y(4.25)} color={C.axis} w={2} punta={11} />
        <Rotulo x={m.X(4.25) + 20} y={m.oy + 8} color={C.muted} italic size={30}>x</Rotulo>
        <Rotulo x={m.ox} y={m.Y(4.25) - 14} color={C.muted} italic size={30}>y</Rotulo>
        {[1, 2, 3, 4].map((r) => <path key={r} d={celda(r, r, 0, Math.PI / 2, m, 40).split("L").slice(0, 41).join("L")} fill="none" stroke={C.grid} strokeOpacity={0.3} strokeWidth={1.2} />)}
        {[10, 20, 30, 40, 50, 60, 70, 80].map((g) => <line key={g} x1={m.ox} y1={m.oy} x2={m.X(4.05 * Math.cos(rad(g)))} y2={m.Y(4.05 * Math.sin(rad(g)))} stroke={C.grid} strokeOpacity={g % 30 === 0 ? 0.3 : 0.14} strokeWidth={1.2} />)}
        {mismo > 0 && <path d={celda(0, 4.05, a0, a1, m, 20)} fill={C.violet} opacity={0.2 * mismo} />}
        {fantasmas.map((r) => (
          <g key={r}>
            <path d={celda(r, r + dr, a0, a1, m)} fill={C.cyan} fillOpacity={0.1} stroke={C.cyan} strokeOpacity={0.5} strokeWidth={1.5} strokeDasharray="5 5" />
          </g>
        ))}
        <path d={celda(r0, r0 + dr, a0, a1, m)} fill={C.cyan} fillOpacity={0.34} stroke={C.cyan} strokeWidth={3} />
        {/* arco exterior r·dθ resaltado */}
        <path d={celda(r0 + dr, r0 + dr, a0, a1, m, 16).split("L").slice(0, 17).join("L")} fill="none" stroke={C.orange} strokeWidth={5} strokeLinecap="round" opacity={etq} />
        <Rotulo x={m.X((r0 + dr + 0.42) * Math.cos(am))} y={m.Y((r0 + dr + 0.42) * Math.sin(am)) + 9} color={C.orangeSoft} italic size={30} o={etq}>r dθ</Rotulo>
        <Rotulo x={m.X(rm * Math.cos(a0 - 0.13))} y={m.Y(rm * Math.sin(a0 - 0.13)) + 9} color={C.cyan} italic size={27} o={etq}>dr</Rotulo>
        {dist > 0 && (
          <g opacity={dist}>
            <Flecha x1={m.ox} y1={m.oy} x2={m.X(r0 * Math.cos(a1 + 0.16))} y2={m.Y(r0 * Math.sin(a1 + 0.16))} color={C.cyan} w={3.5} punta={13} />
            <Rotulo x={m.X(r0 * 0.5 * Math.cos(a1 + 0.3))} y={m.Y(r0 * 0.5 * Math.sin(a1 + 0.3))} color={C.cyan} italic size={34}>r</Rotulo>
          </g>
        )}
        <circle cx={m.ox} cy={m.oy} r={6} fill={C.sun} />
        {/* flecha T entre planos */}
        <path d={`M${PX(r0 + dr) + 6},${PY(th0 + dth) - 10} C${PX(r0 + dr) + 120},${PY(th0 + dth) - 150} ${m.X(rm * Math.cos(am)) - 190},${m.Y(rm * Math.sin(am)) - 110} ${m.X(r0 * Math.cos(a1)) - 16},${m.Y(r0 * Math.sin(a1)) - 6}`} fill="none" stroke={C.muted} strokeWidth={2} strokeDasharray="6 7" opacity={0.75} />
      </Lienzo>
      <div style={{ opacity: aparece }}>
        <div className="abs" style={{ left: 668, top: 262, fontFamily: FONT, display: "flex", gap: 10, alignItems: "baseline" }}><Antetitulo color={C.muted} tam={18}>Plano de parámetros</Antetitulo><Tex tex={"(r,\\,\\theta)"} size={24} color={C.muted} /></div>
        <div className="abs" style={{ left: 1500, top: 262, fontFamily: FONT, display: "flex", gap: 10, alignItems: "baseline" }}><Antetitulo color={C.muted} tam={18}>Plano físico</Antetitulo><Tex tex={"(x,\\,y)"} size={24} color={C.muted} /></div>
        <Caja x={668} y={300} p={prog(t, c("M9.geo") - 0.2, 0.5, E.out)} dy={8}>
          <span style={{ fontFamily: MONO, fontSize: 25, color: C.text }}>dr·dθ = {fmt(dr * rad(dth))} <span style={{ color: C.muted }}>· siempre igual</span></span>
        </Caja>
        <Caja x={1500} y={300} p={prog(t, c("M9.geo") - 0.2, 0.5, E.out)} dy={8}>
          <span style={{ fontFamily: MONO, fontSize: 25, color: C.text }}>área ≈ <span style={{ color: C.cyan }}>r</span>·dr·dθ = <span style={{ color: C.orange, fontWeight: 700 }}>{fmt(area(r0))}</span></span>
        </Caja>
        <Caja x={1500} y={340} p={mismo} dy={8}>
          <span style={{ fontFamily: FONT, fontSize: 23, color: C.violetSoft, fontWeight: 600 }}>mismo ángulo dθ · arco r dθ = {fmt((r0 + dr) * rad(dth))}</span>
        </Caja>
      </div>
    </div>
  );
}

function HaciaKepler({ t }: { t: number }) {
  const c = (id: string) => cue(id);
  const a = prog(t, c("M10") + 0.1, 0.7, E.out);
  if (a <= 0) return null;
  const m = mapaKepler(t);
  const dib = prog(t, c("M10.geo") - 0.5, 1.5);
  // Celdas polares que llenan el sector azul
  const tA = c("M10.areas") - 0.3, dA = Math.max(1.6, c("M10.kepler") - tA - 0.6);
  const celdas: { d: string; k: number }[] = [];
  const nA = 14, drc = 0.34;
  for (let i = 0; i < nA; i++) {
    const a0 = A1_INI + ((A1_FIN - A1_INI) * i) / nA, a1 = A1_INI + ((A1_FIN - A1_INI) * (i + 1)) / nA;
    const rMax = radius((a0 + a1) / 2, KO.p, KO.e);
    for (let r = 0, j = 0; r < rMax - 1e-6; r += drc, j++) celdas.push({ d: celda(r, Math.min(rMax, r + drc), a0, a1, m, 4), k: i / nA + j * 0.012 });
  }
  const fusion = prog(t, tA + dA + 0.1, 0.7);
  const naranja = prog(t, c("M10.kepler") - 0.1, 0.8, E.out);
  const sale = 1 - prog(t, c("M10.fin") + 0.05, 0.5);
  return (
    <div className="full" style={{ opacity: a }}>
      <Lienzo>
        <Trazo d={pathOrbita(KO, m)} p={dib} color={C.orbit} w={3.2} brillo />
        {celdas.map((cl, i) => {
          const q = prog(t, tA + cl.k * dA, 0.35, E.out);
          return q > 0 ? <path key={i} d={cl.d} fill={C.blue} fillOpacity={0.26 * q * (1 - fusion * 0.6)} stroke={C.blue} strokeOpacity={0.85 * q * (1 - fusion)} strokeWidth={1.3} /> : null;
        })}
        {fusion > 0 && <path d={pathSector(KO, A1_INI, A1_FIN, m)} fill={C.blue} fillOpacity={0.22 * fusion} stroke={C.blue} strokeWidth={2.4} strokeOpacity={fusion} />}
        {naranja > 0 && <path d={pathSector(KO, A2_INI, A2_FIN, m)} fill={C.orange} fillOpacity={0.3 * naranja} stroke={C.orange} strokeWidth={2.4} strokeOpacity={naranja} />}
        <Foco x={m.ox} y={m.oy} r={13} t={t} o={dib} />
      </Lienzo>
      <div style={{ opacity: sale }}>
        <Caja x={CX} y={128} p={prog(t, c("M10") + 0.3, 0.7, E.out)} centro style={{ textAlign: "center" }}>
          <Antetitulo>De la geometría orbital al cálculo de áreas</Antetitulo>
        </Caja>
        <Caja x={CX} y={226} p={prog(t, c("M10.areas") - 0.3, 0.8, E.out)} centro>
          <Tex tex={"A=\\iint dA=\\iint \\hl{r}{r}\\,dr\\,d\\theta"} size={68} color={C.text} reveal={prog(t, c("M10.areas") - 0.3, 1.0, E.out)} hl={{ r: { c: C.cyan } }} />
        </Caja>
        <Caja x={CX} y={934} p={naranja * (1 - prog(t, c("M10.fin") - 0.35, 0.4))} centro dy={14}>
          <span style={{ fontFamily: FONT, fontSize: 30, fontWeight: 650, letterSpacing: 4, color: C.text }}>
            SEGUNDA LEY DE KEPLER <span style={{ color: C.orange }}>→</span>
          </span>
        </Caja>
      </div>
    </div>
  );
}

export function Jacobiano({ t, ini, fin }: { t: number; ini: number; fin: number }) {
  return (
    <Escena t={t} ini={ini} fin={fin} zOut={1}>
      <Matriz t={t} />
      <Elemento t={t} />
      <HaciaKepler t={t} />
    </Escena>
  );
}
