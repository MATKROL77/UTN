"""Prepara las voces para el video: cortes, limpieza y ecualización. No cambia la velocidad ni el tono.

    python3 scripts/voces.py            (desde la carpeta video/; requiere numpy, scipy y noisereduce)

Entrada: audio/voz_matias.* y audio/voz_felipe.* (las grabaciones originales, que no se modifican) y
audio/cortes.json (tramos a quitar). Salida: .cache/voces/voz_<nombre>.wav (48 kHz, mono) y un .json con la
"receta" (huella de la grabación, los cortes y los ajustes). Si la receta no cambió, no se vuelve a procesar.

Cadena por voz:
  1. Cortes con fundido de potencia constante (solo se quitan los tramos de audio/cortes.json).
  2. Filtro pasa-altos a 80 Hz (ruido grave, golpes) y filtros muy angostos sobre zumbido eléctrico si lo hay.
  3. Reducción de ruido espectral con el perfil medido en las pausas (solo si la grabación tiene ruido de fondo).
  4. Ecualización moderada (claridad), de-esser y compresión suave (FFmpeg).
  5. Reductor de respiraciones: baja 14 dB lo que no es voz (respiraciones, ambiente) en las pausas. Distingue la
     voz (armónicos graves) del soplido (solo agudos) y respeta los bordes de cada palabra (120 ms antes y 140 ms después). Va al final porque la
     compresión y la ecualización realzan las respiraciones.
Todos los filtros son de fase cero o sin retardo: los tiempos de cada palabra no se mueven.
"""
import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy import signal

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / ".cache" / "voces"
SR = 48000
VERSION = "voces-3"
FFMPEG = os.environ.get("FFMPEG_PATH", "ffmpeg")

# Ecualización y dinámica por voz (FFmpeg). Ajustes moderados, elegidos a partir del análisis de cada grabación.
AJUSTES = {
    # Matías: graves y medios-graves cargados, poca presencia en 1–3 kHz, sibilancia en 4–8 kHz.
    "voz_matias": "equalizer=f=280:t=q:w=1.0:g=-2.5,equalizer=f=2200:t=q:w=0.9:g=2.5,highshelf=f=9000:g=-1",
    # Felipe: graves cargados (cercanía al micrófono) y voz más apagada (la grabación llega hasta ~8 kHz):
    # menos graves, algo más de presencia y brillo.
    "voz_felipe": "equalizer=f=170:t=q:w=1.1:g=-4,equalizer=f=380:t=q:w=1.0:g=-1,equalizer=f=3000:t=q:w=0.8:g=2,highshelf=f=4800:g=2",
}
DINAMICA = "deesser=i=0.35:m=0.5:f=0.5,acompressor=threshold=0.08:ratio=2.5:attack=8:release=160:knee=4:makeup=1.6:detection=rms"


def cargar(archivo):
    crudo = subprocess.run([FFMPEG, "-v", "error", "-i", str(archivo), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], check=True, capture_output=True).stdout
    return np.frombuffer(crudo, dtype=np.float32).astype(np.float64)


def guardar(archivo, x, filtros=None):
    datos = np.clip(x, -1, 1).astype(np.float32).tobytes()
    args = [FFMPEG, "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-"]
    if filtros:
        args += ["-af", filtros]
    args += ["-c:a", "pcm_f32le", "-map_metadata", "-1", "-fflags", "+bitexact", "-flags:a", "+bitexact", str(archivo)]
    subprocess.run(args, input=datos, check=True)


def buscar(nombre):
    for ext in ("wav", "WAV", "m4a", "mp3", "ogg", "flac", "aac"):
        f = RAIZ / "audio" / f"{nombre}.{ext}"
        if f.exists():
            return f
    return None


def aplicar_cortes(x, cortes):
    """Quita los tramos [desde, hasta] uniendo los bordes con un fundido de potencia constante."""
    if not cortes:
        return x
    partes, inicio = [], 0
    for c in sorted(cortes, key=lambda c: c["desde"]):
        f = int(round(c.get("fundido", 0.03) * SR))
        a, b = int(round(c["desde"] * SR)), int(round(c["hasta"] * SR))
        izq = x[inicio : a + f // 2]
        der_ini = b - f // 2
        partes.append((izq, f))
        inicio = der_ini
    resto = x[inicio:]
    salida = partes[0][0]
    for k in range(len(partes)):
        f = partes[k][1]
        siguiente = partes[k + 1][0] if k + 1 < len(partes) else resto
        u = np.linspace(0, 1, f, endpoint=False)
        cola, cabeza = salida[-f:], siguiente[:f]
        mezcla = cola * np.cos(u * np.pi / 2) + cabeza * np.sin(u * np.pi / 2)
        salida = np.concatenate([salida[:-f], mezcla, siguiente[f:]])
    return salida


def energia(x, paso=0.01):
    n = int(paso * SR)
    m = len(x) // n
    return 10 * np.log10(np.mean(x[: m * n].reshape(m, n) ** 2, axis=1) + 1e-12)


def zumbidos(x):
    """Frecuencias de zumbido eléctrico (múltiplos de 50 o 60 Hz) que sobresalen en las pausas."""
    e = energia(x, 0.02)
    validos = e > -110  # descarta silencio digital
    if validos.sum() < 50:
        return []
    piso = np.percentile(e[validos], 8)
    idx = np.where(validos & (e < piso + 4))[0]
    if len(idx) < 50:
        return []
    n = int(0.02 * SR)
    ruido = np.concatenate([x[i * n : (i + 1) * n] for i in idx])
    f, P = signal.welch(ruido, SR, nperseg=min(65536, len(ruido)))
    P = 10 * np.log10(P + 1e-20)
    out = []
    for base in (50, 60):
        for h in range(1, 6):
            fr = base * h
            m = (f > fr - 1.5) & (f < fr + 1.5)
            vec = (f > fr - 20) & (f < fr + 20) & ~((f > fr - 4) & (f < fr + 4))
            if m.any() and vec.any() and P[m].max() - np.median(P[vec]) > 6:
                out.append(fr)
    return out


def reducir_ruido(x):
    """Reducción espectral con perfil estacionario medido en las pausas. Devuelve (señal, piso_antes)."""
    e = energia(x, 0.02)
    validos = e > -110
    piso = np.percentile(e[validos], 8) if validos.any() else -120
    if piso < -75:  # sin ruido de fondo apreciable (o ya silenciado por el teléfono)
        return x, piso
    import noisereduce as nr

    n = int(0.02 * SR)
    pausa = (e < piso + 3) & validos
    tramos, i = [], 0
    while i < len(pausa):
        if pausa[i]:
            j = i
            while j < len(pausa) and pausa[j]:
                j += 1
            if j - i >= 10:  # al menos 200 ms
                tramos.append(x[i * n : j * n])
            i = j
        else:
            i += 1
    ruido = np.concatenate(tramos) if tramos else x[: SR // 2]
    y = nr.reduce_noise(y=x, sr=SR, y_noise=ruido, stationary=True, prop_decrease=0.85, n_fft=2048, n_std_thresh_stationary=1.5, freq_mask_smooth_hz=400, time_mask_smooth_ms=60)
    return y.astype(np.float64), piso


def mascara_voz(x):
    """Por cada tramo de 10 ms: True si es voz (o está pegado a la voz). Se calcula sobre la señal ya limpia."""
    paso = int(0.01 * SR)
    m = len(x) // paso
    def niveles(y):
        return 10 * np.log10(np.mean(y[: m * paso].reshape(m, paso) ** 2, axis=1) + 1e-12)
    e = niveles(x)
    validos = e > -110
    if validos.sum() < 100:
        return np.ones(m, bool)
    techo = np.percentile(e[validos], 95)
    graves = niveles(signal.sosfiltfilt(signal.butter(4, [100, 900], "bandpass", fs=SR, output="sos"), x))
    agudos = niveles(signal.sosfiltfilt(signal.butter(4, [1500, 6000], "bandpass", fs=SR, output="sos"), x))
    # Voz sonora: nivel razonable y armónicos graves dominantes. Lo muy fuerte también cuenta como voz.
    voz = ((e > techo - 32) & (graves - agudos > 3)) | (e > techo - 10)
    # Quitar destellos aislados de menos de 40 ms (chasquidos).
    i = 0
    while i < m:
        if voz[i]:
            j = i
            while j < m and voz[j]:
                j += 1
            if j - i < 4:
                voz[i:j] = False
            i = j
        else:
            i += 1
    # Bordes de palabra: 120 ms antes (consonantes como s, f, t) y 140 ms después (finales suaves).
    antes, despues = 12, 14
    mascara = voz.copy()
    for k in range(1, despues + 1):
        mascara[k:] |= voz[:-k]
    for k in range(1, antes + 1):
        mascara[:-k] |= voz[k:]
    return mascara


def reductor_respiraciones(x, mascara, rango_db=14.0):
    g = np.where(mascara, 1.0, 10 ** (-rango_db / 20))
    s = np.empty_like(g)
    acc = g[0]
    for i, v in enumerate(g):  # sube en ~15 ms, baja en ~80 ms
        acc += (v - acc) * (0.5 if v > acc else 0.12)
        s[i] = acc
    t = np.arange(len(x)) / SR / 0.01
    return x[: len(x)] * np.interp(t, np.arange(len(s)) + 0.5, s)


def preparar(nombre, cortes, forzar=False):
    origen = buscar(nombre)
    if not origen:
        return None
    huella = hashlib.sha1(origen.read_bytes()).hexdigest()
    receta = hashlib.sha1(json.dumps({"v": VERSION, "origen": huella, "cortes": cortes, "eq": AJUSTES.get(nombre, ""), "din": DINAMICA}, sort_keys=True).encode()).hexdigest()
    destino, ficha = SALIDA / f"{nombre}.wav", SALIDA / f"{nombre}.json"
    if not forzar and destino.exists() and ficha.exists() and json.loads(ficha.read_text()).get("receta") == receta:
        print(f"✓ {nombre}: sin cambios ({destino.relative_to(RAIZ)})")
        return destino
    SALIDA.mkdir(parents=True, exist_ok=True)
    x = cargar(origen)
    dur0 = len(x) / SR
    x = aplicar_cortes(x, cortes)
    sos = signal.butter(2, 80, "highpass", fs=SR, output="sos")
    x = signal.sosfiltfilt(sos, x)
    hz = zumbidos(x)
    for fr in hz:
        b, a = signal.iirnotch(fr, 30, fs=SR)
        x = signal.filtfilt(b, a, x)
    x, piso = reducir_ruido(x)
    mascara = mascara_voz(x)
    temporal = SALIDA / f"{nombre}.tmp.wav"
    guardar(temporal, x, f"{AJUSTES.get(nombre, 'anull')},{DINAMICA},alimiter=limit=0.95:attack=3:release=50:level=false:latency=1")
    y = cargar(temporal)
    temporal.unlink()
    y = y[: len(x)] if len(y) >= len(x) else np.concatenate([y, np.zeros(len(x) - len(y))])
    x = reductor_respiraciones(y, mascara)
    guardar(destino, x)
    ficha.write_text(json.dumps({"receta": receta, "origen": origen.name, "sha1_origen": huella, "cortes": cortes, "zumbidos_hz": hz, "piso_ruido_db": round(float(piso), 1), "duracion_origen": round(dur0, 3), "duracion": round(len(x) / SR, 3)}, ensure_ascii=False, indent=1) + "\n")
    quitado = sum(c["hasta"] - c["desde"] for c in cortes)
    print(f"✓ {nombre}: {dur0:.2f} s → {len(x) / SR:.2f} s ({len(cortes)} cortes, {quitado:.2f} s) · zumbido en {hz or 'ninguno'} Hz · ruido de fondo {'reducido' if piso >= -75 else 'no hacía falta'} ({piso:.1f} dB) → {destino.relative_to(RAIZ)}")
    return destino


def main():
    cortes = json.loads((RAIZ / "audio" / "cortes.json").read_text(encoding="utf8"))
    forzar = "--forzar" in sys.argv
    for nombre in ("voz_matias", "voz_felipe"):
        r = preparar(nombre, cortes.get(nombre, []), forzar)
        if r is None:
            print(f"– {nombre}: no hay grabación en audio/")


if __name__ == "__main__":
    main()
