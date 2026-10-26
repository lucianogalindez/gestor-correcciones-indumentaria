import { escaparCelda } from '../lib/csv';
import type { Ficha } from './tipos';

export const ENCABEZADOS_FICHAS = [
  'ID de carga', 'Cargado', 'Artículo', 'Modelo', 'Temporada', 'Línea', 'Orden de compra', 'Proveedor',
  'Tela', 'Cantidad total', 'Código de color', 'Color', 'Cantidad del color', 'Estado', 'Fecha de la ficha',
  'Archivo',
] as const;

/** Una línea por color, como la planilla de Sheets. BOM UTF-8, CRLF y celdas protegidas contra fórmulas. */
export function generarCsvFichas(fichas: Ficha[]): string {
  const filas = fichas.flatMap((f) =>
    f.colores.map((c) => [
      f.idCarga, f.cargado, f.articulo, f.modelo, f.temporada, f.linea, f.ordenCompra, f.proveedor, f.tela,
      String(f.cantidadTotal), c.codigo, c.color, String(c.cantidad), f.estado, f.fechaFicha, f.archivo,
    ]),
  );
  const lineas = [ENCABEZADOS_FICHAS as readonly string[], ...filas].map((l) => l.map(escaparCelda).join(','));
  return '﻿sep=,\r\n' + lineas.join('\r\n') + '\r\n';
}

export const nombreArchivoCsvFichas = (hoy: string) => `fichas-tecnicas_${hoy}.csv`;
