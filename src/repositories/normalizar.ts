import type { Correccion } from '../types';
import { normalizarEstado } from '../lib/estados';
import { normalizarFecha } from '../lib/fechas';
import { RepoError } from './repository';

const texto = (v: unknown): string =>
  typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '';

const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Convierte una fila cruda en Correccion. Tolera fechas dd/mm/aaaa y estados sin tilde o en
 * mayúsculas (ediciones manuales del Sheet). Devuelve null si no tiene ID o el estado no existe.
 */
export function normalizarCorreccion(crudo: unknown): Correccion | null {
  if (!esObjeto(crudo)) return null;
  const id = texto(crudo.id);
  const estado = normalizarEstado(crudo.estado);
  if (id === '' || estado === null) return null;

  const creada = texto(crudo.creada);
  const fechaCreada = normalizarFecha(creada);
  return {
    id,
    codigo: texto(crudo.codigo),
    version: texto(crudo.version),
    talle: texto(crudo.talle),
    color: texto(crudo.color),
    proveedor: texto(crudo.proveedor),
    tipo: texto(crudo.tipo),
    detalle: texto(crudo.detalle),
    enlace: texto(crudo.enlace),
    responsable: texto(crudo.responsable),
    fecha: normalizarFecha(crudo.fecha),
    // Si es un ISO completo se conserva tal cual; si solo era una fecha suelta, se guarda AAAA-MM-DD.
    creada: /^\d{4}-\d{2}-\d{2}T/.test(creada) ? creada : fechaCreada,
    estado,
    cierre: estado === 'Cerrada' ? normalizarFecha(crudo.cierre) : '',
  };
}

/** Respuesta de GET /correcciones: { items: [...] }. Las filas sin ID válido (filas en blanco) se descartan. */
export function normalizarLista(cuerpo: unknown): Correccion[] {
  if (!esObjeto(cuerpo) || !Array.isArray(cuerpo.items)) {
    throw new RepoError('invalida', 'La respuesta del servidor no tiene el formato esperado (falta "items").');
  }
  return cuerpo.items.map(normalizarCorreccion).filter((c): c is Correccion => c !== null);
}

/** Respuesta de crear / cambiar estado: una sola solicitud. */
export function normalizarUna(cuerpo: unknown): Correccion {
  const c = normalizarCorreccion(cuerpo);
  if (c === null) {
    throw new RepoError('invalida', 'La respuesta del servidor no tiene el formato esperado de una solicitud.');
  }
  return c;
}
