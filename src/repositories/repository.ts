import type { Correccion, Estado, NuevaCorreccion } from '../types';

export interface CorreccionesRepository {
  /** true si los datos viven en un servidor compartido (conviene releer periódicamente). */
  readonly remoto: boolean;
  listar(): Promise<Correccion[]>;
  crear(datos: NuevaCorreccion): Promise<Correccion>;
  /** `cierre` es AAAA-MM-DD al cerrar, o '' al reabrir. Lo calcula el cliente en fecha local. */
  cambiarEstado(id: string, estado: Estado, cierre: string): Promise<Correccion>;
}

export type TipoError = 'cancelado' | 'sin-conexion' | 'autorizacion' | 'servidor' | 'invalida' | 'otro';

export class RepoError extends Error {
  constructor(
    readonly tipo: TipoError,
    mensaje: string,
    readonly status?: number,
  ) {
    super(mensaje);
    this.name = 'RepoError';
  }
}

export function mensajeDeError(e: unknown): string {
  return e instanceof RepoError ? e.message : 'Ocurrió un error inesperado. Probá de nuevo.';
}
