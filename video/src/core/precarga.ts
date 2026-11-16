// Precarga de imágenes: el primer cuadro espera a que todas estén decodificadas.
const promesas: Promise<unknown>[] = [];
export function precargar(urls: string[]) {
  for (const url of urls) {
    const img = new Image();
    img.src = url;
    promesas.push(img.decode().catch(() => console.error(`No se pudo cargar ${url}`)));
  }
}
export const precargasListas = () => Promise.all(promesas);
