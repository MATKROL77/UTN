// Modo "solo una parte": ?solo=F (o M) genera el video de un único presentador.
const valor = new URLSearchParams(location.search).get("solo");
export const SOLO: "M" | "F" | null = valor === "M" || valor === "F" ? valor : null;
