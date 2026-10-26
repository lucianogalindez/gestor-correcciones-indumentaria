import { describe, expect, it, vi } from 'vitest';
import { crearRepositorioVerificacion } from '../repositories';
import { ClienteHttp } from '../repositories/clienteHttp';
import { normalizarVerificacion } from './normalizar';
import {
  HttpVerificacionRepository, MENSAJE_ERROR_FILA, MockVerificacionRepository, verificacionDeEjemplo,
} from './repositorio';

const json = (c: unknown, status = 200) => new Response(JSON.stringify(c), { status, headers: { 'Content-Type': 'application/json' } });
const pdf = (n = 'ficha.pdf') => new File(['%PDF'], n, { type: 'application/pdf' });

function http(resp: () => Response | Promise<Response>) {
  const fetchImpl = vi.fn(async (_u: string, _i: RequestInit) => resp());
  const r = new HttpVerificacionRepository(new ClienteHttp({ baseUrl: 'https://n8n.test/webhook/', apiKey: 'k', fetchImpl: fetchImpl as unknown as typeof fetch }));
  return { r, fetchImpl };
}

describe('HttpVerificacionRepository', () => {
  it('POST /fichas-verificar con multipart "file", sin Content-Type, y valida la respuesta', async () => {
    const { r, fetchImpl } = http(() => json(verificacionDeEjemplo('x-dif.pdf')));
    const v = await r.verificar(pdf('x-dif.pdf'));
    expect(v.estado).toBe('CON_DIFERENCIAS');
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://n8n.test/webhook/fichas-verificar');
    expect(init.method).toBe('POST');
    expect((init.body as FormData).get('file')).toBeInstanceOf(File);
    expect(init.headers).not.toHaveProperty('Content-Type');
    expect(init.headers).toMatchObject({ 'X-API-Key': 'k' });
  });

  it.each([
    ['red/CORS', () => Promise.reject(new TypeError('Failed to fetch'))],
    ['500 sin cuerpo', () => new Response(null, { status: 500 })],
    ['no JSON', () => new Response('<html>', { status: 200 })],
    ['forma inválida', () => json({ estado: 'RARO' })],
  ])('falla (%s) con el mismo mensaje de fila', async (_n, resp) => {
    await expect(http(resp as () => Response).r.verificar(pdf())).rejects.toMatchObject({ message: MENSAJE_ERROR_FILA });
  });

  it('cancelar no es un error de lectura', async () => {
    const fetchImpl = vi.fn((_u: string, init: RequestInit) =>
      new Promise<Response>((_a, rej) => init.signal!.addEventListener('abort', () => rej(new DOMException('abort', 'AbortError')))),
    );
    const r = new HttpVerificacionRepository(new ClienteHttp({ baseUrl: 'https://n8n.test', fetchImpl: fetchImpl as unknown as typeof fetch }));
    const c = new AbortController();
    const p = r.verificar(pdf(), { signal: c.signal });
    c.abort();
    await expect(p).rejects.toMatchObject({ tipo: 'cancelado' });
  });

  it('usa el nombre del archivo si el servidor no lo devuelve', async () => {
    const { archivo: _omitido, ...sinNombre } = verificacionDeEjemplo('ok.pdf');
    const { r } = http(() => json(sinNombre));
    expect((await r.verificar(pdf('mi-ficha.pdf'))).archivo).toBe('mi-ficha.pdf');
  });
});

describe('MockVerificacionRepository (según el nombre)', () => {
  const m = new MockVerificacionRepository({ esperaMs: 0 });
  it('OK', async () => expect((await m.verificar(pdf('juan.pdf'))).estado).toBe('OK'));
  it('con diferencias: proveedor TEXAMERI vs TEXTIL AMERICANA y cantidad 600 vs 500', async () => {
    const v = await m.verificar(pdf('juan-dif.pdf'));
    expect(v.estado).toBe('CON_DIFERENCIAS');
    expect(v.diferencias).toBe(2);
    expect(v.campos.find((c) => c.campo === 'Proveedor')).toMatchObject({ ficha: 'TEXAMERI', referencia: 'TEXTIL AMERICANA', resultado: 'diferente' });
    expect(v.colores.find((c) => c.codigo === '820')).toMatchObject({ ficha: 600, referencia: 500, resultado: 'diferente' });
  });
  it('sin referencia', async () => expect((await m.verificar(pdf('juan-sin-ref.pdf'))).estado).toBe('SIN_REFERENCIA'));
  it('falla', async () => {
    await expect(m.verificar(pdf('juan-error.pdf'))).rejects.toMatchObject({ message: MENSAJE_ERROR_FILA });
  });
  it('se puede cancelar', async () => {
    const lento = new MockVerificacionRepository({ esperaMs: 5000 });
    const c = new AbortController();
    const p = lento.verificar(pdf(), { signal: c.signal });
    c.abort();
    await expect(p).rejects.toMatchObject({ tipo: 'cancelado' });
  });
});

describe('normalizarVerificacion', () => {
  it('exige un estado válido y resultados válidos', () => {
    expect(() => normalizarVerificacion(null)).toThrow(/formato/);
    expect(() => normalizarVerificacion({ estado: 'X' })).toThrow();
    expect(() => normalizarVerificacion({ estado: 'OK', campos: [{ campo: 'a', resultado: 'raro' }] })).toThrow();
    expect(() => normalizarVerificacion({ estado: 'OK', campos: 'x' })).toThrow();
  });
  it('tolera campos opcionales ausentes y calcula las diferencias si faltan', () => {
    const v = normalizarVerificacion({
      estado: 'CON_DIFERENCIAS',
      campos: [{ campo: 'Tela', ficha: 'A', referencia: 'B', resultado: 'diferente' }],
      colores: [{ codigo: '1', color: 'X', ficha: '600', referencia: null, resultado: 'falta_en_referencia' }],
    }, 'a.pdf');
    expect(v).toMatchObject({ archivo: 'a.pdf', diferencias: 2, clave: '', resumen: '' });
    expect(v.colores[0]).toMatchObject({ ficha: 600, referencia: null });
  });
});

describe('crearRepositorioVerificacion', () => {
  it('HTTP con VITE_API_BASE_URL; mock sin ella', () => {
    expect(crearRepositorioVerificacion({ VITE_API_BASE_URL: 'https://n8n.test/webhook' })).toBeInstanceOf(HttpVerificacionRepository);
    expect(crearRepositorioVerificacion({})).toBeInstanceOf(MockVerificacionRepository);
  });
});
