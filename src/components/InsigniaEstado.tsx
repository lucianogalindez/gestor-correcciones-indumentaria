import type { Estado } from '../types';

const CLASES: Record<Estado, string> = {
  Pendiente: 'estado--pendiente',
  'En corrección': 'estado--correccion',
  'Para revisar': 'estado--revisar',
  Cerrada: 'estado--cerrada',
};

export function InsigniaEstado({ estado }: { estado: Estado }) {
  return <span className={`estado ${CLASES[estado]}`}>{estado}</span>;
}
