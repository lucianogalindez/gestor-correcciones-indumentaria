import { beforeEach, describe, expect, it } from 'vitest';
import { esVencida } from '../lib/indicadores';
import { CLAVE_DATOS, CLAVE_SEMBRADO, LocalStorageRepository } from './localStorageRepository';
import { semilla } from './semilla';

class AlmacenMemoria {
  datos = new Map<string, string>();
  getItem(k: string) { return this.datos.get(k) ?? null; }
  setItem(k: string, v: string) { this.datos.set(k, v); }
}

const HOY = '2026-10-21';
const AHORA = new Date(2026, 9, 21, 15, 0);
let almacen: AlmacenMemoria;
const nuevo = () => new LocalStorageRepository({ almacen, hoy: () => HOY, ahora: () => AHORA });

const datosNuevos = {
  codigo: 'ZZ-1', version: 'P1', talle: 'S', color: 'Rojo', proveedor: 'Taller', tipo: 'Tela',
  detalle: '  detalle  ', enlace: '', responsable: 'Ana', fecha: '2026-11-01',
};

beforeEach(() => {
  almacen = new AlmacenMemoria();
});

describe('semilla', () => {
  const s = semilla(HOY);
  it('tiene 8 solicitudes con ids únicos', () => {
    expect(s).toHaveLength(8);
    expect(new Set(s.map((c) => c.id)).size).toBe(8);
  });
  it('incluye vencidas, futuras, cerradas, una de hoy y dos del mismo artículo', () => {
    expect(s.filter((c) => esVencida(c, HOY)).length).toBeGreaterThanOrEqual(2);
    expect(s.some((c) => c.fecha > HOY && c.estado !== 'Cerrada')).toBe(true);
    expect(s.some((c) => c.estado === 'Cerrada' && c.cierre !== '')).toBe(true);
    expect(s.filter((c) => c.fecha === HOY)).toHaveLength(1);
    const porArticulo = s.map((c) => c.codigo);
    expect(porArticulo.length - new Set(porArticulo).size).toBeGreaterThanOrEqual(1);
  });
  it('las fechas son relativas a hoy', () => {
    const otra = semilla('2030-01-15');
    expect(otra.find((c) => c.fecha === '2030-01-15')).toBeTruthy();
  });
});

describe('LocalStorageRepository', () => {
  it('siembra al crear y lista las 8', async () => {
    expect(await nuevo().listar()).toHaveLength(8);
    expect(almacen.getItem(CLAVE_SEMBRADO)).toBe('1');
  });
  it('siembra una sola vez: no vuelve a cargar lo que el usuario modificó', async () => {
    const r1 = nuevo();
    await r1.crear(datosNuevos);
    const r2 = nuevo();
    expect(await r2.listar()).toHaveLength(9);
  });
  it('no resiembra si ya se sembró aunque los datos hayan desaparecido', async () => {
    nuevo();
    almacen.datos.delete(CLAVE_DATOS);
    expect(await nuevo().listar()).toEqual([]);
  });
  it('crear asigna el siguiente ID, estado Pendiente, creada ISO, y recorta espacios', async () => {
    const r = nuevo();
    const c = await r.crear(datosNuevos);
    expect(c).toMatchObject({ id: 'COR-0009', estado: 'Pendiente', cierre: '', detalle: 'detalle' });
    expect(c.creada).toBe(AHORA.toISOString());
    expect((await r.listar()).map((x) => x.id)).toContain('COR-0009');
    expect((await r.crear(datosNuevos)).id).toBe('COR-0010');
  });
  it('cambiarEstado cierra con fecha y reabre vaciándola', async () => {
    const r = nuevo();
    const cerrada = await r.cambiarEstado('COR-0001', 'Cerrada', HOY);
    expect(cerrada).toMatchObject({ estado: 'Cerrada', cierre: HOY });
    const reabierta = await r.cambiarEstado('COR-0001', 'En corrección', '');
    expect(reabierta).toMatchObject({ estado: 'En corrección', cierre: '' });
    expect((await r.listar()).find((c) => c.id === 'COR-0001')?.cierre).toBe('');
  });
  it('no guarda cierre si el estado no es Cerrada', async () => {
    const r = nuevo();
    expect((await r.cambiarEstado('COR-0001', 'Pendiente', HOY)).cierre).toBe('');
  });
  it('falla si el ID no existe', async () => {
    await expect(nuevo().cambiarEstado('COR-9999', 'Cerrada', HOY)).rejects.toThrow(/COR-9999/);
  });
  it('informa si los datos guardados están dañados', async () => {
    const r = nuevo();
    almacen.setItem(CLAVE_DATOS, '{no es json');
    await expect(r.listar()).rejects.toMatchObject({ tipo: 'invalida' });
  });
});
