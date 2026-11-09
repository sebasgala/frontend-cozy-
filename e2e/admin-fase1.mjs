import { chromium } from 'playwright';
const W = process.env.COZY_WEB ?? 'http://localhost:5173', A = process.env.COZY_API ?? 'http://localhost:3000/api/v1';
const api = async (m, r, { token, body, headers } = {}) => {
  const x = await fetch(A + r, { method: m, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }), ...headers }, body: body && JSON.stringify(body) });
  const t = await x.text();
  return { s: x.status, j: t ? JSON.parse(t) : null };
};
const sfx = Date.now().toString(36), clave = 'Clave-prueba-123';
const correo = (n) => `${n}.${sfx}@prueba.test`;
const tSA = (await api('POST', '/auth/login', { body: { email: process.env.SA_EMAIL, password: process.env.SA_PASSWORD } })).j.access_token;
const reg = async (n, rol) => (await api('POST', '/auth/registro', { body: { email: correo(n), password: clave, nombre: 'Prueba', apellido: n, rol } })).j;
await reg('cliente', 'cliente');
await reg('pendiente', 'administrador');
const adm = await reg('admin', 'administrador');
const susp = await reg('suspender', 'administrador');
await api('POST', `/admin/usuarios/${adm.id}/aprobar`, { token: tSA });
await api('POST', `/admin/usuarios/${susp.id}/aprobar`, { token: tSA });

// Corre contra el frontend único en el puerto 5173, con CORS real: el navegador de prueba no lo desactiva.
const b = await chromium.launch(); // con CORS real: el navegador de prueba no lo desactiva
const res = [];
const caso = (ok, n, nota = '') => { res.push(ok); console.log(`${ok ? 'OK   ' : 'FALLA'} ${n}${nota ? ' — ' + nota : ''}`); };
const nueva = async (vp = { width: 1366, height: 900 }) => {
  const pg = await (await b.newContext({ viewport: vp })).newPage();
  pg.errores = []; pg.api = [];
  pg.on('pageerror', (e) => pg.errores.push(e.message));
  pg.on('console', (m) => m.type() === 'error' && pg.errores.push(m.text()));
  pg.on('response', (r) => r.url().startsWith(A) && pg.api.push(`${r.status()} ${r.request().method()} ${r.url().slice(A.length)}`));
  return pg;
};
const ingresar = async (pg, email, pass = clave, ruta = '/ingresar') => {
  await pg.goto(W + ruta, { waitUntil: 'networkidle' });
  const i = pg.locator('main input');
  await i.nth(0).fill(email); await i.nth(1).fill(pass);
  await pg.getByRole('button', { name: /^Ingresar$/ }).last().click();
  await pg.waitForTimeout(1500); await pg.waitForLoadState('networkidle');
};
const ruta = (pg) => new URL(pg.url()).pathname + new URL(pg.url()).search;
const menu = async (pg) => (await pg.locator('nav[aria-label="Administración"] a').allInnerTexts()).map((t) => t.trim());
const abrirMenuUsuario = async (pg) => { await pg.getByRole('button', { name: /^Cuenta de/ }).click(); await pg.waitForTimeout(300); };

// 1. Sin sesión
let pg = await nueva();
await pg.goto(W + '/admin/cuenta', { waitUntil: 'networkidle' });
caso(ruta(pg) === '/ingresar?volver=%2Fadmin%2Fcuenta', 'Sin sesión: /admin/cuenta lleva al ingreso con volver', ruta(pg));

// 2. Volver tras ingresar como administrador
await ingresar(pg, correo('admin'), clave, '/ingresar?volver=%2Fadmin%2Fcuenta');
caso(ruta(pg) === '/admin/cuenta', 'Administrador vuelve a la ruta pedida', ruta(pg));
const txtCuenta = await pg.locator('main').innerText();
caso(txtCuenta.includes('Administrador') && txtCuenta.includes('Activa'), 'Mi cuenta muestra rol y estado reales');
await pg.screenshot({ path: 'e2e/capturas/f1-admin-cuenta.png', fullPage: true });

// 3. Administrador
await pg.goto(W + '/admin', { waitUntil: 'networkidle' }); await pg.waitForTimeout(800);
let m = await menu(pg);
caso(!m.includes('Usuarios') && m.includes('Alojamientos') && m.includes('Reservas'), 'Administrador: menú sin Usuarios', m.join(', '));
const indic = await pg.locator('main ul li a').allInnerTexts();
caso(indic.length === 2 && pg.api.some((x) => x.startsWith('200 GET /admin/alojamientos')) && pg.api.some((x) => x.startsWith('200 GET /admin/reservas')),
  'Administrador: panel con 2 indicadores reales', indic.map((t) => t.replace(/\n+/g, ': ')).join(' | '));
caso(!(await pg.getByText('Modo superadministrador').count()), 'Administrador: sin aviso de superadmin');
await pg.screenshot({ path: 'e2e/capturas/f1-admin-panel.png', fullPage: true });
await pg.goto(W + '/admin/usuarios', { waitUntil: 'networkidle' });
caso(ruta(pg) === '/admin', 'Administrador: /admin/usuarios vuelve al panel', ruta(pg));
caso(pg.errores.length === 0, 'Administrador: sin errores de consola', pg.errores.join(' / '));

// 4. Superadmin
pg = await nueva();
await ingresar(pg, process.env.SA_EMAIL, process.env.SA_PASSWORD);
caso(ruta(pg) === '/admin', 'Superadmin entra al panel tras ingresar', ruta(pg));
await pg.waitForTimeout(800); m = await menu(pg);
caso(m.includes('Usuarios'), 'Superadmin: menú con Usuarios', m.join(', '));
caso((await pg.getByText('Modo superadministrador').count()) > 0, 'Superadmin: aviso visible');
const indSA = await pg.locator('main ul li a').allInnerTexts();
caso(indSA.length === 3 && pg.api.some((x) => x.startsWith('200 GET /admin/usuarios')),
  'Superadmin: panel con 3 indicadores (incluye cuentas por aprobar)', indSA.map((t) => t.replace(/\n+/g, ': ')).join(' | '));
await pg.screenshot({ path: 'e2e/capturas/f1-superadmin-panel.png', fullPage: true });
await pg.goto(W + '/admin/usuarios', { waitUntil: 'networkidle' });
caso(ruta(pg) === '/admin/usuarios' && (await pg.locator('h1').innerText()) === 'Usuarios', 'Superadmin: entra a Usuarios');
await pg.locator('nav[aria-label="Administración"] a', { hasText: 'Reservas' }).click(); await pg.waitForTimeout(400);
caso(ruta(pg) === '/admin/reservas', 'Superadmin: navegación del menú funciona');
caso(pg.errores.length === 0, 'Superadmin: sin errores de consola', pg.errores.join(' / '));

// 5. Cliente
pg = await nueva();
await ingresar(pg, correo('cliente'));
caso(ruta(pg) === '/cuenta/reservas', 'Cliente ingresa a sus reservas', ruta(pg));
await pg.goto(W + '/admin', { waitUntil: 'networkidle' }); await pg.waitForTimeout(600);
caso(ruta(pg) === '/', 'Cliente: /admin lo devuelve al inicio', ruta(pg));
await pg.goto(W + '/cuenta/reservas', { waitUntil: 'networkidle' }); await abrirMenuUsuario(pg);
caso(!(await pg.getByText('Panel de administración').count()), 'Cliente: el menú de usuario no ofrece el panel');

// 6. Administrador pendiente
pg = await nueva();
await ingresar(pg, correo('pendiente'));
caso(ruta(pg) === '/admin/pendiente' && (await pg.locator('h1').innerText()).includes('pendiente'), 'Administrador pendiente va a su pantalla', ruta(pg));

// 7. Suspensión con la sesión abierta (fase 8.1): el token dura 10 minutos y no se consulta la cuenta en cada petición.
//    La suspensión surte efecto (a) cuando el token vence y (b) cuando falla la renovación.
pg = await nueva();
await ingresar(pg, correo('suspender'));
caso(ruta(pg) === '/admin', 'Administrador a suspender entra al panel', ruta(pg));
const tSusp = await pg.evaluate(() => localStorage.getItem('cozy:token') ?? JSON.parse(localStorage.getItem('cozy:sesion') ?? '{}').token);
await api('POST', `/admin/usuarios/${susp.id}/suspender`, { token: tSA });
// (a) Suspendida, el token sigue valiendo hasta vencer; al vencer (el reloj de pruebas mide 11 minutos después) deja de valer
const antes = await api('GET', '/auth/me', { token: tSusp });
const vencido = await api('GET', '/auth/me', { token: tSusp, headers: { 'X-Prueba-Token-Ahora': new Date(Date.now() + 11 * 60_000).toISOString() } });
caso(antes.s === 200 && vencido.s === 401, '(a) Cuenta suspendida: su token sigue valiendo hasta vencer y al vencer deja de valer', `${antes.s} → ${vencido.s}`);
// (b) Renovar con la cuenta suspendida falla
const renovar = await api('POST', '/auth/renovar', { token: tSusp });
caso(renovar.s === 403 && renovar.j?.code === 'ACCOUNT_SUSPENDED', '(b) Renovar con la cuenta suspendida: 403 ACCOUNT_SUSPENDED', `${renovar.s} ${renovar.j?.code}`);
// Sin sesión previa, el login explica la suspensión
pg = await nueva();
await ingresar(pg, correo('suspender'));
caso((await pg.getByRole('alert').innerText().catch(() => '')).includes('suspendida'), 'Cuenta suspendida: el login lo explica');

// 8. Sesión antigua sin rol
pg = await nueva();
await ingresar(pg, correo('admin'));
await pg.evaluate(() => { const s = JSON.parse(localStorage.getItem('cozy:sesion')); delete s.rol; delete s.estado; localStorage.setItem('cozy:sesion', JSON.stringify(s)); });
await pg.goto(W + '/admin', { waitUntil: 'networkidle' }); await pg.waitForTimeout(1000);
const rolGuardado = await pg.evaluate(() => JSON.parse(localStorage.getItem('cozy:sesion')).rol);
caso(ruta(pg) === '/admin' && rolGuardado === 'administrador', 'Sesión antigua sin rol: se completa con /auth/me', `rol=${rolGuardado}`);
await pg.goto(W + '/cuenta/reservas', { waitUntil: 'networkidle' }); await abrirMenuUsuario(pg);
caso((await pg.getByText('Panel de administración').count()) > 0, 'Administrador: el menú de usuario ofrece el panel');

// 9. Teléfono
pg = await nueva({ width: 390, height: 844 });
await ingresar(pg, correo('admin'));
const visibleAntes = await pg.locator('#menu-admin').evaluate((e) => e.getBoundingClientRect().right > 0);
await pg.getByRole('button', { name: 'Abrir menú' }).click(); await pg.waitForTimeout(400);
const visibleDespues = await pg.locator('#menu-admin').evaluate((e) => e.getBoundingClientRect().right > 0);
await pg.screenshot({ path: 'e2e/capturas/f1-telefono-menu.png' });
await pg.locator('#menu-admin a', { hasText: 'Mi cuenta' }).click(); await pg.waitForTimeout(500);
const cerrado = await pg.locator('#menu-admin').evaluate((e) => e.getBoundingClientRect().right <= 0);
const anchoPagina = await pg.evaluate(() => document.documentElement.scrollWidth);
caso(!visibleAntes && visibleDespues && cerrado && ruta(pg) === '/admin/cuenta', 'Teléfono: el menú abre, navega y se cierra',
  `antes=${visibleAntes} abierto=${visibleDespues} cerrado=${cerrado} ruta=${ruta(pg)}`);
caso(anchoPagina <= 390, 'Teléfono: sin desplazamiento horizontal', `ancho ${anchoPagina}px`);
await pg.screenshot({ path: 'e2e/capturas/f1-telefono-cuenta.png' });

// 10. Sitio público
pg = await nueva();
await pg.goto(W + '/', { waitUntil: 'networkidle' });
caso(pg.api.some((x) => x.startsWith('200 POST /details')) && pg.errores.filter((e) => !e.includes('hero.mp4')).length === 0, 'Sitio público: el inicio carga con la API');

await api('POST', `/admin/usuarios/${susp.id}/reactivar`, { token: tSA });
await b.close();
console.log(`\n${res.filter(Boolean).length}/${res.length} casos OK`);
process.exit(res.every(Boolean) ? 0 : 1);
