import type { Correccion } from '../types';
import { estaAbierta } from './estados';

/** Vencida = fecha requerida anterior a hoy y no cerrada. El mismo día de hoy NO es vencida. */
export function esVencida(c: Pick<Correccion, 'fecha' | 'estado'>, hoy: string): boolean {
  return estaAbierta(c.estado) && c.fecha !== '' && c.fecha < hoy;
}

export interface Indicadores {
  total: number;
  abiertas: number;
  vencidas: number;
  /** Porcentaje de vencidas sobre las abiertas, entero 0–100. Con 0 abiertas, 0. */
  porcentajeVencidas: number;
}

/** Siempre se calcula sobre el total de solicitudes, no sobre las filtradas. */
export function calcularIndicadores(items: Correccion[], hoy: string): Indicadores {
  const abiertas = items.filter((c) => estaAbierta(c.estado)).length;
  const vencidas = items.filter((c) => esVencida(c, hoy)).length;
  return {
    total: items.length,
    abiertas,
    vencidas,
    porcentajeVencidas: abiertas === 0 ? 0 : Math.round((vencidas / abiertas) * 100),
  };
}
