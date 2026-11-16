// Registro de "drivers": piezas asíncronas (la web real embebida, imágenes) que deben
// ponerse al día con el tiempo t antes de capturar un cuadro.
export interface Driver {
  sync(t: number): Promise<void>;
}
const drivers = new Set<Driver>();
export function registrar(d: Driver) {
  drivers.add(d);
  return () => void drivers.delete(d);
}
export const hayDrivers = () => drivers.size > 0;
export async function syncDrivers(t: number) {
  for (const d of [...drivers]) await d.sync(t);
}

/** Promesas pendientes (carga de imágenes, etc.). */
const pendientes = new Set<Promise<unknown>>();
export function esperar<T>(p: Promise<T>) {
  pendientes.add(p);
  p.finally(() => pendientes.delete(p));
  return p;
}
export async function esperarPendientes() {
  while (pendientes.size) await Promise.allSettled([...pendientes]);
}
export const macrotarea = (w: Window = window) => new Promise<void>((r) => w.setTimeout(r, 0));
