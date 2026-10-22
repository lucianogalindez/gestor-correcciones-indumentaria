import { describe, expect, it } from 'vitest';
import type { Correccion } from '../types';
import { ENCABEZADOS_CSV, escaparCelda, generarCsv, protegerFormula } from './csv';

const base: Correccion = {
  id: 'COR-0001', codigo: 'CAM-1042', version: 'Proto 1', talle: 'M', color: 'Crudo', proveedor: 'Taller Sur',
  tipo: 'Medidas/calce', detalle: 'Cuello alto', enlace: '', responsable: 'Sofía', fecha: '2026-10-25',
  creada: '2026-10-01T10:00:00.000Z', estado: 'En corrección', cierre: '',
};

describe('escaparCelda', () => {
  it('deja el texto simple sin comillas', () => {
    expect(escaparCelda('Moldería')).toBe('Moldería');
  });
  it('encierra en comillas si hay comas', () => {
    expect(escaparCelda('a, b')).toBe('"a, b"');
  });
  it('duplica las comillas', () => {
    expect(escaparCelda('dijo "hola"')).toBe('"dijo ""hola"""');
  });
  it('conserva los saltos de línea dentro de comillas', () => {
    expect(escaparCelda('línea 1\nlínea 2')).toBe('"línea 1\nlínea 2"');
    expect(escaparCelda('a\r\nb')).toBe('"a\r\nb"');
  });
});

describe('protegerFormula', () => {
  it.each(['=SUMA(A1)', '+54911', '-1+2', '@cmd', '\tx', '\rx'])('neutraliza %j', (v) => {
    expect(protegerFormula(v).startsWith("'")).toBe(true);
  });
  it('no toca texto normal ni fechas', () => {
    expect(protegerFormula('2026-10-25')).toBe('2026-10-25');
    expect(protegerFormula('a=b')).toBe('a=b');
  });
  it('se combina con el escape de comillas', () => {
    expect(escaparCelda('=HYPERLINK("http://x","y")')).toBe('"\'=HYPERLINK(""http://x"",""y"")"');
  });
});

describe('generarCsv', () => {
  const csv = generarCsv([base]);

  it('empieza con BOM UTF-8 y la línea sep=,', () => {
    expect(csv.startsWith('﻿sep=,\r\n')).toBe(true);
  });
  it('usa CRLF y termina con salto de línea', () => {
    const lineas = csv.slice(1).split('\r\n');
    expect(lineas).toHaveLength(4); // sep, encabezado, 1 fila, vacío final
    expect(lineas[3]).toBe('');
    expect(csv.replace(/\r\n/g, '')).not.toMatch(/\n/);
  });
  it('encabezados A–N en el orden del Sheet', () => {
    const enc = csv.split('\r\n')[1];
    expect(enc).toBe(ENCABEZADOS_CSV.join(','));
    expect(ENCABEZADOS_CSV).toHaveLength(14);
    expect(ENCABEZADOS_CSV[0]).toBe('ID');
    expect(ENCABEZADOS_CSV[13]).toBe('Fecha de cierre');
  });
  it('conserva acentos y ñ', () => {
    expect(csv).toContain('Medidas/calce');
    expect(csv).toContain('Sofía');
    expect(csv).toContain('En corrección');
  });
  it('escapa comas, comillas y saltos en el detalle', () => {
    const fila = generarCsv([{ ...base, detalle: 'Bajar 1,5 cm\n"urgente"' }]);
    expect(fila).toContain('"Bajar 1,5 cm\n""urgente"""');
  });
  it('protege fórmulas en el contenido', () => {
    expect(generarCsv([{ ...base, proveedor: '=1+1' }])).toContain(",'=1+1,");
  });
  it('sin solicitudes igual exporta encabezados', () => {
    expect(generarCsv([]).split('\r\n')).toHaveLength(3);
  });
});
