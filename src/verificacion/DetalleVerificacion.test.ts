import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DetalleVerificacion } from './DetalleVerificacion';
import { verif } from './pruebas';

const html = (nombre: string) => renderToStaticMarkup(createElement(DetalleVerificacion, { v: verif(nombre) }));
const filas = (h: string) => h.match(/<tr[^>]*>.*?<\/tr>/g) ?? [];

describe('DetalleVerificacion', () => {
  const h = html('ficha-dif.pdf');

  it('muestra tabla de campos con ambos valores y la de colores con ambas cantidades', () => {
    expect(h).toContain('En la ficha');
    expect(h).toContain('En la referencia');
    expect(h).toContain('TEXAMERI');
    expect(h).toContain('TEXTIL AMERICANA');
    expect(h).toContain('Cant. ficha');
    expect(h).toContain('Cant. referencia');
    expect(h).toContain('>600<');
    expect(h).toContain('>500<');
  });

  it('resalta solo las filas distintas de ok, y lo dice con texto', () => {
    const resaltadas = filas(h).filter((f) => f.includes('fila-dif'));
    expect(resaltadas).toHaveLength(2); // proveedor y color 820
    expect(resaltadas[0]).toContain('Diferente');
    expect(resaltadas[0]).toContain('Proveedor');
    expect(h).toContain('Coincide');
    expect(filas(h).filter((f) => f.includes('Coincide') && f.includes('fila-dif'))).toHaveLength(0);
  });

  it('usa "No está en la referencia" y "Falta en la ficha" como texto', () => {
    expect(html('sin-ref.pdf')).toContain('No está en la referencia');
    const v = verif('ok.pdf');
    v.colores = [{ codigo: '1', color: 'X', ficha: null, referencia: 4, resultado: 'falta_en_ficha' }];
    expect(renderToStaticMarkup(createElement(DetalleVerificacion, { v }))).toContain('Falta en la ficha');
  });

  it('valor ausente se muestra como guion y no se decide quién tiene el error', () => {
    const sinRef = html('sin-ref.pdf');
    expect(sinRef).toContain('>—<');
    expect(sinRef).toContain('se muestran ambos valores');
  });

  it('una ficha OK no resalta ninguna fila', () => {
    expect(html('todo-ok.pdf')).not.toContain('fila-dif');
  });
});
