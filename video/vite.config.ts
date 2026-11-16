import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/** Sirve video/audio/* en /audio/* para que la vista previa pueda reproducir las voces. */
function audioLocal(): Plugin {
  const tipos: Record<string, string> = { ".wav": "audio/wav", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".ogg": "audio/ogg", ".flac": "audio/flac" };
  return {
    name: "audio-local",
    configureServer(server) {
      server.middlewares.use("/audio", (req, res, next) => {
        const archivo = path.join(__dirname, "audio", decodeURIComponent((req.url || "").split("?")[0]));
        const tipo = tipos[path.extname(archivo).toLowerCase()];
        if (!tipo || !fs.existsSync(archivo)) return next();
        res.setHeader("content-type", tipo);
        fs.createReadStream(archivo).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), audioLocal()],
  server: { fs: { allow: [".."] } },
  build: { outDir: "dist", emptyOutDir: true, chunkSizeWarningLimit: 4000 },
});
