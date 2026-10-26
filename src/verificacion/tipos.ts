export type Resultado = 'ok' | 'diferente' | 'falta_en_ficha' | 'falta_en_referencia';
export type EstadoVerificacion = 'OK' | 'CON_DIFERENCIAS' | 'SIN_REFERENCIA';

export type Valor = string | number | null;

export interface CampoComparado {
  campo: string;
  ficha: Valor;
  referencia: Valor;
  resultado: Resultado;
}

export interface ColorComparado {
  codigo: string;
  color: string;
  ficha: number | null;
  referencia: number | null;
  resultado: Resultado;
}

export interface FichaLeida {
  articulo: string;
  modelo: string;
  temporada: string;
  linea: string;
  ordenCompra: string;
  proveedor: string;
  tela: string;
  cantidadTotal: number | null;
  colores: { codigo: string; color: string; cantidad: number | null }[];
}

export interface Verificacion {
  archivo: string;
  estado: EstadoVerificacion;
  /** Cómo se encontró en la referencia, ej. "Artículo 17678". */
  clave: string;
  resumen: string;
  diferencias: number;
  ficha: FichaLeida;
  campos: CampoComparado[];
  colores: ColorComparado[];
}

/** Estado de un archivo dentro de la cola de procesamiento. */
export type EstadoItem = 'pendiente' | 'procesando' | 'listo' | 'error' | 'cancelado';

export interface ItemCola {
  id: number;
  archivo: string;
  estado: EstadoItem;
  verificacion?: Verificacion;
}

/** Lo que se muestra como badge en la tabla de control. */
export type EstadoVisible =
  | 'OK'
  | 'CON_DIFERENCIAS'
  | 'SIN_REFERENCIA'
  | 'ERROR'
  | 'PROCESANDO'
  | 'EN_COLA'
  | 'CANCELADO';
