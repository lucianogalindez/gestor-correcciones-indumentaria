import { describe, expect, it } from 'vitest';
import {
  compararFechas, esFechaValida, fechaLocalDeIso, hoyLocal, mostrarFecha, normalizarFecha, sumarDias,
} from './fechas';

describe('hoyLocal', () => {
  it('usa el calendario local, no UTC', () => {
    // 31/12 a las 23:30 hora local: aunque en UTC ya sea otro día, hoy sigue siendo 31/12.
    expect(hoyLocal(new Date(2026, 11, 31, 23, 30))).toBe('2026-12-31');
    expect(hoyLocal(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01');
  });
  it('rellena mes y día con ceros', () => {
    expect(hoyLocal(new Date(2026, 2, 5, 10))).toBe('2026-03-05');
  });
});

describe('esFechaValida', () => {
  it.each(['2026-02-28', '2028-02-29', '2026-12-31'])('acepta %s', (f) => expect(esFechaValida(f)).toBe(true));
  it.each(['2026-02-29', '2026-13-01', '2026-00-10', '2026-04-31', '26-01-01', '2026/01/01', '', '2026-1-1'])(
    'rechaza %j',
    (f) => expect(esFechaValida(f)).toBe(false),
  );
});

describe('sumarDias', () => {
  it('cruza meses, años y bisiestos', () => {
    expect(sumarDias('2026-01-31', 1)).toBe('2026-02-01');
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(sumarDias('2028-03-01', -1)).toBe('2028-02-29');
    expect(sumarDias('2026-10-21', -10)).toBe('2026-10-11');
  });
});

describe('normalizarFecha', () => {
  it('acepta AAAA-MM-DD y dd/mm/aaaa', () => {
    expect(normalizarFecha('2026-10-21')).toBe('2026-10-21');
    expect(normalizarFecha('21/10/2026')).toBe('2026-10-21');
    expect(normalizarFecha('1/2/2026')).toBe('2026-02-01');
    expect(normalizarFecha(' 05-03-2026 ')).toBe('2026-03-05');
  });
  it('interpreta dd/mm (día primero), no mm/dd', () => {
    expect(normalizarFecha('03/04/2026')).toBe('2026-04-03');
  });
  it('acepta ISO con hora tomando la parte de fecha tal cual', () => {
    expect(normalizarFecha('2026-10-21T23:30:00-03:00')).toBe('2026-10-21');
  });
  it('acepta números de serie de Sheets', () => {
    expect(normalizarFecha(46316)).toBe('2026-10-21');
  });
  it('devuelve vacío si no se entiende', () => {
    expect(normalizarFecha('31/02/2026')).toBe('');
    expect(normalizarFecha('mañana')).toBe('');
    expect(normalizarFecha(null)).toBe('');
    expect(normalizarFecha('')).toBe('');
  });
});

describe('mostrar / comparar', () => {
  it('formatea para mostrar', () => {
    expect(mostrarFecha('2026-10-21')).toBe('21/10/2026');
    expect(mostrarFecha('')).toBe('—');
  });
  it('compara dejando las vacías al final', () => {
    const l = ['2026-05-01', '', '2026-01-01'].sort(compararFechas);
    expect(l).toEqual(['2026-01-01', '2026-05-01', '']);
  });
  it('fechaLocalDeIso respeta fechas sueltas y convierte ISO a calendario local', () => {
    expect(fechaLocalDeIso('2026-10-21')).toBe('2026-10-21');
    const local = new Date(2026, 9, 21, 22, 0);
    expect(fechaLocalDeIso(local.toISOString())).toBe('2026-10-21');
    expect(fechaLocalDeIso('basura')).toBe('');
  });
});
