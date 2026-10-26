import { describe, expect, it } from 'vitest';
import { RepoError } from '../repositories/repository';
import { ColaVerificacion } from './cola';
import { verif } from './pruebas';
import type { VerificacionRepository } from './repositorio';
import type { ItemCola } from './tipos';

const pdf = (n: string, size = 10) => new File([new Uint8Array(size)], n, { type: 'application/pdf' });
const tick = () => new Promise((r) => setTimeout(r, 0));
const esperarHasta = async (cond: () => boolean) => {
  for (let i = 0; i < 200 && !cond(); i++) await tick();
  if (!cond()) throw new Error('timeout de la prueba');
};

/** Repo controlable: cada llamada queda pendiente hasta que la prueba la resuelve o la rechaza. */
function repoControlado() {
  const llamadas: { nombre: string; ok: () => void; fallar: (e?: unknown) => void; signal?: AbortSignal }[] = [];
  let enParalelo = 0;
  let maxParalelo = 0;
  const repo: VerificacionRepository = {
    remoto: false,
    verificar: (archivo, o) =>
      new Promise((resolver, rechazar) => {
        enParalelo++;
        maxParalelo = Math.max(maxParalelo, enParalelo);
        const fin = () => { enParalelo--; };
        const l = {
          nombre: archivo.name, signal: o?.signal,
          ok: () => { fin(); resolver(verif(archivo.name)); },
          fallar: (e: unknown = new RepoError('servidor', 'x', 500)) => { fin(); rechazar(e); },
        };
        o?.signal?.addEventListener('abort', () => l.fallar(new RepoError('cancelado', 'Se canceló.')));
        llamadas.push(l);
      }),
  };
  return { repo, llamadas, maxParalelo: () => maxParalelo };
}

const estados = (c: ColaVerificacion) => c.estado.map((i) => i.estado);

describe('ColaVerificacion', () => {
  it('procesa de a uno, en orden, sin superponer', async () => {
    const { repo, llamadas, maxParalelo } = repoControlado();
    const cola = new ColaVerificacion(repo);
    cola.agregar([pdf('a.pdf'), pdf('b.pdf'), pdf('c.pdf')]);
    await esperarHasta(() => llamadas.length === 1);
    expect(estados(cola)).toEqual(['procesando', 'pendiente', 'pendiente']);

    llamadas[0].ok();
    await esperarHasta(() => llamadas.length === 2);
    expect(llamadas.map((l) => l.nombre)).toEqual(['a.pdf', 'b.pdf']);
    expect(estados(cola)).toEqual(['listo', 'procesando', 'pendiente']);

    llamadas[1].ok();
    await esperarHasta(() => llamadas.length === 3);
    llamadas[2].ok();
    await esperarHasta(() => estados(cola).every((e) => e === 'listo'));
    expect(maxParalelo()).toBe(1);
    expect(cola.estado[0].verificacion?.archivo).toBe('a.pdf');
  });

  it('avisa cada cambio con una lista nueva', async () => {
    const { repo, llamadas } = repoControlado();
    const vistos: ItemCola[][] = [];
    const cola = new ColaVerificacion(repo, (i) => vistos.push(i));
    cola.agregar([pdf('a.pdf')]);
    await esperarHasta(() => llamadas.length === 1);
    llamadas[0].ok();
    await esperarHasta(() => cola.estado[0].estado === 'listo');
    expect(vistos.length).toBeGreaterThanOrEqual(3);
    expect(new Set(vistos).size).toBe(vistos.length); // nunca se reutiliza el mismo arreglo
  });

  it('un archivo con error no frena a los siguientes', async () => {
    const { repo, llamadas } = repoControlado();
    const cola = new ColaVerificacion(repo);
    cola.agregar([pdf('a.pdf'), pdf('b.pdf')]);
    await esperarHasta(() => llamadas.length === 1);
    llamadas[0].fallar();
    await esperarHasta(() => llamadas.length === 2);
    llamadas[1].ok();
    await esperarHasta(() => estados(cola)[1] === 'listo');
    expect(estados(cola)).toEqual(['error', 'listo']);
  });

  it('cancelar aborta el archivo en curso y deja el resto cancelado sin procesarlo', async () => {
    const { repo, llamadas } = repoControlado();
    const cola = new ColaVerificacion(repo);
    cola.agregar([pdf('a.pdf'), pdf('b.pdf'), pdf('c.pdf')]);
    await esperarHasta(() => llamadas.length === 1);
    cola.cancelar();
    expect(llamadas[0].signal?.aborted).toBe(true);
    await esperarHasta(() => estados(cola)[0] === 'cancelado');
    expect(estados(cola)).toEqual(['cancelado', 'cancelado', 'cancelado']);
    await tick();
    expect(llamadas).toHaveLength(1); // b y c nunca se enviaron
  });

  it('lo ya procesado se conserva al cancelar', async () => {
    const { repo, llamadas } = repoControlado();
    const cola = new ColaVerificacion(repo);
    cola.agregar([pdf('a.pdf'), pdf('b.pdf'), pdf('c.pdf')]);
    await esperarHasta(() => llamadas.length === 1);
    llamadas[0].ok();
    await esperarHasta(() => llamadas.length === 2);
    cola.cancelar();
    await esperarHasta(() => estados(cola)[1] === 'cancelado');
    expect(estados(cola)).toEqual(['listo', 'cancelado', 'cancelado']);
  });

  it('reintentar sin id solo toca las que fallaron', async () => {
    const { repo, llamadas } = repoControlado();
    const cola = new ColaVerificacion(repo);
    cola.agregar([pdf('a.pdf'), pdf('b.pdf'), pdf('c.pdf')]);
    await esperarHasta(() => llamadas.length === 1);
    llamadas[0].ok();
    await esperarHasta(() => llamadas.length === 2);
    llamadas[1].fallar();
    await esperarHasta(() => llamadas.length === 3);
    cola.cancelar();
    await esperarHasta(() => estados(cola)[2] === 'cancelado');
    expect(estados(cola)).toEqual(['listo', 'error', 'cancelado']);

    cola.reintentar();
    await esperarHasta(() => llamadas.length === 4);
    expect(llamadas[3].nombre).toBe('b.pdf'); // solo la fallida; la cancelada sigue igual
    expect(estados(cola)).toEqual(['listo', 'procesando', 'cancelado']);
    llamadas[3].ok();
    await esperarHasta(() => estados(cola)[1] === 'listo');
    expect(estados(cola)).toEqual(['listo', 'listo', 'cancelado']);
    expect(llamadas).toHaveLength(4);
  });

  it('reintentar con id procesa una cancelada puntual', async () => {
    const { repo, llamadas } = repoControlado();
    const cola = new ColaVerificacion(repo);
    cola.agregar([pdf('a.pdf'), pdf('b.pdf')]);
    await esperarHasta(() => llamadas.length === 1);
    cola.cancelar();
    await esperarHasta(() => estados(cola)[0] === 'cancelado');
    cola.reintentar(cola.estado[1].id);
    await esperarHasta(() => llamadas.length === 2);
    expect(llamadas[1].nombre).toBe('b.pdf');
    llamadas[1].ok();
    await esperarHasta(() => estados(cola)[1] === 'listo');
    expect(estados(cola)).toEqual(['cancelado', 'listo']);
  });

  it('ignora archivos repetidos (mismo nombre y tamaño)', () => {
    const { repo } = repoControlado();
    const cola = new ColaVerificacion(repo);
    expect(cola.agregar([pdf('a.pdf', 5), pdf('a.pdf', 5), pdf('a.pdf', 6)])).toEqual({ agregados: 2, repetidos: 1 });
    expect(cola.estado).toHaveLength(2);
  });

  it('se puede seguir agregando mientras corre', async () => {
    const { repo, llamadas, maxParalelo } = repoControlado();
    const cola = new ColaVerificacion(repo);
    cola.agregar([pdf('a.pdf')]);
    await esperarHasta(() => llamadas.length === 1);
    cola.agregar([pdf('b.pdf')]);
    await tick();
    expect(llamadas).toHaveLength(1);
    llamadas[0].ok();
    await esperarHasta(() => llamadas.length === 2);
    llamadas[1].ok();
    await esperarHasta(() => estados(cola).every((e) => e === 'listo'));
    expect(maxParalelo()).toBe(1);
  });

  it('limpiar quita lo terminado y conserva lo que está en curso', async () => {
    const { repo, llamadas } = repoControlado();
    const cola = new ColaVerificacion(repo);
    cola.agregar([pdf('a.pdf'), pdf('b.pdf')]);
    await esperarHasta(() => llamadas.length === 1);
    llamadas[0].ok();
    await esperarHasta(() => llamadas.length === 2);
    cola.limpiar();
    expect(cola.estado.map((i) => i.archivo)).toEqual(['b.pdf']);
    llamadas[1].ok();
    await esperarHasta(() => estados(cola)[0] === 'listo');
  });

  it('un timeout o falla de red cuenta como error, no como cancelado', async () => {
    const { repo, llamadas } = repoControlado();
    const cola = new ColaVerificacion(repo);
    cola.agregar([pdf('a.pdf')]);
    await esperarHasta(() => llamadas.length === 1);
    llamadas[0].fallar(new RepoError('sin-conexion', 'x'));
    await esperarHasta(() => estados(cola)[0] === 'error');
  });
});
