import { RepoError } from './repository';

type Fetch = typeof fetch;

export interface OpcionesCliente {
  baseUrl: string;
  apiKey?: string;
  fetchImpl?: Fetch;
  timeoutMs?: number;
}

export interface OpcionesPedido {
  /** Cuerpo JSON (POST). Con `formData` no se fija Content-Type: el navegador arma el boundary. */
  cuerpo?: unknown;
  formData?: FormData;
  timeoutMs?: number;
  /** Para que el usuario pueda cancelar. */
  signal?: AbortSignal;
  /** En 4xx intenta leer `{ error }` del servidor y lo usa como mensaje. */
  mensajeDelServidor?: boolean;
}

/** Cliente común hacia n8n: header X-API-Key, timeout, y errores diferenciados. */
export class ClienteHttp {
  private readonly base: string;
  private readonly apiKey: string;
  private readonly fetchImpl: Fetch;
  private readonly timeoutMs: number;

  constructor({ baseUrl, apiKey = '', fetchImpl, timeoutMs = 15000 }: OpcionesCliente) {
    this.base = baseUrl.trim().replace(/\/+$/, '');
    this.apiKey = apiKey.trim();
    this.fetchImpl = fetchImpl ?? ((...a) => fetch(...a));
    this.timeoutMs = timeoutMs;
  }

  async pedir(ruta: string, op: OpcionesPedido = {}): Promise<unknown> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    const esPost = op.cuerpo !== undefined || op.formData !== undefined;
    if (op.cuerpo !== undefined) headers['Content-Type'] = 'application/json';
    if (this.apiKey !== '') headers['X-API-Key'] = this.apiKey;

    const control = new AbortController();
    let cancelado = false;
    const alCancelar = () => {
      cancelado = true;
      control.abort();
    };
    if (op.signal?.aborted) alCancelar();
    op.signal?.addEventListener('abort', alCancelar);
    const temporizador = setTimeout(() => control.abort(), op.timeoutMs ?? this.timeoutMs);

    let respuesta: Response;
    try {
      respuesta = await this.fetchImpl(`${this.base}${ruta}`, {
        method: esPost ? 'POST' : 'GET',
        headers,
        body: op.formData ?? (op.cuerpo === undefined ? undefined : JSON.stringify(op.cuerpo)),
        signal: control.signal,
      });
    } catch {
      if (cancelado) throw new RepoError('cancelado', 'Se canceló la operación.');
      throw new RepoError(
        'sin-conexion',
        'No se pudo conectar con el servidor. Revisá tu conexión a internet; tus datos siguen en pantalla.',
      );
    } finally {
      clearTimeout(temporizador);
      op.signal?.removeEventListener('abort', alCancelar);
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
      let detalle = '';
      if (op.mensajeDelServidor) {
        try {
          const c: unknown = await respuesta.json();
          if (typeof c === 'object' && c !== null && 'error' in c && typeof c.error === 'string') detalle = c.error;
        } catch {
          // sin cuerpo legible: se usa el mensaje genérico
        }
      }
      throw new RepoError(
        'otro',
        detalle || `El servidor no aceptó la solicitud (error ${respuesta.status}).`,
        respuesta.status,
      );
    }
    try {
      return await respuesta.json();
    } catch {
      throw new RepoError('invalida', 'El servidor respondió algo que no es JSON válido.');
    }
  }
}
