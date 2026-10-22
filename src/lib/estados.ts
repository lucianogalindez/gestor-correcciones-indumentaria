import { ESTADOS, type Estado } from '../types';

const clave = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');

const POR_CLAVE = new Map<string, Estado>(ESTADOS.map((e) => [clave(e), e]));

/** "en correccion", "CERRADA", "Pendiente " -> estado canónico; null si no se reconoce. */
export function normalizarEstado(valor: unknown): Estado | null {
  if (typeof valor !== 'string') return null;
  return POR_CLAVE.get(clave(valor)) ?? null;
}

export function estaAbierta(estado: Estado): boolean {
  return estado !== 'Cerrada';
}
