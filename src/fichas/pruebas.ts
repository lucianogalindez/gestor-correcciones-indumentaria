import type { Fila } from './tipos';

/** Fila de ejemplo para las pruebas. */
export const fila = (o: Partial<Fila>): Fila => ({
  idFila: 'CARGA-0001-1', idCarga: 'CARGA-0001', cargado: '2026-10-20T12:00:00.000Z', articulo: '17678',
  modelo: 'JUAN', temporada: 'Invierno 20', linea: 'DEPORTIVA', ordenCompra: '69107', proveedor: 'TEXAMERI',
  tela: 'Jersey', cantidadTotal: 1200, codigoColor: '820', color: 'NEGRO', cantidadColor: 600,
  estado: 'Pendiente', fechaFicha: '2019-10-28', archivo: 'a.pdf', ...o,
});
