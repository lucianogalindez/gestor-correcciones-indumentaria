import { useCallback, useEffect, useRef, useState } from 'react';
import type { Correccion, Estado, NuevaCorreccion } from '../types';
import type { CorreccionesRepository } from '../repositories/repository';
import { RepoError, mensajeDeError, type TipoError } from '../repositories/repository';

export const INTERVALO_RELECTURA_MS = 30_000;

export type Conexion = 'cargando' | 'ok' | 'error';

export interface ErrorCarga {
  tipo: TipoError;
  mensaje: string;
}

export function useCorrecciones(repo: CorreccionesRepository) {
  const [items, setItems] = useState<Correccion[]>([]);
  const [conexion, setConexion] = useState<Conexion>('cargando');
  const [errorCarga, setErrorCarga] = useState<ErrorCarga | null>(null);
  const [ultimaLectura, setUltimaLectura] = useState<Date | null>(null);
  const [actualizando, setActualizando] = useState(false);
  const enVuelo = useRef(false);

  const refrescar = useCallback(async () => {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setActualizando(true);
    try {
      const lista = await repo.listar();
      setItems(lista);
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

  useEffect(() => {
    void refrescar();
    if (!repo.remoto) return;

    const visible = () => document.visibilityState === 'visible';
    const temporizador = setInterval(() => {
      if (visible()) void refrescar();
    }, INTERVALO_RELECTURA_MS);
    const alVolver = () => {
      if (visible()) void refrescar();
    };
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      clearInterval(temporizador);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [repo, refrescar]);

  const reemplazar = (actualizada: Correccion) =>
    setItems((prev) =>
      prev.some((c) => c.id === actualizada.id)
        ? prev.map((c) => (c.id === actualizada.id ? actualizada : c))
        : [...prev, actualizada],
    );

  /** Lanza RepoError si falla: el que llama decide cómo mostrarlo y conserva lo ingresado. */
  const crear = async (datos: NuevaCorreccion): Promise<Correccion> => {
    const creada = await repo.crear(datos);
    reemplazar(creada);
    return creada;
  };

  const cambiarEstado = async (id: string, estado: Estado, cierre: string): Promise<Correccion> => {
    const actualizada = await repo.cambiarEstado(id, estado, cierre);
    reemplazar(actualizada);
    return actualizada;
  };

  return { items, conexion, errorCarga, ultimaLectura, actualizando, refrescar, crear, cambiarEstado };
}
