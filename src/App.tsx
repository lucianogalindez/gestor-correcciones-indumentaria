import { useEffect, useMemo, useState } from 'react';
import { useCorrecciones } from './hooks/useCorrecciones';
import { useHoy } from './hooks/useHoy';
import { crearRepositorio } from './repositories';
import { FichasView } from './fichas/FichasView';
import { NuevaCorreccionForm } from './components/NuevaCorreccionForm';
import { Seguimiento } from './components/Seguimiento';

type Seccion = 'correcciones' | 'fichas';
type Vista = 'nueva' | 'seguimiento';

const seccionDelHash = (): Seccion => (window.location.hash === '#fichas' ? 'fichas' : 'correcciones');

export function App() {
  const repo = useMemo(() => crearRepositorio(), []);
  const datos = useCorrecciones(repo);
  const hoy = useHoy();
  const [seccion, setSeccion] = useState<Seccion>(seccionDelHash);
  const [vista, setVista] = useState<Vista>('nueva');
  // La pestaña de fichas se monta al visitarla por primera vez y después queda montada.
  const [fichasVisitada, setFichasVisitada] = useState(seccion === 'fichas');

  useEffect(() => {
    const alCambiar = () => setSeccion(seccionDelHash());
    window.addEventListener('hashchange', alCambiar);
    return () => window.removeEventListener('hashchange', alCambiar);
  }, []);
  useEffect(() => {
    if (seccion === 'fichas') setFichasVisitada(true);
  }, [seccion]);

  const ir = (s: Seccion) => {
    setSeccion(s);
    // Correcciones no usa hash: se limpia sin recargar ni apilar historial.
    const url = s === 'fichas' ? '#fichas' : window.location.pathname + window.location.search;
    window.history.replaceState(null, '', url);
  };

  const tab = (id: Seccion, texto: string) => (
    <button type="button" className="tab" aria-current={seccion === id ? 'page' : undefined} onClick={() => ir(id)}>
      {texto}
    </button>
  );
  const subtab = (id: Vista, texto: string) => (
    <button type="button" className="subtab" aria-current={vista === id ? 'page' : undefined} onClick={() => setVista(id)}>
      {texto}
    </button>
  );

  return (
    <>
      <a className="saltar" href="#contenido">Saltar al contenido</a>
      <header className="cabecera">
        <div className="contenedor cabecera__fila">
          <div className="cabecera__titulo">
            <p className="cabecera__etiqueta">Diseño y Desarrollo de Producto</p>
            <h1>Correcciones de muestras</h1>
          </div>
          <nav aria-label="Secciones" className="tabs">
            {tab('correcciones', 'Correcciones')}
            {tab('fichas', 'Fichas técnicas')}
          </nav>
        </div>
      </header>

      <main id="contenido" className="contenedor">
        {/* Todo queda montado para no perder lo escrito ni una subida en curso al cambiar de pestaña. */}
        <div hidden={seccion !== 'correcciones'}>
          <nav aria-label="Correcciones" className="subtabs">
            {subtab('nueva', 'Nueva corrección')}
            {subtab('seguimiento', 'Seguimiento')}
          </nav>
          <div hidden={vista !== 'nueva'}>
            <NuevaCorreccionForm onCrear={datos.crear} onIrASeguimiento={() => setVista('seguimiento')} />
          </div>
          <div hidden={vista !== 'seguimiento'}>
            <Seguimiento
              items={datos.items}
              hoy={hoy}
              remoto={repo.remoto}
              conexion={datos.conexion}
              errorCarga={datos.errorCarga}
              ultimaLectura={datos.ultimaLectura}
              actualizando={datos.actualizando}
              onActualizar={datos.refrescar}
              onCambiarEstado={datos.cambiarEstado}
            />
          </div>
        </div>
        {fichasVisitada && (
          <div hidden={seccion !== 'fichas'}>
            <FichasView activo={seccion === 'fichas'} />
          </div>
        )}
      </main>
    </>
  );
}
