import { useEffect, useId, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import Icon, { type IconName } from "./Icons";
import Plot, { type Mode } from "./Plot";
import {
  DEFAULT_ORBIT,
  TAU,
  deg,
  equalAreaEnd,
  orbitalPoint,
  parseCSV,
  potential,
  rad,
  radius,
  sweptArea,
  trueAnomaly,
  type Orbit,
  type Point,
} from "./math";
const fmt = (value: number, decimals = 2) =>
  value.toLocaleString("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
const tabs: { id: Mode; label: string; icon: IconName; number: string }[] = [
  { id: "orbit", label: "Simulador orbital", icon: "orbit", number: "01" },
  { id: "areas", label: "Segunda ley de Kepler", icon: "area", number: "02" },
  {
    id: "potential",
    label: "Potencial gravitatorio",
    icon: "field",
    number: "03",
  },
];
function Slider({
  label,
  symbol,
  value,
  min,
  max,
  step = 1,
  onChange,
  unit = "",
  hint,
}: {
  label: string;
  symbol?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (n: number) => void;
  unit?: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="slider-control">
      <div className="slider-label">
        <label htmlFor={id}>
          {symbol && <span className="math-symbol">{symbol}</span>}
          {label}
        </label>
        <output htmlFor={id}>
          {fmt(value, step < 1 ? 2 : 0)}
          <span>{unit}</span>
        </output>
      </div>
      <input
        id={id}
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(ev) => onChange(Number(ev.target.value))}
        style={
          {
            "--range": `${(100 * (value - min)) / (max - min)}%`,
          } as React.CSSProperties
        }
      />
      <div className="range-endpoints">
        <span>{hint ?? `${min}${unit}`}</span>
        <span>
          {max}
          {unit}
        </span>
      </div>
    </div>
  );
}
function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="switch-row">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="switch" aria-hidden="true" />
    </label>
  );
}
export default function App() {
  const [mode, setMode] = useState<Mode>("orbit");
  const [orbit, setOrbit] = useState<Orbit>(DEFAULT_ORBIT);
  const [localAxes, setLocalAxes] = useState(true);
  const [extendedE, setExtendedE] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [mean, setMean] = useState(0.75);
  const [observations, setObservations] = useState<Point[]>([]);
  const [fileName, setFileName] = useState("");
  const [csvError, setCsvError] = useState("");
  const [contours, setContours] = useState(true),
    [arrows, setArrows] = useState(true);
  const [probe, setProbe] = useState<Point>({ x: 3, y: 2 });
  const [areaE, setAreaE] = useState(0.65),
    [start, setStart] = useState(-35),
    [delta, setDelta] = useState(70),
    [secondStart, setSecondStart] = useState(145);
  const [share, setShare] = useState(false),
    [qr, setQr] = useState(""),
    [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null),
    shareRef = useRef<HTMLDialogElement>(null);
  const update = (key: keyof Orbit, value: number) =>
    setOrbit((previous) => ({ ...previous, [key]: value }));
  const areaOrbit: Orbit = { p: 3, e: areaE, alpha: 0, h: 0, k: 0 };
  const activeOrbit = mode === "areas" ? areaOrbit : orbit;
  const areaResult = useMemo(() => {
    const a1 = sweptArea(3, areaE, rad(start), rad(start + delta));
    const end = equalAreaEnd(3, areaE, rad(secondStart), a1);
    const a2 = sweptArea(3, areaE, rad(secondStart), end);
    return {
      a1,
      a2,
      end,
      angle: deg(end) - secondStart,
      error: (Math.abs(a1 - a2) / a1) * 100,
    };
  }, [areaE, start, delta, secondStart]);
  const theta = orbit.e < 1 ? trueAnomaly(mean, orbit.e) : 0.75;
  const body = orbitalPoint(theta, orbit)!;
  const conic =
    orbit.e === 0
      ? "Circunferencia"
      : orbit.e < 1
        ? "Elipse"
        : orbit.e === 1
          ? "Parábola"
          : "Hipérbola";
  const probeU = potential(probe.x, probe.y, orbit.h, orbit.k);
  useEffect(() => {
    if (!playing || mode !== "orbit" || orbit.e >= 1) return;
    let previous = 0,
      frame = 0;
    const tick = (time: number) => {
      if (previous)
        setMean(
          (v) =>
            (v + (Math.min((time - previous) / 1000, 0.1) * TAU) / 18) % TAU,
        );
      previous = time;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, mode, orbit.e]);
  useEffect(() => {
    if (orbit.e >= 1) setPlaying(false);
  }, [orbit.e]);
  useEffect(() => {
    if (share) {
      shareRef.current?.showModal();
      QRCode.toDataURL(window.location.href.split("#")[0], {
        width: 240,
        margin: 2,
        color: { dark: "#101a30", light: "#ffffff" },
      })
        .then(setQr)
        .catch(() => setQr(""));
    } else shareRef.current?.close();
  }, [share]);
  async function importCSV(file?: File) {
    if (!file) return;
    setCsvError("");
    if (file.size > 1024 * 1024) {
      setCsvError("El CSV debe pesar menos de 1 MB.");
      return;
    }
    try {
      const points = parseCSV(await file.text());
      setObservations(points);
      setFileName(file.name);
    } catch (error) {
      setCsvError(
        error instanceof Error ? error.message : "No se pudo leer el CSV.",
      );
    }
  }
  function reset() {
    if (mode === "areas") {
      setAreaE(0.65);
      setStart(-35);
      setDelta(70);
      setSecondStart(145);
    } else {
      setOrbit(DEFAULT_ORBIT);
      setExtendedE(false);
      setMean(0.75);
      setPlaying(false);
      setLocalAxes(true);
      setContours(true);
      setArrows(true);
      setProbe({ x: 3, y: 2 });
    }
  }
  return (
    <>
      <a className="skip-link" href="#explorador">
        Ir al explorador
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a
            href="#"
            className="brand"
            aria-label="Inicio del Explorador Kepleriano"
          >
            <span className="brand-icon">
              <Icon name="orbit" size={29} />
            </span>
            <span>
              KEPLER<span className="brand-divider">/</span>
              <span className="brand-light">EXPLORER</span>
            </span>
          </a>
          <div className="header-course">
            <span>UTN</span>
            <i />
            Análisis Matemático II
          </div>
          <button
            className="share-button"
            aria-label="Compartir proyecto"
            onClick={() => setShare(true)}
          >
            <Icon name="qr" size={17} />
            <span>Compartir proyecto</span>
          </button>
        </div>
      </header>
      <main>
        <section className="intro">
          <div>
            <div className="eyebrow">
              <span className="status-dot" /> LABORATORIO INTERACTIVO{" "}
              <span className="eyebrow-separator">/</span> GRUPO 14
            </div>
            <h1>
              Explorador de Órbitas <span>Keplerianas</span>
            </h1>
            <p>
              De las ecuaciones al movimiento. Explorá la geometría y la
              matemática detrás de cada órbita.
            </p>
          </div>
          <div className="project-tag">
            <span>PROYECTO INTEGRADOR</span>
            <strong>La matemática del movimiento</strong>
            <span>UTN · Análisis Matemático II</span>
          </div>
        </section>
        <div className="workspace" id="explorador">
          <nav className="tab-nav" aria-label="Experimentos">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={mode === tab.id ? "tab active" : "tab"}
                aria-current={mode === tab.id ? "page" : undefined}
                onClick={() => setMode(tab.id)}
              >
                <span className="tab-number">{tab.number}</span>
                <Icon name={tab.icon} size={18} />
                <span>{tab.label}</span>
                {tab.id === "areas" && (
                  <span
                    className="featured-dot"
                    title="Experimento principal"
                  />
                )}
              </button>
            ))}
            <span className="live-badge">
              <span className="status-dot" /> EN TIEMPO REAL
            </span>
          </nav>
          <div className="experiment-layout">
            <section
              className="visual-panel"
              aria-label="Visualización científica"
            >
              <div className="plot-heading">
                <div>
                  <span className="panel-eyebrow">
                    {mode === "orbit"
                      ? "GEOMETRÍA ORBITAL"
                      : mode === "areas"
                        ? "EXPERIMENTO DE ÁREAS IGUALES"
                        : "CAMPO CONSERVATIVO"}
                  </span>
                  <h2>
                    {mode === "orbit"
                      ? "Una ecuación. Infinitas trayectorias."
                      : mode === "areas"
                        ? "Distintos ángulos, el mismo tiempo."
                        : "La atracción desde el foco."}
                  </h2>
                </div>
                <span
                  className={`conic-badge ${mode === "areas" ? "blue" : ""}`}
                >
                  <span />
                  {mode === "areas"
                    ? "Elipse"
                    : mode === "potential"
                      ? "μ = 1"
                      : conic}
                </span>
              </div>
              <div className="plot-container">
                <Plot
                  mode={mode}
                  orbit={activeOrbit}
                  theta={theta}
                  localAxes={localAxes}
                  observations={mode === "orbit" ? observations : []}
                  sectors={[
                    rad(start),
                    rad(start + delta),
                    rad(secondStart),
                    areaResult.end,
                  ]}
                  contours={contours}
                  arrows={arrows}
                  onProbe={setProbe}
                />
              </div>
              <div className="plot-toolbar">
                <div className="plot-legend">
                  {mode === "orbit" ? (
                    <>
                      <span>
                        <i className="legend-line" />
                        Órbita
                      </span>
                      <span>
                        <i className="legend-focus" />
                        Foco
                      </span>
                      {localAxes && (
                        <span>
                          <i className="legend-dash" />
                          Ejes locales
                        </span>
                      )}
                    </>
                  ) : mode === "areas" ? (
                    <>
                      <span>
                        <i className="legend-square blue" />
                        Sector azul
                      </span>
                      <span>
                        <i className="legend-square orange" />
                        Sector naranja
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        <i className="legend-line" />
                        Equipotenciales
                      </span>
                      <span>
                        <i className="legend-dash" />
                        Campo −∇U
                      </span>
                    </>
                  )}
                </div>
                {mode === "orbit" ? (
                  <button
                    className="animation-button"
                    disabled={orbit.e >= 1}
                    onClick={() => setPlaying(!playing)}
                  >
                    <Icon name={playing ? "pause" : "play"} size={13} />
                    {playing ? "Pausar" : "Animar órbita"}
                  </button>
                ) : (
                  <span className="toolbar-note">
                    {mode === "areas"
                      ? "Integral numérica · Simpson"
                      : "Tocá el plano para evaluar U"}
                  </span>
                )}
              </div>
              <div className="plot-caption">
                <Icon name="info" size={14} />
                {mode === "orbit" ? (
                  <span>
                    {observations.length
                      ? `${observations.length} observaciones superpuestas · Curva de ejemplo, sin ajuste a los datos`
                      : "Ejemplo matemático · Sin datos observados cargados"}
                    {orbit.e >= 1
                      ? " · Solo rama física r > 0; trayectoria abierta recortada al plano."
                      : ""}
                  </span>
                ) : mode === "areas" ? (
                  <span>
                    Los dos sectores se miden desde el foco gravitatorio, no
                    desde el centro de la elipse.
                  </span>
                ) : (
                  <span>
                    El potencial no está definido en el foco. Las flechas
                    indican dirección; su longitud está normalizada.
                  </span>
                )}
              </div>
            </section>
            <aside
              className="controls-panel"
              aria-label="Controles del experimento"
            >
              <div className="control-heading">
                <h2>
                  {mode === "orbit"
                    ? "Parámetros orbitales"
                    : mode === "areas"
                      ? "Construí el experimento"
                      : "Configuración del campo"}
                </h2>
                <button
                  className="icon-button"
                  title="Reiniciar parámetros"
                  aria-label="Reiniciar parámetros"
                  onClick={reset}
                >
                  <Icon name="reset" size={17} />
                </button>
              </div>
              {mode === "orbit" ? (
                <>
                  <div className="preset-label">ELEGÍ UNA TRAYECTORIA</div>
                  <div className="preset-grid">
                    {[
                      { name: "Circunferencia", e: 0 },
                      { name: "Elipse", e: 0.6 },
                      { name: "Parábola", e: 1 },
                      { name: "Hipérbola", e: 1.35 },
                    ].map((preset) => (
                      <button
                        key={preset.name}
                        className={
                          conic === preset.name ? "preset selected" : "preset"
                        }
                        onClick={() => {
                          setOrbit({ ...DEFAULT_ORBIT, e: preset.e });
                          setExtendedE(preset.e >= 1);
                          setMean(0.75);
                        }}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                  <Slider
                    label="Parámetro orbital"
                    symbol="p"
                    value={orbit.p}
                    min={1}
                    max={5}
                    step={0.05}
                    unit=" u"
                    onChange={(v) => update("p", v)}
                  />
                  <Slider
                    label="Excentricidad"
                    symbol="e"
                    value={orbit.e}
                    min={0}
                    max={extendedE ? 1.7 : 0.85}
                    step={0.01}
                    onChange={(v) => update("e", v)}
                  />
                  <Slider
                    label="Rotación"
                    symbol="α"
                    value={orbit.alpha}
                    min={-180}
                    max={180}
                    unit="°"
                    onChange={(v) => update("alpha", v)}
                  />
                  <div className="control-section-title">
                    TRASLACIÓN DEL FOCO <span>(h, k)</span>
                  </div>
                  <div className="translation-controls">
                    <Slider
                      label="Horizontal"
                      symbol="h"
                      value={orbit.h}
                      min={-4}
                      max={4}
                      step={0.1}
                      onChange={(v) => update("h", v)}
                    />
                    <Slider
                      label="Vertical"
                      symbol="k"
                      value={orbit.k}
                      min={-4}
                      max={4}
                      step={0.1}
                      onChange={(v) => update("k", v)}
                    />
                  </div>
                  <div className="control-divider" />
                  <Switch
                    label="Mostrar ejes locales rotados"
                    checked={localAxes}
                    onChange={() => setLocalAxes(!localAxes)}
                  />
                </>
              ) : mode === "areas" ? (
                <>
                  <div className="info-box compact">
                    <Icon name="area" size={19} />
                    <p>
                      Definí el sector azul. El intervalo naranja se calcula
                      para barrer <strong>la misma área.</strong>
                    </p>
                  </div>
                  <Slider
                    label="Excentricidad de la elipse"
                    symbol="e"
                    value={areaE}
                    min={0}
                    max={0.85}
                    step={0.01}
                    onChange={setAreaE}
                  />
                  <div className="control-section-title blue-text">
                    01 / SECTOR AZUL
                  </div>
                  <Slider
                    label="Ángulo inicial azul"
                    symbol="θ₁"
                    value={start}
                    min={-90}
                    max={90}
                    unit="°"
                    onChange={setStart}
                  />
                  <Slider
                    label="Amplitud del sector azul"
                    symbol="Δθ₁"
                    value={delta}
                    min={10}
                    max={120}
                    unit="°"
                    onChange={setDelta}
                  />
                  <div className="control-section-title orange-text">
                    02 / SECTOR NARANJA
                  </div>
                  <Slider
                    label="Ángulo inicial naranja"
                    symbol="θ₂"
                    value={secondStart}
                    min={100}
                    max={260}
                    unit="°"
                    onChange={setSecondStart}
                  />
                  <div className="computed-result">
                    <span>Amplitud calculada Δθ₂</span>
                    <strong data-testid="orange-angle">
                      {fmt(areaResult.angle)}°
                    </strong>
                    <small>El extremo final se encuentra por bisección.</small>
                  </div>
                  <button
                    className="secondary-button full"
                    onClick={() => setAreaE((v) => (v < 0.7 ? 0.8 : 0.35))}
                  >
                    <Icon name="reset" size={15} />
                    Cambiar e y mantener áreas iguales
                  </button>
                </>
              ) : (
                <>
                  <div className="info-box compact">
                    <Icon name="info" size={20} />
                    <p>
                      <strong>Modelo normalizado, μ = 1.</strong> No representa
                      una medición real ni utiliza unidades físicas.
                    </p>
                  </div>
                  <div className="control-section-title">
                    CAPAS DE VISUALIZACIÓN
                  </div>
                  <Switch
                    label="Curvas de nivel"
                    checked={contours}
                    onChange={() => setContours(!contours)}
                  />
                  <Switch
                    label="Flechas del campo"
                    checked={arrows}
                    onChange={() => setArrows(!arrows)}
                  />
                  <div className="control-section-title space-top">
                    POSICIÓN DEL FOCO
                  </div>
                  <Slider
                    label="Horizontal"
                    symbol="h"
                    value={orbit.h}
                    min={-4}
                    max={4}
                    step={0.1}
                    onChange={(v) => update("h", v)}
                  />
                  <Slider
                    label="Vertical"
                    symbol="k"
                    value={orbit.k}
                    min={-4}
                    max={4}
                    step={0.1}
                    onChange={(v) => update("k", v)}
                  />
                  <div className="probe-card">
                    <span className="panel-eyebrow">
                      EVALUACIÓN EN UN PUNTO
                    </span>
                    <p>
                      ({fmt(probe.x)}, {fmt(probe.y)})
                    </p>
                    <strong>
                      U = {probeU === null ? "No definido" : fmt(probeU, 4)}
                    </strong>
                    <small>Tocá o hacé clic sobre el plano.</small>
                    <button
                      className="text-button"
                      onClick={() => setProbe({ x: orbit.h, y: orbit.k })}
                    >
                      Evaluar en el foco
                    </button>
                  </div>
                </>
              )}
            </aside>
          </div>
          <div className="equations-section">
            {mode === "orbit" ? (
              <>
                <div className="equation-card">
                  <span className="equation-label">
                    01 <i /> MODELO POLAR
                  </span>
                  <div className="formula">
                    r(θ) ={" "}
                    <span className="fraction">
                      <span>{fmt(orbit.p)}</span>
                      <span>1 + {fmt(orbit.e)} cos θ</span>
                    </span>
                  </div>
                  <p>
                    p = {fmt(orbit.p)} u <span>·</span> e = {fmt(orbit.e)}
                  </p>
                </div>
                <div className="equation-card">
                  <span className="equation-label">
                    02 <i /> COORDENADAS CARTESIANAS
                  </span>
                  <div className="formula smaller">
                    x = {fmt(orbit.h)} + r cos(θ {orbit.alpha < 0 ? "−" : "+"}{" "}
                    {fmt(Math.abs(orbit.alpha), 0)}°)
                    <br />y = {fmt(orbit.k)} + r sin(θ{" "}
                    {orbit.alpha < 0 ? "−" : "+"}{" "}
                    {fmt(Math.abs(orbit.alpha), 0)}°)
                  </div>
                  <p>Rotación y traslación del sistema local</p>
                </div>
                <div className="equation-card">
                  <span className="equation-label">
                    03 <i /> POSICIÓN ACTUAL
                  </span>
                  <div className="position-values">
                    <span>
                      x <strong>{fmt(body.x)}</strong>
                    </span>
                    <span>
                      y <strong>{fmt(body.y)}</strong>
                    </span>
                    <span>
                      r <strong>{fmt(radius(theta, orbit.p, orbit.e))}</strong>
                    </span>
                  </div>
                  <p>
                    θ = {fmt(deg(theta), 1)}° <span>·</span> Distancias en
                    unidades arbitrarias
                  </p>
                </div>
              </>
            ) : mode === "areas" ? (
              <>
                <div className="equation-card area-card">
                  <span className="equation-label blue-text">SECTOR AZUL</span>
                  <div
                    className="area-number blue-text"
                    data-testid="blue-area"
                    data-value={areaResult.a1}
                  >
                    {fmt(areaResult.a1, 6)} <small>u²</small>
                  </div>
                  <p>
                    Δθ₁ = {fmt(delta)}° · [{fmt(start, 0)}°,{" "}
                    {fmt(start + delta, 0)}°]
                  </p>
                </div>
                <div className="equation-card area-card">
                  <span className="equation-label orange-text">
                    SECTOR NARANJA
                  </span>
                  <div
                    className="area-number orange-text"
                    data-testid="orange-area"
                    data-value={areaResult.a2}
                  >
                    {fmt(areaResult.a2, 6)} <small>u²</small>
                  </div>
                  <p>
                    Δθ₂ = {fmt(areaResult.angle)}° · [{fmt(secondStart, 0)}°,{" "}
                    {fmt(deg(areaResult.end))}°]
                  </p>
                </div>
                <div className="equation-card">
                  <span className="equation-label">DIFERENCIA RELATIVA</span>
                  <div
                    className="area-number success-text"
                    data-testid="area-error"
                    data-value={areaResult.error}
                  >
                    {areaResult.error < 0.000001
                      ? "< 0,000001"
                      : fmt(areaResult.error, 6)}{" "}
                    <small>%</small>
                  </div>
                  <p>
                    <Icon name="check" size={13} /> Áreas equivalentes dentro de
                    la tolerancia numérica
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="equation-card">
                  <span className="equation-label">POTENCIAL GRAVITATORIO</span>
                  <div className="formula">
                    U(x,y) ={" "}
                    <span className="fraction">
                      <span>−μ</span>
                      <span>√[(x−h)² + (y−k)²]</span>
                    </span>
                  </div>
                  <p>μ = 1 · Válido fuera del foco</p>
                </div>
                <div className="equation-card">
                  <span className="equation-label">CAMPO GRAVITATORIO</span>
                  <div className="formula smaller">
                    −∇U = −μ{" "}
                    <span className="fraction">
                      <span>(x−h, y−k)</span>
                      <span>[(x−h)² + (y−k)²]³ᐟ²</span>
                    </span>
                  </div>
                  <p>Dirección radial hacia el cuerpo central</p>
                </div>
                <div className="equation-card">
                  <span className="equation-label">CURVAS DE NIVEL</span>
                  <div className="formula smaller">(x−h)² + (y−k)² = R²</div>
                  <p>U = −1/R &lt; 0 · Circunferencias concéntricas</p>
                </div>
              </>
            )}
          </div>
        </div>
        <section className="under-workspace">
          <div className="explanation">
            <span className="section-index">
              {mode === "orbit" ? "01" : mode === "areas" ? "02" : "03"} / LA
              IDEA MATEMÁTICA
            </span>
            <h2>
              {mode === "orbit"
                ? "El foco es el punto de partida."
                : mode === "areas"
                  ? "Áreas iguales. Tiempos iguales."
                  : "Un campo que apunta al centro."}
            </h2>
            <p>
              {mode === "orbit"
                ? "La excentricidad determina la forma de la trayectoria; p controla su escala. La rotación α orienta los ejes locales y (h, k) ubica el foco en el plano global. Probá cambiar un parámetro por vez y observá qué se conserva."
                : mode === "areas"
                  ? "Según la segunda ley de Kepler, el radio vector barre áreas iguales en tiempos iguales. Cerca del periapsis el cuerpo se mueve más rápido: en el mismo tiempo recorre un ángulo mayor. Ángulos iguales no implican tiempos iguales."
                  : "Las curvas de nivel reúnen puntos con el mismo potencial. El campo −∇U es perpendicular a esas curvas y apunta hacia el foco. Al acercarse al foco, el potencial tiende a −∞; en el foco no está definido."}
            </p>
            <div className="method-note">
              <Icon name={mode === "areas" ? "area" : "info"} size={18} />
              <span>
                {mode === "orbit"
                  ? "Animación elíptica: M = E − e sen E, con anomalía media uniforme. El período visual es de 18 s."
                  : mode === "areas"
                    ? "A = ½ ∫ r(θ)² dθ · Simpson compuesto (1024 subintervalos) + bisección (48 iteraciones)."
                    : "Modelo ideal de una masa puntual. El tamaño del foco es simbólico; no representa una superficie física."}
              </span>
            </div>
            {mode === "areas" && (
              <p className="method-detail">
                Se conservan p = 3, α = 0 y foco (0, 0). Al cambiar e se
                recalculan ambas áreas y se mantiene A₁ = A₂; el valor común
                puede cambiar. Los intervalos pueden atravesar 360° o
                superponerse si así los configurás.
              </p>
            )}
          </div>
          <div className="data-panel">
            {mode === "orbit" ? (
              <>
                <div className="data-heading">
                  <Icon name="upload" size={18} />
                  <h3>Del modelo a tus observaciones</h3>
                  <span>CSV</span>
                </div>
                <p>
                  Superponé las coordenadas (x, y) del Grupo 14. Los datos se
                  procesan en tu dispositivo.
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  aria-label="Importar observaciones CSV"
                  onChange={(ev) => {
                    void importCSV(ev.target.files?.[0]);
                    ev.target.value = "";
                  }}
                />
                <button
                  className="upload-button"
                  onClick={() => fileRef.current?.click()}
                >
                  <Icon name="upload" size={16} />
                  {fileName ? "Cargar otro CSV" : "Importar observaciones"}
                  <Icon name="arrow" size={16} />
                </button>
                {fileName ? (
                  <div className="file-status">
                    <span>
                      <Icon name="check" size={13} />
                      {fileName} · {observations.length} puntos
                    </span>
                    <button
                      title="Quitar observaciones"
                      aria-label="Quitar observaciones"
                      onClick={() => {
                        setObservations([]);
                        setFileName("");
                        setCsvError("");
                      }}
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </div>
                ) : (
                  <small>
                    Formato: x,y · Encabezado opcional · Hasta 5000 puntos
                  </small>
                )}
                {csvError && (
                  <p className="error-message" role="alert">
                    {csvError}
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="data-heading">
                  <Icon name="orbit" size={18} />
                  <h3>Para la defensa oral</h3>
                </div>
                <p>
                  {mode === "areas"
                    ? "Compará los dos ángulos con e = 0. Luego aumentá la excentricidad: ¿por qué dejan de coincidir, aunque las áreas sigan siendo iguales?"
                    : "Elegí dos puntos sobre la misma circunferencia. ¿Cómo cambia U? ¿Qué relación hay entre las flechas y el gradiente?"}
                </p>
                <button
                  className="upload-button"
                  onClick={() => setShare(true)}
                >
                  <Icon name="qr" size={16} />
                  Abrir en otro dispositivo
                  <Icon name="arrow" size={16} />
                </button>
              </>
            )}
          </div>
        </section>
        <div className="academic-note">
          <Icon name="info" size={14} />
          <span>
            Una herramienta para explorar y argumentar. Este simulador
            complementa el informe escrito del proyecto integrador.
          </span>
        </div>
      </main>
      <footer>
        <div className="footer-brand">
          <span className="utn-mark">
            UTN
            <span>
              Universidad Tecnológica
              <br />
              Nacional
            </span>
          </span>
          <span className="footer-separator" />
          <span>
            Análisis Matemático II
            <br />
            <strong>Proyecto integrador · Grupo 14</strong>
          </span>
        </div>
        <div className="members">
          <span>DESARROLLADO POR</span>
          <p>
            Matías Colimodio <i /> Felipe D Ortusar
          </p>
        </div>
        <span className="footer-orbit">
          <Icon name="orbit" size={26} />
        </span>
      </footer>
      <dialog
        ref={shareRef}
        onCancel={() => setShare(false)}
        onClick={(ev) => {
          if (ev.target === ev.currentTarget) setShare(false);
        }}
        className="share-dialog"
      >
        <button
          className="icon-button dialog-close"
          aria-label="Cerrar compartir"
          onClick={() => setShare(false)}
        >
          <Icon name="close" />
        </button>
        <div className="eyebrow">EXPLORÁ DESDE TU CELULAR</div>
        <h2>La órbita, en tus manos.</h2>
        <p>Escaneá el código para abrir este proyecto.</p>
        {qr && (
          <img
            src={qr}
            width="240"
            height="240"
            alt="Código QR con la dirección actual del proyecto"
          />
        )}
        <code>{typeof window !== "undefined" ? window.location.host : ""}</code>
        {typeof window !== "undefined" &&
          ["localhost", "127.0.0.1"].includes(window.location.hostname) && (
            <p className="local-warning">
              Esta dirección es local. El QR será accesible desde otro
              dispositivo cuando la aplicación esté publicada.
            </p>
          )}
        <button
          className="secondary-button full"
          onClick={() => {
            navigator.clipboard
              ?.writeText(window.location.href.split("#")[0])
              .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              })
              .catch(() => setCopied(false));
          }}
        >
          {copied ? "Enlace copiado" : "Copiar enlace"}
        </button>
      </dialog>
    </>
  );
}
