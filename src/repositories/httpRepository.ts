import type { Correccion, Estado, NuevaCorreccion } from '../types';
import { limpiar } from '../lib/validacion';
import { normalizarLista, normalizarUna } from './normalizar';
import { RepoError, type CorreccionesRepository } from './repository';

type Fetch = typeof fetch;

interface Opciones {
  baseUrl: string;
  apiKey?: string;
  fetchImpl?: Fetch;
  timeoutMs?: number;
}

/** Adaptador contra los tres webhooks de n8n. */
export class HttpRepository implements CorreccionesRepository {
  readonly remoto = true;
  private readonly base: string;
  private readonly apiKey: string;
  private readonly fetchImpl: Fetch;
  private readonly timeoutMs: number;

  constructor({ baseUrl, apiKey = '', fetchImpl, timeoutMs = 15000 }: Opciones) {
    this.base = baseUrl.trim().replace(/\/+$/, '');
    this.apiKey = apiKey.trim();
    this.fetchImpl = fetchImpl ?? ((...a) => fetch(...a));
    this.timeoutMs = timeoutMs;
  }

  private async pedir(ruta: string, cuerpo?: unknown): Promise<unknown> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (cuerpo !== undefined) headers['Content-Type'] = 'application/json';
    if (this.apiKey !== '') headers['X-API-Key'] = this.apiKey;

    const control = new AbortController();
    const temporizador = setTimeout(() => control.abort(), this.timeoutMs);
    let respuesta: Response;
    try {
      respuesta = await this.fetchImpl(`${this.base}${ruta}`, {
        method: cuerpo === undefined ? 'GET' : 'POST',
        headers,
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
        signal: control.signal,
      });
    } catch {
      throw new RepoError(
        'sin-conexion',
        'No se pudo conectar con el servidor. Revisá tu conexión a internet; tus datos siguen en pantalla.',
      );
    } finally {
      clearTimeout(temporizador);
    }

    if (respuesta.status === 401 || respuesta.status === 403) {
      throw new RepoError(
        'autorizacion',
        'El servidor rechazó el acceso (401/403). Revisá la clave de API configurada.',
        respuesta.status,
      );
    }
    if (respuesta.status >= 500) {
      throw new RepoError(
        'servidor',
        `El servidor tuvo un problema (error ${respuesta.status}). Probá de nuevo en unos minutos.`,
        respuesta.status,
      );
    }
    if (!respuesta.ok) {
      throw new RepoError('otro', `El servidor no aceptó la solicitud (error ${respuesta.status}).`, respuesta.status);
    }
    try {
      return await respuesta.json();
    } catch {
      throw new RepoError('invalida', 'El servidor respondió algo que no es JSON válido.');
    }
  }

  async listar(): Promise<Correccion[]> {
    return normalizarLista(await this.pedir('/correcciones'));
  }

  async crear(datos: NuevaCorreccion): Promise<Correccion> {
    return normalizarUna(await this.pedir('/correcciones-crear', limpiar(datos)));
  }

  async cambiarEstado(id: string, estado: Estado, cierre: string): Promise<Correccion> {
    return normalizarUna(await this.pedir('/correcciones-estado', { id, estado, cierre }));
  }
}
