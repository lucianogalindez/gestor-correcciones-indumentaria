import { useMemo, useState } from 'react';
import { ESTADOS, type Correccion, type Estado } from '../types';
import type { Conexion, ErrorCarga } from '../hooks/useCorrecciones';
import { descargarCsv, generarCsv, nombreArchivoCsv } from '../lib/csv';
import { mostrarFecha } from '../lib/fechas';
import { FILTROS_VACIOS, filtrar, ordenarPorFecha, valoresUnicos, type Filtros } from '../lib/filtros';
import { calcularIndicadores, esVencida } from '../lib/indicadores';
import { DetalleDialog } from './DetalleDialog';
import { EstadoConexion } from './EstadoConexion';
import { InsigniaEstado } from './InsigniaEstado';

interface Props {
  items: Correccion[];
  hoy: string;
  remoto: boolean;
  conexion: Conexion;
  errorCarga: ErrorCarga | null;
  ultimaLectura: Date | null;
  actualizando: boolean;
  onActualizar: () => void;
  onCambiarEstado: (id: string, estado: Estado, cierre: string) => Promise<Correccion>;
}

export function Seguimiento(p: Props) {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);
  const [abierta, setAbierta] = useState<string | null>(null);

  const ind = useMemo(() => calcularIndicadores(p.items, p.hoy), [p.items, p.hoy]);
  const visibles = useMemo(() => ordenarPorFecha(filtrar(p.items, filtros, p.hoy)), [p.items, filtros, p.hoy]);
  const tipos = useMemo(() => valoresUnicos(p.items, 'tipo'), [p.items]);
  const responsables = useMemo(() => valoresUnicos(p.items, 'responsable'), [p.items]);
  const seleccionada = p.items.find((c) => c.id === abierta) ?? null;
  const hayFiltros = JSON.stringify(filtros) !== JSON.stringify(FILTROS_VACIOS);

  const set = <K extends keyof Filtros>(k: K, v: Filtros[K]) => setFiltros((f) => ({ ...f, [k]: v }));

  return (
    <section aria-labelledby="titulo-seguimiento">
      <div className="titulo-fila">
        <h2 id="titulo-seguimiento">Seguimiento</h2>
        <EstadoConexion
          remoto={p.remoto}
          conexion={p.conexion}
          errorCarga={p.errorCarga}
          ultimaLectura={p.ultimaLectura}
          actualizando={p.actualizando}
          onActualizar={p.onActualizar}
        />
      </div>

      <dl className="indicadores" aria-label="Indicadores sobre el total de solicitudes">
        <div className="indicador">
          <dt>Abiertas</dt>
          <dd>{ind.abiertas}</dd>
        </div>
        <div className="indicador">
          <dt>Abiertas vencidas</dt>
          <dd className={ind.vencidas > 0 ? 'alerta' : undefined}>{ind.vencidas}</dd>
        </div>
        <div className="indicador">
          <dt>% vencidas</dt>
          <dd className={ind.vencidas > 0 ? 'alerta' : undefined}>{ind.porcentajeVencidas} %</dd>
        </div>
      </dl>
      <p className="ayuda ayuda--chica">
        Total de solicitudes: {ind.total}. El porcentaje es sobre las abiertas.
      </p>

      <form className="filtros" role="search" aria-label="Filtros" onSubmit={(e) => e.preventDefault()}>
        <div className="campo">
          <label htmlFor="f-texto">Buscar</label>
          <input id="f-texto" type="search" value={filtros.texto} onChange={(e) => set('texto', e.target.value)} placeholder="ID, artículo, proveedor…" />
        </div>
        <div className="campo">
          <label htmlFor="f-estado">Estado</label>
          <select id="f-estado" value={filtros.estado} onChange={(e) => set('estado', e.target.value as Filtros['estado'])}>
            <option value="">Todos</option>
            <option value="abiertas">Solo abiertas</option>
            {ESTADOS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="f-tipo">Tipo</label>
          <select id="f-tipo" value={filtros.tipo} onChange={(e) => set('tipo', e.target.value)}>
            <option value="">Todos</option>
            {tipos.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="f-resp">Responsable</label>
          <select id="f-resp" value={filtros.responsable} onChange={(e) => set('responsable', e.target.value)}>
            <option value="">Todos</option>
            {responsables.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <label className="casilla" htmlFor="f-venc">
          <input id="f-venc" type="checkbox" checked={filtros.soloVencidas} onChange={(e) => set('soloVencidas', e.target.checked)} />
          Solo vencidas
        </label>
        <div className="acciones">
          {hayFiltros && (
            <button type="button" className="boton" onClick={() => setFiltros(FILTROS_VACIOS)}>
              Limpiar filtros
            </button>
          )}
          <button
            type="button"
            className="boton"
            disabled={visibles.length === 0}
            onClick={() => descargarCsv(generarCsv(visibles), nombreArchivoCsv(p.hoy))}
          >
            Exportar CSV ({visibles.length})
          </button>
        </div>
      </form>

      <p className="ayuda ayuda--chica" aria-live="polite">
        Mostrando {visibles.length} de {p.items.length}, ordenadas por fecha requerida (primero las más urgentes).
      </p>

      {p.items.length === 0 && p.conexion === 'ok' ? (
        <p className="vacio">Todavía no hay solicitudes. Registrá la primera desde “Nueva corrección”.</p>
      ) : visibles.length === 0 && p.conexion !== 'cargando' ? (
        <p className="vacio">Ninguna solicitud coincide con los filtros.</p>
      ) : (
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Artículo</th>
                <th scope="col">Tipo</th>
                <th scope="col">Proveedor</th>
                <th scope="col">Responsable</th>
                <th scope="col">Fecha requerida</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((c) => {
                const vencida = esVencida(c, p.hoy);
                return (
                  <tr key={c.id} className={vencida ? 'vencida' : undefined}>
                    <td data-label="ID">
                      <button type="button" className="enlace" onClick={() => setAbierta(c.id)} aria-haspopup="dialog">
                        {c.id}
                      </button>
                    </td>
                    <td data-label="Artículo">
                      {c.codigo} <span className="tenue">· {c.version} · {c.talle} · {c.color}</span>
                    </td>
                    <td data-label="Tipo">{c.tipo}</td>
                    <td data-label="Proveedor">{c.proveedor}</td>
                    <td data-label="Responsable">{c.responsable}</td>
                    <td data-label="Fecha requerida">
                      {mostrarFecha(c.fecha)}
                      {vencida && <span className="chip chip--vencida">Vencida</span>}
                      {c.fecha === p.hoy && c.estado !== 'Cerrada' && <span className="chip">Hoy</span>}
                    </td>
                    <td data-label="Estado">
                      <InsigniaEstado estado={c.estado} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {seleccionada && (
        <DetalleDialog
          correccion={seleccionada}
          hoy={p.hoy}
          onCerrar={() => setAbierta(null)}
          onCambiarEstado={p.onCambiarEstado}
        />
      )}
    </section>
  );
}
