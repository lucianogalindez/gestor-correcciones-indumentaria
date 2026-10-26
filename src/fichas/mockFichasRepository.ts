import { RepoError } from '../repositories/repository';
import { MENSAJE_ERROR_SUBIDA, type FichasRepository } from './repositorio';
import { validarArchivo } from './logica';
import type { EstadoFicha, FichaGuardada, Fila, ResultadoEstado, ResultadoSubida } from './tipos';

export const FICHA_EJEMPLO: FichaGuardada = {
  articulo: '17678', modelo: 'JUAN', temporada: 'Invierno 20', linea: 'DEPORTIVA', ordenCompra: '69107',
  proveedor: 'TEXAMERI', tela: 'Jersey marmolado', cantidadTotal: 1200, fecha: '2019-10-28',
  colores: [
    { codigo: '820', color: 'NEGRO GRANIZADO', cantidad: 600 },
    { codigo: '881', color: 'AZUL MARINO GRANIZADO', cantidad: 600 },
  ],
};

interface Opciones {
  /** Demora simulada de subir(); 1500 ms por defecto. */
  esperaMs?: number;
  ahora?: () => Date;
}

/** Modo sin servidor: guarda en memoria y "lee" siempre la ficha de ejemplo. */
export class MockFichasRepository implements FichasRepository {
  readonly remoto = false;
  private filas: Fila[] = [];
  private contador = 0;
  private readonly esperaMs: number;
  private readonly ahora: () => Date;

  constructor({ esperaMs = 1500, ahora = () => new Date() }: Opciones = {}) {
    this.esperaMs = esperaMs;
    this.ahora = ahora;
  }

  async listar(): Promise<Fila[]> {
    return this.filas.map((f) => ({ ...f }));
  }

  async subir(archivo: File, opciones: { signal?: AbortSignal } = {}): Promise<ResultadoSubida> {
    if (validarArchivo(archivo) !== null) throw new RepoError('otro', MENSAJE_ERROR_SUBIDA);
    await this.esperar(opciones.signal);

    const idCarga = `CARGA-${String(++this.contador).padStart(4, '0')}`;
    const cargado = this.ahora().toISOString();
    const f = FICHA_EJEMPLO;
    f.colores.forEach((c, i) => {
      this.filas.push({
        idFila: `${idCarga}-${i + 1}`, idCarga, cargado, articulo: f.articulo, modelo: f.modelo,
        temporada: f.temporada, linea: f.linea, ordenCompra: f.ordenCompra, proveedor: f.proveedor, tela: f.tela,
        cantidadTotal: f.cantidadTotal, codigoColor: c.codigo, color: c.color, cantidadColor: c.cantidad,
        estado: 'Pendiente', fechaFicha: f.fecha, archivo: archivo.name,
      });
    });
    return { idCarga, estado: 'Pendiente', filas: f.colores.length, ficha: structuredClone(f) };
  }

  async cambiarEstado(idCarga: string, estado: EstadoFicha): Promise<ResultadoEstado> {
    const propias = this.filas.filter((f) => f.idCarga === idCarga);
    if (propias.length === 0) throw new RepoError('otro', `No existe la carga ${idCarga}.`, 404);
    propias.forEach((f) => (f.estado = estado));
    return { idCarga, estado, filas: propias.length };
  }

  private esperar(signal?: AbortSignal): Promise<void> {
    return new Promise((resolver, rechazar) => {
      const cancelar = () => rechazar(new RepoError('cancelado', 'Se canceló la operación.'));
      if (signal?.aborted) return cancelar();
      const t = setTimeout(() => {
        signal?.removeEventListener('abort', alAbortar);
        resolver();
      }, this.esperaMs);
      const alAbortar = () => {
        clearTimeout(t);
        cancelar();
      };
      signal?.addEventListener('abort', alAbortar, { once: true });
    });
  }
}
