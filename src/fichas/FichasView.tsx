import { useMemo, useState } from 'react';
import { useFichas } from '../hooks/useFichas';
import { crearRepositorioFichas } from '../repositories';
import { CargarFicha } from './CargarFicha';
import { PlanillaFichas } from './PlanillaFichas';

type Sub = 'cargar' | 'planilla';

export function FichasView({ activo }: { activo: boolean }) {
  const repo = useMemo(() => crearRepositorioFichas(), []);
  const datos = useFichas(repo, activo);
  const [sub, setSub] = useState<Sub>('cargar');

  const boton = (id: Sub, texto: string) => (
    <button type="button" className="subtab" aria-current={sub === id ? 'page' : undefined} onClick={() => setSub(id)}>
      {texto}
    </button>
  );

  return (
    <>
      <nav aria-label="Fichas técnicas" className="subtabs">
        {boton('cargar', 'Cargar ficha')}
        {boton('planilla', 'Planilla')}
      </nav>
      {/* Ambas quedan montadas: una subida en curso no se pierde al mirar la planilla. */}
      <div hidden={sub !== 'cargar'}>
        <CargarFicha onSubir={datos.subir} onVerPlanilla={() => setSub('planilla')} />
      </div>
      <div hidden={sub !== 'planilla'}>
        <PlanillaFichas
          fichas={datos.fichas}
          remoto={repo.remoto}
          conexion={datos.conexion}
          errorCarga={datos.errorCarga}
          ultimaLectura={datos.ultimaLectura}
          actualizando={datos.actualizando}
          onActualizar={datos.refrescar}
          onCambiarEstado={datos.cambiarEstado}
        />
      </div>
    </>
  );
}
