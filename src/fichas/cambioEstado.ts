import type { FichasRepository } from './repositorio';
import { aplicarEstado } from './logica';
import type { EstadoFicha, Fila } from './tipos';

/**
 * Cambio de estado con actualización optimista: se muestra el nuevo estado al instante,
 * y si el servidor falla se vuelve al estado anterior y se relanza el error.
 */
export async function cambiarEstadoOptimista(
  repo: FichasRepository,
  idCarga: string,
  estado: EstadoFicha,
  anterior: EstadoFicha,
  actualizar: (fn: (filas: Fila[]) => Fila[]) => void,
): Promise<void> {
  actualizar((f) => aplicarEstado(f, idCarga, estado));
  try {
    const r = await repo.cambiarEstado(idCarga, estado);
    actualizar((f) => aplicarEstado(f, idCarga, r.estado));
  } catch (e) {
    actualizar((f) => aplicarEstado(f, idCarga, anterior));
    throw e;
  }
}
