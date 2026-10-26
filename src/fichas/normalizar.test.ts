import { describe, expect, it } from 'vitest';
import { aNumero, normalizarFila, normalizarFilas, normalizarResultadoEstado, normalizarSubida } from './normalizar';
import { FICHA_EJEMPLO } from './mockFichasRepository';

const crudo = {
  idFila: 'CARGA-0001-1', idCarga: 'CARGA-0001', cargado: '2026-10-20T12:00:00.000Z', articulo: 17678, modelo: 'JUAN',
  temporada: 'Invierno 20', linea: 'DEPORTIVA', ordenCompra: 69107, proveedor: 'TEXAMERI', tela: 'Jersey',
  cantidadTotal: '1200', codigoColor: 820, color: 'NEGRO', cantidadColor: '600', estado: 'en produccion',
  fechaFicha: '28/10/2019', archivo: 'a.pdf',
};

describe('aNumero', () => {
  it.each([[600, 600], ['600', 600], ['1.200', 1200], ['1200,5', 1200.5], [' 15 ', 15], ['x', 0], [null, 0], [NaN, 0]])(
    '%j -> %j', (v, esperado) => expect(aNumero(v)).toBe(esperado),
  );
});

describe('normalizarFila', () => {
  it('convierte números, estados sin tilde y fechas dd/mm/aaaa', () => {
    expect(normalizarFila(crudo)).toMatchObject({
      articulo: '17678', ordenCompra: '69107', codigoColor: '820', cantidadTotal: 1200, cantidadColor: 600,
      estado: 'En producción', fechaFicha: '2019-10-28',
    });
  });
  it('descarta filas sin ids o con estado desconocido', () => {
    expect(normalizarFila({ ...crudo, idCarga: '' })).toBeNull();
    expect(normalizarFila({ ...crudo, idFila: '' })).toBeNull();
    expect(normalizarFila({ ...crudo, estado: 'Rota' })).toBeNull();
    expect(normalizarFila(null)).toBeNull();
  });
  it('normalizarFilas exige { items: [] } y omite filas en blanco', () => {
    expect(() => normalizarFilas({})).toThrow(/items/);
    expect(() => normalizarFilas([])).toThrow();
    expect(normalizarFilas({ items: [crudo, {}, { idFila: '' }] })).toHaveLength(1);
  });
});

describe('respuestas de subir y de estado', () => {
  it('subida válida', () => {
    const r = normalizarSubida({ idCarga: 'CARGA-0001', estado: 'Pendiente', filas: 2, ficha: FICHA_EJEMPLO });
    expect(r.ficha.colores).toHaveLength(2);
    expect(r.filas).toBe(2);
  });
  it('subida con forma inválida', () => {
    expect(() => normalizarSubida({ ok: true })).toThrow(/formato/);
    expect(() => normalizarSubida({ idCarga: 'X', estado: 'Pendiente', filas: 1 })).toThrow(/ficha/);
    expect(() => normalizarSubida({ idCarga: 'X', estado: 'Rara', filas: 1, ficha: FICHA_EJEMPLO })).toThrow();
  });
  it('estado', () => {
    expect(normalizarResultadoEstado({ idCarga: 'X', estado: 'terminada', filas: 3 })).toEqual({ idCarga: 'X', estado: 'Terminada', filas: 3 });
    expect(() => normalizarResultadoEstado({ error: 'no' })).toThrow();
  });
});
