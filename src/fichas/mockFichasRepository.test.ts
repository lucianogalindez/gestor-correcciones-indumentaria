import { describe, expect, it } from 'vitest';
import { RepoError } from '../repositories/repository';
import { agruparPorCarga, indicadoresFichas } from './logica';
import { FICHA_EJEMPLO, MockFichasRepository } from './mockFichasRepository';

const pdf = (nombre = 'ficha.pdf') => new File(['%PDF-1.4'], nombre, { type: 'application/pdf' });
const repo = () => new MockFichasRepository({ esperaMs: 0, ahora: () => new Date('2026-10-26T15:00:00Z') });

describe('flujo subir → confirmación → planilla (mock)', () => {
  it('guarda la ficha de ejemplo y aparece agrupada en la planilla', async () => {
    const r = repo();
    expect(await r.listar()).toEqual([]);

    const res = await r.subir(pdf());
    expect(res).toMatchObject({ idCarga: 'CARGA-0001', estado: 'Pendiente', filas: 2 });
    expect(res.ficha).toMatchObject({
      articulo: '17678', modelo: 'JUAN', temporada: 'Invierno 20', linea: 'DEPORTIVA', ordenCompra: '69107',
      proveedor: 'TEXAMERI', tela: 'Jersey marmolado', cantidadTotal: 1200, fecha: '2019-10-28',
    });
    expect(res.ficha.colores).toEqual([
      { codigo: '820', color: 'NEGRO GRANIZADO', cantidad: 600 },
      { codigo: '881', color: 'AZUL MARINO GRANIZADO', cantidad: 600 },
    ]);

    const planilla = agruparPorCarga(await r.listar());
    expect(planilla).toHaveLength(1);
    expect(planilla[0]).toMatchObject({ idCarga: 'CARGA-0001', articulo: '17678', archivo: 'ficha.pdf', estado: 'Pendiente' });
    expect(planilla[0].colores).toHaveLength(2);
    expect(indicadoresFichas(planilla)).toEqual({ fichas: 1, prendas: 1200, sinTerminar: 1 });
  });

  it('cada subida es una carga nueva', async () => {
    const r = repo();
    await r.subir(pdf());
    expect((await r.subir(pdf('otra.pdf'))).idCarga).toBe('CARGA-0002');
    expect(agruparPorCarga(await r.listar())).toHaveLength(2);
  });

  it('no deja modificar la ficha de ejemplo compartida', async () => {
    const r = repo();
    const res = await r.subir(pdf());
    res.ficha.colores[0].cantidad = 1;
    expect(FICHA_EJEMPLO.colores[0].cantidad).toBe(600);
  });

  it('rechaza archivos que no son PDF', async () => {
    await expect(repo().subir(new File(['x'], 'foto.png'))).rejects.toBeInstanceOf(RepoError);
  });

  it('se puede cancelar mientras espera', async () => {
    const r = new MockFichasRepository({ esperaMs: 5000 });
    const c = new AbortController();
    const p = r.subir(pdf(), { signal: c.signal });
    c.abort();
    await expect(p).rejects.toMatchObject({ tipo: 'cancelado' });
    expect(await r.listar()).toEqual([]);
  });

  it('cambiarEstado actualiza todas las filas de la carga', async () => {
    const r = repo();
    await r.subir(pdf());
    expect(await r.cambiarEstado('CARGA-0001', 'En producción')).toEqual({ idCarga: 'CARGA-0001', estado: 'En producción', filas: 2 });
    expect((await r.listar()).every((f) => f.estado === 'En producción')).toBe(true);
    await expect(r.cambiarEstado('CARGA-9999', 'Terminada')).rejects.toMatchObject({ status: 404 });
  });
});
