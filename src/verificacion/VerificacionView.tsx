import { Fragment, useMemo, useState, type DragEvent } from 'react';
import { useVerificacion } from '../hooks/useVerificacion';
import { descargarCsv } from '../lib/csv';
import { hoyLocal } from '../lib/fechas';
import { MAX_MB, validarArchivo } from '../fichas/logica';
import { crearRepositorioVerificacion } from '../repositories';
import { DetalleVerificacion } from './DetalleVerificacion';
import {
  FILTROS_VERIFICACION_VACIOS, TEXTO_ESTADO, contar, estadoVisible, filasDeDiferencias, filtrarVerificaciones,
  generarCsvInforme, nombreArchivoInforme, ordenarVerificaciones, type FiltrosVerificacion,
} from './logica';
import { MENSAJE_ERROR_FILA } from './repositorio';
import type { EstadoVisible, ItemCola } from './tipos';

const CLASE_ESTADO: Record<EstadoVisible, string> = {
  OK: 'estado--cerrada',
  CON_DIFERENCIAS: 'estado--correccion',
  SIN_REFERENCIA: 'estado--pendiente',
  ERROR: 'estado--error',
  PROCESANDO: 'estado--revisar',
  EN_COLA: 'estado--pendiente',
  CANCELADO: 'estado--pendiente',
};

function Insignia({ item }: { item: ItemCola }) {
  const e = estadoVisible(item);
  const n = item.verificacion?.diferencias ?? 0;
  return (
    <span className={`estado ${CLASE_ESTADO[e]}`}>
      {TEXTO_ESTADO[e]}
      {e === 'CON_DIFERENCIAS' && ` (${n})`}
    </span>
  );
}

export function VerificacionView() {
  const repo = useMemo(() => crearRepositorioVerificacion(), []);
  const cola = useVerificacion(repo);
  const [filtros, setFiltros] = useState<FiltrosVerificacion>(FILTROS_VERIFICACION_VACIOS);
  const [abiertas, setAbiertas] = useState<Set<number>>(new Set());
  const [avisos, setAvisos] = useState<string[]>([]);
  const [arrastrando, setArrastrando] = useState(false);

  const items = cola.items;
  const cont = useMemo(() => contar(items), [items]);
  const visibles = useMemo(() => ordenarVerificaciones(filtrarVerificaciones(items, filtros)), [items, filtros]);
  const enCurso = items.filter((i) => i.estado === 'pendiente' || i.estado === 'procesando').length;
  const cancelados = items.filter((i) => i.estado === 'cancelado').length;
  const hayDiferencias = useMemo(() => filasDeDiferencias(items).length > 0, [items]);
  const hayFiltros = JSON.stringify(filtros) !== JSON.stringify(FILTROS_VERIFICACION_VACIOS);

  function recibir(lista: FileList | null) {
    if (!lista || lista.length === 0) return;
    const validos: File[] = [];
    const mensajes: string[] = [];
    for (const f of Array.from(lista)) {
      const problema = validarArchivo(f);
      if (problema) mensajes.push(`${f.name}: ${problema}`);
      else validos.push(f);
    }
    const { repetidos } = cola.agregar(validos);
    if (repetidos > 0) mensajes.push(`${repetidos} ${repetidos === 1 ? 'archivo ya estaba' : 'archivos ya estaban'} en la lista y se ignoró.`);
    setAvisos(mensajes);
  }

  function alSoltar(ev: DragEvent) {
    ev.preventDefault();
    setArrastrando(false);
    recibir(ev.dataTransfer.files);
  }

  const alternar = (id: number) =>
    setAbiertas((s) => {
      const n = new Set(s);
      if (!n.delete(id)) n.add(id);
      return n;
    });

  return (
    <section aria-labelledby="titulo-verificacion">
      <h2 id="titulo-verificacion">Verificación de fichas</h2>
      <p className="ayuda">
        Subí varias fichas PDF (con texto, hasta {MAX_MB} MB cada una). Se comparan una por una contra la hoja de referencia.
      </p>

      <div className="formulario formulario--una">
        <div className="campo">
          <label
            className={`zona${arrastrando ? ' zona--activa' : ''}`}
            htmlFor="verif-archivos"
            onDragOver={(e) => {
              e.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={alSoltar}
          >
            <span className="zona__titulo">Arrastrá las fichas PDF acá o elegilas</span>
            <span className="tenue">Podés seleccionar varias a la vez</span>
          </label>
          <input
            id="verif-archivos"
            className="zona__input"
            type="file"
            multiple
            accept=".pdf,application/pdf"
            onChange={(e) => {
              recibir(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {avisos.length > 0 && (
        <div className="aviso aviso--error" role="alert">
          <ul className="lista-avisos">
            {avisos.map((m) => <li key={m}>{m}</li>)}
          </ul>
        </div>
      )}

      {items.length > 0 && (
        <>
          <div className="verif-progreso" aria-live="polite">
            <p>
              <strong>{cont.procesadas} de {items.length}</strong> procesadas
              {enCurso > 0 && ' · procesando de a una…'}
              {cancelados > 0 && ` · ${cancelados} ${cancelados === 1 ? 'cancelada' : 'canceladas'}`}
            </p>
            <progress max={items.length} value={cont.procesadas} aria-label="Avance de la verificación" />
          </div>

          <div className="acciones verif-acciones">
            {enCurso > 0 && (
              <button type="button" className="boton" onClick={cola.cancelar}>Cancelar el resto</button>
            )}
            {cont.conError > 0 && (
              <button type="button" className="boton" onClick={() => cola.reintentar()}>
                Reintentar fallidas ({cont.conError})
              </button>
            )}
            <button
              type="button"
              className="boton"
              disabled={!hayDiferencias}
              onClick={() => descargarCsv(generarCsvInforme(items), nombreArchivoInforme(hoyLocal()))}
            >
              Exportar informe CSV
            </button>
            <button type="button" className="boton" disabled={items.length === enCurso} onClick={cola.limpiar}>
              Limpiar lista
            </button>
          </div>

          <dl className="indicadores indicadores--cinco" aria-label="Indicadores de verificación">
            <div className="indicador"><dt>Procesadas</dt><dd>{cont.procesadas}</dd></div>
            <div className="indicador"><dt>OK</dt><dd>{cont.ok}</dd></div>
            <div className="indicador"><dt>Con diferencias</dt><dd className={cont.conDiferencias > 0 ? 'alerta' : undefined}>{cont.conDiferencias}</dd></div>
            <div className="indicador"><dt>Sin referencia</dt><dd>{cont.sinReferencia}</dd></div>
            <div className="indicador"><dt>Con error</dt><dd className={cont.conError > 0 ? 'alerta' : undefined}>{cont.conError}</dd></div>
          </dl>

          <form className="filtros" role="search" aria-label="Filtros de verificación" onSubmit={(e) => e.preventDefault()}>
            <div className="campo">
              <label htmlFor="fv-texto">Buscar</label>
              <input id="fv-texto" type="search" value={filtros.texto} placeholder="Archivo, modelo o artículo…" onChange={(e) => setFiltros((f) => ({ ...f, texto: e.target.value }))} />
            </div>
            <div className="campo">
              <label htmlFor="fv-estado">Estado</label>
              <select id="fv-estado" value={filtros.estado} onChange={(e) => setFiltros((f) => ({ ...f, estado: e.target.value as FiltrosVerificacion['estado'] }))}>
                <option value="">Todos</option>
                <option value="CON_DIFERENCIAS">Con diferencias</option>
                <option value="OK">OK</option>
                <option value="SIN_REFERENCIA">Sin referencia</option>
                <option value="ERROR">Error</option>
                <option value="EN_COLA">En cola</option>
              </select>
            </div>
            {hayFiltros && (
              <div className="acciones">
                <button type="button" className="boton" onClick={() => setFiltros(FILTROS_VERIFICACION_VACIOS)}>Limpiar filtros</button>
              </div>
            )}
          </form>

          <p className="ayuda ayuda--chica" aria-live="polite">Mostrando {visibles.length} de {items.length}. Primero las que tienen diferencias.</p>

          {visibles.length === 0 ? (
            <p className="vacio">Ninguna ficha coincide con los filtros.</p>
          ) : (
            <div className="tabla-contenedor">
              <table className="tabla tabla--verif">
                <thead>
                  <tr>
                    <th scope="col">Archivo</th>
                    <th scope="col">Ficha</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Resumen</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((i) => {
                    const v = i.verificacion;
                    const e = estadoVisible(i);
                    const abierta = abiertas.has(i.id) && v !== undefined;
                    return (
                      <Fragment key={i.id}>
                        <tr className={e === 'CON_DIFERENCIAS' ? 'fila-dif' : e === 'ERROR' ? 'fila-error' : undefined}>
                          <td data-label="Archivo">
                            {v ? (
                              <button
                                type="button"
                                className="enlace"
                                aria-expanded={abierta}
                                aria-controls={`verif-det-${i.id}`}
                                onClick={() => alternar(i.id)}
                              >
                                {abierta ? '▼' : '▶'} {i.archivo}
                              </button>
                            ) : (
                              i.archivo
                            )}
                          </td>
                          <td data-label="Ficha">{v ? [v.ficha.modelo, v.ficha.articulo].filter(Boolean).join(' · ') || '—' : '—'}</td>
                          <td data-label="Estado"><Insignia item={i} /></td>
                          <td data-label="Resumen">
                            {e === 'ERROR' ? (
                              <>
                                {MENSAJE_ERROR_FILA}{' '}
                                <button type="button" className="enlace" onClick={() => cola.reintentar(i.id)}>Reintentar</button>
                              </>
                            ) : e === 'CANCELADO' ? (
                              <button type="button" className="enlace" onClick={() => cola.reintentar(i.id)}>Procesar</button>
                            ) : (
                              v?.resumen ?? '—'
                            )}
                          </td>
                        </tr>
                        {abierta && v && (
                          <tr className="fila-detalle">
                            <td colSpan={4} id={`verif-det-${i.id}`}>
                              <DetalleVerificacion v={v} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
