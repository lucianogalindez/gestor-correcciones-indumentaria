/**
 * Las fechas de negocio viajan como texto AAAA-MM-DD (calendario local).
 * Nunca se usa new Date("AAAA-MM-DD"): se interpretaría en UTC y puede correr un día.
 */

const pad = (n: number) => String(n).padStart(2, '0');

export function formatear(anio: number, mes: number, dia: number): string {
  return `${String(anio).padStart(4, '0')}-${pad(mes)}-${pad(dia)}`;
}

/** Fecha de hoy en el calendario local del navegador. */
export function hoyLocal(ahora: Date = new Date()): string {
  return formatear(ahora.getFullYear(), ahora.getMonth() + 1, ahora.getDate());
}

function diasDelMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

export function esFechaValida(valor: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!m) return false;
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mes < 1 || mes > 12 || dia < 1) return false;
  return dia <= diasDelMes(anio, mes);
}

/** Suma días de calendario (puede ser negativo) sin depender de la zona horaria. */
export function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split('-').map(Number);
  const r = new Date(Date.UTC(a, m - 1, d + dias));
  return formatear(r.getUTCFullYear(), r.getUTCMonth() + 1, r.getUTCDate());
}

function comoValida(anio: number, mes: number, dia: number): string {
  const f = formatear(anio, mes, dia);
  return esFechaValida(f) ? f : '';
}

/**
 * Tolera lo que puede aparecer si alguien edita el Sheet a mano:
 * AAAA-MM-DD, dd/mm/aaaa, AAAA-MM-DDThh:mm..., o un número de serie de Excel/Sheets.
 * Devuelve AAAA-MM-DD o '' si no se puede interpretar.
 */
export function normalizarFecha(valor: unknown): string {
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    if (valor < 1 || valor > 2958465) return '';
    const r = new Date(Date.UTC(1899, 11, 30 + Math.floor(valor)));
    return formatear(r.getUTCFullYear(), r.getUTCMonth() + 1, r.getUTCDate());
  }
  if (typeof valor !== 'string') return '';
  const t = valor.trim();
  if (t === '') return '';

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(t);
  if (iso) return comoValida(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const latino = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t);
  if (latino) return comoValida(Number(latino[3]), Number(latino[2]), Number(latino[1]));

  return '';
}

/** AAAA-MM-DD -> dd/mm/aaaa para mostrar. */
export function mostrarFecha(fecha: string): string {
  if (!esFechaValida(fecha)) return fecha || '—';
  const [a, m, d] = fecha.split('-');
  return `${d}/${m}/${a}`;
}

/** Compara dos fechas AAAA-MM-DD; las vacías van al final. */
export function compararFechas(a: string, b: string): number {
  if (a === b) return 0;
  if (a === '') return 1;
  if (b === '') return -1;
  return a < b ? -1 : 1;
}

/** Fecha de creación (ISO con hora) -> AAAA-MM-DD en calendario local; si es solo fecha, se respeta. */
export function fechaLocalDeIso(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : hoyLocal(d);
}
