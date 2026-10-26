import { describe, expect, it } from 'vitest';
import {
  FILTROS_FICHAS_VACIOS, MAX_MB, agruparPorCarga, aplicarEstado, filtrarFichas, indicadoresFichas,
  normalizarEstadoFicha, proveedoresDe, validarArchivo,
} from './logica';
import { fila } from './pruebas';
import type { Fila } from './tipos';


const filas: Fila[] = [
  fila({ idFila: 'C1-1', idCarga: 'CARGA-0001', codigoColor: '820', cantidadColor: 600 }),
  fila({ idFila: 'C1-2', idCarga: 'CARGA-0001', codigoColor: '881', color: 'AZUL', cantidadColor: 600 }),
  fila({ idFila: 'C2-1', idCarga: 'CARGA-0002', cargado: '2026-10-22T12:00:00.000Z', articulo: '20001', modelo: 'ANA',
    proveedor: 'Textil Pampa', ordenCompra: '70001', estado: 'En producción', cantidadTotal: 300, cantidadColor: 300 }),
  fila({ idFila: 'C3-1', idCarga: 'CARGA-0003', cargado: '2026-10-21T12:00:00.000Z', articulo: '30002', modelo: 'LUCÍA',
    estado: 'Terminada', cantidadTotal: 500, cantidadColor: 500 }),
];

describe('agruparPorCarga', () => {
  const g = agruparPorCarga(filas);
  it('una ficha por idCarga con todos sus colores', () => {
    expect(g).toHaveLength(3);
    const c1 = g.find((f) => f.idCarga === 'CARGA-0001')!;
    expect(c1.colores).toEqual([
      { codigo: '820', color: 'NEGRO', cantidad: 600 },
      { codigo: '881', color: 'AZUL', cantidad: 600 },
    ]);
    expect(c1.cantidadTotal).toBe(1200); // no se suma por fila: es el total de la ficha
  });
  it('ordena las más recientes primero', () => {
    expect(g.map((f) => f.idCarga)).toEqual(['CARGA-0002', 'CARGA-0003', 'CARGA-0001']);
  });
  it('sin filas devuelve lista vacía', () => {
    expect(agruparPorCarga([])).toEqual([]);
  });
});

describe('indicadores', () => {
  it('cuenta fichas, prendas totales y sin terminar (Pendiente + En producción)', () => {
    expect(indicadoresFichas(agruparPorCarga(filas))).toEqual({ fichas: 3, prendas: 2000, sinTerminar: 2 });
  });
  it('vacío', () => {
    expect(indicadoresFichas([])).toEqual({ fichas: 0, prendas: 0, sinTerminar: 0 });
  });
});

describe('filtrarFichas', () => {
  const g = agruparPorCarga(filas);
  const ids = (l: ReturnType<typeof agruparPorCarga>) => l.map((f) => f.idCarga);
  it('búsqueda libre en artículo, modelo, OC y proveedor, sin tildes ni mayúsculas', () => {
    expect(ids(filtrarFichas(g, { ...FILTROS_FICHAS_VACIOS, texto: 'juan' }))).toEqual(['CARGA-0001']);
    expect(ids(filtrarFichas(g, { ...FILTROS_FICHAS_VACIOS, texto: 'lucia' }))).toEqual(['CARGA-0003']);
    expect(ids(filtrarFichas(g, { ...FILTROS_FICHAS_VACIOS, texto: '70001' }))).toEqual(['CARGA-0002']);
    expect(ids(filtrarFichas(g, { ...FILTROS_FICHAS_VACIOS, texto: 'pampa' }))).toEqual(['CARGA-0002']);
  });
  it('por estado y proveedor', () => {
    expect(ids(filtrarFichas(g, { ...FILTROS_FICHAS_VACIOS, estado: 'Terminada' }))).toEqual(['CARGA-0003']);
    expect(ids(filtrarFichas(g, { ...FILTROS_FICHAS_VACIOS, proveedor: 'TEXAMERI' }))).toEqual(['CARGA-0003', 'CARGA-0001']);
  });
  it('proveedoresDe devuelve únicos ordenados', () => {
    expect(proveedoresDe(g)).toEqual(['TEXAMERI', 'Textil Pampa']);
  });
});

describe('estados', () => {
  it('normaliza sin tilde y en mayúsculas', () => {
    expect(normalizarEstadoFicha('en produccion')).toBe('En producción');
    expect(normalizarEstadoFicha(' TERMINADA ')).toBe('Terminada');
    expect(normalizarEstadoFicha('Archivada')).toBeNull();
  });
  it('aplicarEstado cambia todas las filas de la carga sin mutar', () => {
    const r = aplicarEstado(filas, 'CARGA-0001', 'Entregada');
    expect(r.filter((f) => f.idCarga === 'CARGA-0001').every((f) => f.estado === 'Entregada')).toBe(true);
    expect(r.find((f) => f.idCarga === 'CARGA-0002')!.estado).toBe('En producción');
    expect(filas[0].estado).toBe('Pendiente');
  });
});

describe('validarArchivo', () => {
  it('acepta un PDF', () => {
    expect(validarArchivo({ name: 'ficha.PDF', size: 1000, type: 'application/pdf' })).toBeNull();
    expect(validarArchivo({ name: 'ficha.pdf', size: 1000, type: '' })).toBeNull();
  });
  it('rechaza lo que no es PDF', () => {
    expect(validarArchivo({ name: 'ficha.docx', size: 1000 })).toMatch(/PDF/);
    expect(validarArchivo({ name: 'ficha.pdf.exe', size: 1000 })).toMatch(/PDF/);
    expect(validarArchivo({ name: 'ficha.pdf', size: 1000, type: 'image/png' })).toMatch(/PDF/);
  });
  it('rechaza vacío y más de 15 MB (15 MB justos sí)', () => {
    expect(validarArchivo({ name: 'a.pdf', size: 0 })).toMatch(/vacío/);
    expect(validarArchivo({ name: 'a.pdf', size: MAX_MB * 1024 * 1024 })).toBeNull();
    expect(validarArchivo({ name: 'a.pdf', size: MAX_MB * 1024 * 1024 + 1 })).toMatch(/15 MB/);
  });
});
