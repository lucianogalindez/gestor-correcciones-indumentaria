import { ClienteHttp } from '../repositories/clienteHttp';
import { RepoError } from '../repositories/repository';
import { validarArchivo } from '../fichas/logica';
import { normalizarVerificacion } from './normalizar';
import type { Verificacion } from './tipos';

export interface VerificacionRepository {
  /** true si verifica contra n8n; false en el mock. */
  readonly remoto: boolean;
  /** Puede tardar hasta ~60 s por archivo. `signal` permite cancelar. */
  verificar(archivo: File, opciones?: { signal?: AbortSignal }): Promise<Verificacion>;
}

export const TIMEOUT_VERIFICACION_MS = 120_000;
export const MENSAJE_ERROR_FILA = 'No se pudo leer esta ficha';

export class HttpVerificacionRepository implements VerificacionRepository {
  readonly remoto = true;

  constructor(private readonly cliente: ClienteHttp) {}

  async verificar(archivo: File, opciones: { signal?: AbortSignal } = {}): Promise<Verificacion> {
    const formData = new FormData();
    formData.append('file', archivo, archivo.name); // sin Content-Type: el navegador arma el boundary
    try {
      return normalizarVerificacion(
        await this.cliente.pedir('/fichas-verificar', { formData, timeoutMs: TIMEOUT_VERIFICACION_MS, signal: opciones.signal }),
        archivo.name,
      );
    } catch (e) {
      if (e instanceof RepoError && e.tipo === 'cancelado') throw e;
      // El flujo de n8n corta sin mensaje legible: se muestra un único texto por fila.
      throw new RepoError(e instanceof RepoError ? e.tipo : 'otro', MENSAJE_ERROR_FILA, e instanceof RepoError ? e.status : undefined);
    }
  }
}

const FICHA_MOCK = {
  articulo: '17678', modelo: 'JUAN', temporada: 'Invierno 20', linea: 'DEPORTIVA', ordenCompra: '69107',
  proveedor: 'TEXAMERI', tela: 'Jersey marmolado', cantidadTotal: 1200,
  colores: [
    { codigo: '820', color: 'NEGRO GRANIZADO', cantidad: 600 },
    { codigo: '881', color: 'AZUL MARINO GRANIZADO', cantidad: 600 },
  ],
};

const camposOk = (): Verificacion['campos'] =>
  [
    ['Artículo', '17678'], ['Modelo', 'JUAN'], ['Temporada', 'Invierno 20'], ['Línea', 'DEPORTIVA'],
    ['Orden de compra', '69107'], ['Proveedor', 'TEXAMERI'], ['Tela', 'Jersey marmolado'], ['Cantidad total', 1200],
  ].map(([campo, v]) => ({ campo: String(campo), ficha: v, referencia: v, resultado: 'ok' as const }));

/** Respuesta de ejemplo según el nombre del archivo (mismas palabras que usa el servidor mock). */
export function verificacionDeEjemplo(nombre: string): Verificacion {
  const n = nombre.toLowerCase();
  if (/sin[-_ ]?ref/.test(n)) {
    return {
      archivo: nombre, estado: 'SIN_REFERENCIA', clave: 'Artículo 99999',
      resumen: 'No se encontró esta ficha en la hoja de referencia.',
      diferencias: 0, ficha: { ...FICHA_MOCK, articulo: '99999', modelo: 'DESCONOCIDO' },
      campos: [{ campo: 'Artículo', ficha: '99999', referencia: null, resultado: 'falta_en_referencia' }], colores: [],
    };
  }
  if (/dif/.test(n)) {
    const campos = camposOk().map((c) =>
      c.campo === 'Proveedor' ? { ...c, referencia: 'TEXTIL AMERICANA', resultado: 'diferente' as const } : c,
    );
    return {
      archivo: nombre, estado: 'CON_DIFERENCIAS', clave: 'Artículo 17678',
      resumen: '2 diferencias: proveedor y cantidad del color 820.', diferencias: 2, ficha: FICHA_MOCK, campos,
      colores: [
        { codigo: '820', color: 'NEGRO GRANIZADO', ficha: 600, referencia: 500, resultado: 'diferente' },
        { codigo: '881', color: 'AZUL MARINO GRANIZADO', ficha: 600, referencia: 600, resultado: 'ok' },
      ],
    };
  }
  return {
    archivo: nombre, estado: 'OK', clave: 'Artículo 17678', resumen: 'Todos los datos coinciden con la referencia.',
    diferencias: 0, ficha: FICHA_MOCK, campos: camposOk(),
    colores: FICHA_MOCK.colores.map((c) => ({ codigo: c.codigo, color: c.color, ficha: c.cantidad, referencia: c.cantidad, resultado: 'ok' as const })),
  };
}

interface OpcionesMock {
  esperaMs?: number;
}

/**
 * Sin servidor: según el nombre del archivo devuelve OK, "dif" → con diferencias
 * (proveedor TEXAMERI vs TEXTIL AMERICANA, cantidad 600 vs 500), "sin-ref" → sin referencia, "error" → falla.
 */
export class MockVerificacionRepository implements VerificacionRepository {
  readonly remoto = false;
  private readonly esperaMs: number;

  constructor({ esperaMs = 700 }: OpcionesMock = {}) {
    this.esperaMs = esperaMs;
  }

  async verificar(archivo: File, opciones: { signal?: AbortSignal } = {}): Promise<Verificacion> {
    await this.esperar(opciones.signal);
    if (validarArchivo(archivo) !== null || /error/i.test(archivo.name)) throw new RepoError('servidor', MENSAJE_ERROR_FILA, 500);
    return verificacionDeEjemplo(archivo.name);
  }

  private esperar(signal?: AbortSignal): Promise<void> {
    return new Promise((resolver, rechazar) => {
      const cancelar = () => rechazar(new RepoError('cancelado', 'Se canceló la operación.'));
      if (signal?.aborted) return cancelar();
      const alAbortar = () => {
        clearTimeout(t);
        cancelar();
      };
      const t = setTimeout(() => {
        signal?.removeEventListener('abort', alAbortar);
        resolver();
      }, this.esperaMs);
      signal?.addEventListener('abort', alAbortar, { once: true });
    });
  }
}
