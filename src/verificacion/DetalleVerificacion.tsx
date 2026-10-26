import { mostrarValor, TEXTO_RESULTADO } from './logica';
import type { Resultado, Verificacion } from './tipos';

function CeldaResultado({ r }: { r: Resultado }) {
  // El texto va siempre: el color solo refuerza, no es lo único que distingue.
  return <span className={`resultado resultado--${r === 'ok' ? 'ok' : 'dif'}`}>{TEXTO_RESULTADO[r]}</span>;
}

/** Tablas de campos y de colores de una ficha verificada. Muestra ambos valores sin decidir cuál es el correcto. */
export function DetalleVerificacion({ v }: { v: Verificacion }) {
  return (
    <div className="verif-detalle">
      <p className="tenue">
        Encontrada en la referencia como: <strong>{v.clave || '—'}</strong>
      </p>
      <p>{v.resumen}</p>

      {v.campos.length > 0 && (
        <>
          <h4>Campos</h4>
          <table className="tabla tabla--chica">
            <thead>
              <tr>
                <th scope="col">Campo</th>
                <th scope="col">En la ficha</th>
                <th scope="col">En la referencia</th>
                <th scope="col">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {v.campos.map((c, i) => (
                <tr key={`${c.campo}-${i}`} className={c.resultado === 'ok' ? undefined : 'fila-dif'}>
                  <td data-label="Campo">{c.campo}</td>
                  <td data-label="En la ficha">{mostrarValor(c.ficha)}</td>
                  <td data-label="En la referencia">{mostrarValor(c.referencia)}</td>
                  <td data-label="Resultado"><CeldaResultado r={c.resultado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {v.colores.length > 0 && (
        <>
          <h4>Colores</h4>
          <table className="tabla tabla--chica">
            <thead>
              <tr>
                <th scope="col">Código</th>
                <th scope="col">Color</th>
                <th scope="col">Cant. ficha</th>
                <th scope="col">Cant. referencia</th>
                <th scope="col">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {v.colores.map((c, i) => (
                <tr key={`${c.codigo}-${i}`} className={c.resultado === 'ok' ? undefined : 'fila-dif'}>
                  <td data-label="Código">{c.codigo}</td>
                  <td data-label="Color">{c.color}</td>
                  <td data-label="Cant. ficha">{mostrarValor(c.ficha)}</td>
                  <td data-label="Cant. referencia">{mostrarValor(c.referencia)}</td>
                  <td data-label="Resultado"><CeldaResultado r={c.resultado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      <p className="ayuda ayuda--chica">
        Una diferencia puede estar en la ficha, en la referencia o en la lectura del PDF: se muestran ambos valores para que lo revises.
      </p>
    </div>
  );
}
