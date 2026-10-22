// Servidor local que imita los tres webhooks de n8n, para desarrollar sin n8n.
//   npm run mock            -> http://localhost:8787
// Variables opcionales:
//   PORT=8787   MOCK_API_KEY=clave (exige el header X-API-Key)   MOCK_LATENCY=300 (ms de demora)
//   MOCK_ORIGIN=http://localhost:5173 (origen permitido por CORS; por defecto cualquiera)
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
  fila(1, 'CAM-1042', 'Proto 1', 'M', 'Crudo', 'Taller Sur', 'Moldería', 'Cuello 1,5 cm alto.', 'Sofía Ramírez', -6, -14, 'En corrección', null),
  fila(2, 'CAM-1042', 'Proto 2', 'M', 'Crudo', 'Taller Sur', 'Costura / Confección', 'Puntada floja en la sisa.', 'Sofía Ramírez', -2, -5, 'Pendiente', null),
  fila(3, 'PAN-2210', 'Proto 1', '40', 'Azul noche', 'Confecciones Norte', 'Medidas / Talle', 'Tiro 1 cm corto.', 'Martín Pérez', 0, -3, 'Pendiente', null),
  fila(4, 'VES-3301', 'Proto 3', 'S', 'Verde oliva', 'Taller Sur', 'Color', 'Tono más amarillento que el pantone.', 'Lucía Gómez', 3, -4, 'Para revisar', null),
  fila(5, 'REM-1500', 'Proto 2', 'M', 'Blanco', 'Confecciones Norte', 'Avíos y accesorios', 'Cambiar botones.', 'Lucía Gómez', -12, -25, 'Cerrada', -13),
];

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
  console.log(`Usalo con VITE_API_BASE_URL=http://localhost:${PORT}${API_KEY ? ' y VITE_API_KEY=' + API_KEY : ''}`);
});
