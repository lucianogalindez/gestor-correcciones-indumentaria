import { describe, expect, it } from 'vitest';
import type { NuevaCorreccion } from '../types';
import { MAX_CORTO, MAX_DETALLE, esEnlaceValido, primerCampoConError, validar } from './validacion';

const valido: NuevaCorreccion = {
  codigo: 'CAM-1042', version: 'Proto 1', talle: 'M', color: 'Crudo', proveedor: 'Taller Sur',
  tipo: 'Medidas/calce', detalle: 'Cuello alto', enlace: '', responsable: 'Sofía', fecha: '2026-10-25',
};

describe('validar', () => {
  it('acepta datos completos (enlace es opcional)', () => {
    expect(validar(valido)).toEqual({});
  });
  it('marca cada obligatorio vacío o con solo espacios', () => {
    const e = validar({ ...valido, codigo: '', talle: '   ', detalle: '', fecha: '' });
    expect(Object.keys(e).sort()).toEqual(['codigo', 'detalle', 'fecha', 'talle']);
  });
  it('rechaza tipos fuera de la lista', () => {
    expect(validar({ ...valido, tipo: 'Inventado' }).tipo).toBeTruthy();
  });
  it('rechaza fechas imposibles o mal formadas', () => {
    expect(validar({ ...valido, fecha: '2026-02-30' }).fecha).toBeTruthy();
    expect(validar({ ...valido, fecha: '25/10/2026' }).fecha).toBeTruthy();
  });
  it('valida el enlace: solo http(s)', () => {
    expect(validar({ ...valido, enlace: 'https://example.com/a?b=1' })).toEqual({});
    expect(validar({ ...valido, enlace: 'javascript:alert(1)' }).enlace).toBeTruthy();
    expect(validar({ ...valido, enlace: 'example.com' }).enlace).toBeTruthy();
    expect(esEnlaceValido('ftp://x.com')).toBe(false);
  });
  it('limita la longitud', () => {
    expect(validar({ ...valido, color: 'a'.repeat(MAX_CORTO + 1) }).color).toBeTruthy();
    expect(validar({ ...valido, detalle: 'a'.repeat(MAX_DETALLE + 1) }).detalle).toBeTruthy();
    expect(validar({ ...valido, detalle: 'a'.repeat(MAX_DETALLE) })).toEqual({});
  });
});

describe('primerCampoConError', () => {
  it('devuelve el primero según el orden de la pantalla', () => {
    const e = validar({ ...valido, fecha: '', proveedor: '', detalle: '' });
    expect(primerCampoConError(e)).toBe('proveedor');
  });
  it('devuelve null sin errores', () => {
    expect(primerCampoConError({})).toBeNull();
  });
});
