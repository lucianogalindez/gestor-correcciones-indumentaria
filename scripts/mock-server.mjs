// Servidor local que imita los tres webhooks de n8n, para desarrollar sin n8n.
//   npm run mock            -> http://localhost:8787
// Variables opcionales:
//   PORT=8787   MOCK_API_KEY=clave (exige el header X-API-Key)   MOCK_LATENCY=300 (ms de demora)
//   MOCK_ORIGIN=http://localhost:5173   MOCK_SUBIDA_MS=1500 (demora de /fichas-subir)
//   Un PDF con "error" en el nombre hace fallar /fichas-subir (500 sin cuerpo), como n8n. (origen permitido por CORS; por defecto cualquiera)
// Los datos viven en memoria: se pierden al reiniciar.
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT ?? 8787);
const API_KEY = process.env.MOCK_API_KEY ?? '';
const LATENCIA = Number(process.env.MOCK_LATENCY ?? 0);
const ORIGEN = process.env.MOCK_ORIGIN ?? '*';
const ESTADOS = ['Pendiente', 'En corrección', 'Para revisar', 'Cerrada'];

const pad = (n) => String(n).padStart(2, '0');
const fechaLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const relativa = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return fechaLocal(d);
};
const iso = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString();
};

const fila = (n, codigo, version, talle, color, proveedor, tipo, detalle, responsable, dias, creadaDias, estado, cierreDias) => ({
  id: `COR-${String(n).padStart(4, '0')}`, codigo, version, talle, color, proveedor, tipo, detalle, enlace: '',
  responsable, fecha: relativa(dias), creada: iso(creadaDias), estado,
  cierre: cierreDias === null ? '' : relativa(cierreDias),
});

const filas = [
  fila(1, 'CAM-1042', 'Proto 1', 'M', 'Crudo', 'Taller Sur', 'Medidas/calce', 'Cuello 1,5 cm alto.', 'Sofía Ramírez', -6, -14, 'En corrección', null),
  fila(2, 'CAM-1042', 'Proto 2', 'M', 'Crudo', 'Taller Sur', 'Costura/terminación', 'Puntada floja en la sisa.', 'Sofía Ramírez', -2, -5, 'Pendiente', null),
  fila(3, 'PAN-2210', 'Proto 1', '40', 'Azul noche', 'Confecciones Norte', 'Medidas/calce', 'Tiro 1 cm corto.', 'Martín Pérez', 0, -3, 'Pendiente', null),
  fila(4, 'VES-3301', 'Proto 3', 'S', 'Verde oliva', 'Taller Sur', 'Tela', 'Tono más amarillento que el pantone.', 'Lucía Gómez', 3, -4, 'Para revisar', null),
  fila(5, 'REM-1500', 'Proto 2', 'M', 'Blanco', 'Confecciones Norte', 'Avíos', 'Cambiar botones.', 'Lucía Gómez', -12, -25, 'Cerrada', -13),
];

// ---- Fichas técnicas (en memoria) ----
const ESTADOS_FICHA = ['Pendiente', 'En producción', 'Terminada', 'Entregada'];
const FICHA = {
  articulo: '17678', modelo: 'JUAN', temporada: 'Invierno 20', linea: 'DEPORTIVA', ordenCompra: '69107',
  proveedor: 'TEXAMERI', tela: 'Jersey marmolado', cantidadTotal: 1200, fecha: '2019-10-28',
  colores: [
    { codigo: '820', color: 'NEGRO GRANIZADO', cantidad: 600 },
    { codigo: '881', color: 'AZUL MARINO GRANIZADO', cantidad: 600 },
  ],
};
const filasFichas = [];

// ---- Verificación contra referencia (según el nombre del archivo) ----
const campoOk = (campo, v) => ({ campo, ficha: v, referencia: v, resultado: 'ok' });
const verificacionDeEjemplo = (nombre) => {
  const n = nombre.toLowerCase();
  const base = { archivo: nombre, clave: 'Artículo 17678', ficha: FICHA };
  const campos = [
    campoOk('Artículo', '17678'), campoOk('Modelo', 'JUAN'), campoOk('Temporada', 'Invierno 20'), campoOk('Línea', 'DEPORTIVA'),
    campoOk('Orden de compra', '69107'), campoOk('Proveedor', 'TEXAMERI'), campoOk('Tela', 'Jersey marmolado'), campoOk('Cantidad total', 1200),
  ];
  if (/sin[-_ ]?ref/.test(n)) {
    return { ...base, estado: 'SIN_REFERENCIA', clave: 'Artículo 99999', resumen: 'No se encontró esta ficha en la hoja de referencia.',
      diferencias: 0, ficha: { ...FICHA, articulo: '99999', modelo: 'DESCONOCIDO' },
      campos: [{ campo: 'Artículo', ficha: '99999', referencia: null, resultado: 'falta_en_referencia' }], colores: [] };
  }
  if (/dif/.test(n)) {
    return { ...base, estado: 'CON_DIFERENCIAS', resumen: '2 diferencias: proveedor y cantidad del color 820.', diferencias: 2,
      campos: campos.map((c) => (c.campo === 'Proveedor' ? { ...c, referencia: 'TEXTIL AMERICANA', resultado: 'diferente' } : c)),
      colores: [
        { codigo: '820', color: 'NEGRO GRANIZADO', ficha: 600, referencia: 500, resultado: 'diferente' },
        { codigo: '881', color: 'AZUL MARINO GRANIZADO', ficha: 600, referencia: 600, resultado: 'ok' },
      ] };
  }
  return { ...base, estado: 'OK', resumen: 'Todos los datos coinciden con la referencia.', diferencias: 0, campos,
    colores: FICHA.colores.map((c) => ({ codigo: c.codigo, color: c.color, ficha: c.cantidad, referencia: c.cantidad, resultado: 'ok' })) };
};
let cargas = 0;

const leerCrudo = (req, max = 20 * 1024 * 1024) =>
  new Promise((resolve, reject) => {
    const partes = [];
    let total = 0;
    req.on('data', (c) => {
      total += c.length;
      if (total > max) reject(new Error('Cuerpo demasiado grande'));
      else partes.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(partes)));
    req.on('error', reject);
  });

const campos = ['codigo', 'version', 'talle', 'color', 'proveedor', 'tipo', 'detalle', 'enlace', 'responsable', 'fecha'];

const cabeceras = {
  'Access-Control-Allow-Origin': ORIGEN,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
  'Content-Type': 'application/json; charset=utf-8',
};

const responder = (res, status, cuerpo) => {
  res.writeHead(status, cabeceras);
  res.end(JSON.stringify(cuerpo));
};

const leerCuerpo = (req) =>
  new Promise((resolve, reject) => {
    let datos = '';
    req.on('data', (c) => {
      datos += c;
      if (datos.length > 1e6) reject(new Error('Cuerpo demasiado grande'));
    });
    req.on('end', () => {
      try {
        resolve(datos ? JSON.parse(datos) : {});
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
  });

const siguienteId = () => {
  const max = filas.reduce((m, f) => Math.max(m, Number(/^COR-(\d+)$/.exec(f.id)?.[1] ?? 0)), 0);
  return `COR-${String(max + 1).padStart(4, '0')}`;
};

const server = createServer(async (req, res) => {
  const ruta = new URL(req.url ?? '/', 'http://localhost').pathname.replace(/\/+$/, '');
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cabeceras);
    return res.end();
  }
  if (LATENCIA > 0) await new Promise((r) => setTimeout(r, LATENCIA));
  if (API_KEY && req.headers['x-api-key'] !== API_KEY) {
    return responder(res, 401, { error: 'Clave de API inválida' });
  }

  try {
    if (req.method === 'GET' && ruta === '/correcciones') {
      return responder(res, 200, { items: filas });
    }
    if (req.method === 'POST' && ruta === '/correcciones-crear') {
      const b = await leerCuerpo(req);
      const faltan = campos.filter((c) => c !== 'enlace' && !String(b[c] ?? '').trim());
      if (faltan.length) return responder(res, 400, { error: `Faltan campos: ${faltan.join(', ')}` });
      const nueva = { id: siguienteId(), ...Object.fromEntries(campos.map((c) => [c, String(b[c] ?? '').trim()])) };
      nueva.creada = new Date().toISOString();
      nueva.estado = 'Pendiente';
      nueva.cierre = '';
      filas.push(nueva);
      return responder(res, 200, nueva);
    }
    if (req.method === 'POST' && ruta === '/correcciones-estado') {
      const b = await leerCuerpo(req);
      if (!ESTADOS.includes(b.estado)) return responder(res, 400, { error: 'Estado inválido' });
      const f = filas.find((x) => x.id === b.id);
      if (!f) return responder(res, 404, { error: `No existe ${b.id}` });
      f.estado = b.estado;
      f.cierre = b.estado === 'Cerrada' ? String(b.cierre ?? '') : '';
      return responder(res, 200, f);
    }
    if (req.method === 'GET' && ruta === '/fichas') {
      return responder(res, 200, { items: filasFichas });
    }
    if (req.method === 'POST' && ruta === '/fichas-subir') {
      const crudo = await leerCrudo(req);
      if (!String(req.headers['content-type'] ?? '').startsWith('multipart/form-data')) {
        res.writeHead(500, cabeceras);
        return res.end();
      }
      const nombre = /filename="([^"]*)"/.exec(crudo.toString('latin1'))?.[1] ?? 'ficha.pdf';
      // Para probar el camino de error: un archivo cuyo nombre contenga "error" hace fallar el flujo, como en n8n.
      if (/error/i.test(nombre)) {
        res.writeHead(500, cabeceras);
        return res.end();
      }
      await new Promise((r) => setTimeout(r, Number(process.env.MOCK_SUBIDA_MS ?? 1500)));
      const idCarga = `CARGA-${String(++cargas).padStart(4, '0')}`;
      const cargado = new Date().toISOString();
      FICHA.colores.forEach((c, i) => {
        filasFichas.push({
          idFila: `${idCarga}-${i + 1}`, idCarga, cargado, articulo: FICHA.articulo, modelo: FICHA.modelo,
          temporada: FICHA.temporada, linea: FICHA.linea, ordenCompra: FICHA.ordenCompra, proveedor: FICHA.proveedor,
          tela: FICHA.tela, cantidadTotal: FICHA.cantidadTotal, codigoColor: c.codigo, color: c.color,
          cantidadColor: c.cantidad, estado: 'Pendiente', fechaFicha: FICHA.fecha, archivo: nombre,
        });
      });
      return responder(res, 200, { idCarga, estado: 'Pendiente', filas: FICHA.colores.length, ficha: FICHA });
    }
    if (req.method === 'POST' && ruta === '/fichas-verificar') {
      const crudo = await leerCrudo(req);
      const nombre = /filename="([^"]*)"/.exec(crudo.toString('latin1'))?.[1] ?? 'ficha.pdf';
      await new Promise((r) => setTimeout(r, Number(process.env.MOCK_SUBIDA_MS ?? 1500)));
      if (/error/i.test(nombre) || !String(req.headers['content-type'] ?? '').startsWith('multipart/form-data')) {
        res.writeHead(500, cabeceras);
        return res.end();
      }
      return responder(res, 200, verificacionDeEjemplo(nombre));
    }
    if (req.method === 'POST' && ruta === '/fichas-estado') {
      const b = await leerCuerpo(req);
      if (!ESTADOS_FICHA.includes(b.estado)) return responder(res, 400, { error: 'Estado inválido' });
      const propias = filasFichas.filter((f) => f.idCarga === b.idCarga);
      if (!propias.length) return responder(res, 404, { error: `No existe la carga ${b.idCarga}` });
      propias.forEach((f) => (f.estado = b.estado));
      return responder(res, 200, { idCarga: b.idCarga, estado: b.estado, filas: propias.length });
    }
    return responder(res, 404, { error: 'Ruta inexistente' });
  } catch (e) {
    return responder(res, 400, { error: e instanceof Error ? e.message : 'Error' });
  }
});

server.listen(PORT, () => {
  console.log(`Mock de n8n escuchando en http://localhost:${PORT}`);
  console.log('  GET  /correcciones');
  console.log('  POST /correcciones-crear');
  console.log('  POST /correcciones-estado');
  console.log('  GET  /fichas   POST /fichas-subir (multipart, campo file)   POST /fichas-estado');
  console.log('  POST /fichas-verificar (multipart; el nombre decide: dif / sin-ref / error / otro = OK)');
  console.log(`Usalo con VITE_API_BASE_URL=http://localhost:${PORT}${API_KEY ? ' y VITE_API_KEY=' + API_KEY : ''}`);
});
