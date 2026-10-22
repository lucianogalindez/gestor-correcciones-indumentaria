import { useEffect, useRef, useState } from 'react';
import { ESTADOS, type Correccion, type Estado } from '../types';
import { mostrarFecha, hoyLocal, fechaLocalDeIso } from '../lib/fechas';
import { esVencida } from '../lib/indicadores';
import { esEnlaceValido } from '../lib/validacion';
import { mensajeDeError } from '../repositories/repository';
import { InsigniaEstado } from './InsigniaEstado';

interface Props {
  correccion: Correccion;
  hoy: string;
  onCerrar: () => void;
  onCambiarEstado: (id: string, estado: Estado, cierre: string) => Promise<Correccion>;
}

export function DetalleDialog({ correccion: c, hoy, onCerrar, onCambiarEstado }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const bloqueo = useRef(false);
  const [guardando, setGuardando] = useState<Estado | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const d = dialogo.current;
    if (d && !d.open) d.showModal();
  }, []);

  async function cambiar(estado: Estado) {
    if (bloqueo.current || estado === c.estado) return;
    bloqueo.current = true;
    setGuardando(estado);
    setError('');
    try {
      // La fecha de cierre la calcula el cliente en fecha local; al reabrir se vacía.
      await onCambiarEstado(c.id, estado, estado === 'Cerrada' ? hoyLocal() : '');
    } catch (e) {
      setError(`No se pudo cambiar el estado. ${mensajeDeError(e)}`);
    } finally {
      bloqueo.current = false;
      setGuardando(null);
    }
  }

  const fila = (titulo: string, valor: React.ReactNode) => (
    <div className="detalle__fila">
      <dt>{titulo}</dt>
      <dd>{valor || '—'}</dd>
    </div>
  );

  return (
    <dialog
      ref={dialogo}
      className="dialogo"
      aria-labelledby="dialogo-titulo"
      onClose={onCerrar}
      onClick={(e) => {
        if (e.target === dialogo.current) dialogo.current?.close();
      }}
    >
      <div className="dialogo__cabecera">
        <h2 id="dialogo-titulo">
          {c.id} · {c.codigo}
        </h2>
        <button type="button" className="boton boton--chico" onClick={() => dialogo.current?.close()}>
          Cerrar
        </button>
      </div>

      <dl className="detalle">
        {fila('Estado', <InsigniaEstado estado={c.estado} />)}
        {fila('Versión de muestra', c.version)}
        {fila('Talle', c.talle)}
        {fila('Color', c.color)}
        {fila('Proveedor / taller', c.proveedor)}
        {fila('Tipo de corrección', c.tipo)}
        {fila('Detalle', <span className="detalle__texto">{c.detalle}</span>)}
        {fila(
          'Enlace de referencia',
          c.enlace && esEnlaceValido(c.enlace) ? (
            <a href={c.enlace} target="_blank" rel="noopener noreferrer">
              {c.enlace}
            </a>
          ) : (
            c.enlace
          ),
        )}
        {fila('Responsable', c.responsable)}
        {fila(
          'Fecha requerida',
          <>
            {mostrarFecha(c.fecha)}
            {esVencida(c, hoy) && <span className="chip chip--vencida">Vencida</span>}
          </>,
        )}
        {fila('Fecha de creación', c.creada ? mostrarFecha(fechaLocalDeIso(c.creada)) : '')}
        {fila('Fecha de cierre', c.cierre ? mostrarFecha(c.cierre) : '')}
      </dl>

      <fieldset className="estados" disabled={guardando !== null}>
        <legend>Cambiar estado</legend>
        <div className="estados__botones">
          {ESTADOS.map((s) => (
            <button
              key={s}
              type="button"
              className={`boton ${s === c.estado ? 'boton--activo' : ''}`}
              aria-pressed={s === c.estado}
              onClick={() => void cambiar(s)}
            >
              {guardando === s ? 'Guardando…' : s}
            </button>
          ))}
        </div>
      </fieldset>
      {error && (
        <p className="aviso aviso--error" role="alert">
          {error}
        </p>
      )}
    </dialog>
  );
}
