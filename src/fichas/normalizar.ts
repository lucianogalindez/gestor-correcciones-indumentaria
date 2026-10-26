import { normalizarFecha } from '../lib/fechas';
import { RepoError } from '../repositories/repository';
import { normalizarEstadoFicha } from './logica';
import type { ColorFicha, FichaGuardada, Fila, ResultadoEstado, ResultadoSubida } from './tipos';

const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const texto = (v: unknown): string =>
  typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '';

/** Acepta números y textos de Sheets ("600", "1.200", "1200,5"); si no se entiende, 0. */
export function aNumero(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v !== 'string') return 0;
  const t = v.trim().replace(/\s/g, '');
  const limpio = /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t) ? t.replace(/\./g, '').replace(',', '.') : t.replace(',', '.');
  const n = Number(limpio);
  return Number.isFinite(n) ? n : 0;
}

/** Una fila de la planilla. Devuelve null si falta idFila/idCarga o el estado no existe. */
export function normalizarFila(crudo: unknown): Fila | null {
  if (!esObjeto(crudo)) return null;
  const estado = normalizarEstadoFicha(crudo.estado);
  const idFila = texto(crudo.idFila);
  const idCarga = texto(crudo.idCarga);
  if (idFila === '' || idCarga === '' || estado === null) return null;
  const cargado = texto(crudo.cargado);
  return {
    idFila, idCarga,
    cargado: /^\d{4}-\d{2}-\d{2}T/.test(cargado) ? cargado : normalizarFecha(cargado),
    articulo: texto(crudo.articulo), modelo: texto(crudo.modelo), temporada: texto(crudo.temporada),
    linea: texto(crudo.linea), ordenCompra: texto(crudo.ordenCompra), proveedor: texto(crudo.proveedor),
    tela: texto(crudo.tela), cantidadTotal: aNumero(crudo.cantidadTotal),
    codigoColor: texto(crudo.codigoColor), color: texto(crudo.color), cantidadColor: aNumero(crudo.cantidadColor),
    estado, fechaFicha: normalizarFecha(crudo.fechaFicha), archivo: texto(crudo.archivo),
  };
}

const invalida = (que: string) =>
  new RepoError('invalida', `La respuesta del servidor no tiene el formato esperado (${que}).`);

export function normalizarFilas(cuerpo: unknown): Fila[] {
  if (!esObjeto(cuerpo) || !Array.isArray(cuerpo.items)) throw invalida('falta "items"');
  return cuerpo.items.map(normalizarFila).filter((f): f is Fila => f !== null);
}

function normalizarFicha(crudo: unknown): FichaGuardada {
  if (!esObjeto(crudo) || !Array.isArray(crudo.colores)) throw invalida('falta "ficha"');
  const colores: ColorFicha[] = crudo.colores.map((c) => {
    if (!esObjeto(c)) throw invalida('colores');
    return { codigo: texto(c.codigo), color: texto(c.color), cantidad: aNumero(c.cantidad) };
  });
  return {
    articulo: texto(crudo.articulo), modelo: texto(crudo.modelo), temporada: texto(crudo.temporada),
    linea: texto(crudo.linea), ordenCompra: texto(crudo.ordenCompra), proveedor: texto(crudo.proveedor),
    tela: texto(crudo.tela), cantidadTotal: aNumero(crudo.cantidadTotal), fecha: normalizarFecha(crudo.fecha),
    colores,
  };
}

export function normalizarSubida(cuerpo: unknown): ResultadoSubida {
  if (!esObjeto(cuerpo)) throw invalida('subida');
  const idCarga = texto(cuerpo.idCarga);
  const estado = normalizarEstadoFicha(cuerpo.estado);
  if (idCarga === '' || estado === null) throw invalida('subida');
  return { idCarga, estado, filas: aNumero(cuerpo.filas), ficha: normalizarFicha(cuerpo.ficha) };
}

export function normalizarResultadoEstado(cuerpo: unknown): ResultadoEstado {
  if (!esObjeto(cuerpo)) throw invalida('estado');
  const idCarga = texto(cuerpo.idCarga);
  const estado = normalizarEstadoFicha(cuerpo.estado);
  if (idCarga === '' || estado === null) throw invalida('estado');
  return { idCarga, estado, filas: aNumero(cuerpo.filas) };
}
