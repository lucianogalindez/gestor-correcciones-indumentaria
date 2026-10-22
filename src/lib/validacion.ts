import { TIPOS, type NuevaCorreccion } from '../types';
import { esFechaValida } from './fechas';

export type CampoForm = keyof NuevaCorreccion;
export type Errores = Partial<Record<CampoForm, string>>;

/** Orden en pantalla: sirve para enfocar el primer campo con error. */
export const ORDEN_CAMPOS: CampoForm[] = [
  'codigo', 'version', 'talle', 'color', 'proveedor', 'tipo', 'detalle', 'enlace', 'responsable', 'fecha',
];

const OBLIGATORIOS: Record<Exclude<CampoForm, 'enlace'>, string> = {
  codigo: 'Ingresá el artículo.',
  version: 'Ingresá la versión de la muestra.',
  talle: 'Ingresá el talle.',
  color: 'Ingresá el color.',
  proveedor: 'Ingresá el proveedor o taller.',
  tipo: 'Elegí el tipo de corrección.',
  detalle: 'Describí la corrección.',
  responsable: 'Ingresá el responsable.',
  fecha: 'Ingresá la fecha requerida.',
};

export const MAX_CORTO = 80;
export const MAX_DETALLE = 1000;

/** Solo http(s): evita enlaces javascript: o data: en el detalle. */
export function esEnlaceValido(valor: string): boolean {
  try {
    const u = new URL(valor);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function limpiar(datos: NuevaCorreccion): NuevaCorreccion {
  const t = (s: string) => s.trim();
  return {
    codigo: t(datos.codigo), version: t(datos.version), talle: t(datos.talle), color: t(datos.color),
    proveedor: t(datos.proveedor), tipo: t(datos.tipo), detalle: t(datos.detalle),
    enlace: t(datos.enlace), responsable: t(datos.responsable), fecha: t(datos.fecha),
  };
}

export function validar(datos: NuevaCorreccion): Errores {
  const d = limpiar(datos);
  const e: Errores = {};

  for (const campo of Object.keys(OBLIGATORIOS) as Array<keyof typeof OBLIGATORIOS>) {
    if (d[campo] === '') e[campo] = OBLIGATORIOS[campo];
  }
  for (const campo of ['codigo', 'version', 'talle', 'color', 'proveedor', 'responsable'] as const) {
    if (!e[campo] && d[campo].length > MAX_CORTO) e[campo] = `Máximo ${MAX_CORTO} caracteres.`;
  }
  if (!e.detalle && d.detalle.length > MAX_DETALLE) e.detalle = `Máximo ${MAX_DETALLE} caracteres.`;
  if (!e.tipo && !(TIPOS as readonly string[]).includes(d.tipo)) e.tipo = 'Elegí un tipo de la lista.';
  if (!e.fecha && !esFechaValida(d.fecha)) e.fecha = 'La fecha no es válida.';
  if (d.enlace !== '' && !esEnlaceValido(d.enlace)) {
    e.enlace = 'Ingresá un enlace completo que empiece con http:// o https://.';
  }
  return e;
}

export function primerCampoConError(errores: Errores): CampoForm | null {
  return ORDEN_CAMPOS.find((c) => errores[c]) ?? null;
}
