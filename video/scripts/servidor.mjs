// Compila la composición (vite build) y la sirve como archivos estáticos para el render.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { ROOT, correr } from "./lib.mjs";

const TIPOS = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf",
  ".wav": "audio/wav", ".mp3": "audio/mpeg", ".m4a": "audio/mp4",
};

export async function prepararSitio({ compilar = true } = {}) {
  correr("node", [path.join(ROOT, "scripts/build-app.mjs"), "--si-falta"]);
  correr("node", [path.join(ROOT, "scripts/timeline.mjs"), "--si-falta"]);
  correr("node", [path.join(ROOT, "scripts/check-guion.mjs")]);
  if (compilar) correr("npx", ["vite", "build", "--logLevel", "warn"], { cwd: ROOT, shell: process.platform === "win32" });
  const raiz = path.join(ROOT, "dist");
  const servidor = http.createServer((req, res) => {
    let p = decodeURIComponent((req.url || "/").split("?")[0]);
    if (p.endsWith("/")) p += "index.html";
    const archivo = path.join(raiz, p);
    if (!archivo.startsWith(raiz) || !fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) {
      res.writeHead(404);
      res.end("no encontrado");
      return;
    }
    res.writeHead(200, { "content-type": TIPOS[path.extname(archivo).toLowerCase()] || "application/octet-stream", "cache-control": "no-store" });
    fs.createReadStream(archivo).pipe(res);
  });
  await new Promise((r) => servidor.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${servidor.address().port}`;
  return { url, cerrar: () => new Promise((r) => servidor.close(r)) };
}

export async function abrirNavegador() {
  const { chromium } = await import("playwright");
  const opciones = { args: ["--force-color-profile=srgb", "--font-render-hinting=none", "--disable-lcd-text", "--hide-scrollbars"] };
  try {
    return await chromium.launch(opciones);
  } catch (e) {
    const alternativas = [process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, "/opt/pw-browsers/chromium", "/usr/bin/chromium", "/usr/bin/google-chrome"].filter((f) => f && fs.existsSync(f));
    for (const executablePath of alternativas) {
      try { return await chromium.launch({ ...opciones, executablePath }); } catch { /* probar la siguiente */ }
    }
    throw new Error(`No se pudo abrir Chromium. Ejecutá "npx playwright install chromium".\n${e.message}`);
  }
}

export async function abrirPagina(navegador, url) {
  const contexto = await navegador.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, reducedMotion: "reduce", colorScheme: "dark" });
  const pagina = await contexto.newPage();
  const errores = [];
  pagina.on("pageerror", (e) => errores.push(e.message));
  pagina.on("console", (m) => { if (m.type() === "error") errores.push(m.text()); });
  await pagina.goto(`${url}/?render=1`);
  await pagina.evaluate(() => window.__listo);
  const info = await pagina.evaluate(() => window.__info);
  const cdp = await contexto.newCDPSession(pagina);
  const capturar = async (frame) => {
    await pagina.evaluate((f) => window.__seek(f), frame);
    if (errores.length) throw new Error(`Error en la página (cuadro ${frame}): ${errores.join(" | ")}`);
    const { data } = await cdp.send("Page.captureScreenshot", { format: "png", optimizeForSpeed: true });
    return Buffer.from(data, "base64");
  };
  return { pagina, info, capturar, cerrar: () => contexto.close() };
}
