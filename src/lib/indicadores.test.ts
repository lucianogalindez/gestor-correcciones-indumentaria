import { describe, expect, it } from 'vitest';
import type { Correccion, Estado } from '../types';
import { calcularIndicadores, esVencida } from './indicadores';

const HOY = '2026-10-21';

function c(fecha: string, estado: Estado, id = 'COR-0001'): Correccion {
  return {
    id, codigo: 'X', version: '1', talle: 'M', color: 'a', proveedor: 'p', tipo: 'Tela', detalle: 'd',
    enlace: '', responsable: 'r', fecha, creada: '2026-10-01T10:00:00.000Z', estado,
    cierre: estado === 'Cerrada' ? '2026-10-20' : '',
  };
}

describe('esVencida', () => {
  it('fecha anterior a hoy y abierta -> vencida', () => {
    expect(esVencida(c('2026-10-20', 'Pendiente'), HOY)).toBe(true);
    expect(esVencida(c('2025-01-01', 'En corrección'), HOY)).toBe(true);
    expect(esVencida(c('2026-10-20', 'Para revisar'), HOY)).toBe(true);
  });
  it('hoy NO es vencida', () => {
    expect(esVencida(c(HOY, 'Pendiente'), HOY)).toBe(false);
  });
  it('futura no es vencida', () => {
    expect(esVencida(c('2026-10-22', 'Pendiente'), HOY)).toBe(false);
  });
  it('cerrada nunca es vencida', () => {
    expect(esVencida(c('2020-01-01', 'Cerrada'), HOY)).toBe(false);
  });
  it('sin fecha no es vencida', () => {
    expect(esVencida(c('', 'Pendiente'), HOY)).toBe(false);
  });
  it('compara bien entre fin de mes y fin de año', () => {
    expect(esVencida(c('2026-09-30', 'Pendiente'), '2026-10-01')).toBe(true);
    expect(esVencida(c('2026-12-31', 'Pendiente'), '2027-01-01')).toBe(true);
  });
});

describe('calcularIndicadores', () => {
  it('cuenta abiertas, vencidas y porcentaje sobre las abiertas', () => {
    const items = [
      c('2026-10-10', 'Pendiente', 'COR-0001'), // vencida
      c('2026-10-15', 'En corrección', 'COR-0002'), // vencida
      c(HOY, 'Pendiente', 'COR-0003'),
      c('2026-11-01', 'Para revisar', 'COR-0004'),
      c('2026-09-01', 'Cerrada', 'COR-0005'),
    ];
    expect(calcularIndicadores(items, HOY)).toEqual({
      total: 5, abiertas: 4, vencidas: 2, porcentajeVencidas: 50,
    });
  });
  it('con 0 abiertas muestra 0 %, sin dividir por cero', () => {
    const r = calcularIndicadores([c('2020-01-01', 'Cerrada')], HOY);
    expect(r).toMatchObject({ abiertas: 0, vencidas: 0, porcentajeVencidas: 0 });
    expect(calcularIndicadores([], HOY).porcentajeVencidas).toBe(0);
  });
  it('redondea el porcentaje', () => {
    const items = [c('2026-10-01', 'Pendiente', 'a'), c(HOY, 'Pendiente', 'b'), c(HOY, 'Pendiente', 'c')];
    expect(calcularIndicadores(items, HOY).porcentajeVencidas).toBe(33);
  });
});
