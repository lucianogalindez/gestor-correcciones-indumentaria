import { RepoError } from '../repositories/repository';
import type { VerificacionRepository } from './repositorio';
import type { ItemCola } from './tipos';

/**
 * Cola de archivos a verificar: de a uno por vez (máx. 1 en paralelo), con cancelación del resto
 * y reintento de los que fallaron. No depende de React: avisa cada cambio con `alCambiar`.
 */
export class ColaVerificacion {
  private items: ItemCola[] = [];
  private readonly archivos = new Map<number, File>();
  private siguienteId = 1;
  private corriendo = false;
  private control: AbortController | null = null;

  constructor(
    private readonly repo: VerificacionRepository,
    private readonly alCambiar: (items: ItemCola[]) => void = () => {},
  ) {}

  get estado(): ItemCola[] {
    return this.items;
  }

  /** Agrega archivos al final de la cola. Los que ya están (mismo nombre y tamaño) se ignoran. */
  agregar(archivos: File[]): { agregados: number; repetidos: number } {
    let repetidos = 0;
    for (const f of archivos) {
      const ya = [...this.archivos.entries()].some(([, x]) => x.name === f.name && x.size === f.size);
      if (ya) {
        repetidos++;
        continue;
      }
      const id = this.siguienteId++;
      this.archivos.set(id, f);
      this.items = [...this.items, { id, archivo: f.name, estado: 'pendiente' }];
    }
    this.emitir();
    void this.procesar();
    return { agregados: archivos.length - repetidos, repetidos };
  }

  /** Cancela el archivo en curso y deja el resto de la cola como "cancelado". */
  cancelar(): void {
    this.items = this.items.map((i) => (i.estado === 'pendiente' ? { ...i, estado: 'cancelado' } : i));
    this.control?.abort();
    this.emitir();
  }

  /** Sin id: reintenta todas las que fallaron. Con id: reintenta ese archivo (fallido o cancelado). */
  reintentar(id?: number): void {
    this.items = this.items.map((i) => {
      const aplica = id === undefined ? i.estado === 'error' : i.id === id && (i.estado === 'error' || i.estado === 'cancelado');
      return aplica ? { id: i.id, archivo: i.archivo, estado: 'pendiente' } : i;
    });
    this.emitir();
    void this.procesar();
  }

  /** Quita de la lista lo que ya terminó; no toca lo que está en cola o procesándose. */
  limpiar(): void {
    const quitar = this.items.filter((i) => i.estado !== 'pendiente' && i.estado !== 'procesando');
    quitar.forEach((i) => this.archivos.delete(i.id));
    this.items = this.items.filter((i) => i.estado === 'pendiente' || i.estado === 'procesando');
    this.emitir();
  }

  private cambiar(id: number, parche: Partial<ItemCola>): void {
    this.items = this.items.map((i) => (i.id === id ? { ...i, ...parche } : i));
    this.emitir();
  }

  private emitir(): void {
    this.alCambiar(this.items);
  }

  private async procesar(): Promise<void> {
    if (this.corriendo) return;
    this.corriendo = true;
    try {
      for (;;) {
        const item = this.items.find((i) => i.estado === 'pendiente');
        if (!item) break;
        const archivo = this.archivos.get(item.id);
        if (!archivo) {
          this.cambiar(item.id, { estado: 'error' });
          continue;
        }
        this.cambiar(item.id, { estado: 'procesando' });
        const control = new AbortController();
        this.control = control;
        try {
          const verificacion = await this.repo.verificar(archivo, { signal: control.signal });
          this.cambiar(item.id, { estado: 'listo', verificacion });
        } catch (e) {
          this.cambiar(item.id, { estado: e instanceof RepoError && e.tipo === 'cancelado' ? 'cancelado' : 'error' });
        } finally {
          this.control = null;
        }
      }
    } finally {
      this.corriendo = false;
    }
  }
}
