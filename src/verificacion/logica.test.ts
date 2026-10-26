import { describe, expect, it } from 'vitest';
import {
  ENCABEZADOS_INFORME, FILTROS_VERIFICACION_VACIOS, contar, estadoVisible, filasDeDiferencias, filtrarVerificaciones,
  generarCsvInforme, ordenarVerificaciones,
} from './logica';
import { item } from './pruebas';
import type { ItemCola } from './tipos';

const lote: ItemCola[] = [
  item(1, 'ficha-ok.pdf'),
  item(2, 'ficha-dif.pdf'),
  item(3, 'ficha-sin-ref.pdf'),
  item(4, 'rota.pdf', 'error'),
  item(5, 'espera.pdf', 'pendiente'),
  item(6, 'otra-ok.pdf'),
  item(7, 'cancelada.pdf', 'cancelado'),
];
const ids = (l: ItemCola[]) => l.map((i) => i.id);

describe('estadoVisible', () => {
  it('mapea la cola y el resultado', () => {
    expect(lote.map(estadoVisible)).toEqual(['OK', 'CON_DIFERENCIAS', 'SIN_REFERENCIA', 'ERROR', 'EN_COLA', 'OK', 'CANCELADO']);
    expect(estadoVisible(item(9, 'x.pdf', 'procesando'))).toBe('PROCESANDO');
  });
});

describe('contar', () => {
  it('procesadas = las terminadas (con resultado o error); en cola y canceladas no cuentan', () => {
    expect(contar(lote)).toEqual({ procesadas: 5, ok: 2, conDiferencias: 1, sinReferencia: 1, conError: 1 });
  });
  it('vacío', () => {
    expect(contar([])).toEqual({ procesadas: 0, ok: 0, conDiferencias: 0, sinReferencia: 0, conError: 0 });
  });
});

describe('ordenarVerificaciones', () => {
  it('primero las que tienen diferencias, luego error, sin referencia, OK y lo pendiente', () => {
    expect(ids(ordenarVerificaciones(lote))).toEqual([2, 4, 3, 1, 6, 5, 7]);
  });
  it('entre las que tienen diferencias, las que tienen más van antes', () => {
    const a = item(1, 'a-dif.pdf');
    const b = item(2, 'b-dif.pdf');
    b.verificacion = { ...b.verificacion!, diferencias: 5 };
    expect(ids(ordenarVerificaciones([a, b]))).toEqual([2, 1]);
  });
  it('no muta la entrada', () => {
    const copia = [...lote];
    ordenarVerificaciones(lote);
    expect(lote).toEqual(copia);
  });
});

describe('filtrarVerificaciones', () => {
  it('por estado', () => {
    expect(ids(filtrarVerificaciones(lote, { ...FILTROS_VERIFICACION_VACIOS, estado: 'OK' }))).toEqual([1, 6]);
    expect(ids(filtrarVerificaciones(lote, { ...FILTROS_VERIFICACION_VACIOS, estado: 'CON_DIFERENCIAS' }))).toEqual([2]);
    expect(ids(filtrarVerificaciones(lote, { ...FILTROS_VERIFICACION_VACIOS, estado: 'ERROR' }))).toEqual([4]);
  });
  it('"En cola" incluye pendientes, en proceso y canceladas', () => {
    expect(ids(filtrarVerificaciones(lote, { ...FILTROS_VERIFICACION_VACIOS, estado: 'EN_COLA' }))).toEqual([5, 7]);
  });
  it('búsqueda por archivo, modelo o artículo, sin mayúsculas ni tildes', () => {
    expect(ids(filtrarVerificaciones(lote, { ...FILTROS_VERIFICACION_VACIOS, texto: 'OTRA' }))).toEqual([6]);
    expect(ids(filtrarVerificaciones(lote, { ...FILTROS_VERIFICACION_VACIOS, texto: 'juan' }))).toEqual([1, 2, 6]);
    expect(ids(filtrarVerificaciones(lote, { ...FILTROS_VERIFICACION_VACIOS, texto: '17678' }))).toEqual([1, 2, 6]);
    expect(ids(filtrarVerificaciones(lote, { ...FILTROS_VERIFICACION_VACIOS, texto: 'rota' }))).toEqual([4]);
  });
});

describe('informe CSV', () => {
  it('una fila por diferencia (campos y colores), con texto del resultado', () => {
    const filas = filasDeDiferencias(lote);
    expect(filas).toEqual([
      ['ficha-dif.pdf', 'Proveedor', 'TEXAMERI', 'TEXTIL AMERICANA', 'Diferente'],
      ['ficha-dif.pdf', 'Color 820 NEGRO GRANIZADO', '600', '500', 'Diferente'],
      ['ficha-sin-ref.pdf', 'Artículo', '99999', '—', 'No está en la referencia'],
    ]);
  });
  it('BOM, sep=, y CRLF, con encabezados', () => {
    const csv = generarCsvInforme(lote);
    expect(csv.startsWith('﻿sep=,\r\n')).toBe(true);
    expect(csv.split('\r\n')[1]).toBe(ENCABEZADOS_INFORME.join(','));
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(csv.replace(/\r\n/g, '')).not.toMatch(/\n/);
    expect(csv).toContain('ficha-dif.pdf,Proveedor,TEXAMERI,TEXTIL AMERICANA,Diferente');
  });
  it('escapa comas y comillas y neutraliza = + - @', () => {
    const it1 = item(1, 'ficha-dif.pdf');
    it1.verificacion = {
      ...it1.verificacion!,
      archivo: '=cmd.pdf',
      campos: [{ campo: 'Tela', ficha: '+1, "x"', referencia: '@y', resultado: 'diferente' }],
      colores: [{ codigo: '1', color: '-A', ficha: null, referencia: 3, resultado: 'falta_en_ficha' }],
    };
    const csv = generarCsvInforme([it1]);
    expect(csv).toContain("'=cmd.pdf,Tela,\"'+1, \"\"x\"\"\",'@y,Diferente");
    expect(csv).toContain("'=cmd.pdf,Color 1 -A,—,3,Falta en la ficha");
  });
  it('sin diferencias solo exporta encabezados', () => {
    expect(generarCsvInforme([item(1, 'ok.pdf')]).split('\r\n')).toHaveLength(3);
  });
});
