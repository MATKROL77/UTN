// ESCENA 10 — Visualizaciones generadas con Python (python/figuras_kepler.py → public/python/).
// Para usar las figuras propias del grupo: reemplazar los archivos de public/python con los mismos nombres.
import codigo from "../../python/figuras_kepler.py?raw";
import { E, clamp, lerp, prog } from "../core/anim";
import { precargar } from "../core/precarga";
import { C, FONT, MONO } from "../core/theme";
import { cue } from "../core/tl";
import { Antetitulo, Caja } from "../components/ui";
import { Escena } from "./comun";

const N3D = 36;
const cuadro3d = (i: number) => `/python/potencial_3d_${String(((i % N3D) + N3D) % N3D).padStart(2, "0")}.jpg`;
precargar(["/python/orbita_polar.png", "/python/campo_vectorial.png", ...Array.from({ length: N3D }, (_, i) => cuadro3d(i))]);

/** Extrae del script real las tres funciones matemáticas (sin los docstrings). */
function fragmento() {
  const out: string[] = [];
  for (const nombre of ["radio", "potencial", "campo"]) {
    const m = codigo.match(new RegExp(`def ${nombre}\\([^)]*\\):\\n((?:    .*\\n)+)`));
    if (!m) continue;
    out.push(m[0].split("\n")[0], ...m[1].split("\n").filter((l) => l.trim() && !l.trim().startsWith('"""')), "");
  }
  return ["import numpy as np", "import matplotlib.pyplot as plt", "", ...out].slice(0, -1);
}
const LINEAS = fragmento();
const TOTAL = LINEAS.reduce((a, l) => a + l.length + 1, 0);

function colorear(l: string) {
  const partes = l.split(/(\bdef\b|\breturn\b|\bimport\b|\bas\b|\bnp\b|\*\*|#.*$|\b\d+(?:\.\d+)?\b)/g);
  return partes.map((s, i) => {
    const col = /^(def|return|import|as)$/.test(s) ? C.violetSoft : s === "np" ? C.cyan : /^\d/.test(s) ? C.orangeSoft : s.startsWith("#") ? C.dim : undefined;
    return col ? <span key={i} style={{ color: col }}>{s}</span> : s;
  });
}

const FIGS = [
  { id: "F9.orb", src: () => "/python/orbita_polar.png", archivo: "orbita_polar.png", titulo: "Órbita en coordenadas polares" },
  { id: "F9.sup", src: (k: number) => cuadro3d(k), archivo: "potencial_3d.png", titulo: "Superficie 3D del potencial" },
  { id: "F9.campo", src: () => "/python/campo_vectorial.png", archivo: "campo_vectorial.png", titulo: "Campo vectorial −∇U" },
];
const ESCENARIO = { x: 660, y: 118, w: 760, h: 570 };
const MINI = (i: number) => ({ x: 64 + i * 196, y: 664, w: 180, h: 135 });

export function Python({ t, ini, fin }: { t: number; ini: number; fin: number }) {
  const c = (id: string) => cue(id);
  const tPy = ini + 0.35;
  const escrito = Math.floor(prog(t, tPy + 0.5, Math.max(2.2, c("F9.orb") - tPy - 0.8), E.lin) * TOTAL);
  let resto = escrito;
  const k3 = (t - c("F9.sup")) * 12;
  return (
    <Escena t={t} ini={ini} fin={fin}>
      <Caja x={64} y={96} p={prog(t, ini + 0.3, 0.6, E.out)} dy={10}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Antetitulo color={C.cyan} tam={19}>Complemento en Python</Antetitulo>
          <span style={{ fontFamily: MONO, fontSize: 19, color: C.muted }}>NumPy · Matplotlib</span>
        </div>
      </Caja>
      {/* editor con fragmentos del script real */}
      <Caja x={64} y={140} w={568} h={500} p={prog(t, tPy, 0.6, E.out)} dy={16}>
        <div style={{ height: "100%", borderRadius: 16, overflow: "hidden", background: "#0a1220", border: `1.5px solid ${C.border2}`, boxShadow: "0 24px 60px rgba(0,0,0,.45)" }}>
          <div style={{ height: 44, background: "#0e1829", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8, padding: "0 16px" }}>
            {["#ff6b5e", "#ffc24a", "#42d27a"].map((k) => <i key={k} style={{ width: 11, height: 11, borderRadius: 6, background: k, opacity: 0.85 }} />)}
            <span style={{ marginLeft: 12, fontFamily: MONO, fontSize: 18, color: "#a9bbd3" }}>figuras_kepler.py</span>
          </div>
          <pre style={{ margin: 0, padding: "16px 20px", fontFamily: MONO, fontSize: 19.5, lineHeight: 1.52, color: "#cfdcee", whiteSpace: "pre" }}>
            {LINEAS.map((l, i) => {
              const n = clamp(resto, 0, l.length);
              resto -= l.length + 1;
              return <div key={i} style={{ minHeight: "1.52em" }}>{colorear(l.slice(0, n))}{n > 0 && n < l.length && <span style={{ background: C.cyan, color: C.cyan }}>|</span>}</div>;
            })}
          </pre>
        </div>
      </Caja>
      <Caja x={64} y={822} p={prog(t, c("F9.orb") - 0.2, 0.5, E.out)} dy={10}>
        <span style={{ fontFamily: MONO, fontSize: 20, color: C.muted }}>$ python3 figuras_kepler.py <span style={{ color: C.green }}>✓ {FIGS.filter((f) => t >= c(f.id) + 0.4).length} / 3 figuras</span></span>
      </Caja>

      {/* marco del escenario */}
      <div className="abs" style={{ left: ESCENARIO.x - 10, top: ESCENARIO.y - 10, width: ESCENARIO.w + 20, height: ESCENARIO.h + 20, borderRadius: 20, border: `1.5px dashed ${C.border2}`, opacity: prog(t, tPy + 0.2, 0.6) * (1 - prog(t, c("F9.orb") - 0.2, 0.5)) }} />
      {FIGS.map((f, i) => {
        const t0 = c(f.id) - 0.25;
        if (t < t0) return null;
        const entra = prog(t, t0, 0.7, E.out);
        const aMini = i < FIGS.length - 1 ? prog(t, c(FIGS[i + 1].id) - 0.45, 0.75) : 0;
        const mn = MINI(i);
        const r = { x: lerp(ESCENARIO.x, mn.x, aMini), y: lerp(ESCENARIO.y, mn.y, aMini), w: lerp(ESCENARIO.w, mn.w, aMini), h: lerp(ESCENARIO.h, mn.h, aMini) };
        const k = Math.floor(k3), mezcla = k3 - k;
        return (
          <div key={f.id} className="abs" style={{ left: r.x, top: r.y + (1 - entra) * 30, width: r.w, height: r.h, opacity: entra, transform: `scale(${lerp(0.94, 1, entra)})`, borderRadius: lerp(18, 10, aMini), overflow: "hidden", border: `${lerp(2, 1.5, aMini)}px solid ${aMini > 0.5 ? C.border2 : C.cyan}`, boxShadow: `0 24px 70px rgba(0,0,0,.5), 0 0 ${40 * (1 - aMini)}px rgba(110,223,232,.18)`, background: "#0b1322", zIndex: aMini > 0 ? 1 : 2 }}>
            <img src={f.src(i === 1 ? k : 0)} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            {i === 1 && <img src={f.src(k + 1)} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: mezcla }} />}
          </div>
        );
      })}
      {FIGS.map((f, i) => {
        const activo = Math.min(prog(t, c(f.id) - 0.1, 0.5, E.out), i < FIGS.length - 1 ? 1 - prog(t, c(FIGS[i + 1].id) - 0.45, 0.4) : 1);
        return (
          <Caja key={f.id} x={ESCENARIO.x + ESCENARIO.w / 2} y={ESCENARIO.y + ESCENARIO.h + 52} p={activo} centro dy={12} style={{ textAlign: "center", whiteSpace: "nowrap" }}>
            <div style={{ fontFamily: FONT, fontSize: 31, fontWeight: 700, color: "#fff" }}>{f.titulo}</div>
            <div style={{ fontFamily: MONO, fontSize: 19, color: C.muted, marginTop: 6 }}>{f.archivo} · generado con Python</div>
          </Caja>
        );
      })}
    </Escena>
  );
}
