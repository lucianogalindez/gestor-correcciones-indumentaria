import type { EstadoFicha, Fila, ResultadoEstado, ResultadoSubida } from './tipos';

export interface FichasRepository {
  /** true si los datos viven en n8n; false en el mock en memoria. */
  readonly remoto: boolean;
  listar(): Promise<Fila[]>;
  /** Puede tardar 10–60 s. `signal` permite cancelar. */
  subir(archivo: File, opciones?: { signal?: AbortSignal }): Promise<ResultadoSubida>;
  cambiarEstado(idCarga: string, estado: EstadoFicha): Promise<ResultadoEstado>;
}

/** /fichas-subir no devuelve mensajes legibles: ante cualquier fallo se muestra este texto. */
export const MENSAJE_ERROR_SUBIDA =
  'No se pudo procesar la ficha. Puede que el PDF no tenga texto, que ya esté cargada o que los colores no sumen el total. Revisá la ejecución en n8n.';
