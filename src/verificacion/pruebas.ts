import type { EstadoItem, ItemCola, Verificacion } from './tipos';
import { verificacionDeEjemplo } from './repositorio';

/** Verificación de ejemplo para pruebas; el nombre decide el resultado ("dif", "sin-ref" u otro = OK). */
export const verif = (nombre: string): Verificacion => verificacionDeEjemplo(nombre);

export const item = (id: number, nombre: string, estado: EstadoItem = 'listo', conResultado = true): ItemCola => ({
  id,
  archivo: nombre,
  estado,
  verificacion: estado === 'listo' && conResultado ? verif(nombre) : undefined,
});
