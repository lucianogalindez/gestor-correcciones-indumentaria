# Correcciones de muestras

Aplicación web para registrar y dar seguimiento a las correcciones de muestras de indumentaria (Diseño y Desarrollo de Producto). Es un sitio estático (Vite + React + TypeScript) que se publica en Netlify y guarda los datos en un Google Sheet a través de n8n. Sin n8n funciona en modo demo, guardando en el navegador.

- **Correcciones** (pestañas *Nueva corrección* y *Seguimiento*) y **Fichas técnicas** (ver más abajo).
- **Nueva corrección**: formulario con validaciones; confirma con el ID solo si el guardado fue exitoso.
- **Seguimiento**: indicadores (abiertas, abiertas vencidas, % vencidas), filtros, orden por fecha requerida, detalle de cada solicitud, cambio de estado (Pendiente, En corrección, Para revisar, Cerrada) y exportación a CSV para Excel.

> **Nota sobre el diseño:** el archivo `reference/prototipo.html` mencionado en el pedido no estaba en la carpeta cuando se armó el proyecto. Los campos, validaciones y textos se definieron a partir de la especificación escrita. Si el prototipo difiere en algún detalle (lista de tipos de corrección, textos, colores), los puntos a ajustar son `src/types.ts` (`TIPOS`), `src/lib/validacion.ts` y `src/styles.css`.

## Reglas de negocio

- **Vencida** = fecha requerida anterior a hoy **y** estado distinto de Cerrada. Una solicitud con fecha de hoy no está vencida.
- Las fechas son texto `AAAA-MM-DD` en calendario local. Nunca se usa `new Date("AAAA-MM-DD")` (que interpreta UTC y puede correr un día).
- Al cerrar se guarda la fecha de cierre (la calcula el navegador en fecha local); al reabrir se vacía.
- Los indicadores se calculan siempre sobre el total de solicitudes, no sobre las filtradas. Con 0 abiertas, el porcentaje es 0 %.
- El CSV exporta lo que se ve en pantalla (con filtros aplicados), con BOM UTF-8, saltos CRLF, línea `sep=,`, escape de comas, comillas y saltos de línea, y protección contra fórmulas (`=`, `+`, `-`, `@` al inicio de una celda se escriben con un apóstrofo delante).

## 1. Probar en tu computadora

Requisitos: [Node.js](https://nodejs.org) 20 o superior.

```bash
npm install
```

```bash
npm run dev
```

Abrí la dirección que muestra la terminal (normalmente http://localhost:5173). Sin configuración corre en **modo demo**: se cargan 8 solicitudes de ejemplo (una sola vez) y todo se guarda en el `localStorage` del navegador.

### Probar con el servidor simulado de n8n

En una terminal:

```bash
npm run mock
```

Crea un archivo `.env.local` (copiá `.env.example`) con:

```
VITE_API_BASE_URL=http://localhost:8787
```

y reiniciá `npm run dev`. El mock imita los tres endpoints; los datos viven en memoria. Variables opcionales del mock: `PORT`, `MOCK_API_KEY` (exige el header `X-API-Key`), `MOCK_LATENCY` (demora en ms), `MOCK_ORIGIN`.

### Pruebas y build

```bash
npm test
```

```bash
npm run build
```

## 2. Subir a GitHub

Con el repositorio ya creado en GitHub (vacío):

```bash
git init
git add .
git commit -m "Correcciones de muestras"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git push -u origin main
```

`.gitignore` excluye `node_modules`, `dist` y todos los `.env*` salvo `.env.example`. Revisá con `git status` que no aparezca ningún `.env.local` antes de subir.

## 3. Desplegar en Netlify

1. En Netlify: **Add new site → Import an existing project → GitHub** y elegí el repositorio.
2. La configuración sale de `netlify.toml` (build `npm run build`, carpeta `dist`).
3. En **Site configuration → Environment variables** agregá:
   - `VITE_API_BASE_URL` = URL de producción de los webhooks de n8n, sin barra final (ej.: `https://tu-n8n.example.com/webhook`).
   - `VITE_API_KEY` = opcional (ver advertencia abajo).
4. **Deploy**. Las variables `VITE_*` se incrustan al *compilar*: si las cambiás, hay que volver a desplegar.
5. Copiá el dominio final (ej.: `https://mi-sitio.netlify.app`): lo necesitás para CORS en n8n (paso 4.3).

Si no definís `VITE_API_BASE_URL`, el sitio publicado queda en modo demo (datos solo en cada navegador).

### ⚠️ Sobre `VITE_API_KEY`

Todo lo que empieza con `VITE_` queda **dentro del JavaScript público** del sitio. Cualquiera que abra el sitio puede verlo con las herramientas del navegador. La clave sirve para filtrar tráfico casual y bots, **no es seguridad real**: quien la vea puede leer y escribir en tu Sheet. No uses una clave que proteja algo más, y no pongas datos sensibles en el Sheet. Si necesitás control de acceso de verdad, hay que poner autenticación de usuarios delante (por ejemplo, Netlify Identity o un proxy con login).

## 4. Conectar n8n y Google Sheets

### 4.1 Preparar el Sheet

1. Creá una hoja de cálculo y renombrá la pestaña como **`Correcciones`**.
2. En la fila 1, columnas **A–N**, escribí exactamente:

   | A | B | C | D | E | F | G |
   |---|---|---|---|---|---|---|
   | ID | Artículo | Versión de muestra | Talle | Color | Proveedor/taller | Tipo de corrección |

   | H | I | J | K | L | M | N |
   |---|---|---|---|---|---|---|
   | Detalle | Enlace de referencia | Responsable | Fecha requerida | Fecha de creación | Estado | Fecha de cierre |

3. Seleccioná las columnas **K, L y N** → **Formato → Número → Texto sin formato**, para que Sheets no convierta las fechas.
4. Copiá el **ID del Sheet** (en la URL: `docs.google.com/spreadsheets/d/`**`ESTE_ES_EL_ID`**`/edit`).

Si alguien edita el Sheet a mano, la app tolera fechas `dd/mm/aaaa` y estados sin tilde o en mayúsculas (`en correccion`, `CERRADA`). Las filas sin ID se ignoran.

### 4.2 Importar el workflow

1. En n8n: **Workflows → Create workflow → ⋯ → Import from file** y elegí [`n8n/workflow-correcciones.json`](n8n/workflow-correcciones.json).
2. En cada uno de los 5 nodos **Google Sheets** (Leer filas ×3, Agregar fila, Actualizar fila):
   - **Credential to connect with** → *Create new credential* → *Google Sheets OAuth2 API* → **Sign in with Google** y autorizá. Una vez creada, elegí la misma credencial en los demás nodos.
   - **Document** → *By ID* → pegá el ID del Sheet.
   - **Sheet** → `Correcciones`.
3. En los 3 nodos **Webhook** y los 5 nodos **Responder…**, reemplazá `https://REEMPLAZAR-TU-SITIO.netlify.app` por el dominio de Netlify.

### 4.3 CORS

El navegador solo permite que el sitio llame a n8n si n8n lo autoriza. El workflow ya lo configura de dos formas:

- En cada Webhook: *Options → Allowed Origins (CORS)* con el dominio de Netlify. Para desarrollar en local podés poner varios separados por coma: `https://mi-sitio.netlify.app,http://localhost:5173`.
- En cada nodo *Respond to Webhook*: header `Access-Control-Allow-Origin`.

Si cambiás de dominio, actualizá ambos lugares.

### 4.4 Activar el workflow (URL de producción, no de prueba)

1. Arriba a la derecha activá el interruptor **Active**. Sin activar, los webhooks de producción no responden.
2. Abrí un nodo Webhook: hay dos pestañas, **Test URL** y **Production URL**. La de prueba (`/webhook-test/…`) solo funciona mientras n8n está "escuchando" una ejecución de prueba. **Usá siempre la Production URL** (`/webhook/…`).
3. `VITE_API_BASE_URL` es la parte común de esas URL, sin el nombre del endpoint: por ejemplo `https://tu-n8n.example.com/webhook` (las tres rutas quedan `/webhook/correcciones`, `/webhook/correcciones-crear` y `/webhook/correcciones-estado`).
4. Verificá con:

   ```bash
   curl https://tu-n8n.example.com/webhook/correcciones
   ```

   Debe devolver `{"items":[...]}`.

### Contrato de los endpoints

| Método y ruta | Cuerpo | Respuesta |
|---|---|---|
| `GET {BASE}/correcciones` | — | `{ "items": Correccion[] }` |
| `POST {BASE}/correcciones-crear` | datos del formulario (sin `id`, `creada`, `estado` ni `cierre`) | la solicitud creada, con el `id` que genera n8n (`COR-0001`, `COR-0002`…) |
| `POST {BASE}/correcciones-estado` | `{ id, estado, cierre }` | la solicitud actualizada |

Si definís `VITE_API_KEY`, la app envía el header `X-API-Key`. n8n no lo valida por sí solo: para exigirlo, en cada Webhook elegí *Authentication → Header Auth* y creá una credencial con nombre `X-API-Key` y el valor de la clave (y recordá el aviso de seguridad de arriba).

### Limitaciones conocidas del workflow

- **IDs simultáneos:** el ID se calcula leyendo las filas existentes. Si dos personas guardan *en el mismo instante*, podrían recibir el mismo ID. Con el volumen de uso de un equipo de diseño es muy improbable; si te preocupa, limitá la concurrencia del workflow en *Settings → Execution* o asigná los IDs con una fórmula en el Sheet.
- **Reabrir una solicitud** debe dejar vacía la celda "Fecha de cierre". Probalo una vez después de importar; si tu versión de n8n no borra celdas con texto vacío, revisá el nodo "Actualizar fila".
- El workflow se probó solo a nivel de su lógica (los nodos de código); no se ejecutó contra una instancia real de n8n ni contra Google. Si tu versión del nodo Google Sheets muestra algún campo distinto, completá lo que pida en la interfaz.

## Comportamiento con n8n conectado

- Se vuelve a leer cada **30 segundos** (solo con la pestaña visible), al volver a la pestaña y con el botón **Actualizar**.
- Indicador de conexión y errores diferenciados: sin conexión, 401/403 (acceso rechazado), 5xx (problema del servidor) y respuesta inválida. Ante un error se siguen mostrando los últimos datos cargados.
- Si falla el guardado de una solicitud nueva, el formulario conserva todo lo ingresado y explica el problema.
- Se valida la forma de cada respuesta del servidor antes de usarla.

## Fichas técnicas

La segunda pestaña de la web (**Fichas técnicas**, dirección `#fichas`) permite subir el PDF de una ficha técnica: n8n lo lee con OpenAI y lo guarda en un Google Sheet, una fila por color. La web muestra la planilla agrupada por ficha.

- **Cargar ficha:** arrastrá o elegí un PDF (solo PDF con texto, hasta 15 MB; se valida en el navegador). Mientras se procesa (10–60 s) se puede cancelar; el límite es de 120 s. Si sale bien, muestra el ID de carga, los datos y los colores con cantidades.
- **Planilla:** una tarjeta por ficha (agrupada por `idCarga`) con sus colores desplegables, indicadores (fichas, prendas totales, sin terminar = Pendiente + En producción), búsqueda, filtros por estado y proveedor, cambio de estado (se ve al instante y se revierte si el servidor falla) y exportación a CSV.
- **Errores de subida:** `/fichas-subir` no devuelve mensajes legibles; ante cualquier fallo la app muestra un único aviso ("No se pudo procesar la ficha…") y vuelve a leer la planilla por si igual se guardó.
- **Sin `VITE_API_BASE_URL`** usa un mock en memoria (la subida espera 1,5 s y guarda una ficha de ejemplo: 17678 JUAN, 2 colores). Los datos se pierden al recargar.

| Método y ruta | Entrada | Respuesta |
|---|---|---|
| `GET {BASE}/fichas` | — | `{ items: Fila[] }` (una fila por color) |
| `POST {BASE}/fichas-subir` | `multipart/form-data`, campo `file` | `{ idCarga, estado, filas, ficha }` |
| `POST {BASE}/fichas-estado` | JSON `{ idCarga, estado }` | `{ idCarga, estado, filas }` (o `{ error }` con 4xx) |

Estados: Pendiente, En producción, Terminada, Entregada. El flujo de n8n se importa desde [`n8n/fichas-tecnicas-n8n-web.json`](n8n/fichas-tecnicas-n8n-web.json) (hay que asignar la credencial de Google Sheets, la de OpenAI, el ID del Sheet y el dominio de Netlify en CORS; después activarlo y usar la URL de producción, igual que en la sección 4). `npm run mock` también atiende estas tres rutas; un PDF con "error" en el nombre hace fallar `/fichas-subir` para probar el aviso de error.

## Estructura

```
src/
  types.ts                      modelo Correccion, estados y tipos
  lib/
    fechas.ts                   fechas locales AAAA-MM-DD (sin zonas horarias)
    estados.ts                  normalización de estados
    indicadores.ts              vencimientos e indicadores
    filtros.ts                  filtros y orden
    csv.ts                      exportación CSV para Excel
    validacion.ts               validaciones del formulario
  repositories/
    repository.ts               interfaz CorreccionesRepository y errores
    localStorageRepository.ts   modo demo (con 8 solicitudes de ejemplo)
    clienteHttp.ts              cliente compartido hacia n8n (API key, timeout, errores)
    httpRepository.ts           adaptador n8n de correcciones
    normalizar.ts               validación/normalización de respuestas
    index.ts                    elige adaptador según VITE_API_BASE_URL
  hooks/                        lectura periódica, "hoy" y fichas
  fichas/                       pestaña Fichas técnicas (lógica, repositorios HTTP/mock, componentes)
  components/                   formulario, seguimiento, detalle (diálogo), conexión
n8n/workflow-correcciones.json  workflow importable (correcciones)
n8n/fichas-tecnicas-n8n-web.json  workflow importable (fichas técnicas)
scripts/mock-server.mjs         `npm run mock`
```

## Accesibilidad

Cada campo tiene su `label`; los errores se asocian al campo (`aria-describedby`, `aria-invalid`) y el foco va al primer campo con error; el foco es siempre visible; el detalle es un diálogo modal (`<dialog>`) que se cierra con Esc y devuelve el foco al elemento que lo abrió; el estado vencido se indica con texto además del color.
