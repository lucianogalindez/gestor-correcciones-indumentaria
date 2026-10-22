import { describe, expect, it } from 'vitest';
import type { Correccion } from '../types';
import { FILTROS_VACIOS, filtrar, ordenarPorFecha, valoresUnicos } from './filtros';

const HOY = '2026-10-21';

const base: Correccion = {
  id: 'COR-0001', codigo: 'CAM-1042', version: 'Proto 1', talle: 'M', color: 'Crudo', proveedor: 'Taller Sur',
  tipo: 'Medidas/calce', detalle: 'Cuello alto', enlace: '', responsable: 'Sofía', fecha: '2026-10-25',
  creada: '2026-10-01T10:00:00.000Z', estado: 'Pendiente', cierre: '',
};
const mk = (o: Partial<Correccion>): Correccion => ({ ...base, ...o });

const datos = [
  mk({ id: 'COR-0001' }),
  mk({ id: 'COR-0002', estado: 'Cerrada', cierre: '2026-10-01', fecha: '2026-09-01', tipo: 'Tela', responsable: 'Martín' }),
  mk({ id: 'COR-0003', fecha: '2026-10-01', estado: 'En corrección', codigo: 'PAN-2210', detalle: 'Tiro corto' }),
  mk({ id: 'COR-0004', estado: 'Para revisar', color: 'Azul' }),
];
const ids = (l: Correccion[]) => l.map((c) => c.id);

describe('filtrar', () => {
  it('sin filtros devuelve todo', () => {
    expect(filtrar(datos, FILTROS_VACIOS, HOY)).toHaveLength(4);
  });
  it('por estado puntual y por "abiertas"', () => {
    expect(ids(filtrar(datos, { ...FILTROS_VACIOS, estado: 'Cerrada' }, HOY))).toEqual(['COR-0002']);
    expect(ids(filtrar(datos, { ...FILTROS_VACIOS, estado: 'abiertas' }, HOY))).toEqual(['COR-0001', 'COR-0003', 'COR-0004']);
  });
  it('por tipo y por responsable', () => {
    expect(ids(filtrar(datos, { ...FILTROS_VACIOS, tipo: 'Tela' }, HOY))).toEqual(['COR-0002']);
    expect(ids(filtrar(datos, { ...FILTROS_VACIOS, responsable: 'Martín' }, HOY))).toEqual(['COR-0002']);
  });
  it('solo vencidas excluye cerradas, futuras y hoy', () => {
    expect(ids(filtrar(datos, { ...FILTROS_VACIOS, soloVencidas: true }, HOY))).toEqual(['COR-0003']);
    const conHoy = [...datos, mk({ id: 'COR-0005', fecha: HOY })];
    expect(ids(filtrar(conHoy, { ...FILTROS_VACIOS, soloVencidas: true }, HOY))).toEqual(['COR-0003']);
  });
  it('búsqueda ignora mayúsculas y tildes', () => {
    expect(ids(filtrar(datos, { ...FILTROS_VACIOS, texto: 'sofia' }, HOY))).toEqual(['COR-0001', 'COR-0003', 'COR-0004']);
    expect(ids(filtrar(datos, { ...FILTROS_VACIOS, texto: 'pan-22' }, HOY))).toEqual(['COR-0003']);
    expect(ids(filtrar(datos, { ...FILTROS_VACIOS, texto: 'cor-0004' }, HOY))).toEqual(['COR-0004']);
  });
  it('combina filtros', () => {
    const f = { ...FILTROS_VACIOS, estado: 'abiertas' as const, texto: 'azul' };
    expect(ids(filtrar(datos, f, HOY))).toEqual(['COR-0004']);
  });
});

describe('ordenarPorFecha', () => {
  it('ordena por fecha requerida ascendente y desempata por ID, sin mutar', () => {
    const entrada = [
      mk({ id: 'COR-0010', fecha: '2026-11-01' }),
      mk({ id: 'COR-0002', fecha: '2026-10-01' }),
      mk({ id: 'COR-0009', fecha: '2026-10-01' }),
      mk({ id: 'COR-0003', fecha: '' }),
    ];
    const copia = [...entrada];
    expect(ids(ordenarPorFecha(entrada))).toEqual(['COR-0002', 'COR-0009', 'COR-0010', 'COR-0003']);
    expect(entrada).toEqual(copia);
  });
});

describe('valoresUnicos', () => {
  it('devuelve únicos ordenados y sin vacíos', () => {
    expect(valoresUnicos([mk({ responsable: 'b' }), mk({ responsable: 'a' }), mk({ responsable: 'b' }), mk({ responsable: '' })], 'responsable')).toEqual(['a', 'b']);
  });
});
