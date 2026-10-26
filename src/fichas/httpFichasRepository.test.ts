import { describe, expect, it, vi } from 'vitest';
import { ClienteHttp } from '../repositories/clienteHttp';
import { crearRepositorioFichas } from '../repositories';
import { HttpFichasRepository } from './httpFichasRepository';
import { MockFichasRepository, FICHA_EJEMPLO } from './mockFichasRepository';
import { MENSAJE_ERROR_SUBIDA } from './repositorio';

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });

function repo(respuesta: () => Response | Promise<Response>, apiKey?: string) {
  const fetchImpl = vi.fn(async (_u: string, _i: RequestInit) => respuesta());
  const cliente = new ClienteHttp({ baseUrl: 'https://n8n.test/webhook/', apiKey, fetchImpl: fetchImpl as unknown as typeof fetch });
  return { fetchImpl, r: new HttpFichasRepository(cliente) };
}
const llamada = (f: ReturnType<typeof vi.fn>) => f.mock.calls[0] as unknown as [string, RequestInit];
const pdf = () => new File(['%PDF-1.4'], 'ficha.pdf', { type: 'application/pdf' });

const fila = {
  idFila: 'CARGA-0001-1', idCarga: 'CARGA-0001', cargado: '2026-10-20T12:00:00.000Z', articulo: '17678', modelo: 'JUAN',
  temporada: 'Invierno 20', linea: 'DEPORTIVA', ordenCompra: '69107', proveedor: 'TEXAMERI', tela: 'Jersey',
  cantidadTotal: 1200, codigoColor: '820', color: 'NEGRO', cantidadColor: 600, estado: 'Pendiente',
  fechaFicha: '2019-10-28', archivo: 'a.pdf',
};

describe('HttpFichasRepository', () => {
  it('listar: GET /fichas y valida la forma', async () => {
    const { r, fetchImpl } = repo(() => json({ items: [fila] }), 'clave');
    expect(await r.listar()).toHaveLength(1);
    const [url, init] = llamada(fetchImpl);
    expect(url).toBe('https://n8n.test/webhook/fichas');
    expect(init.method).toBe('GET');
    expect(init.headers).toMatchObject({ 'X-API-Key': 'clave' });
  });

  it('subir: multipart con campo "file" y SIN Content-Type fijado', async () => {
    const { r, fetchImpl } = repo(() => json({ idCarga: 'CARGA-0001', estado: 'Pendiente', filas: 2, ficha: FICHA_EJEMPLO }));
    const res = await r.subir(pdf());
    expect(res.idCarga).toBe('CARGA-0001');
    const [url, init] = llamada(fetchImpl);
    expect(url).toBe('https://n8n.test/webhook/fichas-subir');
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get('file')).toBeInstanceOf(File);
    expect(init.headers).not.toHaveProperty('Content-Type');
  });

  describe('subir: cualquier fallo muestra el mismo mensaje', () => {
    it.each([
      ['fallo de red/CORS', () => Promise.reject(new TypeError('Failed to fetch'))],
      ['500 sin cuerpo', () => new Response(null, { status: 500 })],
      ['502', () => json({}, 502)],
      ['respuesta que no es JSON', () => new Response('<html>', { status: 200 })],
      ['forma inesperada', () => json({ ok: true })],
    ])('%s', async (_n, resp) => {
      const { r } = repo(resp as () => Response);
      await expect(r.subir(pdf())).rejects.toMatchObject({ message: MENSAJE_ERROR_SUBIDA });
    });
  });

  it('subir: cancelar no es un error de procesamiento', async () => {
    const fetchImpl = vi.fn((_u: string, init: RequestInit) =>
      new Promise<Response>((_res, rej) => init.signal!.addEventListener('abort', () => rej(new DOMException('abort', 'AbortError')))),
    );
    const r = new HttpFichasRepository(new ClienteHttp({ baseUrl: 'https://n8n.test', fetchImpl: fetchImpl as unknown as typeof fetch }));
    const c = new AbortController();
    const p = r.subir(pdf(), { signal: c.signal });
    c.abort();
    await expect(p).rejects.toMatchObject({ tipo: 'cancelado' });
  });

  it('cambiarEstado: POST JSON { idCarga, estado }', async () => {
    const { r, fetchImpl } = repo(() => json({ idCarga: 'CARGA-0001', estado: 'Terminada', filas: 2 }));
    expect(await r.cambiarEstado('CARGA-0001', 'Terminada')).toEqual({ idCarga: 'CARGA-0001', estado: 'Terminada', filas: 2 });
    const [url, init] = llamada(fetchImpl);
    expect(url).toBe('https://n8n.test/webhook/fichas-estado');
    expect(JSON.parse(init.body as string)).toEqual({ idCarga: 'CARGA-0001', estado: 'Terminada' });
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
  });

  it('cambiarEstado: muestra el { error } que devuelve el servidor en 4xx', async () => {
    const { r } = repo(() => json({ error: 'No existe la carga X' }, 404));
    await expect(r.cambiarEstado('X', 'Terminada')).rejects.toMatchObject({ message: 'No existe la carga X', status: 404 });
  });

  it('cambiarEstado: 5xx y 401 siguen diferenciados', async () => {
    await expect(repo(() => json({}, 503)).r.cambiarEstado('X', 'Terminada')).rejects.toMatchObject({ tipo: 'servidor' });
    await expect(repo(() => json({}, 401)).r.cambiarEstado('X', 'Terminada')).rejects.toMatchObject({ tipo: 'autorizacion' });
  });
});

describe('crearRepositorioFichas', () => {
  it('HTTP con VITE_API_BASE_URL; mock en memoria sin ella', () => {
    expect(crearRepositorioFichas({ VITE_API_BASE_URL: 'https://n8n.test/webhook' })).toBeInstanceOf(HttpFichasRepository);
    expect(crearRepositorioFichas({})).toBeInstanceOf(MockFichasRepository);
    expect(crearRepositorioFichas({ VITE_API_BASE_URL: '  ' })).toBeInstanceOf(MockFichasRepository);
  });
});
