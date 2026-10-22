import type { Correccion, Estado } from '../types';
import { compararFechas } from './fechas';
import { estaAbierta } from './estados';
import { esVencida } from './indicadores';

export interface Filtros {
  texto: string;
  /** '' = todos, 'abiertas' = no cerradas, o un estado puntual. */
  estado: '' | 'abiertas' | Estado;
  tipo: string;
  responsable: string;
  soloVencidas: boolean;
}

export const FILTROS_VACIOS: Filtros = {
  texto: '',
  estado: '',
  tipo: '',
  responsable: '',
  soloVencidas: false,
};

const plano = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function filtrar(items: Correccion[], f: Filtros, hoy: string): Correccion[] {
  const q = plano(f.texto.trim());
  return items.filter((c) => {
    if (f.estado === 'abiertas' && !estaAbierta(c.estado)) return false;
    if (f.estado !== '' && f.estado !== 'abiertas' && c.estado !== f.estado) return false;
    if (f.tipo !== '' && c.tipo !== f.tipo) return false;
    if (f.responsable !== '' && c.responsable !== f.responsable) return false;
    if (f.soloVencidas && !esVencida(c, hoy)) return false;
    if (q !== '') {
      const pajar = plano(
        [c.id, c.codigo, c.version, c.talle, c.color, c.proveedor, c.detalle, c.responsable].join(' '),
      );
      if (!pajar.includes(q)) return false;
    }
    return true;
  });
}

/** Orden por fecha requerida ascendente (la más urgente primero); desempata por ID. No muta. */
export function ordenarPorFecha(items: Correccion[]): Correccion[] {
  return [...items].sort(
    (a, b) => compararFechas(a.fecha, b.fecha) || a.id.localeCompare(b.id, 'es', { numeric: true }),
  );
}

export function valoresUnicos(items: Correccion[], campo: 'tipo' | 'responsable'): string[] {
  return [...new Set(items.map((c) => c[campo]).filter((v) => v !== ''))].sort((a, b) =>
    a.localeCompare(b, 'es'),
  );
}
