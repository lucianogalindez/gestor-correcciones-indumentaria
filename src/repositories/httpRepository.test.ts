import { describe, expect, it, vi } from 'vitest';
import { HttpRepository } from './httpRepository';
import { crearRepositorio } from './index';
import { LocalStorageRepository } from './localStorageRepository';

const fila = {
  id: 'COR-0001', codigo: 'CAM-1', version: 'P1', talle: 'M', color: 'Crudo', proveedor: 'Sur', tipo: 'Tela',
  detalle: 'x', enlace: '', responsable: 'Ana', fecha: '2026-10-25', creada: '2026-10-01T10:00:00.000Z',
  estado: 'Pendiente', cierre: '',
};
const nuevaDatos = {
  codigo: 'CAM-1', version: 'P1', talle: 'M', color: 'Crudo', proveedor: 'Sur', tipo: 'Tela',
  detalle: ' x ', enlace: '', responsable: 'Ana', fecha: '2026-10-25',
};

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });

function repo(respuesta: () => Response | Promise<Response>, apiKey?: string) {
  const fetchImpl = vi.fn(async () => respuesta());
  return { fetchImpl, r: new HttpRepository({ baseUrl: 'https://n8n.test/webhook/', apiKey, fetchImpl: fetchImpl as unknown as typeof fetch }) };
}

describe('HttpRepository', () => {
  it('listar: GET {BASE}/correcciones y valida la forma', async () => {
    const { r, fetchImpl } = repo(() => json({ items: [fila, { ...fila, id: 'COR-0002', fecha: '26/10/2026', estado: 'cerrada', cierre: '2026-10-22' }] }));
    const lista = await r.listar();
    expect(lista).toHaveLength(2);
    expect(lista[1]).toMatchObject({ fecha: '2026-10-26', estado: 'Cerrada' });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://n8n.test/webhook/correcciones');
    expect(init.method).toBe('GET');
  });

  it('crear: POST sin id, creada, estado ni cierre, y devuelve lo que genera n8n', async () => {
    const { r, fetchImpl } = repo(() => json({ ...fila, id: 'COR-0042' }));
    const c = await r.crear(nuevaDatos);
    expect(c.id).toBe('COR-0042');
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://n8n.test/webhook/correcciones-crear');
    expect(init.method).toBe('POST');
    const cuerpo = JSON.parse(init.body as string);
    expect(cuerpo).not.toHaveProperty('id');
    expect(cuerpo).not.toHaveProperty('creada');
    expect(cuerpo).not.toHaveProperty('estado');
    expect(cuerpo).not.toHaveProperty('cierre');
    expect(cuerpo.detalle).toBe('x');
    expect(Object.keys(cuerpo).sort()).toEqual(
      ['codigo', 'color', 'detalle', 'enlace', 'fecha', 'proveedor', 'responsable', 'talle', 'tipo', 'version'],
    );
  });

  it('cambiarEstado: POST { id, estado, cierre }', async () => {
    const { r, fetchImpl } = repo(() => json({ ...fila, estado: 'Cerrada', cierre: '2026-10-21' }));
    const c = await r.cambiarEstado('COR-0001', 'Cerrada', '2026-10-21');
    expect(c).toMatchObject({ estado: 'Cerrada', cierre: '2026-10-21' });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://n8n.test/webhook/correcciones-estado');
    expect(JSON.parse(init.body as string)).toEqual({ id: 'COR-0001', estado: 'Cerrada', cierre: '2026-10-21' });
  });

  it('envía X-API-Key solo si hay clave', async () => {
    const con = repo(() => json({ items: [] }), 'secreta');
    await con.r.listar();
    expect((con.fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].headers).toMatchObject({ 'X-API-Key': 'secreta' });
    const sin = repo(() => json({ items: [] }));
    await sin.r.listar();
    expect((sin.fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].headers).not.toHaveProperty('X-API-Key');
  });

  describe('errores diferenciados', () => {
    it('sin conexión (fetch rechaza)', async () => {
      const { r } = repo(() => Promise.reject(new TypeError('Failed to fetch')));
      await expect(r.listar()).rejects.toMatchObject({ tipo: 'sin-conexion' });
    });
    it.each([401, 403])('%i -> autorización', async (status) => {
      const { r } = repo(() => json({}, status));
      await expect(r.listar()).rejects.toMatchObject({ tipo: 'autorizacion', status });
    });
    it.each([500, 502, 503])('%i -> servidor', async (status) => {
      const { r } = repo(() => json({}, status));
      await expect(r.crear(nuevaDatos)).rejects.toMatchObject({ tipo: 'servidor', status });
    });
    it('JSON inválido -> respuesta inválida', async () => {
      const { r } = repo(() => new Response('<html>', { status: 200 }));
      await expect(r.listar()).rejects.toMatchObject({ tipo: 'invalida' });
    });
    it('forma inesperada -> respuesta inválida', async () => {
      await expect(repo(() => json({ datos: [] })).r.listar()).rejects.toMatchObject({ tipo: 'invalida' });
      await expect(repo(() => json({ ok: true })).r.crear(nuevaDatos)).rejects.toMatchObject({ tipo: 'invalida' });
      await expect(repo(() => json([])).r.cambiarEstado('COR-0001', 'Cerrada', '2026-10-21')).rejects.toMatchObject({ tipo: 'invalida' });
    });
    it('otro 4xx (p. ej. 400/404) -> error genérico con status', async () => {
      const { r } = repo(() => json({ error: 'no existe' }, 404));
      await expect(r.cambiarEstado('X', 'Cerrada', '2026-10-21')).rejects.toMatchObject({ tipo: 'otro', status: 404 });
    });
  });

  it('corta por tiempo de espera', async () => {
    const fetchImpl = vi.fn((_u: string, init: RequestInit) =>
      new Promise<Response>((_res, rej) => init.signal!.addEventListener('abort', () => rej(new DOMException('abort', 'AbortError')))),
    );
    const r = new HttpRepository({ baseUrl: 'https://n8n.test', fetchImpl: fetchImpl as unknown as typeof fetch, timeoutMs: 10 });
    await expect(r.listar()).rejects.toMatchObject({ tipo: 'sin-conexion' });
  });
});

describe('crearRepositorio', () => {
  it('usa HTTP si hay VITE_API_BASE_URL', () => {
    const r = crearRepositorio({ VITE_API_BASE_URL: 'https://n8n.test/webhook' });
    expect(r).toBeInstanceOf(HttpRepository);
    expect(r.remoto).toBe(true);
  });
  it('sin la variable (o en blanco) usa localStorage', () => {
    const almacen = { getItem: () => null, setItem: () => undefined };
    vi.stubGlobal('window', { localStorage: almacen });
    expect(crearRepositorio({})).toBeInstanceOf(LocalStorageRepository);
    expect(crearRepositorio({ VITE_API_BASE_URL: '   ' })).toBeInstanceOf(LocalStorageRepository);
    vi.unstubAllGlobals();
  });
});
