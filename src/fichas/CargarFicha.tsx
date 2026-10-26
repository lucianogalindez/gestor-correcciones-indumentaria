import { useEffect, useRef, useState, type DragEvent } from 'react';
import { RepoError } from '../repositories/repository';
import { MAX_MB, validarArchivo } from './logica';
import { MENSAJE_ERROR_SUBIDA } from './repositorio';
import type { ResultadoSubida } from './tipos';

interface Props {
  onSubir: (archivo: File, signal: AbortSignal) => Promise<ResultadoSubida>;
  onVerPlanilla: () => void;
}

const tamano = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export function CargarFicha({ onSubir, onVerPlanilla }: Props) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errorArchivo, setErrorArchivo] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [errorSubida, setErrorSubida] = useState('');
  const [resultado, setResultado] = useState<ResultadoSubida | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const bloqueo = useRef(false);
  const control = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmacion = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resultado) confirmacion.current?.focus();
  }, [resultado]);
  useEffect(() => {
    if (errorSubida) errorRef.current?.focus();
  }, [errorSubida]);

  function elegir(f: File | undefined) {
    setErrorSubida('');
    if (!f) return;
    const problema = validarArchivo(f);
    setErrorArchivo(problema ?? '');
    setArchivo(problema ? null : f);
    if (problema && inputRef.current) inputRef.current.value = '';
  }

  function alSoltar(ev: DragEvent) {
    ev.preventDefault();
    setArrastrando(false);
    if (!subiendo) elegir(ev.dataTransfer.files[0]);
  }

  async function subir() {
    if (!archivo || bloqueo.current) return;
    bloqueo.current = true;
    const c = new AbortController();
    control.current = c;
    setSubiendo(true);
    setErrorSubida('');
    setResultado(null);
    try {
      setResultado(await onSubir(archivo, c.signal));
      setArchivo(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (e) {
      if (!(e instanceof RepoError && e.tipo === 'cancelado')) setErrorSubida(MENSAJE_ERROR_SUBIDA);
    } finally {
      bloqueo.current = false;
      control.current = null;
      setSubiendo(false);
    }
  }

  function otra() {
    setResultado(null);
    setArchivo(null);
    setErrorArchivo('');
    inputRef.current?.focus();
  }

  const f = resultado?.ficha;

  return (
    <section aria-labelledby="titulo-cargar">
      <h2 id="titulo-cargar">Cargar ficha técnica</h2>
      <p className="ayuda">Subí el PDF de la ficha (con texto, no escaneado, hasta {MAX_MB} MB). Se lee y se guarda en la planilla.</p>

      {resultado && f && (
        <div className="aviso aviso--ok ficha-ok" role="status" tabIndex={-1} ref={confirmacion}>
          <p>
            Ficha guardada con el ID de carga <strong>{resultado.idCarga}</strong> ({resultado.filas}{' '}
            {resultado.filas === 1 ? 'color' : 'colores'}).
          </p>
          <dl className="ficha-datos">
            <div><dt>Artículo</dt><dd>{f.articulo}</dd></div>
            <div><dt>Modelo</dt><dd>{f.modelo}</dd></div>
            <div><dt>Proveedor</dt><dd>{f.proveedor}</dd></div>
            <div><dt>Tela</dt><dd>{f.tela}</dd></div>
            <div><dt>Total</dt><dd>{f.cantidadTotal} prendas</dd></div>
          </dl>
          <ul className="ficha-colores">
            {f.colores.map((c) => (
              <li key={`${c.codigo}-${c.color}`}>
                {c.codigo} · {c.color}: <strong>{c.cantidad}</strong>
              </li>
            ))}
          </ul>
          <div className="acciones">
            <button type="button" className="boton boton--primario" onClick={onVerPlanilla}>Ver en la planilla</button>
            <button type="button" className="boton" onClick={otra}>Cargar otra</button>
          </div>
        </div>
      )}

      {errorSubida && (
        <div className="aviso aviso--error" role="alert" tabIndex={-1} ref={errorRef}>
          {errorSubida}
        </div>
      )}

      {!resultado && (
        <div className="formulario formulario--una">
          <div className="campo">
            <label
              className={`zona${arrastrando ? ' zona--activa' : ''}${subiendo ? ' zona--bloqueada' : ''}`}
              htmlFor="ficha-archivo"
              onDragOver={(e) => {
                e.preventDefault();
                setArrastrando(true);
              }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={alSoltar}
            >
              <span className="zona__titulo">{archivo ? archivo.name : 'Arrastrá el PDF acá o elegilo'}</span>
              <span className="tenue">{archivo ? tamano(archivo.size) : `Solo PDF, hasta ${MAX_MB} MB`}</span>
            </label>
            <input
              id="ficha-archivo"
              ref={inputRef}
              className="zona__input"
              type="file"
              accept=".pdf,application/pdf"
              disabled={subiendo}
              aria-invalid={errorArchivo ? true : undefined}
              aria-describedby={errorArchivo ? 'error-archivo' : undefined}
              onChange={(e) => elegir(e.target.files?.[0])}
            />
            {errorArchivo && (
              <p className="error" id="error-archivo">
                {errorArchivo}
              </p>
            )}
          </div>

          <div className="acciones">
            <button type="button" className="boton boton--primario" disabled={!archivo || subiendo} onClick={() => void subir()}>
              {subiendo ? 'Leyendo y guardando la ficha…' : 'Subir ficha'}
            </button>
            {subiendo && (
              <button type="button" className="boton" onClick={() => control.current?.abort()}>
                Cancelar
              </button>
            )}
          </div>
          {subiendo && (
            <p className="ayuda ayuda--chica" role="status">
              Puede tardar entre 10 y 60 segundos. No cierres esta pestaña.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
