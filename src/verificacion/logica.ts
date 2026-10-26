import { escaparCelda } from '../lib/csv';
import type { EstadoVisible, ItemCola, Resultado, Valor } from './tipos';

const plano = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

export const TEXTO_RESULTADO: Record<Resultado, string> = {
  ok: 'Coincide',
  diferente: 'Diferente',
  falta_en_ficha: 'Falta en la ficha',
  falta_en_referencia: 'No está en la referencia',
};

export const TEXTO_ESTADO: Record<EstadoVisible, string> = {
  OK: 'OK',
  CON_DIFERENCIAS: 'Con diferencias',
  SIN_REFERENCIA: 'Sin referencia',
  ERROR: 'Error',
  PROCESANDO: 'Procesando…',
  EN_COLA: 'En cola',
  CANCELADO: 'Cancelado',
};

export function estadoVisible(i: ItemCola): EstadoVisible {
  switch (i.estado) {
    case 'listo':
      return i.verificacion?.estado ?? 'ERROR';
    case 'error':
      return 'ERROR';
    case 'procesando':
      return 'PROCESANDO';
    case 'cancelado':
      return 'CANCELADO';
    default:
      return 'EN_COLA';
  }
}

export const mostrarValor = (v: Valor): string => (v === null || v === '' ? '—' : String(v));

export interface ContadoresVerificacion {
  procesadas: number;
  ok: number;
  conDiferencias: number;
  sinReferencia: number;
  conError: number;
}

/** "Procesadas" = las que ya terminaron (con resultado o con error). */
export function contar(items: ItemCola[]): ContadoresVerificacion {
  const c: ContadoresVerificacion = { procesadas: 0, ok: 0, conDiferencias: 0, sinReferencia: 0, conError: 0 };
  for (const i of items) {
    const e = estadoVisible(i);
    if (e === 'OK') c.ok++;
    else if (e === 'CON_DIFERENCIAS') c.conDiferencias++;
    else if (e === 'SIN_REFERENCIA') c.sinReferencia++;
    else if (e === 'ERROR') c.conError++;
    else continue;
    c.procesadas++;
  }
  return c;
}

const RANGO: Record<EstadoVisible, number> = {
  CON_DIFERENCIAS: 0, ERROR: 1, SIN_REFERENCIA: 2, OK: 3, PROCESANDO: 4, EN_COLA: 4, CANCELADO: 4,
};

/** Primero las que tienen diferencias (más diferencias antes), luego error, sin referencia, OK y lo que sigue en cola. */
export function ordenarVerificaciones(items: ItemCola[]): ItemCola[] {
  return [...items].sort((a, b) => {
    const ea = estadoVisible(a);
    const eb = estadoVisible(b);
    return (
      RANGO[ea] - RANGO[eb] ||
      (ea === 'CON_DIFERENCIAS' ? (b.verificacion?.diferencias ?? 0) - (a.verificacion?.diferencias ?? 0) : 0) ||
      a.id - b.id
    );
  });
}

export type FiltroEstado = '' | 'OK' | 'CON_DIFERENCIAS' | 'SIN_REFERENCIA' | 'ERROR' | 'EN_COLA';

export interface FiltrosVerificacion {
  texto: string;
  estado: FiltroEstado;
}

export const FILTROS_VERIFICACION_VACIOS: FiltrosVerificacion = { texto: '', estado: '' };

export function filtrarVerificaciones(items: ItemCola[], f: FiltrosVerificacion): ItemCola[] {
  const q = plano(f.texto);
  return items.filter((i) => {
    const e = estadoVisible(i);
    if (f.estado === 'EN_COLA') {
      if (e !== 'EN_COLA' && e !== 'PROCESANDO' && e !== 'CANCELADO') return false;
    } else if (f.estado !== '' && e !== f.estado) return false;
    if (q !== '') {
      const v = i.verificacion;
      const pajar = plano([i.archivo, v?.ficha.modelo ?? '', v?.ficha.articulo ?? ''].join(' '));
      if (!pajar.includes(q)) return false;
    }
    return true;
  });
}

export const ENCABEZADOS_INFORME = ['Archivo', 'Campo', 'Ficha', 'Referencia', 'Resultado'] as const;

/** Una fila por diferencia (campos y colores que no coinciden). */
export function filasDeDiferencias(items: ItemCola[]): string[][] {
  const filas: string[][] = [];
  for (const i of items) {
    const v = i.verificacion;
    if (!v) continue;
    for (const c of v.campos) {
      if (c.resultado !== 'ok') filas.push([v.archivo, c.campo, mostrarValor(c.ficha), mostrarValor(c.referencia), TEXTO_RESULTADO[c.resultado]]);
    }
    for (const c of v.colores) {
      if (c.resultado !== 'ok') {
        filas.push([v.archivo, `Color ${c.codigo} ${c.color}`.trim(), mostrarValor(c.ficha), mostrarValor(c.referencia), TEXTO_RESULTADO[c.resultado]]);
      }
    }
  }
  return filas;
}

/** Informe CSV para Excel: BOM UTF-8, CRLF, y celdas protegidas contra fórmulas (= + - @). */
export function generarCsvInforme(items: ItemCola[]): string {
  const lineas = [ENCABEZADOS_INFORME as readonly string[], ...filasDeDiferencias(items)].map((f) => f.map(escaparCelda).join(','));
  return '﻿sep=,\r\n' + lineas.join('\r\n') + '\r\n';
}

export const nombreArchivoInforme = (hoy: string) => `verificacion-fichas_${hoy}.csv`;
