import { compararFechas } from '../lib/fechas';
import { ESTADOS_FICHA, type EstadoFicha, type Ficha, type Fila } from './tipos';

const plano = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

/** "en produccion", "TERMINADA" -> estado canónico; null si no se reconoce. */
export function normalizarEstadoFicha(valor: unknown): EstadoFicha | null {
  if (typeof valor !== 'string') return null;
  const k = plano(valor);
  return ESTADOS_FICHA.find((e) => plano(e) === k) ?? null;
}

export function estaSinTerminar(estado: EstadoFicha): boolean {
  return estado === 'Pendiente' || estado === 'En producción';
}

/** Agrupa las filas (una por color) en fichas, una por idCarga. Más recientes primero. */
export function agruparPorCarga(filas: Fila[]): Ficha[] {
  const mapa = new Map<string, Ficha>();
  for (const f of filas) {
    let ficha = mapa.get(f.idCarga);
    if (!ficha) {
      ficha = {
        idCarga: f.idCarga, cargado: f.cargado, articulo: f.articulo, modelo: f.modelo,
        temporada: f.temporada, linea: f.linea, ordenCompra: f.ordenCompra, proveedor: f.proveedor,
        tela: f.tela, cantidadTotal: f.cantidadTotal, estado: f.estado, fechaFicha: f.fechaFicha,
        archivo: f.archivo, colores: [],
      };
      mapa.set(f.idCarga, ficha);
    }
    ficha.colores.push({ codigo: f.codigoColor, color: f.color, cantidad: f.cantidadColor });
  }
  return [...mapa.values()].sort(
    (a, b) => compararFechas(b.cargado, a.cargado) || b.idCarga.localeCompare(a.idCarga, 'es', { numeric: true }),
  );
}

export interface FiltrosFichas {
  texto: string;
  estado: '' | EstadoFicha;
  proveedor: string;
}

export const FILTROS_FICHAS_VACIOS: FiltrosFichas = { texto: '', estado: '', proveedor: '' };

export function filtrarFichas(fichas: Ficha[], f: FiltrosFichas): Ficha[] {
  const q = plano(f.texto);
  return fichas.filter((x) => {
    if (f.estado !== '' && x.estado !== f.estado) return false;
    if (f.proveedor !== '' && x.proveedor !== f.proveedor) return false;
    if (q !== '' && !plano([x.articulo, x.modelo, x.ordenCompra, x.proveedor].join(' ')).includes(q)) return false;
    return true;
  });
}

export function proveedoresDe(fichas: Ficha[]): string[] {
  return [...new Set(fichas.map((x) => x.proveedor).filter((p) => p !== ''))].sort((a, b) => a.localeCompare(b, 'es'));
}

export interface IndicadoresFichas {
  fichas: number;
  prendas: number;
  sinTerminar: number;
}

export function indicadoresFichas(fichas: Ficha[]): IndicadoresFichas {
  return {
    fichas: fichas.length,
    prendas: fichas.reduce((s, x) => s + x.cantidadTotal, 0),
    sinTerminar: fichas.filter((x) => estaSinTerminar(x.estado)).length,
  };
}

/** Cambia el estado de todas las filas de una carga. No muta. */
export function aplicarEstado(filas: Fila[], idCarga: string, estado: EstadoFicha): Fila[] {
  return filas.map((f) => (f.idCarga === idCarga ? { ...f, estado } : f));
}

const MAX_BYTES = 15 * 1024 * 1024;
export const MAX_MB = 15;

/** Validación en el navegador antes de subir: solo PDF, hasta 15 MB. Devuelve el mensaje o null. */
export function validarArchivo(a: { name: string; size: number; type?: string }): string | null {
  if (!/\.pdf$/i.test(a.name) || (a.type && a.type !== 'application/pdf')) {
    return 'El archivo tiene que ser un PDF.';
  }
  if (a.size <= 0) return 'El archivo está vacío.';
  if (a.size > MAX_BYTES) return `El PDF pesa más de ${MAX_MB} MB.`;
  return null;
}
