import type { Correccion } from '../types';
import { sumarDias } from '../lib/fechas';

/** 8 solicitudes de ejemplo con fechas relativas a `hoy` (AAAA-MM-DD). */
export function semilla(hoy: string): Correccion[] {
  const creada = (dias: number) => `${sumarDias(hoy, dias)}T12:00:00.000Z`;
  const base = { enlace: '', cierre: '' };
  return [
    {
      ...base, id: 'COR-0001', codigo: 'CAM-1042', version: 'Proto 1', talle: 'M', color: 'Crudo',
      proveedor: 'Taller Sur', tipo: 'Medidas/calce', responsable: 'Sofía Ramírez', estado: 'En corrección',
      detalle: 'El cuello queda 1,5 cm alto respecto del molde base. Bajar y reajustar la caída del hombro.',
      enlace: 'https://example.com/fotos/cam-1042-proto1', fecha: sumarDias(hoy, -6), creada: creada(-14),
    },
    {
      ...base, id: 'COR-0002', codigo: 'CAM-1042', version: 'Proto 2', talle: 'M', color: 'Crudo',
      proveedor: 'Taller Sur', tipo: 'Costura/terminación', responsable: 'Sofía Ramírez', estado: 'Pendiente',
      detalle: 'Puntada floja en la sisa; usar hilo del mismo tono y reforzar costura.',
      fecha: sumarDias(hoy, -2), creada: creada(-5),
    },
    {
      ...base, id: 'COR-0003', codigo: 'PAN-2210', version: 'Proto 1', talle: '40', color: 'Azul noche',
      proveedor: 'Confecciones Norte', tipo: 'Medidas/calce', responsable: 'Martín Pérez', estado: 'Pendiente',
      detalle: 'Tiro 1 cm corto en talle 40. Verificar tabla de medidas y, si hace falta, tabla de gradación.',
      fecha: hoy, creada: creada(-3),
    },
    {
      ...base, id: 'COR-0004', codigo: 'VES-3301', version: 'Proto 3', talle: 'S', color: 'Verde oliva',
      proveedor: 'Taller Sur', tipo: 'Tela', responsable: 'Lucía Gómez', estado: 'Para revisar',
      detalle: 'El tono salió más amarillento que el pantone aprobado. Enviar nueva tintura para aprobación.',
      fecha: sumarDias(hoy, 3), creada: creada(-4),
    },
    {
      ...base, id: 'COR-0005', codigo: 'ABR-4120', version: 'Proto 1', talle: 'L', color: 'Negro',
      proveedor: 'Bordados del Plata', tipo: 'Estampa/bordado', responsable: 'Martín Pérez', estado: 'Pendiente',
      detalle: 'Bordado del logo 0,8 cm corrido hacia la izquierda; centrar según plano técnico.',
      fecha: sumarDias(hoy, 10), creada: creada(-1),
    },
    {
      ...base, id: 'COR-0006', codigo: 'REM-1500', version: 'Proto 2', talle: 'M', color: 'Blanco',
      proveedor: 'Confecciones Norte', tipo: 'Avíos', responsable: 'Lucía Gómez', estado: 'Cerrada',
      detalle: 'Cambiar botones de 15 mm por 12 mm. Aprobado con muestra física.',
      fecha: sumarDias(hoy, -12), creada: creada(-25), cierre: sumarDias(hoy, -13),
    },
    {
      ...base, id: 'COR-0007', codigo: 'PAN-2210', version: 'Proto 2', talle: '42', color: 'Azul noche',
      proveedor: 'Confecciones Norte', tipo: 'Costura/terminación', responsable: 'Sofía Ramírez', estado: 'Cerrada',
      detalle: 'Planchado marcado en el dobladillo. Corregido en la segunda muestra.',
      fecha: sumarDias(hoy, -1), creada: creada(-9), cierre: sumarDias(hoy, -2),
    },
    {
      ...base, id: 'COR-0008', codigo: 'CAM-1098', version: 'Proto 1', talle: 'XL', color: 'Rayado celeste',
      proveedor: 'Taller Sur', tipo: 'Tela', responsable: 'Lucía Gómez', estado: 'En corrección',
      detalle: 'La tela encoge al lavado más de lo previsto (4 %). Pedir ficha técnica del proveedor de tela.',
      fecha: sumarDias(hoy, 6), creada: creada(-2),
    },
  ];
}
