import { useEffect, useRef, useState, type FormEvent } from 'react';
import { TIPOS, type Correccion, type NuevaCorreccion } from '../types';
import { mensajeDeError } from '../repositories/repository';
import { MAX_CORTO, MAX_DETALLE, primerCampoConError, validar, type CampoForm, type Errores } from '../lib/validacion';

const VACIO: NuevaCorreccion = {
  codigo: '', version: '', talle: '', color: '', proveedor: '', tipo: '',
  detalle: '', enlace: '', responsable: '', fecha: '',
};

interface Props {
  onCrear: (datos: NuevaCorreccion) => Promise<Correccion>;
  onIrASeguimiento: () => void;
}

export function NuevaCorreccionForm({ onCrear, onIrASeguimiento }: Props) {
  const [datos, setDatos] = useState<NuevaCorreccion>(VACIO);
  const [errores, setErrores] = useState<Errores>({});
  const [errorEnvio, setErrorEnvio] = useState('');
  const [creada, setCreada] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // El estado de React se actualiza de forma asíncrona: este ref bloquea el segundo clic inmediato.
  const bloqueo = useRef(false);
  const aviso = useRef<HTMLDivElement>(null);
  const errorEnvioRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (creada) aviso.current?.focus();
  }, [creada]);
  useEffect(() => {
    if (errorEnvio) errorEnvioRef.current?.focus();
  }, [errorEnvio]);

  const cambiar = (campo: CampoForm, valor: string) => {
    setDatos((d) => ({ ...d, [campo]: valor }));
    if (errores[campo]) setErrores((e) => ({ ...e, [campo]: undefined }));
  };

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    if (bloqueo.current) return;

    const nuevos = validar(datos);
    setErrores(nuevos);
    setCreada(null);
    setErrorEnvio('');
    const primero = primerCampoConError(nuevos);
    if (primero) {
      document.getElementById(`campo-${primero}`)?.focus();
      return;
    }

    bloqueo.current = true;
    setEnviando(true);
    try {
      const guardada = await onCrear(datos);
      setDatos(VACIO);
      setCreada(guardada.id);
    } catch (e) {
      // Se conserva todo lo ingresado para poder reintentar.
      setErrorEnvio(`No se pudo guardar la solicitud. ${mensajeDeError(e)}`);
    } finally {
      bloqueo.current = false;
      setEnviando(false);
    }
  }

  const props = (campo: CampoForm) => ({
    id: `campo-${campo}`,
    name: campo,
    value: datos[campo],
    onChange: (ev: { target: { value: string } }) => cambiar(campo, ev.target.value),
    'aria-invalid': errores[campo] ? (true as const) : undefined,
    'aria-describedby': errores[campo] ? `error-${campo}` : undefined,
  });
  const error = (campo: CampoForm) =>
    errores[campo] ? (
      <p className="error" id={`error-${campo}`}>
        {errores[campo]}
      </p>
    ) : null;

  return (
    <section aria-labelledby="titulo-nueva">
      <h2 id="titulo-nueva">Nueva corrección</h2>
      <p className="ayuda">Registrá lo que hay que corregir en una muestra. Los campos con * son obligatorios.</p>

      {creada && (
        <div className="aviso aviso--ok" role="status" tabIndex={-1} ref={aviso}>
          <p>
            Solicitud registrada con el ID <strong>{creada}</strong>.
          </p>
          <button type="button" className="enlace" onClick={onIrASeguimiento}>
            Ver en Seguimiento
          </button>
        </div>
      )}
      {errorEnvio && (
        <div className="aviso aviso--error" role="alert" tabIndex={-1} ref={errorEnvioRef}>
          {errorEnvio}
        </div>
      )}

      <form noValidate onSubmit={enviar} className="formulario" aria-busy={enviando}>
        <div className="campo">
          <label htmlFor="campo-codigo">Artículo *</label>
          <input type="text" maxLength={MAX_CORTO} autoComplete="off" placeholder="Ej.: CAM-1042" {...props('codigo')} />
          {error('codigo')}
        </div>
        <div className="campo">
          <label htmlFor="campo-version">Versión de muestra *</label>
          <input type="text" maxLength={MAX_CORTO} autoComplete="off" placeholder="Ej.: Proto 2" {...props('version')} />
          {error('version')}
        </div>
        <div className="campo">
          <label htmlFor="campo-talle">Talle *</label>
          <input type="text" maxLength={MAX_CORTO} autoComplete="off" placeholder="Ej.: M" {...props('talle')} />
          {error('talle')}
        </div>
        <div className="campo">
          <label htmlFor="campo-color">Color *</label>
          <input type="text" maxLength={MAX_CORTO} autoComplete="off" {...props('color')} />
          {error('color')}
        </div>
        <div className="campo">
          <label htmlFor="campo-proveedor">Proveedor / taller *</label>
          <input type="text" maxLength={MAX_CORTO} autoComplete="off" {...props('proveedor')} />
          {error('proveedor')}
        </div>
        <div className="campo">
          <label htmlFor="campo-tipo">Tipo de corrección *</label>
          <select {...props('tipo')}>
            <option value="">Elegí una opción</option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {error('tipo')}
        </div>
        <div className="campo campo--ancho">
          <label htmlFor="campo-detalle">Detalle de la corrección *</label>
          <textarea rows={4} maxLength={MAX_DETALLE} {...props('detalle')} />
          {error('detalle')}
        </div>
        <div className="campo campo--ancho">
          <label htmlFor="campo-enlace">Enlace de referencia (opcional)</label>
          <input
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://…"
            {...props('enlace')}
            aria-describedby={[errores.enlace ? 'error-enlace' : '', 'ayuda-enlace'].filter(Boolean).join(' ')}
          />
          <p className="ayuda ayuda--chica" id="ayuda-enlace">Fotos, plano técnico o carpeta compartida.</p>
          {error('enlace')}
        </div>
        <div className="campo">
          <label htmlFor="campo-responsable">Responsable *</label>
          <input type="text" maxLength={MAX_CORTO} autoComplete="off" {...props('responsable')} />
          {error('responsable')}
        </div>
        <div className="campo">
          <label htmlFor="campo-fecha">Fecha requerida *</label>
          <input type="date" {...props('fecha')} />
          {error('fecha')}
        </div>

        <div className="acciones campo--ancho">
          <button type="submit" className="boton boton--primario" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Registrar corrección'}
          </button>
        </div>
      </form>
    </section>
  );
}
