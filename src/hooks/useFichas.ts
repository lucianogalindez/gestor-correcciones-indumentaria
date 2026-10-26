import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cambiarEstadoOptimista } from '../fichas/cambioEstado';
import { agruparPorCarga } from '../fichas/logica';
import type { FichasRepository } from '../fichas/repositorio';
import type { EstadoFicha, Fila, ResultadoSubida } from '../fichas/tipos';
import { RepoError, mensajeDeError } from '../repositories/repository';
import type { Conexion, ErrorCarga } from './useCorrecciones';

export function useFichas(repo: FichasRepository, activo: boolean) {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [conexion, setConexion] = useState<Conexion>('cargando');
  const [errorCarga, setErrorCarga] = useState<ErrorCarga | null>(null);
  const [ultimaLectura, setUltimaLectura] = useState<Date | null>(null);
  const [actualizando, setActualizando] = useState(false);
  const enVuelo = useRef(false);
  const filasRef = useRef<Fila[]>([]);
  filasRef.current = filas;

  const refrescar = useCallback(async () => {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setActualizando(true);
    try {
      setFilas(await repo.listar());
      setConexion('ok');
      setErrorCarga(null);
      setUltimaLectura(new Date());
    } catch (e) {
      setConexion('error');
      setErrorCarga({ tipo: e instanceof RepoError ? e.tipo : 'otro', mensaje: mensajeDeError(e) });
    } finally {
      enVuelo.current = false;
      setActualizando(false);
    }
  }, [repo]);

  // La planilla se carga al abrir la pestaña por primera vez.
  useEffect(() => {
    if (activo) void refrescar();
  }, [activo, refrescar]);

  const fichas = useMemo(() => agruparPorCarga(filas), [filas]);

  /** Tras subir (bien o mal) se relee la planilla: ante un fallo, la ficha pudo haberse guardado igual. */
  const subir = async (archivo: File, signal?: AbortSignal): Promise<ResultadoSubida> => {
    try {
      const r = await repo.subir(archivo, { signal });
      void refrescar();
      return r;
    } catch (e) {
      if (!(e instanceof RepoError && e.tipo === 'cancelado')) void refrescar();
      throw e;
    }
  };

  const cambiarEstado = async (idCarga: string, estado: EstadoFicha): Promise<void> => {
    const anterior = filasRef.current.find((f) => f.idCarga === idCarga)?.estado;
    if (!anterior || anterior === estado) return;
    await cambiarEstadoOptimista(repo, idCarga, estado, anterior, (fn) => setFilas(fn));
  };

  return { fichas, filas, conexion, errorCarga, ultimaLectura, actualizando, refrescar, subir, cambiarEstado };
}
