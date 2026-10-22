import { describe, expect, it } from 'vitest';
import { normalizarCorreccion, normalizarLista, normalizarUna } from './normalizar';
import { RepoError } from './repository';

const crudo = {
  id: 'COR-0001', codigo: 'CAM-1', version: 'P1', talle: 'M', color: 'Crudo', proveedor: 'Sur', tipo: 'Tela',
  detalle: 'x', enlace: '', responsable: 'Ana', fecha: '2026-10-25', creada: '2026-10-01T10:00:00.000Z',
  estado: 'Pendiente', cierre: '',
};

describe('normalizarCorreccion', () => {
  it('acepta una fila correcta', () => {
    expect(normalizarCorreccion(crudo)).toEqual(crudo);
  });
  it('tolera fechas dd/mm/aaaa y estados sin tilde o en mayúsculas (Sheet editado a mano)', () => {
    const r = normalizarCorreccion({ ...crudo, fecha: '25/10/2026', estado: 'EN CORRECCION', cierre: '20/10/2026' });
    expect(r?.fecha).toBe('2026-10-25');
    expect(r?.estado).toBe('En corrección');
    expect(r?.cierre).toBe(''); // no está cerrada
    const c = normalizarCorreccion({ ...crudo, estado: 'cerrada', cierre: '20/10/2026' });
    expect(c?.estado).toBe('Cerrada');
    expect(c?.cierre).toBe('2026-10-20');
  });
  it('convierte números en texto y recorta espacios', () => {
    expect(normalizarCorreccion({ ...crudo, talle: 40, color: '  Azul ' })).toMatchObject({ talle: '40', color: 'Azul' });
  });
  it('descarta filas sin ID o con estado desconocido', () => {
    expect(normalizarCorreccion({ ...crudo, id: '' })).toBeNull();
    expect(normalizarCorreccion({ ...crudo, estado: 'Archivada' })).toBeNull();
    expect(normalizarCorreccion(null)).toBeNull();
    expect(normalizarCorreccion('hola')).toBeNull();
  });
  it('fecha ilegible queda vacía en vez de romper', () => {
    expect(normalizarCorreccion({ ...crudo, fecha: 'pronto' })?.fecha).toBe('');
  });
});

describe('normalizarLista / normalizarUna', () => {
  it('exige { items: [] }', () => {
    expect(() => normalizarLista([])).toThrowError(RepoError);
    expect(() => normalizarLista({})).toThrowError(RepoError);
    expect(() => normalizarLista({ items: 'x' })).toThrowError(RepoError);
    expect(normalizarLista({ items: [] })).toEqual([]);
  });
  it('omite filas en blanco', () => {
    expect(normalizarLista({ items: [crudo, {}, { id: '' }] })).toHaveLength(1);
  });
  it('normalizarUna falla con forma inválida', () => {
    expect(() => normalizarUna({ ok: true })).toThrowError(/formato/);
    expect(normalizarUna(crudo).id).toBe('COR-0001');
  });
});
