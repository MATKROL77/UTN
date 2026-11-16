// La web REAL del proyecto, embebida en vivo dentro del video.
// Se carga /app/index.html (build sin modificar de la raíz del repositorio) en un iframe y se la
// maneja igual que un usuario: se mueven los deslizadores, se pulsan pestañas, botones e interruptores.
// Cada toma es una lista de acciones con su tiempo; el estado de la web es función del tiempo t,
// así que el render cuadro a cuadro y la vista previa muestran siempre lo mismo.
import { useLayoutEffect, useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import { E, clamp, lerp, type Ease } from "../core/anim";
import { macrotarea, registrar, type Driver } from "../core/drivers";
import { C, FONT, MONO } from "../core/theme";
import { FPS } from "../core/tl";

export const APP_W = 1440;
export const APP_H = 1700;

export type Accion =
  | { en: number; tipo: "tab"; tab: string }
  | { en: number; tipo: "slider"; label: string; a: number; dur: number; ease?: Ease }
  | { en: number; tipo: "fijar"; label: string; valor: number }
  | { en: number; tipo: "boton"; texto: string }
  | { en: number; tipo: "switch"; texto: string }
  | { en: number; tipo: "probe"; x: number; y: number; cam: { X: (x: number) => number; Y: (y: number) => number } }
  | { en: number; tipo: "animar"; hasta: number };

export type Toma = { id: string; inicio: number; fin: number; acciones: Accion[] };
export type Recorte = { x: number; y: number; w: number; h: number };
export type ClaveRecorte = { t: number; r: Recorte; dur?: number };
/** Cámara sobre la web: cada clave empieza en su t y tarda `dur` segundos en llegar al nuevo encuadre. */
export function recorteEn(t: number, claves: ClaveRecorte[]): Recorte {
  let r = claves[0].r;
  for (const k of claves) {
    if (t < k.t) break;
    const u = E.inOut(clamp((t - k.t) / (k.dur ?? 1)));
    r = { x: lerp(r.x, k.r.x, u), y: lerp(r.y, k.r.y, u), w: lerp(r.w, k.r.w, u), h: lerp(r.h, k.r.h, u) };
  }
  return r;
}
type Pt = { x: number; y: number };

export type Metricas = {
  listo: boolean;
  cursor: { x: number; y: number; presionado: boolean; visible: boolean } | null;
  clics: { x: number; y: number; t: number }[];
  /** Matriz del gráfico SVG de la web: página = (a·X + e, d·Y + f) con X,Y en unidades del viewBox. */
  plot: { a: number; d: number; e: number; f: number } | null;
  rects: Record<string, { x: number; y: number; w: number; h: number }>;
  /** Textos y valores leídos de la web en vivo (clave → contenido). */
  textos: Record<string, string>;
};

const finDe = (a: Accion) => (a.tipo === "slider" ? a.en + a.dur : a.tipo === "animar" ? a.en : a.en);
const usaCursor = (a: Accion) => a.tipo !== "fijar";

class AppDriver implements Driver {
  iframe: HTMLIFrameElement | null = null;
  toma: Toma;
  metricas: Metricas = { listo: false, cursor: null, clics: [], plot: null, rects: {}, textos: {} };
  private carga: Promise<void> | null = null;
  private ultimoT = -Infinity;
  private hecho = new Set<number>();
  private desde = new Map<number, number>();
  private posFin = new Map<number, Pt>();
  private cola = new Map<number, FrameRequestCallback>();
  private rafId = 0;
  private ultimoTick = -1;
  private pausado = new Set<number>();
  medir: string[] = [];
  leer: Record<string, string> = {};

  constructor(toma: Toma) {
    this.toma = toma;
  }

  conectar(iframe: HTMLIFrameElement) {
    if (this.iframe === iframe) return;
    this.iframe = iframe;
    this.carga = this.cargar();
  }

  private cargar(): Promise<void> {
    const iframe = this.iframe!;
    this.hecho.clear();
    this.desde.clear();
    this.posFin.clear();
    this.cola.clear();
    this.pausado.clear();
    this.ultimoTick = -1;
    this.metricas.clics = [];
    this.metricas.listo = false;
    return new Promise<void>((resolve) => {
      const preparar = async () => {
        const w = iframe.contentWindow!;
        const d = iframe.contentDocument!;
        // Reloj virtual: la animación de la web (requestAnimationFrame) avanza con el tiempo del video.
        w.requestAnimationFrame = (cb: FrameRequestCallback) => {
          this.cola.set(++this.rafId, cb);
          return this.rafId;
        };
        w.cancelAnimationFrame = (id: number) => void this.cola.delete(id);
        const st = d.createElement("style");
        st.textContent = "*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}html{scrollbar-width:none;overflow:hidden}::-webkit-scrollbar{display:none}";
        d.head.appendChild(st);
        for (let i = 0; i < 400 && !d.querySelector(".workspace"); i++) await new Promise((r) => setTimeout(r, 10));
        await (d as Document).fonts?.ready;
        this.metricas.listo = true;
        resolve();
      };
      const yaCargado = iframe.contentDocument?.readyState === "complete" && iframe.contentWindow?.location.pathname.includes("/app/");
      if (yaCargado) void preparar();
      else iframe.addEventListener("load", () => void preparar(), { once: true });
    });
  }

  private async recargar() {
    const iframe = this.iframe!;
    this.carga = new Promise<void>((resolve) => {
      iframe.addEventListener("load", () => resolve(), { once: true });
      iframe.contentWindow!.location.reload();
    }).then(() => this.cargar());
    await this.carga;
  }

  private get doc() {
    return this.iframe!.contentDocument!;
  }
  private get win() {
    return this.iframe!.contentWindow as Window & typeof globalThis;
  }

  private slider(label: string) {
    const el = this.doc.querySelector<HTMLInputElement>(`input[type="range"][aria-label="${label}"]`);
    if (!el) throw new Error(`[${this.toma.id}] No existe el deslizador "${label}" en la pestaña actual de la web`);
    return el;
  }
  private boton(texto: string) {
    const el = [...this.doc.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.replace(/\s+/g, " ").trim().includes(texto));
    if (!el) throw new Error(`[${this.toma.id}] No existe el botón "${texto}"`);
    return el;
  }
  private interruptor(texto: string) {
    const el = [...this.doc.querySelectorAll<HTMLLabelElement>("label.switch-row")].find((b) => b.textContent?.includes(texto));
    if (!el) throw new Error(`[${this.toma.id}] No existe el interruptor "${texto}"`);
    return el;
  }
  private centro(el: Element): Pt {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  private pulgar(el: HTMLInputElement): Pt {
    const r = el.getBoundingClientRect();
    const min = Number(el.min), max = Number(el.max), v = Number(el.value);
    const ancho = 14;
    return { x: r.left + ancho / 2 + ((v - min) / (max - min)) * (r.width - ancho), y: r.top + r.height / 2 };
  }
  private fijar(el: HTMLInputElement, valor: number) {
    const set = Object.getOwnPropertyDescriptor(this.win.HTMLInputElement.prototype, "value")!.set!;
    set.call(el, String(valor));
    el.dispatchEvent(new this.win.Event("input", { bubbles: true }));
  }
  private plotCTM() {
    const svg = this.doc.querySelector<SVGSVGElement>("svg.orbit-plot");
    const m = svg?.getScreenCTM();
    return m ? { a: m.a, d: m.d, e: m.e, f: m.f } : null;
  }
  private puntoPlot(a: Extract<Accion, { tipo: "probe" }>): Pt {
    const m = this.plotCTM()!;
    return { x: m.a * a.cam.X(a.x) + m.e, y: m.d * a.cam.Y(a.y) + m.f };
  }
  /** Posición (en píxeles de la página) donde el cursor debe estar al comenzar la acción. */
  private objetivo(a: Accion): Pt | null {
    try {
      switch (a.tipo) {
        case "tab": return this.centro(this.boton(a.tab));
        case "slider": return this.pulgar(this.slider(a.label));
        case "boton": return this.centro(this.boton(a.texto));
        case "switch": return this.centro(this.interruptor(a.texto).querySelector(".switch") ?? this.interruptor(a.texto));
        case "probe": return this.puntoPlot(a);
        case "animar": return this.centro(this.boton("Animar órbita"));
        default: return null;
      }
    } catch {
      return null;
    }
  }

  private async asentar(n = 3) {
    for (let i = 0; i < n; i++) await macrotarea(this.win);
  }

  private tick(hastaFrame: number) {
    for (let f = this.ultimoTick + 1; f <= hastaFrame; f++) {
      const cbs = [...this.cola.values()];
      this.cola.clear();
      const ms = (f * 1000) / FPS;
      for (const cb of cbs) cb(ms);
    }
    this.ultimoTick = Math.max(this.ultimoTick, hastaFrame);
  }

  async sync(t: number) {
    if (!this.iframe) return;
    await this.carga;
    if (t < this.ultimoT - 1e-6) await this.recargar();
    this.ultimoT = t;
    const acciones = this.toma.acciones;
    for (let i = 0; i < acciones.length; i++) {
      const a = acciones[i];
      if (t < a.en) break;
      if (a.tipo === "slider") {
        if (this.hecho.has(i)) continue;
        const el = this.slider(a.label);
        if (!this.desde.has(i)) this.desde.set(i, Number(el.value));
        const u = clamp((t - a.en) / Math.max(a.dur, 1e-6));
        this.fijar(el, lerp(this.desde.get(i)!, a.a, (a.ease ?? E.inOut)(u)));
        if (u >= 1) {
          this.fijar(el, a.a);
          this.hecho.add(i);
          this.posFin.set(i, this.pulgar(el));
        }
        continue;
      }
      if (a.tipo === "animar") {
        if (!this.hecho.has(i)) {
          const b = this.boton("Animar órbita");
          this.posFin.set(i, this.centro(b));
          this.metricas.clics.push({ ...this.centro(b), t: a.en });
          b.click();
          this.hecho.add(i);
          this.ultimoTick = Math.ceil(a.en * FPS) - 1;
          for (let k = 0; k < 60 && !this.cola.size; k++) await macrotarea(this.win);
        }
        if (!this.pausado.has(i)) {
          this.tick(Math.floor(Math.min(t, a.hasta) * FPS + 1e-6));
          if (t >= a.hasta) {
            await this.asentar();
            try { this.boton("Pausar").click(); } catch { /* ya estaba detenida */ }
            this.pausado.add(i);
          }
        }
        continue;
      }
      if (this.hecho.has(i)) continue;
      this.hecho.add(i);
      switch (a.tipo) {
        case "fijar": this.fijar(this.slider(a.label), a.valor); break;
        case "tab": { const b = this.boton(a.tab); this.posFin.set(i, this.centro(b)); this.metricas.clics.push({ ...this.centro(b), t: a.en }); b.click(); break; }
        case "boton": { const b = this.boton(a.texto); this.posFin.set(i, this.centro(b)); this.metricas.clics.push({ ...this.centro(b), t: a.en }); b.click(); break; }
        case "switch": {
          const l = this.interruptor(a.texto);
          const p = this.centro(l.querySelector(".switch") ?? l);
          this.posFin.set(i, p);
          this.metricas.clics.push({ ...p, t: a.en });
          l.querySelector<HTMLInputElement>("input")!.click();
          break;
        }
        case "probe": {
          const p = this.puntoPlot(a);
          this.posFin.set(i, p);
          this.metricas.clics.push({ ...p, t: a.en });
          // PointerEvent conserva coordenadas fraccionarias (MouseEvent las trunca a enteros).
          this.doc.querySelector("svg.orbit-plot")!.dispatchEvent(new this.win.PointerEvent("click", { bubbles: true, clientX: p.x, clientY: p.y }));
          break;
        }
      }
      await this.asentar(2);
    }
    await this.asentar();
    this.metricas.plot = this.plotCTM();
    this.metricas.cursor = this.cursorEn(t);
    this.metricas.rects = {};
    for (const sel of this.medir) {
      const el = this.doc.querySelector(sel);
      if (el) {
        const r = el.getBoundingClientRect();
        this.metricas.rects[sel] = { x: r.left, y: r.top, w: r.width, h: r.height };
      }
    }
    this.metricas.textos = {};
    for (const [clave, sel] of Object.entries(this.leer)) {
      const el = this.doc.querySelector(sel);
      if (el) this.metricas.textos[clave] = el instanceof this.win.HTMLInputElement ? el.value : (el.textContent ?? "").replace(/\s+/g, " ").trim();
    }
  }

  private cursorEn(t: number) {
    const acc = this.toma.acciones.map((a, i) => ({ a, i })).filter(({ a }) => usaCursor(a));
    if (!acc.length) return null;
    // ¿Arrastrando un deslizador ahora?
    for (const { a } of acc) {
      if (a.tipo === "slider" && t >= a.en && t <= a.en + a.dur) {
        try { return { ...this.pulgar(this.slider(a.label)), presionado: true, visible: true }; } catch { /* sigue */ }
      }
    }
    let previa: { a: Accion; i: number } | null = null;
    let proxima: { a: Accion; i: number } | null = null;
    for (const x of acc) {
      if (finDe(x.a) <= t) previa = x;
      else if (x.a.en > t && !proxima) proxima = x;
    }
    const reposo: Pt = { x: APP_W * 0.62, y: 1010 };
    const desde = previa ? this.posFin.get(previa.i) ?? reposo : reposo;
    if (!proxima) return { ...desde, presionado: false, visible: true };
    const t0 = previa ? finDe(previa.a) : this.toma.inicio;
    const hueco = proxima.a.en - t0;
    const mv = Math.min(0.75, Math.max(0.2, hueco * 0.7));
    const u = clamp((t - (proxima.a.en - mv)) / mv);
    if (u <= 0) return { ...desde, presionado: false, visible: true };
    const hacia = this.objetivo(proxima.a) ?? desde;
    const k = E.inOut(u);
    return { x: lerp(desde.x, hacia.x, k), y: lerp(desde.y, hacia.y, k), presionado: false, visible: true };
  }
}

export type AppAPI = {
  metricas: Metricas;
  /** Convierte un punto de la página (px del iframe) a coordenadas del escenario. */
  aEscena: (x: number, y: number) => Pt;
  /** Convierte un punto del gráfico de la web (unidades del viewBox SVG) a coordenadas del escenario. */
  plotAEscena: (X: number, Y: number) => Pt | null;
  escala: number;
};

export function AppWindow({
  t, toma, rect, recorte, opacidad = 1, etiqueta = "kepler-grupo14-utn.pages.dev", cursor = true, medir, leer, children, style, barra = true,
}: {
  t: number; toma: Toma;
  /** Rectángulo del escenario donde se muestra la ventana (incluye la barra superior). */
  rect: { x: number; y: number; w: number; h: number };
  /** Zona de la página que se ve dentro de la ventana (px de la web a 1440 de ancho). */
  recorte: Recorte;
  opacidad?: number; etiqueta?: string; cursor?: boolean; medir?: string[]; leer?: Record<string, string>; barra?: boolean;
  children?: (api: AppAPI) => ReactNode; style?: CSSProperties;
}) {
  const driver = useMemo(() => new AppDriver(toma), [toma.id]);
  driver.toma = toma;
  driver.medir = medir ?? [];
  driver.leer = leer ?? {};
  const ref = useRef<HTMLIFrameElement>(null);
  useLayoutEffect(() => {
    if (ref.current) driver.conectar(ref.current);
    return registrar(driver);
  }, [driver]);

  const BAR = barra ? 46 : 0;
  const vw = rect.w, vh = rect.h - BAR;
  const s = Math.max(vw / recorte.w, vh / recorte.h);
  const ox = recorte.x - (vw / s - recorte.w) / 2;
  const oy = recorte.y - (vh / s - recorte.h) / 2;
  const aEscena = (x: number, y: number) => ({ x: rect.x + (x - ox) * s, y: rect.y + BAR + (y - oy) * s });
  const m = driver.metricas;
  const api: AppAPI = {
    metricas: m, aEscena, escala: s,
    plotAEscena: (X, Y) => (m.plot ? aEscena(m.plot.a * X + m.plot.e, m.plot.d * Y + m.plot.f) : null),
  };
  const cur = cursor && m.cursor?.visible ? aEscena(m.cursor.x, m.cursor.y) : null;
  const dentro = cur && cur.x > rect.x - 20 && cur.x < rect.x + rect.w + 20 && cur.y > rect.y && cur.y < rect.y + rect.h + 20;
  return (
    <>
      <div className="abs" style={{
        left: rect.x, top: rect.y, width: rect.w, height: rect.h, borderRadius: 18, overflow: "hidden", opacity: opacidad,
        background: C.bg, border: `1px solid ${C.border2}`, boxShadow: "0 30px 90px rgba(0,0,0,.55), 0 0 0 1px rgba(110,223,232,.06)", ...style,
      }}>
        {barra && (
          <div style={{ height: BAR, background: "#0b1322", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 9, padding: "0 18px" }}>
            {["#ff6b5e", "#ffc24a", "#42d27a"].map((c) => <span key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c, opacity: 0.85 }} />)}
            <div style={{ marginLeft: 18, flex: 1, maxWidth: 560, height: 28, borderRadius: 14, background: "#111d2f", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 9, padding: "0 14px", fontFamily: MONO, fontSize: 14.5, color: "#a9bbd3" }}>
              <svg width="12" height="14" viewBox="0 0 12 14"><rect x="1" y="6" width="10" height="7" rx="1.6" fill="#6edfe8" opacity=".85" /><path d="M3.2 6V4.2a2.8 2.8 0 0 1 5.6 0V6" fill="none" stroke="#6edfe8" strokeWidth="1.4" opacity=".85" /></svg>
              {etiqueta}
            </div>
            <span style={{ marginLeft: "auto", fontFamily: FONT, fontSize: 12.5, letterSpacing: 2.2, color: C.cyan, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              <i style={{ width: 7, height: 7, borderRadius: 4, background: C.cyan, display: "inline-block", opacity: 0.55 + 0.45 * Math.sin(t * 4) }} />
              WEB REAL DEL PROYECTO
            </span>
          </div>
        )}
        <div style={{ position: "relative", width: vw, height: vh, overflow: "hidden", background: C.bg }}>
          <iframe ref={ref} src="/app/index.html" width={APP_W} height={APP_H} title="Web real del proyecto" scrolling="no"
            style={{ border: 0, position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: `scale(${s}) translate(${-ox}px, ${-oy}px)`, pointerEvents: "none" }} />
        </div>
      </div>
      {m.listo && children?.(api)}
      {m.listo && m.clics.map((c, i) => {
        const u = (t - c.t) / 0.45;
        if (u < 0 || u > 1) return null;
        const p = aEscena(c.x, c.y);
        if (p.x < rect.x || p.x > rect.x + rect.w || p.y < rect.y || p.y > rect.y + rect.h) return null;
        return <div key={i} className="abs" style={{ left: p.x - 30, top: p.y - 30, width: 60, height: 60, borderRadius: 30, border: `2.5px solid ${C.cyan}`, opacity: (1 - u) * 0.9 * opacidad, transform: `scale(${0.35 + u * 0.9})` }} />;
      })}
      {cur && dentro && (
        <svg className="abs" width="44" height="44" viewBox="0 0 22 22" style={{ left: cur.x - 5, top: cur.y - 3, opacity: opacidad, transform: `scale(${m.cursor!.presionado ? 0.88 : 1})`, transformOrigin: "5px 3px", filter: "drop-shadow(0 3px 5px rgba(0,0,0,.55))" }}>
          <path d="M3 1.5 L3 17 L7.2 13.2 L10 19.6 L12.6 18.5 L9.8 12.2 L15.4 12.2 Z" fill="#fff" stroke="#0b1322" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
      )}
    </>
  );
}
