import { RepoError } from '../repositories/repository';
import { aNumero } from '../fichas/normalizar';
import type {
  CampoComparado, ColorComparado, EstadoVerificacion, FichaLeida, Resultado, Valor, Verificacion,
} from './tipos';

const RESULTADOS: Resultado[] = ['ok', 'diferente', 'falta_en_ficha', 'falta_en_referencia'];
const ESTADOS: EstadoVerificacion[] = ['OK', 'CON_DIFERENCIAS', 'SIN_REFERENCIA'];

const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const texto = (v: unknown): string => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');

const invalida = (que: string) =>
  new RepoError('invalida', `La respuesta del servidor no tiene el formato esperado (${que}).`);

const valor = (v: unknown): Valor => (typeof v === 'number' ? v : typeof v === 'string' ? v : null);
const cantidad = (v: unknown): number | null => (v === null || v === undefined || v === '' ? null : aNumero(v));

function resultado(v: unknown): Resultado {
  if (typeof v === 'string' && (RESULTADOS as string[]).includes(v)) return v as Resultado;
  throw invalida('resultado');
}

function lista(v: unknown, nombre: string): unknown[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw invalida(nombre);
  return v;
}

export const esDiferencia = (r: Resultado) => r !== 'ok';

function normalizarFichaLeida(crudo: unknown): FichaLeida {
  const f = esObjeto(crudo) ? crudo : {};
  return {
    articulo: texto(f.articulo), modelo: texto(f.modelo), temporada: texto(f.temporada), linea: texto(f.linea),
    ordenCompra: texto(f.ordenCompra), proveedor: texto(f.proveedor), tela: texto(f.tela),
    cantidadTotal: cantidad(f.cantidadTotal),
    colores: lista(f.colores, 'ficha.colores').map((c) => {
      const o = esObjeto(c) ? c : {};
      return { codigo: texto(o.codigo), color: texto(o.color), cantidad: cantidad(o.cantidad) };
    }),
  };
}

/** Valida la forma de la respuesta de /fichas-verificar. `archivoRespaldo` se usa si el servidor no devuelve el nombre. */
export function normalizarVerificacion(cuerpo: unknown, archivoRespaldo = ''): Verificacion {
  if (!esObjeto(cuerpo)) throw invalida('verificación');
  const estado = cuerpo.estado;
  if (typeof estado !== 'string' || !(ESTADOS as string[]).includes(estado)) throw invalida('estado');

  const campos: CampoComparado[] = lista(cuerpo.campos, 'campos').map((c) => {
    if (!esObjeto(c)) throw invalida('campos');
    return { campo: texto(c.campo), ficha: valor(c.ficha), referencia: valor(c.referencia), resultado: resultado(c.resultado) };
  });
  const colores: ColorComparado[] = lista(cuerpo.colores, 'colores').map((c) => {
    if (!esObjeto(c)) throw invalida('colores');
    return {
      codigo: texto(c.codigo), color: texto(c.color), ficha: cantidad(c.ficha),
      referencia: cantidad(c.referencia), resultado: resultado(c.resultado),
    };
  });
  const calculadas = campos.filter((c) => esDiferencia(c.resultado)).length + colores.filter((c) => esDiferencia(c.resultado)).length;

  return {
    archivo: texto(cuerpo.archivo) || archivoRespaldo,
    estado: estado as EstadoVerificacion,
    clave: texto(cuerpo.clave),
    resumen: texto(cuerpo.resumen),
    diferencias: typeof cuerpo.diferencias === 'number' ? cuerpo.diferencias : calculadas,
    ficha: normalizarFichaLeida(cuerpo.ficha),
    campos,
    colores,
  };
}
