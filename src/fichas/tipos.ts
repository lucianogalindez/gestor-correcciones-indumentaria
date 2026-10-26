export const ESTADOS_FICHA = ['Pendiente', 'En producción', 'Terminada', 'Entregada'] as const;
export type EstadoFicha = (typeof ESTADOS_FICHA)[number];

/** Una fila de la planilla = un color de una ficha. */
export interface Fila {
  idFila: string;
  idCarga: string;
  /** Fecha y hora de la carga (ISO). */
  cargado: string;
  articulo: string;
  modelo: string;
  temporada: string;
  linea: string;
  ordenCompra: string;
  proveedor: string;
  tela: string;
  cantidadTotal: number;
  codigoColor: string;
  color: string;
  cantidadColor: number;
  estado: EstadoFicha;
  /** AAAA-MM-DD */
  fechaFicha: string;
  archivo: string;
}

export interface ColorFicha {
  codigo: string;
  color: string;
  cantidad: number;
}

/** Lo que n8n confirma al guardar una ficha. */
export interface FichaGuardada {
  articulo: string;
  modelo: string;
  temporada: string;
  linea: string;
  ordenCompra: string;
  proveedor: string;
  tela: string;
  cantidadTotal: number;
  fecha: string;
  colores: ColorFicha[];
}

export interface ResultadoSubida {
  idCarga: string;
  estado: EstadoFicha;
  filas: number;
  ficha: FichaGuardada;
}

export interface ResultadoEstado {
  idCarga: string;
  estado: EstadoFicha;
  filas: number;
}

/** Una ficha con todos sus colores (filas agrupadas por idCarga). */
export interface Ficha {
  idCarga: string;
  cargado: string;
  articulo: string;
  modelo: string;
  temporada: string;
  linea: string;
  ordenCompra: string;
  proveedor: string;
  tela: string;
  cantidadTotal: number;
  estado: EstadoFicha;
  fechaFicha: string;
  archivo: string;
  colores: ColorFicha[];
}
