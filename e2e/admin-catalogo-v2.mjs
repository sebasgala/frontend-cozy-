// Integración v2, fase 2: lo que el panel guarda (estrellas, tipo de propiedad, dirección) y los códigos que genera el
// backend llegan tal cual a la API del contrato v2 (/api/v2/alojamientos). Crea y edita por la interfaz y lee por la v2.
import { chromium } from 'playwright';
const W = process.env.COZY_WEB ?? 'http://localhost:5173', A = process.env.COZY_API ?? 'http://localhost:3000/api/v1';
const V2 = process.env.COZY_API_V2 ?? A.replace(/\/api\/v1$/, '/api/v2');
const pedir = async (base, m, r, { token, body } = {}) => {
  const x = await fetch(base + r, { method: m, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) }, body: body && JSON.stringify(body) });
  const t = await x.text();
  return { s: x.status, j: t ? JSON.parse(t) : null, h: x.headers };
};
const api = (m, r, o) => pedir(A, m, r, o);
const v2 = (m, r, o) => pedir(V2, m, r, o);
const sfx = Date.now().toString(36), clave = 'Clave-prueba-123';
const res = [];
const caso = (ok, n, nota = '') => { res.push(ok); console.log(`${ok ? 'OK   ' : 'FALLA'} ${n}${nota ? ' — ' + nota : ''}`); };

const tSA = (await api('POST', '/auth/login', { body: { email: process.env.SA_EMAIL, password: process.env.SA_PASSWORD } })).j.access_token;
const u = (await api('POST', '/auth/registro', { body: { email: `v2.${sfx}@prueba.test`, password: clave, nombre: 'Admin', apellido: 'V2' + sfx, rol: 'administrador' } })).j;
await api('POST', `/admin/usuarios/${u.id}/aprobar`, { token: tSA });
const token = (await api('POST', '/auth/login', { body: { email: `v2.${sfx}@prueba.test`, password: clave } })).j.access_token;
const ciudadNombre = `Ciudad V2 ${sfx}`;
await api('POST', '/admin/ciudades', { token, body: { nombre: ciudadNombre, pais: 'ec' } });
const alojNombre = `Resort UI ${sfx}`;

const b = await chromium.launch(); // con CORS real: el navegador de prueba no lo desactiva
const pg = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
const errores = [];
pg.on('pageerror', (e) => errores.push(e.message));
pg.on('console', (m) => m.type() === 'error' && !/status of (4|5)\d\d|Failed to load resource/.test(m.text()) && errores.push(m.text()));
const esperar = async () => { await pg.waitForLoadState('networkidle'); await pg.waitForTimeout(300); await pg.locator('[aria-busy="true"]').first().waitFor({ state: 'detached', timeout: 8000 }).catch(() => {}); };
const lbl = (t) => pg.getByLabel(new RegExp('^' + t));

await pg.goto(W + '/ingresar', { waitUntil: 'networkidle' });
const i = pg.locator('main input');
await i.nth(0).fill(`v2.${sfx}@prueba.test`); await i.nth(1).fill(clave);
await pg.getByRole('button', { name: /^Ingresar$/ }).last().click(); await pg.waitForTimeout(1500); await pg.waitForLoadState('networkidle');

// ═══ Crear por la interfaz con los campos nuevos ═══
await pg.goto(W + '/admin/alojamientos/nuevo', { waitUntil: 'networkidle' }); await esperar();
caso((await lbl('Estrellas').inputValue()) === '3' && (await lbl('Tipo de propiedad').inputValue()) === 'HOTEL', 'Formulario: estrellas 3 y tipo Hotel por defecto');
await lbl('Nombre').fill(alojNombre);
await lbl('Ciudad').selectOption({ label: ciudadNombre });
await lbl('Estrellas').selectOption('5');
await lbl('Tipo de propiedad').selectOption({ label: 'Resort' });
await lbl('Dirección').fill('Av. de las Pruebas 123');
await lbl('Precio por noche').fill('85.5');
await pg.getByRole('button', { name: 'Crear alojamiento' }).click(); await esperar();

const creado = (await api('GET', '/admin/alojamientos?limit=50', { token })).j.data.find((a) => a.nombre === alojNombre);
caso(!!creado && creado.estrellas === 5 && creado.tipoPropiedad === 'RESORT' && creado.direccion === 'Av. de las Pruebas 123', 'Crear: el panel guarda estrellas, tipo y dirección', JSON.stringify({ e: creado?.estrellas, t: creado?.tipoPropiedad }));
const codigo = creado?.codigo;
caso(/^HTL-[A-Z0-9]+-[A-Z]{3}-\d{3,}$/.test(codigo ?? ''), 'Crear: el backend genera el código público', codigo);

// ═══ La v2 lo ve igual ═══
const ficha = await v2('GET', `/alojamientos/${codigo}`);
caso(ficha.s === 200 && ficha.j.id === codigo && ficha.j.estrellas === 5 && ficha.j.tipoPropiedad === 'RESORT' && ficha.j.direccion === 'Av. de las Pruebas 123' && ficha.j.destino === ciudadNombre,
  'v2: la ficha trae lo que guardó el panel', `${ficha.s}`);

// Habitaciones: el código sale del nombre y se evita repetirlo dentro del alojamiento
const crearHab = (nombre) => api('POST', `/admin/alojamientos/${creado.id}/habitaciones`, { token, body: { nombre, tipo: 'suite', capacidadAdultos: 2, capacidadNinos: 0, precioBase: 120, mealPlan: 'breakfast_included', cancellationType: 'free_cancellation' } });
const h1 = await crearHab('Suite Deluxe');
const h2 = await crearHab('Suite  Deluxe!');
caso(h1.j?.codigo === 'SUITE_DELUXE' && h2.j?.codigo === 'SUITE_DELUXE_2', 'Habitaciones: SUITE_DELUXE y, si se repite, SUITE_DELUXE_2', `${h1.j?.codigo} / ${h2.j?.codigo}`);
const habs = await v2('GET', `/alojamientos/${codigo}/habitaciones`);
const lista = habs.j?.habitaciones ?? [];
caso(habs.s === 200 && lista.map((h) => h.codigo).sort().join() === 'SUITE_DELUXE,SUITE_DELUXE_2' && lista.every((h) => h.precioBaseNoche === '120.00' && h.regimen === 'DESAYUNO_INCLUIDO' && h.planesTarifa[0].politicaCancelacion.esReembolsable === true),
  'v2: las habitaciones salen con código, régimen, política y Money', `${habs.s}`);

// ═══ Editar por la interfaz: el código no cambia, lo demás sí ═══
await pg.goto(W + `/admin/alojamientos/${creado.id}/editar`, { waitUntil: 'networkidle' }); await esperar();
caso((await pg.locator('main').innerText()).includes(`Código ${codigo}`), 'Editar: la pantalla muestra el código del alojamiento');
caso((await lbl('Estrellas').inputValue()) === '5' && (await lbl('Tipo de propiedad').inputValue()) === 'RESORT' && (await lbl('Dirección').inputValue()) === 'Av. de las Pruebas 123', 'Editar: el formulario carga estrellas, tipo y dirección');
await lbl('Nombre').fill(alojNombre + ' Renovado');
await lbl('Estrellas').selectOption('2');
await lbl('Tipo de propiedad').selectOption({ label: 'Hostal' });
await lbl('Dirección').fill('');
await pg.getByRole('button', { name: 'Guardar cambios' }).click(); await esperar();
const ficha2 = await v2('GET', `/alojamientos/${codigo}`);
caso(ficha2.s === 200 && ficha2.j.nombre === alojNombre + ' Renovado' && ficha2.j.estrellas === 2 && ficha2.j.tipoPropiedad === 'HOSTAL' && ficha2.j.direccion === undefined,
  'Editar: la v2 ve los cambios y el código sigue siendo el mismo', `${ficha2.s} ${ficha2.j?.id}`);
caso(ficha2.h.get('etag') && ficha2.h.get('etag') !== ficha.h.get('etag'), 'v2: el ETag cambia cuando cambia la ficha');
const filtro = await v2('GET', '/alojamientos?estrellas=2&limit=50');
caso(filtro.j.data.some((a) => a.id === codigo), 'v2: el catálogo lo encuentra con el filtro estrellas=2');

// ═══ Dar de baja: la v2 deja de verlo ═══
await api('DELETE', `/admin/alojamientos/${creado.id}`, { token });
const baja = await v2('GET', `/alojamientos/${codigo}`);
caso(baja.s === 404 && baja.j.code === 'NOT_FOUND', 'Baja: la v2 responde 404 NOT_FOUND', `${baja.s}`);

caso(errores.length === 0, 'Panel: sin errores de consola', errores.join(' / '));
await b.close();
console.log(`\n${res.filter(Boolean).length}/${res.length} casos OK`);
process.exit(res.every(Boolean) ? 0 : 1);
