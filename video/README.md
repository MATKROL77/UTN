# Video de presentación — Órbitas keplerianas · Grupo 14

Proyecto **independiente** que genera el video `Kepler_Grupo14_Presentacion.mp4` (1920 × 1080, 30 fps, H.264).
No modifica la web: vive en `video/` y solo *lee* el código de la raíz del repositorio para compilar la
aplicación real y mostrarla dentro del video.

El video se compone por código (React + Vite): cada cuadro es una función del tiempo. Un script abre
Chromium con Playwright, captura los cuadros y los codifica con FFmpeg. No se usan servicios pagos ni voces
artificiales.

## Uso rápido

```sh
cd video
npm install
npx playwright install chromium   # solo la primera vez (en la nube ya viene instalado)
npm run dev                       # vista previa en http://127.0.0.1:5180 (espacio = reproducir, ←/→ = saltar)
npm run render                    # genera los MP4 y el .srt en esta carpeta (unos 15 minutos)
```

Requisitos: Node 22 o superior y `ffmpeg`/`ffprobe` en el PATH (o las variables `FFMPEG_PATH` y `FFPROBE_PATH`).
Python solo hace falta para regenerar las figuras de la escena 10.

Archivos que produce `npm run render`:

| Archivo | Contenido |
| --- | --- |
| `Kepler_Grupo14_Presentacion.mp4` | Video completo con subtítulos discretos del guion |
| `Kepler_Grupo14_Presentacion_sin_subtitulos.mp4` | El mismo video, limpio |
| `Kepler_Grupo14_Presentacion.srt` | Subtítulos sueltos (para YouTube o un reproductor) |

## Cómo agregar las voces

1. Grabar cada parte de corrido, leyendo el guion tal cual (`guion/guion_original.txt`).
2. Copiar los archivos a `video/audio/voz_matias.wav` y `video/audio/voz_felipe.wav` (también vale `.m4a` o `.mp3`).
3. Ejecutar `npm run render`.

Con eso alcanza. El render detecta las voces y:

- **alinea** la línea de tiempo (`npm run sync`): mide dónde empieza y termina cada frase en cada grabación y
  reescribe `timeline.json`; todas las escenas se estiran o se acortan solas, porque cada animación está atada
  a una palabra del guion y no a un segundo fijo;
- **mezcla** las dos voces en el MP4 en el orden del guion (primero Matías, después Felipe), sin cortarlas ni
  cambiarles la velocidad; la duración del video se adapta a la lectura.

Para revisar la sincronía antes de renderizar: `npm run sync` y luego `npm run dev` (la vista previa reproduce
las voces). Si alguna frase quedó corrida (el script marca las dudosas con `⚠ revisar`):

- corregir su `inicio`/`fin` en `timeline.json` (segundos de video), o
- fijar un instante puntual en `"cuesManuales"`, por ejemplo `"M5.e0": 61.4`,

y renderizar con `npm run render -- --sin-sync` para que no se pisen los cambios manuales.

Sin voces, `npm run timeline -- --segundos-por-parte 150` regenera la estimación (2 min 30 s por persona).

## Cómo está sincronizado

- `guion/guion.json` contiene los dos guiones exactos. Las marcas `{{nombre}}` no se leen: señalan la palabra
  donde arranca una animación. Un *cue* se nombra `<párrafo>.<marca>`: `M5.e0` es «cuando la excentricidad es cero».
- `timeline.json` guarda el inicio y el fin de cada frase (estimados o medidos sobre las voces).
- En el código, `cue("M5.e0")` devuelve el segundo exacto. Mover una marca dentro del texto cambia cuándo
  ocurre la animación; `npm run check` verifica que el texto siga idéntico al original.

## La web real dentro del video

`npm run app` compila la aplicación de la raíz del repositorio (sin tocarla) en `public/app/`. Las escenas la
cargan en un `iframe` y la manejan como un usuario: mueven los deslizadores, pulsan pestañas, interruptores y
botones, y hacen clic sobre el gráfico (`src/components/AppWindow.tsx`). Los valores que se destacan en
pantalla (áreas, Δθ₂, excentricidad, tipo de cónica) se **leen de la página en vivo**, no están escritos a mano.

## Figuras de Python (escena 10)

`python/figuras_kepler.py` genera con NumPy y Matplotlib las tres figuras de `public/python/`:

```sh
pip install numpy matplotlib
npm run figuras
```

Para usar las figuras propias del grupo, reemplazar los archivos de `public/python/` manteniendo los nombres
(`orbita_polar.png`, `campo_vectorial.png` y `potencial_3d_00.jpg` … `potencial_3d_35.jpg`; si la superficie es
una sola imagen, copiarla 36 veces o ajustar `N3D` en `src/escenas/E10_Python.tsx`) y volver a renderizar.

## Datos de demostración (escena 11)

Los puntos del ajuste se generan en `src/escenas/E11_Ajuste.tsx` con una semilla fija y aparecen rotulados como
**datos de demostración**. No son los datos oficiales del Grupo 14 y no se muestra ningún valor numérico como
resultado. La curva converge con un Levenberg–Marquardt real sobre esos puntos.

## Mapa del proyecto

| Ruta | Qué es |
| --- | --- |
| `guion/` | Guion original, guion con marcas y cálculo de cues |
| `timeline.json` | Tiempos de cada frase |
| `audio/` | Acá van `voz_matias.wav` y `voz_felipe.wav` |
| `src/escenas/` | Una escena por archivo (`E01_Intro` … `E13_Final`) |
| `src/presentadores.tsx` | Dónde está cada personaje, qué gesto hace y cuándo habla |
| `src/components/Presenter.tsx` | Los personajes Mati y Feli (vectores animados por código) |
| `src/components/AppWindow.tsx` | La web real embebida y su manejo |
| `python/` | Script de las figuras |
| `scripts/` | `render`, `sync-audio`, `still` (capturas sueltas), `timeline`, `build-app` |

Comandos útiles: `npm run still -- 62.5 "F4.amp+1" --hoja prueba` (capturas en `out/stills/`),
`npm run render -- --desde 150 --hasta 200` (solo un tramo), `npm run prueba-sync` (autoprueba del alineador).
