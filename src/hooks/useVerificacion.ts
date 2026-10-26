import { useRef, useState } from 'react';
import { ColaVerificacion } from '../verificacion/cola';
import type { VerificacionRepository } from '../verificacion/repositorio';
import type { ItemCola } from '../verificacion/tipos';

export function useVerificacion(repo: VerificacionRepository) {
  const [items, setItems] = useState<ItemCola[]>([]);
  const cola = useRef<ColaVerificacion | null>(null);
  if (cola.current === null) cola.current = new ColaVerificacion(repo, setItems);
  const c = cola.current;

  return {
    items,
    agregar: (archivos: File[]) => c.agregar(archivos),
    cancelar: () => c.cancelar(),
    reintentar: (id?: number) => c.reintentar(id),
    limpiar: () => c.limpiar(),
  };
}
