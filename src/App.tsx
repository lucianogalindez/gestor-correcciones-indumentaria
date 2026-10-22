import { useMemo, useState } from 'react';
import { useCorrecciones } from './hooks/useCorrecciones';
import { useHoy } from './hooks/useHoy';
import { crearRepositorio } from './repositories';
import { NuevaCorreccionForm } from './components/NuevaCorreccionForm';
import { Seguimiento } from './components/Seguimiento';

type Vista = 'nueva' | 'seguimiento';

export function App() {
  const repo = useMemo(() => crearRepositorio(), []);
  const datos = useCorrecciones(repo);
  const hoy = useHoy();
  const [vista, setVista] = useState<Vista>('nueva');

  const boton = (id: Vista, texto: string) => (
    <button
      type="button"
      className="tab"
      aria-current={vista === id ? 'page' : undefined}
      onClick={() => setVista(id)}
    >
      {texto}
    </button>
  );

  return (
    <>
      <a className="saltar" href="#contenido">Saltar al contenido</a>
      <header className="cabecera">
        <div className="contenedor cabecera__fila">
          <div>
            <p className="cabecera__etiqueta">Diseño y Desarrollo de Producto</p>
            <h1>Correcciones de muestras</h1>
          </div>
          <nav aria-label="Secciones" className="tabs">
            {boton('nueva', 'Nueva corrección')}
            {boton('seguimiento', 'Seguimiento')}
          </nav>
        </div>
      </header>

      <main id="contenido" className="contenedor">
        {/* Ambas vistas quedan montadas para no perder lo escrito en el formulario al cambiar de pestaña. */}
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
      </main>
    </>
  );
}
