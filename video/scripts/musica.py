"""Música original de fondo, generada por código (síntesis con NumPy; no usa grabaciones ni muestras ajenas).

    python3 scripts/musica.py        (desde video/; lee timeline.json y escribe .cache/musica.wav)

Pieza ambiental en Re mayor, 72 pulsos por minuto: colchón de acordes, arpegio suave y bajo. Se adapta a la
línea de tiempo: suena plena en la introducción, en el relevo y en la pantalla final, y baja mientras se habla.
"""
import json
import subprocess
import os
from pathlib import Path

import numpy as np
from scipy import signal

RAIZ = Path(__file__).resolve().parent.parent
SR = 48000
BPM = 72
NEGRA = 60 / BPM
COMPAS = 4 * NEGRA
# Progresión: Dmaj7 – Bm7 – Gmaj7 – A6 (y variante con Em7 cada 8 compases)
ACORDES = [
    ([62, 66, 69, 73], 38), ([59, 62, 66, 69], 35), ([55, 59, 62, 66], 43), ([57, 61, 64, 66], 45),
    ([62, 66, 69, 73], 38), ([59, 62, 66, 69], 35), ([52, 55, 59, 62], 40), ([57, 61, 64, 69], 45),
]
hz = lambda n: 440.0 * 2 ** ((n - 69) / 12)


def nota_pad(f, dur, rng):
    t = np.arange(int(dur * SR)) / SR
    y = np.zeros_like(t)
    for arm, amp in ((1, 1.0), (2, 0.35), (3, 0.12), (4, 0.05)):
        for des in (-0.35, 0.35):
            y += amp * np.sin(2 * np.pi * (f * arm + des) * t + rng.uniform(0, 6.28))
    env = np.minimum(1, t / 1.1) * np.minimum(1, (dur - t) / 1.4)
    return y * env * (1 + 0.08 * np.sin(2 * np.pi * 0.21 * t))


def nota_pluck(f, dur=1.6):
    t = np.arange(int(dur * SR)) / SR
    y = np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 6) + 0.15 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t * 10)
    return y * np.exp(-t * 3.2) * np.minimum(1, t / 0.006)


def nota_bajo(f, dur):
    t = np.arange(int(dur * SR)) / SR
    y = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t)
    return y * np.minimum(1, t / 0.08) * np.minimum(1, (dur - t) / 0.5)


def main():
    tl = json.loads((RAIZ / "timeline.json").read_text(encoding="utf8"))
    dur = tl["duracion"]
    n = int((dur + 1) * SR)
    L, R = np.zeros(n), np.zeros(n)
    rng = np.random.default_rng(14)

    def sumar(y, t0, pan=0.0, g=1.0):
        i = int(t0 * SR)
        if i >= n:
            return
        y = y[: n - i] * g
        L[i : i + len(y)] += y * np.cos((pan + 1) * np.pi / 4)
        R[i : i + len(y)] += y * np.sin((pan + 1) * np.pi / 4)

    compases = int(np.ceil(dur / COMPAS)) + 1
    patron = [0, 2, 1, 3, 2, 1, 3, 2]  # arpegio en corcheas
    for c in range(compases):
        notas, bajo = ACORDES[c % len(ACORDES)]
        t0 = c * COMPAS
        for k, m in enumerate(notas):
            sumar(nota_pad(hz(m), COMPAS + 1.2, rng), t0, pan=(-0.5, 0.5, -0.2, 0.2)[k], g=0.055)
        sumar(nota_bajo(hz(bajo), COMPAS), t0, g=0.16)
        if c >= 1:  # el arpegio entra en el segundo compás
            for k, idx in enumerate(patron):
                if (c % 4 == 3) and k >= 6:
                    continue  # respiro al final de cada frase de cuatro compases
                m = notas[idx] + 12
                sumar(nota_pluck(hz(m)), t0 + k * NEGRA / 2, pan=0.6 * (-1) ** k, g=0.05 * (0.8 + 0.2 * rng.random()))
    # Calidez: recorte suave de agudos y de subgraves
    sos = signal.butter(2, [45, 6500], "bandpass", fs=SR, output="sos")
    L, R = signal.sosfiltfilt(sos, L), signal.sosfiltfilt(sos, R)

    # Dinámica según la línea de tiempo: plena sin voz, 15 dB más baja mientras se habla.
    paso = 0.05
    m = int(dur / paso) + 2
    habla = np.zeros(m)
    for f in tl["frases"]:
        habla[max(0, int((f["inicio"] - 0.35) / paso)) : int((f["fin"] + 0.45) / paso) + 1] = 1
    # Las pausas cortas entre frases no levantan la música (se rellenan huecos de menos de 2,5 s).
    i = 0
    while i < m:
        if habla[i] == 0:
            j = i
            while j < m and habla[j] == 0:
                j += 1
            if 0 < i and j < m and (j - i) * paso < 2.5:
                habla[i:j] = 1
            i = j
        else:
            i += 1
    objetivo = np.where(habla > 0, 10 ** (-15 / 20), 1.0)
    g = np.empty(m)
    acc = objetivo[0]
    for k, v in enumerate(objetivo):  # baja en ~0,4 s, sube en ~1,2 s
        acc += (v - acc) * (0.12 if v < acc else 0.04)
        g[k] = acc
    t = np.arange(n) / SR
    env = np.interp(t, np.arange(m) * paso, g)
    env *= np.minimum(1, t / 1.5) * np.clip((dur - t) / 3.0, 0, 1)  # entrada y fundido final
    L, R = L * env, R * env
    pico = max(np.abs(L).max(), np.abs(R).max())
    L, R = L / pico * 0.5, R / pico * 0.5
    estereo = np.stack([L, R], axis=1)[: int(dur * SR)].astype(np.float32)
    destino = RAIZ / ".cache" / "musica.wav"
    destino.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([os.environ.get("FFMPEG_PATH", "ffmpeg"), "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "pcm_s24le", str(destino)], input=estereo.tobytes(), check=True)
    print(f"✓ Música original: {dur:.1f} s → {destino.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
