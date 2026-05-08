/** Convierte "YYYY-MM-DD" → "DD/MM/YYYY" para mostrar en formularios */
export function isoToDisplay(iso: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Convierte "DD/MM/YYYY" → "YYYY-MM-DD" antes de enviar al servicio */
export function displayToIso(display: string): string {
  if (!display || !/^\d{2}\/\d{2}\/\d{4}$/.test(display)) return display;
  const [d, m, y] = display.split("/");
  return `${y}-${m}-${d}`;
}

/** Devuelve la fecha de hoy en formato DD/MM/YYYY */
export function todayDisplay(): string {
  return isoToDisplay(new Date().toISOString().split("T")[0]);
}
