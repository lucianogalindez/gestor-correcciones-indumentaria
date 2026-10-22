import type { Conexion, ErrorCarga } from '../hooks/useCorrecciones';

interface Props {
  remoto: boolean;
  conexion: Conexion;
  errorCarga: ErrorCarga | null;
  ultimaLectura: Date | null;
  actualizando: boolean;
  onActualizar: () => void;
}

const hora = (d: Date) => d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

const TITULO_ERROR = {
  'sin-conexion': 'Sin conexión',
  autorizacion: 'Acceso rechazado',
  servidor: 'Problema en el servidor',
  invalida: 'Respuesta inválida',
  otro: 'Error',
} as const;

export function EstadoConexion({ remoto, conexion, errorCarga, ultimaLectura, actualizando, onActualizar }: Props) {
  let estado: string;
  let clase = 'conexion';
  if (conexion === 'error' && errorCarga) {
    estado = TITULO_ERROR[errorCarga.tipo];
    clase += ' conexion--error';
  } else if (conexion === 'cargando') {
    estado = 'Cargando…';
  } else if (!remoto) {
    estado = 'Modo demo: los datos se guardan solo en este navegador';
  } else {
    estado = ultimaLectura ? `Conectado · actualizado ${hora(ultimaLectura)}` : 'Conectado';
    clase += ' conexion--ok';
  }

  return (
    <div className="conexion-bloque">
      <div className="conexion-fila">
        <p className={clase} role="status">
          <span className="punto" aria-hidden="true" />
          {estado}
        </p>
        <button type="button" className="boton boton--chico" onClick={onActualizar} disabled={actualizando}>
          {actualizando ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>
      {conexion === 'error' && errorCarga && (
        <p className="aviso aviso--error" role="alert">
          {errorCarga.mensaje} Se muestran los últimos datos cargados.
        </p>
      )}
    </div>
  );
}
