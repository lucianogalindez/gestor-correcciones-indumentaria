export const ESTADOS = ['Pendiente', 'En corrección', 'Para revisar', 'Cerrada'] as const;
export type Estado = (typeof ESTADOS)[number];

export const TIPOS = [
  'Moldería',
  'Medidas / Talle',
  'Tela',
  'Color',
  'Costura / Confección',
  'Avíos y accesorios',
  'Estampa / Bordado',
  'Terminación',
  'Otro',
] as const;

export interface Correccion {
  id: string;
  codigo: string;
  version: string;
  talle: string;
  color: string;
  proveedor: string;
  tipo: string;
  detalle: string;
  enlace: string;
  responsable: string;
  /** Fecha requerida, AAAA-MM-DD (calendario local). */
  fecha: string;
  /** Fecha y hora de creación, ISO 8601. */
  creada: string;
  estado: Estado;
  /** Fecha de cierre AAAA-MM-DD, o '' si no está cerrada. */
  cierre: string;
}

/** Lo que carga el usuario: el resto lo asigna el sistema. */
export type NuevaCorreccion = Omit<Correccion, 'id' | 'creada' | 'estado' | 'cierre'>;
