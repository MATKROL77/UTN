# Explorador de Órbitas Keplerianas — Grupo 14

Complemento interactivo del proyecto integrador de **Análisis Matemático II · UTN**.
Integrantes: **Matías Colimodio y Felipe D Ortusar**.

Aplicación estática construida con React, Vite y TypeScript. Los gráficos son SVG y mantienen la misma escala en ambos ejes. No requiere backend, cuentas, servicios pagos ni datos de observaciones para funcionar. El QR se genera en el dispositivo y apunta a la dirección desde la que se abrió la aplicación.

## Desarrollo

Requisito: Node.js 22.12 o superior; versión recomendada: Node 24 (`.nvmrc`).

```sh
cd /workspace/UTN
npm ci
npm run dev
```

El servidor usa el puerto 5173. Para verificar la versión de producción:

```sh
npm test
npm run build
npm run preview -- --port 4173
npm run test:e2e
```

Las pruebas de navegador usan Chromium del sistema si existe; en otra máquina, instalarlo con `npx playwright install chromium`. Se puede especificar una ruta con `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Playwright inicia y detiene su propio servidor de producción para las pruebas. La CI instala Chromium con sus dependencias.

Cada tarea de este entorno ya está aislada: usar el checkout existente, sin crear un worktree salvo pedido explícito.

## Qué permite explorar

- **Simulador orbital:** parámetro p, excentricidad e, rotación α, traslación (h,k), ejes globales y locales, animación temporal de elipses y ejemplos de las cuatro cónicas. El control inicial de e recorre 0–0,85; al elegir una cónica abierta se habilita 0–1,70. Reiniciar vuelve al caso elíptico inicial.
- **Segunda ley de Kepler:** dos sectores medidos desde el foco, integración del área, búsqueda automática del segundo extremo, amplitudes y error relativo. Controles independientes de la primera vista; p = 3, α = 0 y foco (0,0).
- **Potencial:** curvas de nivel, dirección del campo, evaluación al tocar el plano y singularidad en el foco, con μ = 1 normalizado.
- **CSV:** importación local de hasta 5000 pares numéricos (máximo 1 MB), con encabezado opcional `x,y`. Admite comas o punto y coma como separador; con punto y coma admite coma decimal. Se valida todo el archivo antes de reemplazar los datos anteriores. No se ajustan parámetros ni se inventan observaciones. No se envían datos a un servidor y no se guardan al recargar.

## Matemática y decisiones de representación

### Cónicas y cambio de coordenadas

```text
r(θ) = p / (1 + e cos θ)
x = h + r cos(θ + α)
y = k + r sin(θ + α)
```

Los cálculos usan radianes; la interfaz muestra grados. El foco está en (h,k). La dirección local x′ rota α respecto de x. Para e < 1 la elipse está cerrada; para e ≥ 1 se muestrea únicamente `|θ| < arccos(−1/e)`, con un margen de 0,005 rad para evitar las asíntotas. Se excluyen radios negativos o no finitos; la polilínea abierta nunca se cierra. El recorte SVG limita la porción visible de la rama física. La cámara se ajusta automáticamente a la trayectoria acotada, al foco, al origen y a las observaciones; por eso cambia la graduación al variar la escala. En trayectorias abiertas se usa una ventana finita alrededor del foco.

### Áreas iguales

```text
A₁ = ½ ∫[θ₁, θ₁ + Δθ₁] r(θ)² dθ
Buscar β ≥ θ₂ tal que ½ ∫[θ₂, β] r(θ)² dθ = A₁
Error porcentual = |A₁ − A₂| / A₁ × 100
```

Se integra con **Simpson compuesto de 1024 subintervalos**. Como el integrando es positivo, el área es estrictamente creciente respecto del extremo final; una **bisección de 48 iteraciones** en `[θ₂, θ₂ + 2π]` determina β. No se igualan los ángulos. El área inicial siempre es menor que una revolución para los controles disponibles.

Al cambiar e se recalcula A₁ y se encuentra nuevamente A₂ = A₁. Se conserva la igualdad, no necesariamente el valor común anterior. Los intervalos pueden pasar por 360°; se usa la periodicidad de r. La interfaz aclara que pueden superponerse si se eligen así sus inicios.

La igualdad numérica se verifica además con una solución analítica independiente en las pruebas: `A = a²√(1−e²)(E − e sen E)/2`. Se verifican 135 combinaciones de parámetros, incluidas excentricidades altas y cruces de 360°.

### Animación

La anomalía media M aumenta uniformemente. Se resuelve `M = E − e sen E` con Newton y se transforma E en anomalía verdadera θ. Por lo tanto, intervalos de tiempo iguales barren áreas iguales; θ no avanza uniformemente. El período visual de 18 segundos es ilustrativo y no una medición física. La animación solo está habilitada para elipses; en trayectorias abiertas se muestra un punto representativo.

### Potencial

```text
U = −μ / R,  R = √[(x−h)² + (y−k)²]
−∇U = −μ (x−h, y−k) / R³
```

μ = 1 es una normalización, no un dato observado. Se excluye R = 0. Las curvas U = constante son circunferencias concéntricas. Las flechas preservan la dirección exacta del campo, con longitud normalizada para legibilidad; no son una escala de su módulo. El radio dibujado del cuerpo central es simbólico.

## Organización

- `src/math.ts`: funciones matemáticas puras y parser CSV, comentados.
- `src/Plot.tsx`: escala isotrópica, cámara, ejes, cónicas, sectores, potencial y campo.
- `src/App.tsx`: controles, estados de los experimentos, fórmulas, importación y QR.
- `src/styles.css`: diseño adaptativo y estados accesibles.
- `tests/math.test.ts`: diez pruebas matemáticas y de datos, con referencias analíticas independientes.
- `tests/browser/app.spec.ts`: tres pruebas funcionales por dispositivo, en escritorio y celular.

## Despliegue automático desde GitHub Actions

El workflow **Verificar y publicar explorador** valida la aplicación y publica cada push a `main` en Cloudflare Pages. También se puede ejecutar manualmente desde Actions.

El token `CLOUDFLARE_API_TOKEN` puede estar en los secretos del repositorio o en su Environment de GitHub. El workflow detecta automáticamente un único Environment; si hay varios, busca cuál declara ese secreto o utiliza la variable `CLOUDFLARE_ENVIRONMENT`. En la ejecución manual se puede indicar el Environment explícitamente.

La cuenta se detecta con el token. Si este tiene acceso a varias cuentas, o no permite enumerarlas, configurar `CLOUDFLARE_ACCOUNT_ID` como variable del Environment. No se imprime ni se incorpora el token al frontend.

Se crea el proyecto `kepler-grupo14-utn` en la primera publicación. Para reutilizar un proyecto existente se comprueba que su despliegue anterior pertenezca al historial de este repositorio. El workflow publica únicamente después de las pruebas, verifica la respuesta HTML del dominio público y repite las seis pruebas funcionales sobre la web publicada, en escritorio y celular, antes de marcar el despliegue como completo.

## Publicar en un nuevo proyecto de Cloudflare Pages

La carpeta publicable es **`dist`**, generada con `npm run build`. Cloudflare Pages sirve todos los recursos desde el mismo origen; no hay llamadas a APIs desde la aplicación, fuentes remotas ni secretos dentro del frontend.

Para el despliegue por CLI se requieren acceso a `api.cloudflare.com` y autenticación de Cloudflare con permiso **Account / Cloudflare Pages / Edit** sobre la cuenta de destino. Configurar `CLOUDFLARE_API_TOKEN` en los secretos del entorno; nunca pegarlo en el código ni en el chat. Si se dispone de varias cuentas, configurar el identificador no secreto `CLOUDFLARE_ACCOUNT_ID`.

```sh
# Ejecutar una vez para crear el proyecto nuevo:
npm run deploy:create
# Compilar y publicar en producción:
npm run deploy
```

Los comandos usan Wrangler fijado a 4.160.0. El proyecto creado es `kepler-grupo14-utn`, publicado en https://kepler-grupo14-utn.pages.dev. El Environment de GitHub que contiene el token se llama `api token`. La URL de producción solo debe considerarse existente después de un despliegue exitoso y una petición HTTP de verificación. El QR se adapta automáticamente al dominio definitivo.

Alternativamente, crear un proyecto Pages conectado a este repositorio, rama `main`, comando de compilación `npm run build`, salida `dist` y Node 24. No se necesita una variable pública con la dirección del sitio.

## Validación en el entorno de desarrollo

Se ejecutan la compilación TypeScript/Vite, las pruebas matemáticas y las pruebas Chromium en escritorio (1440 px) y celular (390 px). Las pruebas cubren sliders, cónicas abiertas, cambio de régimen, animación, CSV válido e inválido, áreas equivalentes, capas del potencial, singularidad, diálogo QR y ausencia de desbordamiento horizontal. La proporción del SVG conserva distancias; la versión móvil usa una ventana gráfica propia para mantener legibles sus etiquetas.
