import { useEffect, useState } from 'react';
import { hoyLocal } from '../lib/fechas';

/** "Hoy" en fecha local; se actualiza si la pestaña queda abierta pasada la medianoche. */
export function useHoy(): string {
  const [hoy, setHoy] = useState(() => hoyLocal());
  useEffect(() => {
    const actualizar = () => setHoy(hoyLocal());
    const t = setInterval(actualizar, 60_000);
    document.addEventListener('visibilitychange', actualizar);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', actualizar);
    };
  }, []);
  return hoy;
}
