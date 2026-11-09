// Fase 6: estados de error, sesión vencida, página inexistente y teléfono en todas las pantallas del panel.
// Corre con el superadmin (ve todas las pantallas). Los errores se simulan interceptando la API en el navegador.
import { chromium } from 'playwright';
const W = process.env.COZY_WEB ?? 'http://localhost:5173', A = process.env.COZY_API ?? 'http://localhost:3000/api/v1';
const SA = { email: process.env.SA_EMAIL, password: process.env.SA_PASSWORD };
const res = [];
const caso = (ok, n, nota = '') => { res.push(ok); console.log(`${ok ? 'OK   ' : 'FALLA'} ${n}${nota ? ' — ' + nota : ''}`); };

const b = await chromium.launch(); // con CORS real: el navegador de prueba no lo desactiva
const nueva = async (vp = { width: 1440, height: 900 }) => {
  const pg = await (await b.newContext({ viewport: vp })).newPage();
  pg.errores = [];
  pg.on('pageerror', (e) => pg.errores.push(e.message));
  pg.on('console', (m) => m.type() === 'error' && !/status of (4|5)\d\d|Failed to load resource|ERR_FAILED|CORS/.test(m.text()) && pg.errores.push(m.text()));
  return pg;
};
const ingresar = async (pg) => {
  await pg.goto(W + '/ingresar', { waitUntil: 'networkidle' });
  const i = pg.locator('main input');
  await i.nth(0).fill(SA.email); await i.nth(1).fill(SA.password);
  await pg.getByRole('button', { name: /^Ingresar$/ }).last().click();
  await pg.waitForTimeout(1500); await pg.waitForLoadState('networkidle');
};
const esperar = async (pg) => { await pg.waitForLoadState('networkidle'); await pg.waitForTimeout(350); await pg.locator('[aria-busy="true"]').first().waitFor({ state: 'detached', timeout: 8000 }).catch(() => {}); };
const ruta = (pg) => new URL(pg.url()).pathname;

// ═══ 1. Errores del servidor y de red ═══
let pg = await nueva();
await ingresar(pg);
// 500 en el listado de alojamientos
await pg.route('**/api/v1/admin/alojamientos?**', (r) => r.fulfill({ status: 500, contentType: 'application/problem+json', body: JSON.stringify({ type: 'about:blank', title: 'Internal Server Error', status: 500, detail: 'Internal Server Error' }) }));
await pg.goto(W + '/admin/alojamientos', { waitUntil: 'networkidle' }); await esperar(pg);
let alerta = await pg.getByRole('alert').innerText().catch(() => '');
caso(/problema/.test(alerta) && !/Internal Server Error/.test(alerta), 'Lista con 500: mensaje claro en español (no el texto técnico)', alerta);
await pg.unroute('**/api/v1/admin/alojamientos?**');

// Sin conexión en el listado de usuarios
await pg.route('**/api/v1/admin/usuarios?**', (r) => r.abort('failed'));
await pg.goto(W + '/admin/usuarios', { waitUntil: 'networkidle' }); await esperar(pg);
alerta = await pg.getByRole('alert').innerText().catch(() => '');
caso(/conexión/.test(alerta), 'Usuarios sin conexión: "No hay conexión con el servidor."', alerta);
await pg.unroute('**/api/v1/admin/usuarios?**');

// Panel con el resumen caído
await pg.route('**/api/v1/admin/reservas?**', (r) => r.fulfill({ status: 503, contentType: 'application/problem+json', body: JSON.stringify({ status: 503, title: 'Unavailable' }) }));
await pg.goto(W + '/admin', { waitUntil: 'networkidle' }); await esperar(pg);
alerta = await pg.getByRole('alert').innerText().catch(() => '');
caso(/No se pudo cargar el resumen|problema/.test(alerta) || alerta.length > 0, 'Panel con la API caída: muestra un aviso en vez de quedarse cargando', alerta);
await pg.unroute('**/api/v1/admin/reservas?**');

// Error al guardar: 500 al crear una ciudad
await pg.goto(W + '/admin/ciudades', { waitUntil: 'networkidle' }); await esperar(pg);
await pg.route('**/api/v1/admin/ciudades', (r) => r.request().method() === 'POST' ? r.fulfill({ status: 500, contentType: 'application/problem+json', body: JSON.stringify({ status: 500, title: 'Internal Server Error' }) }) : r.continue());
await pg.getByLabel(/^Nombre/).fill('Ciudad error F6'); await pg.getByLabel(/^País/).fill('ec');
await pg.getByRole('button', { name: 'Agregar', exact: true }).click(); await esperar(pg);
alerta = await pg.getByRole('alert').innerText().catch(() => '');
caso(/problema/.test(alerta) && (await pg.getByLabel(/^Nombre/).inputValue()) === 'Ciudad error F6', 'Guardar con 500: aviso claro y el formulario conserva lo escrito', alerta);
await pg.unroute('**/api/v1/admin/ciudades');

// ═══ 2. Sesión vencida ═══
const sesionCruda = await pg.evaluate(() => localStorage.getItem('cozy:sesion'));
const sesionVencida = JSON.parse(sesionCruda); sesionVencida.token = 'token.que.no.sirve';
await pg.evaluate((s) => { localStorage.setItem('cozy:sesion', s); localStorage.setItem('cozy:token', 'token.que.no.sirve'); }, JSON.stringify(sesionVencida));
await pg.goto(W + '/admin/alojamientos', { waitUntil: 'networkidle' }); await pg.waitForTimeout(1500);
caso(ruta(pg) === '/ingresar' || ruta(pg) === '/admin/alojamientos' && (await pg.getByRole('link', { name: /Ingresar/ }).count()) > 0, 'Token vencido: la sesión se cierra y se pide ingresar de nuevo', ruta(pg));
caso((await pg.evaluate(() => localStorage.getItem('cozy:sesion'))) === null, 'Token vencido: se borra la sesión guardada');
await ingresar(pg);

// ═══ 3. Página inexistente dentro del panel ═══
await pg.goto(W + '/admin/no-existe', { waitUntil: 'networkidle' }); await esperar(pg);
caso((await pg.locator('main').innerText()).includes('No encontramos esta página'), 'Ruta inexistente en el panel: página de no encontrado, con el menú');
caso((await pg.locator('nav[aria-label="Administración"]').count()) === 1, 'Ruta inexistente: el menú del panel sigue visible');

// ═══ 4. Teléfono: todas las pantallas del panel ═══
const tel = await nueva({ width: 390, height: 844 });
await ingresar(tel);
const pantallas = ['/admin', '/admin/alojamientos', '/admin/alojamientos/nuevo', '/admin/ciudades', '/admin/habitaciones', '/admin/habitaciones/nueva', '/admin/disponibilidad', '/admin/reservas', '/admin/cuenta', '/admin/usuarios'];
const malas = [];
for (const url of pantallas) {
  tel.errores.length = 0;
  await tel.goto(W + url, { waitUntil: 'networkidle' }); await esperar(tel);
  const ancho = await tel.evaluate(() => document.documentElement.scrollWidth);
  if (ancho > 390) malas.push(`${url} (${ancho}px)`);
  if (tel.errores.length) malas.push(`${url} (consola: ${tel.errores[0].slice(0, 80)})`);
}
caso(malas.length === 0, `Teléfono: ${pantallas.length} pantallas sin desplazamiento horizontal ni errores de consola`, malas.join(' | '));
await tel.screenshot({ path: 'e2e/capturas/f6-telefono-disponibilidad.png', fullPage: true }).catch(() => {});

// ═══ 5. Escritorio: sin errores de consola en el recorrido ═══
pg.errores.length = 0;
for (const url of pantallas.filter((u) => u !== '/admin/habitaciones/nueva')) {
  await pg.goto(W + url, { waitUntil: 'networkidle' }); await esperar(pg);
}
caso(pg.errores.length === 0, 'Escritorio: recorrido de todas las pantallas sin errores de consola', pg.errores.join(' / '));

await b.close();
console.log(`\n${res.filter(Boolean).length}/${res.length} casos OK`);
process.exit(res.every(Boolean) ? 0 : 1);
