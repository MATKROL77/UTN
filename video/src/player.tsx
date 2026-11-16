// Vista previa en tiempo real: reproduce la línea de tiempo (y las voces, si existen en video/audio/).
// Atajos: espacio = reproducir/pausar · ←/→ = ±1 s · Shift+←/→ = ±5 s · , . = ±1 cuadro
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Video } from "./Video";
import { hayDrivers, syncDrivers } from "./core/drivers";
import { H, W } from "./core/theme";
import { DUR, FPS, FRASES, FUENTE, HABLANTES, VOCES } from "./core/tl";

const inicial = Number(new URLSearchParams(location.search).get("t") ?? localStorage.getItem("kepler-t") ?? 0);

export function Player() {
  const [t, setT] = useState(Math.min(inicial, DUR));
  const [v, setV] = useState(0);
  const [play, setPlay] = useState(false);
  const [escala, setEscala] = useState(0.5);
  const vista = useRef<HTMLDivElement>(null);
  const audios = useRef<Partial<Record<"M" | "F", HTMLAudioElement>>>({});
  const tRef = useRef(t);
  tRef.current = t;

  useLayoutEffect(() => {
    const ajustar = () => {
      const r = vista.current!.getBoundingClientRect();
      setEscala(Math.min(r.width / W, r.height / H));
    };
    ajustar();
    window.addEventListener("resize", ajustar);
    return () => window.removeEventListener("resize", ajustar);
  }, []);

  // Voces (si están): /audio/voz_matias.wav y /audio/voz_felipe.wav
  useEffect(() => {
    for (const q of ["M", "F"] as const) {
      const archivo = VOCES[q].archivo ?? HABLANTES[q].audio;
      const a = new Audio(`/audio/${archivo.split("/").pop()}`);
      a.preload = "auto";
      a.addEventListener("canplaythrough", () => (audios.current[q] = a), { once: true });
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("kepler-t", String(t));
    let vivo = true;
    if (hayDrivers()) void syncDrivers(t).then(() => vivo && setV((x) => x + 1));
    return () => { vivo = false; };
  }, [t]);

  useEffect(() => {
    const sincronizarAudio = (reproducir: boolean) => {
      for (const q of ["M", "F"] as const) {
        const a = audios.current[q];
        if (!a) continue;
        const local = tRef.current - VOCES[q].desfase + ((VOCES[q] as { recorteInicio?: number }).recorteInicio ?? 0);
        if (reproducir && local >= 0 && local < a.duration) {
          if (Math.abs(a.currentTime - local) > 0.12) a.currentTime = local;
          if (a.paused) void a.play().catch(() => undefined);
        } else if (!a.paused) a.pause();
      }
    };
    if (!play) { sincronizarAudio(false); return; }
    let raf = 0;
    const t0 = performance.now() - tRef.current * 1000;
    const paso = (ahora: number) => {
      const nt = (ahora - t0) / 1000;
      if (nt >= DUR) { setT(DUR); setPlay(false); return; }
      setT(Math.round(nt * FPS) / FPS);
      sincronizarAudio(true);
      raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [play]);

  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => {
      const mover = (d: number) => { setPlay(false); setT((x) => Math.min(DUR, Math.max(0, Math.round((x + d) * FPS) / FPS))); };
      if (ev.code === "Space") { ev.preventDefault(); setPlay((p) => !p); }
      else if (ev.key === "ArrowRight") mover(ev.shiftKey ? 5 : 1);
      else if (ev.key === "ArrowLeft") mover(ev.shiftKey ? -5 : -1);
      else if (ev.key === ".") mover(1 / FPS);
      else if (ev.key === ",") mover(-1 / FPS);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, []);

  const frase = FRASES.find((f) => t >= f.inicio && t <= f.fin + 0.4);
  const mm = (x: number) => `${Math.floor(x / 60)}:${(x % 60).toFixed(2).padStart(5, "0")}`;
  return (
    <div className="player">
      <div className="player-view" ref={vista}>
        <div style={{ position: "absolute", left: "50%", top: "50%", width: W, height: H, transform: `translate(-50%,-50%) scale(${escala})` }}>
          <Video t={t} v={v} />
        </div>
      </div>
      <div className="player-bar">
        <button onClick={() => setPlay((p) => !p)}>{play ? "Pausa" : "Reproducir"}</button>
        <span className="mono">{mm(t)} / {mm(DUR)}</span>
        <input type="range" min={0} max={DUR} step={1 / FPS} value={t} onChange={(ev) => { setPlay(false); setT(Number(ev.target.value)); }} />
        <span className="player-sub">{frase ? `${frase.id} · ${frase.texto}` : "—"}</span>
        <span>tiempos: {FUENTE}</span>
      </div>
    </div>
  );
}
