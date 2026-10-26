import { ClienteHttp } from '../repositories/clienteHttp';
import { RepoError } from '../repositories/repository';
import { normalizarFilas, normalizarResultadoEstado, normalizarSubida } from './normalizar';
import { MENSAJE_ERROR_SUBIDA, type FichasRepository } from './repositorio';
import type { EstadoFicha, Fila, ResultadoEstado, ResultadoSubida } from './tipos';

export const TIMEOUT_SUBIDA_MS = 120_000;

/** Adaptador contra los webhooks de fichas de n8n. */
export class HttpFichasRepository implements FichasRepository {
  readonly remoto = true;

  constructor(private readonly cliente: ClienteHttp) {}

  async listar(): Promise<Fila[]> {
    return normalizarFilas(await this.cliente.pedir('/fichas'));
  }

  async subir(archivo: File, opciones: { signal?: AbortSignal } = {}): Promise<ResultadoSubida> {
    const formData = new FormData();
    formData.append('file', archivo, archivo.name);
    try {
      return normalizarSubida(
        await this.cliente.pedir('/fichas-subir', { formData, timeoutMs: TIMEOUT_SUBIDA_MS, signal: opciones.signal }),
      );
    } catch (e) {
      if (e instanceof RepoError && e.tipo === 'cancelado') throw e;
      // n8n corta el flujo sin mensaje legible (fallo de red/CORS o 5xx): un solo texto para todos los casos.
      throw new RepoError(e instanceof RepoError ? e.tipo : 'otro', MENSAJE_ERROR_SUBIDA, e instanceof RepoError ? e.status : undefined);
    }
  }

  async cambiarEstado(idCarga: string, estado: EstadoFicha): Promise<ResultadoEstado> {
    return normalizarResultadoEstado(
      await this.cliente.pedir('/fichas-estado', { cuerpo: { idCarga, estado }, mensajeDelServidor: true }),
    );
  }
}
