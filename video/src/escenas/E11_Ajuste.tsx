// ESCENA 11 — Ajuste de parámetros: minimizar la distancia entre observaciones y modelo.
// IMPORTANTE: los puntos son DATOS DE DEMOSTRACIÓN generados aquí mismo (semilla fija). No son los
// datos oficiales del Grupo 14 y no se muestra ningún valor numérico como resultado.
import { E, clamp, inOut, lerp, prog, pulse, rng } from "../core/anim";
import { mapa, pathOrbita, rad, type Orbit, type Point } from "../core/orbit";
import { C, FONT } from "../core/theme";
import { cue } from "../core/tl";
import { Ejes, Foco, Lienzo, Rejilla, Trazo } from "../components/Plano";
import { Tex } from "../components/Tex";
import { Antetitulo, Caja, Chip } from "../components/ui";
import { Escena } from "./comun";

type Beta = [number, number, number, number, number]; // p, e, α (rad), h, k

/** Observaciones de demostración: una elipse de referencia más ruido pseudoaleatorio. */
const OBS: Point[] = (() => {
  const r = rng(2026);
  const gauss = () => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r());
  const ref: Orbit = { p: 3.1, e: 0.52, alpha: 35, h: 0.6, k: -0.3 };
  return Array.from({ length: 24 }, (_, i) => {
    const th = rad(18 + (i * 306) / 23 + (r() - 0.5) * 6);
    const rr = ref.p / (1 + ref.e * Math.cos(th)) + gauss() * 0.1;
    const a = th + rad(ref.alpha);
    return { x: ref.h + rr * Math.cos(a), y: ref.k + rr * Math.sin(a) };
  });
})();

/** Residuo radial de cada observación: distancia al modelo medida sobre el rayo que sale del foco. */
function residuos(b: Beta) {
  const [p, e, al, h, k] = b;
  return OBS.map((o) => {
    const dx = o.x - h, dy = o.y - k;
    const r = Math.hypot(dx, dy), th = Math.atan2(dy, dx) - al;
    return r - p / Math.max(0.05, 1 + e * Math.cos(th));
  });
}
const error = (b: Beta) => residuos(b).reduce((a, d) => a + d * d, 0);

/** Levenberg–Marquardt con derivadas numéricas. Devuelve todas las iteraciones aceptadas. */
const ITER: Beta[] = (() => {
  let b: Beta = [2.0, 0.3, rad(20), 1.2, 0.4]; // estimación inicial, deliberadamente alejada
  const camino: Beta[] = [b];
  let lambda = 0.02, E0 = error(b);
  for (let it = 0; it < 200 && camino.length < 16; it++) {
    const r0 = residuos(b);
    const J = r0.map(() => [0, 0, 0, 0, 0]);
    for (let j = 0; j < 5; j++) {
      const bb = [...b] as Beta;
      bb[j] += 1e-5;
      const r1 = residuos(bb);
      for (let i = 0; i < r0.length; i++) J[i][j] = (r1[i] - r0[i]) / 1e-5;
    }
    const A = Array.from({ length: 5 }, (_, i) => Array.from({ length: 5 }, (_, j) => J.reduce((s, f) => s + f[i] * f[j], 0)));
    const g = Array.from({ length: 5 }, (_, i) => -J.reduce((s, f, n) => s + f[i] * r0[n], 0));
    for (let i = 0; i < 5; i++) A[i][i] *= 1 + lambda;
    // Eliminación de Gauss
    const M = A.map((f, i) => [...f, g[i]]);
    for (let i = 0; i < 5; i++) {
      let piv = i;
      for (let q = i + 1; q < 5; q++) if (Math.abs(M[q][i]) > Math.abs(M[piv][i])) piv = q;
      [M[i], M[piv]] = [M[piv], M[i]];
      for (let q = i + 1; q < 5; q++) { const f = M[q][i] / M[i][i]; for (let cc = i; cc <= 5; cc++) M[q][cc] -= f * M[i][cc]; }
    }
    const d = [0, 0, 0, 0, 0];
    for (let i = 4; i >= 0; i--) { let s = M[i][5]; for (let q = i + 1; q < 5; q++) s -= M[i][q] * d[q]; d[i] = s / M[i][i]; }
    const paso = 0.3; // pasos amortiguados: la convergencia se ve gradual
    const nb = b.map((v, i) => v + d[i] * paso) as Beta;
    nb[1] = clamp(nb[1], 0, 0.93);
    nb[0] = Math.max(0.3, nb[0]);
    const E1 = error(nb);
    if (E1 < E0) { b = nb; E0 = E1; lambda = Math.max(1e-4, lambda / 2); camino.push(b); } else lambda *= 4;
  }
  return camino;
})();
const E_INI = error(ITER[0]);

function betaEn(u: number): Beta {
  const x = clamp(u) * (ITER.length - 1), i = Math.min(ITER.length - 2, Math.floor(x)), f = x - i;
  return ITER[i].map((v, j) => lerp(v, ITER[i + 1][j], f)) as Beta;
}

const PARAMS = ["p", "e", "\\alpha", "h", "k"];

export function Ajuste({ t, ini, fin }: { t: number; ini: number; fin: number }) {
  const c = (id: string) => cue(id);
  const m = mapa(640, 432, 76);
  const tIter = c("F10.param") - 0.2, dIter = Math.max(3, c("F10.datos") - tIter - 0.2);
  const u = prog(t, tIter, dIter, E.soft);
  const b = betaEn(u);
  const o: Orbit = { p: b[0], e: b[1], alpha: (b[2] * 180) / Math.PI, h: b[3], k: b[4] };
  const curva = prog(t, c("F10.error") - 0.3, 0.9, E.out);
  const res = residuos(b);
  const Erel = Math.sqrt(error(b) / E_INI); // distancia cuadrática media, relativa a la inicial
  const gDatos = pulse(t, c("F10.datos") - 0.1, 3.0), gRef = pulse(t, c("F10.ref") - 0.1, 2.6);
  const gObs = pulse(t, c("F10.obs") - 0.2, 1.6);
  const aviso = prog(t, ini + 0.5, 0.6, E.out);
  return (
    <Escena t={t} ini={ini} fin={fin}>
      <Lienzo>
        <Rejilla m={m} xr={[-7, 4]} yr={[-6, 3.6]} />
        <Ejes m={m} xr={[-7.2, 4.3]} yr={[-6.1, 3.8]} p={prog(t, ini + 0.2, 0.9, E.out)} />
        {/* segmentos de distancia observación–modelo */}
        {curva > 0 && OBS.map((ob, i) => {
          const dx = ob.x - b[3], dy = ob.y - b[4], r = Math.hypot(dx, dy);
          const rm = r - res[i];
          return <line key={i} x1={m.X(ob.x)} y1={m.Y(ob.y)} x2={m.X(b[3] + (dx / r) * rm)} y2={m.Y(b[4] + (dy / r) * rm)} stroke={C.orange} strokeWidth={3} strokeOpacity={0.9 * curva} strokeLinecap="round" />;
        })}
        <Trazo d={pathOrbita(o, m)} p={curva} color={C.orbit} w={3.4} brillo />
        <Foco x={m.X(b[3])} y={m.Y(b[4])} r={11} t={t} o={curva} halo={0.8} />
        {OBS.map((ob, i) => {
          const q = prog(t, c("F10.ajuste") + 0.1 + i * 0.045, 0.4, E.outBack);
          return <circle key={i} cx={m.X(ob.x)} cy={m.Y(ob.y)} r={(7.5 + gObs * 3) * q} fill="#d1b0ff" stroke="#10192d" strokeWidth={2} />;
        })}
      </Lienzo>

      <Caja x={86} y={104} p={aviso} dy={10}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Antetitulo color={C.cyan} tam={19}>Ejemplo de ajuste</Antetitulo>
          <span style={{ transform: `scale(${1 + 0.05 * gDatos})`, transformOrigin: "0 50%", display: "inline-block" }}>
            <Chip color={C.orange} tam={22} activo={0.4 + 0.6 * gDatos}>DATOS DE DEMOSTRACIÓN</Chip>
          </span>
        </div>
      </Caja>
      <Caja x={86} y={842} p={prog(t, c("F10.datos") - 0.2, 0.6, E.out)} dy={12}>
        <div style={{ fontFamily: FONT, fontSize: 27, fontWeight: 600, color: "#fff", padding: "12px 20px", borderRadius: 14, background: "rgba(8,15,29,.9)", border: `2px solid color-mix(in srgb, ${C.orange} ${50 + Math.round(50 * Math.max(gDatos, gRef))}%, #223047)`, whiteSpace: "nowrap", boxShadow: `0 0 ${34 * Math.max(gDatos, gRef)}px rgba(255,177,102,.4)` }}>
          No son los datos oficiales del Grupo 14<span style={{ color: C.orangeSoft, fontWeight: 500, opacity: prog(t, c("F10.ref") - 0.2, 0.5), display: "inline-block", verticalAlign: "bottom", overflow: "hidden", maxWidth: 760 * prog(t, c("F10.ref") - 0.3, 0.6) }}>&nbsp;· conjunto de referencia para explicar el procedimiento</span>
        </div>
      </Caja>

      {/* columna derecha: función de error, parámetros y minimización */}
      <Caja x={1010} y={150} p={prog(t, c("F10.error") - 0.3, 0.7, E.out)} dy={12}>
        <Antetitulo color={C.orange} tam={18}>Función de error</Antetitulo>
        <div style={{ marginTop: 12 }}>
          <Tex tex={"E(p,e,\\alpha,h,k)=\\displaystyle\\sum_{i}\\hl{d}{d_i}^{\\,2}"} size={43} color={C.text} reveal={prog(t, c("F10.error") - 0.3, 1.0, E.out)} hl={{ d: { c: C.orange } }} />
        </div>
        <div style={{ marginTop: 12, fontFamily: FONT, fontSize: 23, color: C.muted, display: "flex", alignItems: "center", gap: 10 }}>
          <i style={{ width: 34, height: 4, borderRadius: 2, background: C.orange, display: "inline-block" }} />
          <Tex tex={"d_i"} size={26} color={C.orangeSoft} /> distancia observación–modelo
        </div>
      </Caja>
      <Caja x={1010} y={420} p={prog(t, c("F10.param") - 0.3, 0.6, E.out)} dy={12}>
        <Antetitulo color={C.cyan} tam={18}>Parámetros a estimar</Antetitulo>
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          {PARAMS.map((s, i) => {
            const q = prog(t, c("F10.param") - 0.2 + i * 0.12, 0.45, E.outBack);
            const mov = u > 0 && u < 1 ? 0.5 + 0.5 * Math.sin(t * 7 + i * 1.3) : 0;
            return (
              <span key={s} style={{ opacity: clamp(q * 1.5), transform: `scale(${0.8 + 0.2 * q}) translateY(${-mov * 4}px)`, width: 66, height: 66, borderRadius: 16, display: "grid", placeItems: "center", background: "rgba(11,19,34,.92)", border: `2px solid color-mix(in srgb, ${C.cyan} ${45 + Math.round(mov * 55)}%, #223047)` }}>
                <Tex tex={s} size={38} color="#fff" />
              </span>
            );
          })}
        </div>
      </Caja>
      <Caja x={1010} y={592} w={420} p={prog(t, c("F10.param") + 0.2, 0.6, E.out)} dy={12}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontFamily: FONT }}>
          <Antetitulo color={C.muted} tam={17}>Error E</Antetitulo>
          <span style={{ fontSize: 23, fontWeight: 650, color: u >= 1 ? C.green : C.orangeSoft, whiteSpace: "nowrap" }}>{u >= 1 ? "mínimo alcanzado ✓" : u > 0 ? "minimizando…" : ""}</span>
        </div>
        <div style={{ marginTop: 12, height: 22, borderRadius: 11, background: "#111d2f", border: `1.5px solid ${C.border2}`, overflow: "hidden" }}>
          <div style={{ width: `${lerp(4, 100, clamp(Erel))}%`, height: "100%", borderRadius: 11, background: `linear-gradient(90deg, ${C.green}, ${C.orange})` }} />
        </div>
      </Caja>
    </Escena>
  );
}
