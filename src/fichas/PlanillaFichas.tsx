import { useMemo, useState } from 'react';
import { EstadoConexion } from '../components/EstadoConexion';
import type { Conexion, ErrorCarga } from '../hooks/useCorrecciones';
import { descargarCsv } from '../lib/csv';
import { hoyLocal, mostrarFecha, fechaLocalDeIso } from '../lib/fechas';
import { mensajeDeError } from '../repositories/repository';
import { generarCsvFichas, nombreArchivoCsvFichas } from './csv';
import {
  FILTROS_FICHAS_VACIOS, filtrarFichas, indicadoresFichas, proveedoresDe, type FiltrosFichas,
} from './logica';
import { ESTADOS_FICHA, type EstadoFicha, type Ficha } from './tipos';

interface Props {
  fichas: Ficha[];
  remoto: boolean;
  conexion: Conexion;
  errorCarga: ErrorCarga | null;
  ultimaLectura: Date | null;
  actualizando: boolean;
  onActualizar: () => void;
  onCambiarEstado: (idCarga: string, estado: EstadoFicha) => Promise<void>;
}

export function PlanillaFichas(p: Props) {
  const [filtros, setFiltros] = useState<FiltrosFichas>(FILTROS_FICHAS_VACIOS);
  const [guardando, setGuardando] = useState<Set<string>>(new Set());
  const [errorEstado, setErrorEstado] = useState('');

  const ind = useMemo(() => indicadoresFichas(p.fichas), [p.fichas]);
  const visibles = useMemo(() => filtrarFichas(p.fichas, filtros), [p.fichas, filtros]);
  const proveedores = useMemo(() => proveedoresDe(p.fichas), [p.fichas]);
  const hayFiltros = JSON.stringify(filtros) !== JSON.stringify(FILTROS_FICHAS_VACIOS);
  const set = <K extends keyof FiltrosFichas>(k: K, v: FiltrosFichas[K]) => setFiltros((f) => ({ ...f, [k]: v }));

  async function cambiar(idCarga: string, estado: EstadoFicha) {
    if (guardando.has(idCarga)) return;
    setErrorEstado('');
    setGuardando((s) => new Set(s).add(idCarga));
    try {
      await p.onCambiarEstado(idCarga, estado);
    } catch (e) {
      setErrorEstado(`No se pudo cambiar el estado de ${idCarga}; se volvió al estado anterior. ${mensajeDeError(e)}`);
    } finally {
      setGuardando((s) => {
        const n = new Set(s);
        n.delete(idCarga);
        return n;
      });
    }
  }

  return (
    <section aria-labelledby="titulo-planilla">
      <div className="titulo-fila">
        <h2 id="titulo-planilla">Planilla de fichas</h2>
        <EstadoConexion
          remoto={p.remoto}
          conexion={p.conexion}
          errorCarga={p.errorCarga}
          ultimaLectura={p.ultimaLectura}
          actualizando={p.actualizando}
          onActualizar={p.onActualizar}
          textoDemo="Modo demo: las fichas se guardan solo en memoria (se pierden al recargar)"
        />
      </div>
      {p.conexion === 'error' && (
        <button type="button" className="boton boton--chico" onClick={p.onActualizar} disabled={p.actualizando}>
          Reintentar
        </button>
      )}

      <dl className="indicadores" aria-label="Indicadores de fichas">
        <div className="indicador"><dt>Fichas</dt><dd>{ind.fichas}</dd></div>
        <div className="indicador"><dt>Prendas totales</dt><dd>{ind.prendas.toLocaleString('es-AR')}</dd></div>
        <div className="indicador"><dt>Sin terminar</dt><dd>{ind.sinTerminar}</dd></div>
      </dl>
      <p className="ayuda ayuda--chica">Sin terminar = Pendiente + En producción.</p>

      <form className="filtros" role="search" aria-label="Filtros de fichas" onSubmit={(e) => e.preventDefault()}>
        <div className="campo">
          <label htmlFor="ff-texto">Buscar</label>
          <input id="ff-texto" type="search" value={filtros.texto} onChange={(e) => set('texto', e.target.value)} placeholder="Artículo, modelo, OC, proveedor…" />
        </div>
        <div className="campo">
          <label htmlFor="ff-estado">Estado</label>
          <select id="ff-estado" value={filtros.estado} onChange={(e) => set('estado', e.target.value as FiltrosFichas['estado'])}>
            <option value="">Todos</option>
            {ESTADOS_FICHA.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="ff-prov">Proveedor</label>
          <select id="ff-prov" value={filtros.proveedor} onChange={(e) => set('proveedor', e.target.value)}>
            <option value="">Todos</option>
            {proveedores.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <div className="acciones">
          {hayFiltros && (
            <button type="button" className="boton" onClick={() => setFiltros(FILTROS_FICHAS_VACIOS)}>Limpiar filtros</button>
          )}
          <button
            type="button"
            className="boton"
            disabled={visibles.length === 0}
            onClick={() => descargarCsv(generarCsvFichas(visibles), nombreArchivoCsvFichas(hoyLocal()))}
          >
            Exportar CSV ({visibles.length})
          </button>
        </div>
      </form>

      {errorEstado && <div className="aviso aviso--error" role="alert">{errorEstado}</div>}

      <p className="ayuda ayuda--chica" aria-live="polite">Mostrando {visibles.length} de {p.fichas.length} fichas.</p>

      {p.conexion === 'cargando' && p.fichas.length === 0 ? (
        <p className="vacio">Cargando la planilla…</p>
      ) : p.fichas.length === 0 ? (
        <p className="vacio">
          {p.conexion === 'error' ? 'No se pudo cargar la planilla.' : 'Todavía no hay fichas cargadas. Subí la primera desde “Cargar ficha”.'}
        </p>
      ) : visibles.length === 0 ? (
        <p className="vacio">Ninguna ficha coincide con los filtros.</p>
      ) : (
        <ul className="fichas">
          {visibles.map((f) => (
            <li key={f.idCarga} className="ficha">
              <div className="ficha__cabecera">
                <div>
                  <h3 className="ficha__titulo">
                    {f.articulo} · {f.modelo}
                  </h3>
                  <p className="tenue">
                    {f.idCarga} · cargada el {mostrarFecha(fechaLocalDeIso(f.cargado))}
                  </p>
                </div>
                <div className="campo ficha__estado">
                  <label htmlFor={`estado-${f.idCarga}`}>Estado de {f.idCarga}</label>
                  <select
                    id={`estado-${f.idCarga}`}
                    value={f.estado}
                    disabled={guardando.has(f.idCarga)}
                    onChange={(e) => void cambiar(f.idCarga, e.target.value as EstadoFicha)}
                  >
                    {ESTADOS_FICHA.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <dl className="ficha__datos">
                <div><dt>Proveedor</dt><dd>{f.proveedor || '—'}</dd></div>
                <div><dt>Tela</dt><dd>{f.tela || '—'}</dd></div>
                <div><dt>Temporada</dt><dd>{[f.temporada, f.linea].filter(Boolean).join(' · ') || '—'}</dd></div>
                <div><dt>Orden de compra</dt><dd>{f.ordenCompra || '—'}</dd></div>
                <div><dt>Total</dt><dd>{f.cantidadTotal.toLocaleString('es-AR')}</dd></div>
                <div><dt>Fecha de la ficha</dt><dd>{mostrarFecha(f.fechaFicha)}</dd></div>
              </dl>
              <details className="ficha__colores">
                <summary>
                  {f.colores.length} {f.colores.length === 1 ? 'color' : 'colores'}
                </summary>
                <table className="tabla tabla--chica">
                  <thead>
                    <tr><th scope="col">Código</th><th scope="col">Color</th><th scope="col">Cantidad</th></tr>
                  </thead>
                  <tbody>
                    {f.colores.map((c, i) => (
                      <tr key={`${c.codigo}-${i}`}>
                        <td data-label="Código">{c.codigo}</td>
                        <td data-label="Color">{c.color}</td>
                        <td data-label="Cantidad">{c.cantidad.toLocaleString('es-AR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
