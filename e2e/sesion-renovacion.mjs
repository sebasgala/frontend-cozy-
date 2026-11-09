// Renovación del token en el navegador (fase 8.1): el token dura 10 minutos y la página lo renueva sola.
//
// Requiere la API con V2_CABECERAS_PRUEBA=true: X-Prueba-Token-Ahora mueve el instante con que el servidor mide el vencimiento
// del token, y así se provocan 401 reales sin esperar 10 minutos. El reloj de la página se adelanta con page.clock de Playwright.
//
// Límite de la simulación: el reloj del servidor no se adelanta, así que el token renovado (que el servidor emite con su hora
// real) queda "en el futuro" para la página. Por eso, tras la primera renovación, la página renueva cada 15 segundos (la espera
// mínima); no afecta a lo que se comprueba aquí.
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
const reg = async (n) => (await api('POST', '/auth/registro', { body: { email: correo(n), password: clave, nombre: 'Prueba', apellido: n, rol: 'cliente' } })).j;
await reg('uno');
const dos = await reg('dos');
await reg('tres');

const b = await chromium.launch();
const res = [];
const caso = (ok, n, nota = '') => { res.push(ok); console.log(`${ok ? 'OK   ' : 'FALLA'} ${n}${nota ? ' — ' + nota : ''}`); };
const nueva = async () => {
  const pg = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
  await pg.clock.install(); // el reloj de la página corre normal hasta que se lo adelanta
  pg.errores = []; pg.api = [];
  pg.on('pageerror', (e) => pg.errores.push(e.message));
  pg.on('response', (r) => r.url().startsWith(A) && pg.api.push(`${r.status()} ${r.request().method()} ${r.url().slice(A.length)}`));
  return pg;
};
const ingresar = async (pg, email) => {
  await pg.goto(W + '/ingresar', { waitUntil: 'networkidle' });
  const i = pg.locator('main input');
  await i.nth(0).fill(email); await i.nth(1).fill(clave);
  await pg.getByRole('button', { name: /^Ingresar$/ }).last().click();
  await pg.waitForTimeout(1500); await pg.waitForLoadState('networkidle');
};
const decodificar = (t) => JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString());
const token = (pg) => pg.evaluate(() => localStorage.getItem('cozy:token'));
const sinSesion = (pg) => pg.evaluate(() => !localStorage.getItem('cozy:sesion') && !localStorage.getItem('cozy:token'));
const desdeElMenu = async (pg, opcion) => {
  await pg.getByRole('button', { name: /^Cuenta de/ }).click();
  await pg.getByRole('menuitem', { name: opcion }).click();
  await pg.waitForTimeout(1200); await pg.waitForLoadState('networkidle');
};
const hasta = async (fn, ms = 8000) => {
  const fin = Date.now() + ms;
  while (Date.now() < fin) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 150)); }
  return false;
};
const min = (n) => n * 60_000;
const mas11 = () => new Date(Date.now() + min(11)).toISOString();
const ruta = (pg) => new URL(pg.url()).pathname;
const pideLogin = async (pg) => (await pg.locator('main').innerText()).includes('Ingresa a tu cuenta');

// ── 1. Sesión larga: la página renueva sola y la sesión pasa de los 10 minutos ──
let pg = await nueva();
await ingresar(pg, correo('uno'));
const t0 = await token(pg), c0 = decodificar(t0);
caso(c0.exp - c0.iat === 600, 'El token que guarda el navegador dura 10 minutos', `${c0.exp - c0.iat} s`);

const renovo = pg.waitForResponse((r) => r.url().endsWith('/auth/renovar') && r.request().method() === 'POST');
await pg.clock.fastForward(min(8.5));
const r1 = await renovo;
await pg.waitForTimeout(500);
const t1 = await token(pg), c1 = decodificar(t1);
caso(r1.status() === 200 && t1 !== t0 && c1.exp >= c0.exp, 'A los 8 minutos del reloj de la página renueva sola (POST /auth/renovar 200) y guarda un token nuevo',
  `${r1.status()}, token distinto: ${t1 !== t0}, vence ${c1.exp - c0.exp} s después`);

await pg.clock.fastForward(min(3));
const minutos = ((await pg.evaluate(() => Date.now())) - c0.iat * 1000) / 60_000;
// Tras ingresar la app ya está en Mis reservas: se sale y se vuelve para que pida la lista con el token de ahora
await desdeElMenu(pg, 'Favoritos');
const marca = pg.api.length;
await desdeElMenu(pg, 'Mis reservas');
const tras = pg.api.slice(marca);
caso(minutos > 11 && ruta(pg) === '/cuenta/reservas' && !(await pideLogin(pg)) && tras.some((x) => x.startsWith('200 GET /cuenta/reservas')),
  'Pasados 11 minutos desde el inicio de sesión, la sesión sigue activa: Mis reservas carga con la sesión', `reloj de la página +${minutos.toFixed(1)} min, ${tras.filter((x) => x.includes('cuenta/reservas')).join(' | ')}`);
const viejo = await api('GET', '/auth/me', { token: t0, headers: { 'X-Prueba-Token-Ahora': mas11() } });
caso(viejo.s === 401, 'Sin la renovación, el token del inicio de sesión ya habría vencido (el servidor lo mide 11 minutos después: 401)', String(viejo.s));

// ── 2. Un 401 suelto: renueva una vez y reintenta, sin cerrar la sesión ──
let negada = false;
await pg.route((u) => u.pathname === new URL(A).pathname + '/cuenta/reservas', (route) => {
  if (negada || route.request().method() !== 'GET') return route.continue();
  negada = true; // el servidor mide el token 11 minutos después: 401 real
  return route.continue({ headers: { ...route.request().headers(), 'x-prueba-token-ahora': mas11() } });
});
const antes = await token(pg);
await desdeElMenu(pg, 'Favoritos');
const marca2 = pg.api.length;
await desdeElMenu(pg, 'Mis reservas');
const sec = pg.api.slice(marca2).filter((x) => x.includes('cuenta/reservas') || x.includes('auth/renovar'));
const i401 = sec.findIndex((x) => x.startsWith('401 GET /cuenta/reservas')), iRen = sec.findIndex((x) => x.startsWith('200 POST /auth/renovar'));
const i200 = sec.findLastIndex((x) => x.startsWith('200 GET /cuenta/reservas'));
caso(negada && i401 >= 0 && iRen > i401 && i200 > iRen && (await token(pg)) !== antes && !(await pideLogin(pg)),
  'Un 401 con la sesión abierta: renueva una vez, reintenta la petición y la sesión sigue', sec.join(' → '));

// ── 3. Cuenta suspendida: la renovación da 403 y la sesión se cierra ──
pg = await nueva();
await ingresar(pg, correo('dos'));
await desdeElMenu(pg, 'Mis reservas');
caso(ruta(pg) === '/cuenta/reservas' && !(await pideLogin(pg)), 'Cuenta a suspender: entra y ve Mis reservas', ruta(pg));
await api('POST', `/admin/usuarios/${dos.id}/suspender`, { token: tSA });
const renovo2 = pg.waitForResponse((r) => r.url().endsWith('/auth/renovar') && r.request().method() === 'POST');
await pg.clock.fastForward(min(8.5));
const r2 = await renovo2;
const cerro2 = await hasta(() => sinSesion(pg));
await pg.waitForTimeout(500);
caso(r2.status() === 403 && cerro2 && (await pideLogin(pg)), 'Cuenta suspendida: la renovación responde 403 y se cierra la sesión', `${r2.status()}, sesión cerrada: ${cerro2}`);

// ── 4. Renovación que responde 401: se cierra la sesión ──
pg = await nueva();
await ingresar(pg, correo('tres'));
await desdeElMenu(pg, 'Mis reservas');
await pg.route((u) => u.pathname === new URL(A).pathname + '/auth/renovar', (route) =>
  route.continue({ headers: { ...route.request().headers(), 'x-prueba-token-ahora': mas11() } }));
const renovo3 = pg.waitForResponse((r) => r.url().endsWith('/auth/renovar') && r.request().method() === 'POST');
await pg.clock.fastForward(min(8.5));
const r3 = await renovo3;
const cerro3 = await hasta(() => sinSesion(pg));
await pg.waitForTimeout(500);
caso(r3.status() === 401 && cerro3 && (await pideLogin(pg)), 'Renovación con el token vencido: responde 401 y se cierra la sesión', `${r3.status()}, sesión cerrada: ${cerro3}`);

await b.close();
console.log(`\n${res.filter(Boolean).length}/${res.length} casos OK`);
process.exit(res.every(Boolean) ? 0 : 1);
