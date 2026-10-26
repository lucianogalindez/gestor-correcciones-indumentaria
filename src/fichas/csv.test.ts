import { describe, expect, it } from 'vitest';
import { ENCABEZADOS_FICHAS, generarCsvFichas } from './csv';
import { agruparPorCarga } from './logica';
import { fila } from './pruebas';

const fichas = agruparPorCarga([
  fila({ idFila: 'a', codigoColor: '820', color: 'NEGRO, GRANIZADO', cantidadColor: 600 }),
  fila({ idFila: 'b', codigoColor: '881', color: 'AZUL "MARINO"', cantidadColor: 600 }),
]);

describe('generarCsvFichas', () => {
  const csv = generarCsvFichas(fichas);
  it('BOM UTF-8, línea sep=, y CRLF', () => {
    expect(csv.startsWith('﻿sep=,\r\n')).toBe(true);
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(csv.replace(/\r\n/g, '')).not.toMatch(/\n/);
  });
  it('encabezados y una línea por color', () => {
    const l = csv.split('\r\n');
    expect(l[1]).toBe(ENCABEZADOS_FICHAS.join(','));
    expect(l).toHaveLength(5); // sep, encabezado, 2 colores, vacío final
  });
  it('escapa comas y comillas', () => {
    expect(csv).toContain('"NEGRO, GRANIZADO"');
    expect(csv).toContain('"AZUL ""MARINO"""');
  });
  it('conserva acentos', () => {
    expect(generarCsvFichas(agruparPorCarga([fila({ estado: 'En producción' })]))).toContain('En producción');
  });
  it('neutraliza celdas que empiezan con = + - @', () => {
    const peligrosas = agruparPorCarga([fila({ modelo: '=1+1', tela: '+cmd', color: '-x', proveedor: '@SUMA(A1)' })]);
    const c = generarCsvFichas(peligrosas);
    expect(c).toContain(",'=1+1,");
    expect(c).toContain(",'+cmd,");
    expect(c).toContain(",'-x,");
    expect(c).toContain(",'@SUMA(A1),");
  });
  it('sin fichas exporta solo encabezados', () => {
    expect(generarCsvFichas([]).split('\r\n')).toHaveLength(3);
  });
});
