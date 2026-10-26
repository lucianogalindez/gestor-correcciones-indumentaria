import { describe, expect, it } from 'vitest';
import { RepoError } from '../repositories/repository';
import { cambiarEstadoOptimista } from './cambioEstado';
import { MockFichasRepository } from './mockFichasRepository';
import { fila } from './pruebas';
import type { Fila } from './tipos';
import type { FichasRepository } from './repositorio';

function almacen(inicial: Fila[]) {
  const estado = { filas: inicial, historial: [] as string[] };
  const actualizar = (fn: (f: Fila[]) => Fila[]) => {
    estado.filas = fn(estado.filas);
    estado.historial.push(estado.filas.map((f) => f.estado).join('|'));
  };
  return { estado, actualizar };
}

const inicial = [fila({ idFila: 'a', idCarga: 'C1' }), fila({ idFila: 'b', idCarga: 'C1' }), fila({ idFila: 'c', idCarga: 'C2' })];

describe('cambiarEstadoOptimista', () => {
  it('muestra el estado nuevo al instante y lo confirma con la respuesta', async () => {
    const repo = new MockFichasRepository({ esperaMs: 0 });
    await repo.subir(new File(['x'], 'a.pdf'));
    const { estado, actualizar } = almacen(await repo.listar());
    const idCarga = estado.filas[0].idCarga;

    const p = cambiarEstadoOptimista(repo, idCarga, 'Terminada', 'Pendiente', actualizar);
    expect(estado.filas.every((f) => f.estado === 'Terminada')).toBe(true); // antes de que responda el servidor
    await p;
    expect(estado.filas.every((f) => f.estado === 'Terminada')).toBe(true);
  });

  it('si el servidor falla vuelve al estado anterior y relanza el error', async () => {
    const repo = {
      remoto: true,
      listar: async () => [],
      subir: async () => { throw new Error('no usado'); },
      cambiarEstado: async () => { throw new RepoError('servidor', 'caído', 500); },
    } as unknown as FichasRepository;
    const { estado, actualizar } = almacen(inicial);

    await expect(cambiarEstadoOptimista(repo, 'C1', 'Entregada', 'Pendiente', actualizar)).rejects.toMatchObject({ tipo: 'servidor' });

    expect(estado.historial).toEqual(['Entregada|Entregada|Pendiente', 'Pendiente|Pendiente|Pendiente']);
    expect(estado.filas.map((f) => f.estado)).toEqual(['Pendiente', 'Pendiente', 'Pendiente']);
  });

  it('no toca las filas de otras cargas al revertir', async () => {
    const repo = {
      cambiarEstado: async () => { throw new RepoError('otro', 'No existe', 404); },
    } as unknown as FichasRepository;
    const filas = [fila({ idFila: 'a', idCarga: 'C1' }), fila({ idFila: 'c', idCarga: 'C2', estado: 'Terminada' })];
    const { estado, actualizar } = almacen(filas);
    await expect(cambiarEstadoOptimista(repo, 'C1', 'Entregada', 'Pendiente', actualizar)).rejects.toThrow();
    expect(estado.filas.map((f) => f.estado)).toEqual(['Pendiente', 'Terminada']);
  });
});
