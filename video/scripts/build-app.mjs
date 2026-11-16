// Compila la web real del proyecto (../) y la deja en video/public/app para embeberla en vivo dentro del video.
// No modifica ningún archivo de la web: solo ejecuta su build con otra carpeta de salida y base "/app/".
// Uso: npm run app  [-- --si-falta]
import fs from "node:fs";
import path from "node:path";
import { REPO, ROOT, argumentos, correr } from "./lib.mjs";

const { flags } = argumentos();
const destino = path.join(ROOT, "public/app");
if ((flags["si-falta"] || flags["if-missing"]) && fs.existsSync(path.join(destino, "index.html"))) process.exit(0);
if (!fs.existsSync(path.join(REPO, "node_modules/vite"))) {
  console.log("Instalando dependencias de la web (npm ci en la raíz del repositorio)…");
  correr("npm", ["ci"], { cwd: REPO, shell: process.platform === "win32" });
}
console.log("Compilando la web real en video/public/app …");
correr("npx", ["vite", "build", "--base=/app/", "--outDir", destino, "--emptyOutDir"], { cwd: REPO, shell: process.platform === "win32" });
fs.rmSync(path.join(destino, "_headers"), { force: true });
console.log("✓ Web lista en video/public/app");
