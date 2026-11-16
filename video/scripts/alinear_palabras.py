"""Alineación fina (opcional): ubica cada palabra del guion dentro de las grabaciones.

Usa un reconocedor de voz LOCAL y gratuito (faster-whisper). El audio no sale de la máquina: solo se
descarga el modelo la primera vez. No genera ni modifica ninguna voz; solo mide cuándo se dice cada palabra.

    pip install faster-whisper
    python3 scripts/alinear_palabras.py            (desde la carpeta video/)
    python3 scripts/alinear_palabras.py large-v3-turbo M     (modelo y, opcionalmente, solo M o F)

Por cada grabación presente en audio/ escribe audio/voz_<nombre>.palabras.json. Si ese archivo existe,
"npm run sync" lo usa para fijar cada frase y cada cue en la palabra exacta (en vez de guiarse solo por las pausas).
También muestra las diferencias entre lo que se oyó y el guion, para detectar palabras cambiadas al leer.
"""
import difflib
import hashlib
import json
import os
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
MODELO = sys.argv[1] if len(sys.argv) > 1 else "large-v3-turbo"  # "small" es más liviano y algo menos preciso
SOLO = sys.argv[2] if len(sys.argv) > 2 else None  # opcional: M o F, para medir una sola grabación


def limpiar(texto: str) -> str:
    return re.sub(r"\{\{[^}]+\}\}", "", texto)


def norma(palabra: str) -> str:
    s = unicodedata.normalize("NFD", palabra.lower())
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    return re.sub(r"[^a-z0-9ñ]", "", s)


EQUIVALENTES = {"14": "catorce", "ii": "2", "dos": "2", "theta": "teta", "tita": "teta", "zeta": "teta", "mu": "mu", "miu": "mu"}


def clave(palabra: str) -> str:
    n = norma(palabra)
    return EQUIVALENTES.get(n, n)


def decodificar(audio: Path):
    """Audio → mono 16 kHz en memoria, con FFmpeg (sirve para wav, m4a, mp3…)."""
    import numpy as np

    ffmpeg = os.environ.get("FFMPEG_PATH", "ffmpeg")
    crudo = subprocess.run([ffmpeg, "-v", "error", "-i", str(audio), "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], check=True, capture_output=True).stdout
    return np.frombuffer(crudo, dtype=np.int16).astype(np.float32) / 32768.0


def buscar_audio(nombre: str):
    """Devuelve (archivo, receta): la voz procesada por scripts/voces.py si corresponde a la grabación actual;
    si no, la grabación original (receta None)."""
    base = Path(nombre).stem
    original = None
    for ext in ("wav", "WAV", "m4a", "mp3", "ogg", "flac", "aac"):
        f = RAIZ / "audio" / f"{base}.{ext}"
        if f.exists():
            original = f
            break
    if not original:
        return None, None
    wav, ficha = RAIZ / ".cache" / "voces" / f"{base}.wav", RAIZ / ".cache" / "voces" / f"{base}.json"
    if wav.exists() and ficha.exists():
        datos = json.loads(ficha.read_text(encoding="utf8"))
        if datos.get("sha1_origen") == hashlib.sha1(original.read_bytes()).hexdigest():
            return wav, datos.get("receta")
    return original, None


def main():
    from faster_whisper import WhisperModel

    guion = json.loads((RAIZ / "guion" / "guion.json").read_text(encoding="utf8"))
    modelo = None
    for quien, datos in guion["hablantes"].items():
        if SOLO and quien != SOLO:
            continue
        audio, receta = buscar_audio(datos["audio"])
        if not audio:
            print(f"– {datos['nombre']}: todavía no hay grabación ({datos['audio']}).")
            continue
        if modelo is None:
            print(f"Cargando el modelo '{MODELO}' (la primera vez se descarga)…")
            modelo = WhisperModel(MODELO, device="cpu", compute_type="int8")
        texto = " ".join(limpiar(p["texto"]) for p in guion["parrafos"] if p["id"].startswith(quien))
        palabras = texto.split()
        segmentos, _ = modelo.transcribe(
            decodificar(audio), language="es", word_timestamps=True, vad_filter=True, beam_size=5, condition_on_previous_text=False,
            initial_prompt="Análisis Matemático II, órbitas keplerianas, jacobiano, coordenadas polares, excentricidad, theta, mu, gradiente, potencial gravitatorio, segunda ley de Kepler, Grupo 14.",
        )
        oidas = [w for s in segmentos for w in (s.words or []) if norma(w.word)]
        a = [clave(w) for w in palabras]
        b = [clave(w.word) for w in oidas]
        tiempos = [None] * len(palabras)
        sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
        diferencias = []
        for op, i1, i2, j1, j2 in sm.get_opcodes():
            if op == "equal":
                for k in range(i2 - i1):
                    tiempos[i1 + k] = (float(oidas[j1 + k].start), float(oidas[j1 + k].end))
            else:
                diferencias.append((" ".join(palabras[i1:i2]) or "∅", " ".join(w.word.strip() for w in oidas[j1:j2]) or "∅"))
                # Tramo distinto con la misma cantidad de palabras: se toma el tiempo de cada una (mal oída, bien ubicada).
                if op == "replace" and i2 - i1 == j2 - j1:
                    for k in range(i2 - i1):
                        tiempos[i1 + k] = (float(oidas[j1 + k].start), float(oidas[j1 + k].end))
                elif op == "replace" and j2 > j1:
                    t0, t1 = float(oidas[j1].start), float(oidas[j2 - 1].end)
                    pesos = [max(1, len(norma(w))) for w in palabras[i1:i2]]
                    acum = 0
                    for k, w in enumerate(pesos):
                        tiempos[i1 + k] = (t0 + (t1 - t0) * acum / sum(pesos), t0 + (t1 - t0) * (acum + w) / sum(pesos))
                        acum += w
        # Palabras sin tiempo (omitidas por el reconocedor): se interpolan entre las vecinas.
        exactas = sum(1 for i, t in enumerate(tiempos) if t is not None)
        for i, t in enumerate(tiempos):
            if t is not None:
                continue
            j = i
            while j < len(tiempos) and tiempos[j] is None:
                j += 1
            antes = tiempos[i - 1][1] if i > 0 else (tiempos[j][0] - 0.3 * (j - i) if j < len(tiempos) else 0.0)
            despues = tiempos[j][0] if j < len(tiempos) else antes + 0.3 * (j - i)
            for k in range(i, j):
                tiempos[k] = (antes + (despues - antes) * (k - i) / (j - i), antes + (despues - antes) * (k - i + 1) / (j - i))
        coincidencia = sm.ratio()
        salida = RAIZ / "audio" / f"{Path(datos['audio']).stem}.palabras.json"
        salida.write_text(json.dumps({
            "_ayuda": "Tiempo (segundos del archivo de audio) de cada palabra del guion, medido con faster-whisper.",
            "audio": audio.name, "receta": receta, "sha1": hashlib.sha1(audio.read_bytes()).hexdigest(), "modelo": MODELO, "coincidencia": round(coincidencia, 4),
            "palabras": [{"p": w, "inicio": round(t[0], 3), "fin": round(t[1], 3)} for w, t in zip(palabras, tiempos)],
        }, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
        print(f"✓ {datos['nombre']}: {len(palabras)} palabras del guion · {len(oidas)} oídas · coincidencia {coincidencia:.1%} · {salida.relative_to(RAIZ)}")
        print(f"  primera palabra a los {tiempos[0][0]:.2f} s · última termina a los {tiempos[-1][1]:.2f} s")
        if diferencias:
            print("  Diferencias entre el guion y lo que entendió el reconocedor (pueden ser errores del reconocedor):")
            for g, o in diferencias:
                print(f"    guion: «{g}»  →  oído: «{o}»")
        else:
            print("  El reconocedor entendió exactamente el texto del guion.")


if __name__ == "__main__":
    main()
