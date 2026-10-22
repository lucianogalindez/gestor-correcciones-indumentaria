import type { Correccion } from '../types';

export const ENCABEZADOS_CSV = [
  'ID',
  'Artículo',
  'Versión de muestra',
  'Talle',
  'Color',
  'Proveedor/taller',
  'Tipo de corrección',
  'Detalle',
  'Enlace de referencia',
  'Responsable',
  'Fecha requerida',
  'Fecha de creación',
  'Estado',
  'Fecha de cierre',
] as const;

const BOM = '﻿';
const CRLF = '\r\n';

/**
 * Evita la inyección de fórmulas en Excel/Sheets: si la celda empieza con = + - @ tab o CR
 * se antepone un apóstrofo para que se lea como texto.
 */
export function protegerFormula(valor: string): string {
  return /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
}

export function escaparCelda(valor: string): string {
  const seguro = protegerFormula(valor);
  return /[",\r\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

export function filaCsv(c: Correccion): string[] {
  return [
    c.id, c.codigo, c.version, c.talle, c.color, c.proveedor, c.tipo, c.detalle,
    c.enlace, c.responsable, c.fecha, c.creada, c.estado, c.cierre,
  ];
}

/** CSV para Excel: BOM UTF-8, línea "sep=,", separador coma, saltos CRLF. */
export function generarCsv(items: Correccion[]): string {
  const lineas = [ENCABEZADOS_CSV as readonly string[], ...items.map(filaCsv)].map((fila) =>
    fila.map(escaparCelda).join(','),
  );
  return BOM + 'sep=,' + CRLF + lineas.join(CRLF) + CRLF;
}

export function nombreArchivoCsv(hoy: string): string {
  return `correcciones_${hoy}.csv`;
}

export function descargarCsv(contenido: string, nombre: string): void {
  const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
