import type { Correccion, Estado, NuevaCorreccion } from '../types';
import { hoyLocal } from '../lib/fechas';
import { limpiar } from '../lib/validacion';
import { normalizarCorreccion } from './normalizar';
import { RepoError, type CorreccionesRepository } from './repository';
import { semilla } from './semilla';

export const CLAVE_DATOS = 'correcciones.datos.v1';
export const CLAVE_SEMBRADO = 'correcciones.sembrado.v1';

type Almacen = Pick<Storage, 'getItem' | 'setItem'>;

interface Opciones {
  almacen?: Almacen;
  hoy?: () => string;
  ahora?: () => Date;
}

/** Modo demo sin servidor: guarda todo en el navegador. La semilla se carga una sola vez. */
export class LocalStorageRepository implements CorreccionesRepository {
  readonly remoto = false;
  private readonly almacen: Almacen;
  private readonly hoy: () => string;
  private readonly ahora: () => Date;

  constructor({ almacen, hoy, ahora }: Opciones = {}) {
    this.almacen = almacen ?? window.localStorage;
    this.ahora = ahora ?? (() => new Date());
    this.hoy = hoy ?? (() => hoyLocal(this.ahora()));
    this.sembrar();
  }

  private sembrar(): void {
    try {
      if (this.almacen.getItem(CLAVE_SEMBRADO) === null) {
        if (this.almacen.getItem(CLAVE_DATOS) === null) this.guardar(semilla(this.hoy()));
        this.almacen.setItem(CLAVE_SEMBRADO, '1');
      }
    } catch {
      // Sin almacenamiento disponible: los errores se informan al listar/guardar.
    }
  }

  private leer(): Correccion[] {
    let crudo: string | null;
    try {
      crudo = this.almacen.getItem(CLAVE_DATOS);
    } catch {
      throw new RepoError('otro', 'No se pudo leer el almacenamiento del navegador.');
    }
    if (crudo === null) return [];
    try {
      const datos: unknown = JSON.parse(crudo);
      if (!Array.isArray(datos)) throw new Error('no es lista');
      return datos.map(normalizarCorreccion).filter((c): c is Correccion => c !== null);
    } catch {
      throw new RepoError('invalida', 'Los datos guardados en este navegador están dañados.');
    }
  }

  private guardar(items: Correccion[]): void {
    try {
      this.almacen.setItem(CLAVE_DATOS, JSON.stringify(items));
    } catch {
      throw new RepoError('otro', 'No se pudo guardar en el navegador (¿almacenamiento lleno o bloqueado?).');
    }
  }

  async listar(): Promise<Correccion[]> {
    return this.leer();
  }

  async crear(datos: NuevaCorreccion): Promise<Correccion> {
    const items = this.leer();
    const maximo = items.reduce((m, c) => Math.max(m, Number(/^COR-(\d+)$/.exec(c.id)?.[1] ?? 0)), 0);
    const nueva: Correccion = {
      ...limpiar(datos),
      id: `COR-${String(maximo + 1).padStart(4, '0')}`,
      creada: this.ahora().toISOString(),
      estado: 'Pendiente',
      cierre: '',
    };
    this.guardar([...items, nueva]);
    return nueva;
  }

  async cambiarEstado(id: string, estado: Estado, cierre: string): Promise<Correccion> {
    const items = this.leer();
    const actual = items.find((c) => c.id === id);
    if (!actual) throw new RepoError('otro', `No existe la solicitud ${id}.`);
    const actualizada: Correccion = { ...actual, estado, cierre: estado === 'Cerrada' ? cierre : '' };
    this.guardar(items.map((c) => (c.id === id ? actualizada : c)));
    return actualizada;
  }
}
