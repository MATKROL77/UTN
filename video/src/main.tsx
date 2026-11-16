import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "katex/dist/katex.min.css";
import "./styles.css";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { Video } from "./Video";
import { Player } from "./player";
import { esperarPendientes, hayDrivers, macrotarea, syncDrivers } from "./core/drivers";
import { DUR, FPS, FRAMES } from "./core/tl";

declare global {
  interface Window {
    __listo: Promise<void>;
    __seek: (frame: number) => Promise<void>;
    __info: { fps: number; frames: number; duracion: number };
  }
}

const params = new URLSearchParams(location.search);
const RENDER = params.has("render");
const root = createRoot(document.getElementById("root")!);

// Todas las fuentes (incluidas las de KaTeX) deben estar cargadas antes del primer cuadro.
window.__listo = (async () => {
  await document.fonts.ready;
  await Promise.all([...document.fonts].map((f) => f.load().catch(() => undefined)));
  await document.fonts.ready;
})();
window.__info = { fps: FPS, frames: FRAMES, duracion: DUR };

if (RENDER) {
  let n = 0;
  const dibujar = (t: number) => flushSync(() => root.render(<Video t={t} v={n++} />));
  window.__seek = async (frame: number) => {
    await window.__listo;
    const t = frame / FPS;
    dibujar(t);
    await macrotarea();
    if (hayDrivers()) {
      await syncDrivers(t);
      dibujar(t);
    }
    await esperarPendientes();
    await macrotarea();
  };
  dibujar(0);
} else {
  root.render(<Player />);
}
