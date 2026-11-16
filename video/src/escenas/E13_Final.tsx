// ESCENA 13 — Pantalla final con el QR real de la página.
import QRCode from "qrcode";
import { E, lerp, prog } from "../core/anim";
import { TAU, mapa, orbitalPoint, pathOrbita, trueAnomaly, type Orbit } from "../core/orbit";
import { C, FONT, MONO } from "../core/theme";
import { Cuerpo, Foco, Lienzo, Trazo } from "../components/Plano";
import { Punto } from "../components/ui";
import { Escena } from "./comun";

export const URL_PAGINA = "https://kepler-grupo14-utn.pages.dev/";
// Misma librería y mismo contenido que el diálogo "Compartir proyecto" de la web (la URL de inicio).
const qr = QRCode.create(URL_PAGINA, { errorCorrectionLevel: "M" });
const N = qr.modules.size;
const MODULOS: [number, number][] = [];
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (qr.modules.get(y, x)) MODULOS.push([x, y]);

const A: Orbit = { p: 3, e: 0.62, alpha: 168, h: 0, k: 0 };
const B: Orbit = { p: 4.4, e: 0.4, alpha: -24, h: 0, k: 0 };

export function Final({ t, ini, fin }: { t: number; ini: number; fin: number }) {
  const m = mapa(900, 930, 112);
  const s = (d: number, dur = 0.7) => prog(t, ini + d, dur, E.out);
  const sube = (d: number) => ({ opacity: s(d), transform: `translateY(${(1 - s(d)) * 18}px)` });
  const a = orbitalPoint(trueAnomaly((TAU * t) / 11 + 1.2, A.e), A)!;
  const b = orbitalPoint(trueAnomaly((TAU * t) / 19 + 3.1, B.e), B)!;
  const mod = 13, borde = 4 * mod, lado = N * mod + 2 * borde;
  return (
    <Escena t={t} ini={ini} fin={fin + 2} dIn={0.8} dOut={0.01}>
      <Lienzo style={{ opacity: 0.62 }}>
        <Trazo d={pathOrbita(B, m)} p={prog(t, ini, 2.2)} color={C.blue} w={2} o={0.45} />
        <Trazo d={pathOrbita(A, m)} p={prog(t, ini, 1.8)} color={C.orbit} w={2.6} />
        <Foco x={m.ox} y={m.oy} r={12} t={t} />
        <Cuerpo x={m.X(b.x)} y={m.Y(b.y)} r={8} o={0.85} />
        <Cuerpo x={m.X(a.x)} y={m.Y(a.y)} r={11} />
      </Lienzo>
      <div className="abs" style={{ left: 120, top: 262, width: 1120, fontFamily: FONT }}>
        <div style={{ ...sube(0.25), fontSize: 50, fontWeight: 600, letterSpacing: lerp(16, 7, s(0.25, 1.2)), color: C.text, whiteSpace: "nowrap" }}>MOVIMIENTO PLANO Y</div>
        <div style={{ ...sube(0.4), display: "inline-block", fontSize: 90, fontWeight: 800, letterSpacing: 0.5, lineHeight: 1.14, whiteSpace: "nowrap", background: `linear-gradient(90deg, #9ff0f5, ${C.cyan} 35%, ${C.blue})`, WebkitBackgroundClip: "text", color: "transparent", filter: "drop-shadow(0 0 16px rgba(110,223,232,.3))" }}>ÓRBITAS KEPLERIANAS</div>
        <div style={{ ...sube(0.65), marginTop: 14, fontSize: 34, color: "#b9c8dc", letterSpacing: 1.2 }}>
          Proyecto integrador <span style={{ color: C.dim, padding: "0 10px" }}>·</span> Análisis Matemático II
        </div>
        <div style={{ ...sube(0.85), marginTop: 30 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 14, fontSize: 30, letterSpacing: 6, fontWeight: 700, color: C.cyan, padding: "10px 24px", borderRadius: 999, border: "1.5px solid rgba(110,223,232,.45)", background: "rgba(110,223,232,.08)" }}>
            <Punto tam={12} /> GRUPO 14
          </span>
        </div>
        <div style={{ ...sube(1.05), marginTop: 30, display: "flex", gap: 22 }}>
          {[["Matías Colimodio", C.cyan], ["Felipe de Ortúzar", C.orange]].map(([n, col]) => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 26px", borderRadius: 16, background: "rgba(11,19,34,.86)", border: `1.5px solid ${col}66` }}>
              <i style={{ width: 13, height: 13, borderRadius: 7, background: col, boxShadow: `0 0 12px ${col}` }} />
              <span style={{ fontSize: 37, fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }}>{n}</span>
            </div>
          ))}
        </div>
        <div style={{ ...sube(1.3), marginTop: 44, display: "inline-flex", alignItems: "center", gap: 16, padding: "16px 26px", borderRadius: 16, background: "rgba(8,15,29,.92)", border: `1.5px solid ${C.border2}` }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.cyan} strokeWidth="2" strokeLinecap="round"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" /><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" /></svg>
          <span style={{ fontFamily: MONO, fontSize: 35, color: "#eaf2fb", fontWeight: 500, whiteSpace: "nowrap" }}>{URL_PAGINA}</span>
        </div>
      </div>
      <div className="abs" style={{ left: 1270, top: 218, width: lado + 56, ...sube(0.9), fontFamily: FONT, textAlign: "center" }}>
        <div style={{ padding: 28, borderRadius: 30, background: "linear-gradient(180deg, rgba(17,29,47,.96), rgba(11,19,34,.96))", border: `1.5px solid ${C.border2}`, boxShadow: `0 30px 80px rgba(0,0,0,.5), 0 0 ${60 + 30 * Math.sin(t * 1.6)}px rgba(110,223,232,${(0.16 + 0.1 * Math.sin(t * 1.6)).toFixed(3)})` }}>
          <svg width={lado} height={lado} viewBox={`0 0 ${lado} ${lado}`} shapeRendering="crispEdges" style={{ display: "block", borderRadius: 14 }}>
            <rect width={lado} height={lado} fill="#ffffff" />
            {MODULOS.map(([x, y]) => <rect key={`${x}-${y}`} x={borde + x * mod} y={borde + y * mod} width={mod} height={mod} fill="#101a30" />)}
          </svg>
        </div>
        <div style={{ marginTop: 22, fontSize: 28, fontWeight: 650, color: "#fff" }}>Escaneá para abrir la página</div>
        <div style={{ marginTop: 6, fontSize: 21, color: C.muted, letterSpacing: 3 }}>EXPLORADOR INTERACTIVO</div>
      </div>
    </Escena>
  );
}
