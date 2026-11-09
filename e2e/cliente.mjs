// Recorrido del cliente: registro, reserva y pago, mis reservas, detalle, consulta sin cuenta, cancelación y login
// con clave incorrecta. Es la parte "cliente" de la línea base: si falla algo aquí, el sitio público se rompió.
// Usa el alojamiento «Mirador Andino» del seed, que busca por nombre con las credenciales del superadmin (SA_EMAIL y
// SA_PASSWORD): su id depende de la base.
import { chromium } from 'playwright';
const W = process.env.COZY_WEB ?? 'http://localhost:5173', A = process.env.COZY_API ?? 'http://localhost:3000/api/v1';
const res = [];
const caso = (ok, n, nota = '') => { res.push(ok); console.log(`${ok ? 'OK   ' : 'FALLA'} ${n}${nota ? ' — ' + nota : ''}`); };
const dia = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const sfx = Date.now().toString(36), correo = `ana.${sfx}@prueba.test`, clave = 'Clave-prueba-123';

// Alojamiento del seed, buscado por nombre con el listado del superadmin. Si no está, la prueba no sigue.
const api = async (m, r, { token, body } = {}) => {
  const x = await fetch(A + r, { method: m, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) }, body: body && JSON.stringify(body) });
  const t = await x.text();
  return { s: x.status, j: t ? JSON.parse(t) : null };
};
const NOMBRE_ALOJ_SEED = 'Mirador Andino';
const tSA = (await api('POST', '/auth/login', { body: { email: process.env.SA_EMAIL, password: process.env.SA_PASSWORD } })).j?.access_token;
let alojSeed;
for (let pagina = 1, paginas = 1; tSA && !alojSeed && pagina <= paginas; pagina++) {
  const r = await api('GET', `/admin/alojamientos?limit=100&page=${pagina}`, { token: tSA });
  if (r.s !== 200) { console.log(`FALLA GET /admin/alojamientos respondió ${r.s} al buscar el alojamiento del seed`); process.exit(1); }
  alojSeed = r.j.data.find((a) => a.nombre === NOMBRE_ALOJ_SEED);
  paginas = r.j.meta.totalPages;
}
if (!tSA) { console.log('FALLA No se pudo iniciar sesión como superadmin para buscar el alojamiento del seed (SA_EMAIL y SA_PASSWORD). La prueba no continúa.'); process.exit(1); }
if (!alojSeed) { console.log(`FALLA Falta el alojamiento del seed «${NOMBRE_ALOJ_SEED}»: corre el seed sobre esta base. La prueba no continúa.`); process.exit(1); }

const b = await chromium.launch(); // con CORS real: el navegador de prueba no lo desactiva
const pg = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
let log = [], consola = [];
const registrar = (page, lista) => page.on('response', (r) => { if (r.url().startsWith(A)) lista.push(`${r.status()} ${r.request().method()} ${r.url().replace(A, '')}`); });
registrar(pg, log);
pg.on('console', (m) => m.type() === 'error' && !/status of (4|5)\d\d|Failed to load resource/.test(m.text()) && consola.push(m.text().slice(0, 140)));
pg.on('pageerror', (e) => consola.push('PAGEERROR ' + e.message.slice(0, 140)));
const tiene = (p) => log.some((l) => l.startsWith(p));
const idle = () => pg.waitForLoadState('networkidle').catch(() => {});
// Esperas por algo real, con tope de 15 s: nunca un tiempo fijo. Si lo esperado no llega, no se lanza error: el caso lo marca FALLA.
const TOPE = 15000;
const respuesta = (page, metodo, ruta) => page.waitForResponse((r) => r.request().method() === metodo && r.url().startsWith(A + ruta), { timeout: TOPE }).catch(() => null);
const visible = (loc) => loc.first().waitFor({ state: 'visible', timeout: TOPE }).catch(() => null);
const texto = async (p = pg) => (await p.locator('main').last().innerText()).replace(/\s+/g, ' ');

// A. Registro con inicio de sesión automático
await pg.goto(W + '/registro', { waitUntil: 'networkidle' }); log.length = 0;
const ri = pg.locator('main input'); const rv = ['Ana', 'Prueba', correo, clave];
for (let i = 0; i < 4; i++) await ri.nth(i).fill(rv[i]);
// El registro y el inicio de sesión automático son dos llamadas seguidas: se espera la respuesta real del login y después el
// cambio visible (salir de /registro), no un tiempo fijo.
const respuestaLogin = respuesta(pg, 'POST', '/auth/login');
await pg.getByRole('button', { name: /crear cuenta/i }).last().click();
await respuestaLogin;
await pg.waitForURL((u) => !u.pathname.startsWith('/registro'), { timeout: TOPE }).catch(() => {});
await idle();
caso(tiene('201 POST /auth/registro') && tiene('200 POST /auth/login'), 'Registro: crea la cuenta e inicia sesión', pg.url().replace(W, ''));

// B. Reservar y pagar con sesión
await pg.goto(W + `/alojamientos/${alojSeed.id}?entrada=${dia(30)}&salida=${dia(32)}&huespedes=2`, { waitUntil: 'networkidle' });
await visible(pg.locator('select[aria-label^="Seleccionar cantidad"]'));
await pg.locator('select[aria-label^="Seleccionar cantidad"]').first().selectOption('1');
await pg.getByRole('button', { name: /^Reservar/ }).last().click(); await idle();
await visible(pg.getByRole('button', { name: /continuar al pago/i }));
const ci = pg.locator('main input');
if (!(await ci.nth(0).inputValue())) { const v = ['Ana', 'Prueba', correo]; for (let i = 0; i < 3; i++) await ci.nth(i).fill(v[i]); }
await pg.getByRole('button', { name: /continuar al pago/i }).click(); await idle();
const pi = pg.locator('main input'); const vp = ['4242424242424242', 'Ana Prueba', '12/30', '123'];
for (let i = 0; i < 4; i++) await pi.nth(i).fill(vp[i]);
const respuestaPago = respuesta(pg, 'POST', '/orders/create');
await pg.getByRole('button', { name: /^Pagar/ }).click();
await respuestaPago;
await pg.waitForURL((u) => u.pathname.includes('/reserva/confirmacion'), { timeout: TOPE }).catch(() => {});
await idle();
const loc = new URL(pg.url()).searchParams.get('localizador');
caso(tiene('201 POST /orders/create') && pg.url().includes('/reserva/confirmacion') && !!loc, 'Reservar y pagar: llega a la confirmación con localizador', `localizador ${loc}`);

// C. Mis reservas
log.length = 0;
const respuestaLista = respuesta(pg, 'GET', '/cuenta/reservas');
await pg.goto(W + '/cuenta/reservas', { waitUntil: 'networkidle' });
await respuestaLista; await visible(pg.getByText('Confirmada'));
caso(tiene('200 GET /cuenta/reservas') && (await texto()).includes('Confirmada'), 'Mis reservas: aparece la reserva confirmada');

// D. Detalle
await pg.goto(W + `/cuenta/reservas/${loc}`, { waitUntil: 'networkidle' }); await visible(pg.getByText(loc));
caso((await texto()).includes(loc), 'Detalle: abre la reserva por su localizador');

// E. Consultar sin cuenta, desde un navegador limpio
const p2 = await (await b.newContext()).newPage(); const l2 = []; registrar(p2, l2);
await p2.goto(W + '/consultar-reserva', { waitUntil: 'networkidle' });
const i2 = p2.locator('main input');
await i2.nth(0).fill(loc); await i2.nth(1).fill('otro@prueba.test');
const r404 = respuesta(p2, 'POST', '/cuenta/consultar-reserva');
await p2.getByRole('button', { name: /buscar reserva/i }).click(); await r404; await p2.waitForLoadState('networkidle');
caso(l2.some((x) => x.startsWith('404 POST /cuenta/consultar-reserva')), 'Consulta sin cuenta: un correo que no coincide da 404', l2.join(' | '));
l2.length = 0;
await i2.nth(1).fill(correo);
const r200 = respuesta(p2, 'POST', '/cuenta/consultar-reserva');
await p2.getByRole('button', { name: /buscar reserva/i }).click(); await r200; await p2.waitForLoadState('networkidle');
caso(l2.some((x) => x.startsWith('200 POST /cuenta/consultar-reserva')), 'Consulta sin cuenta: con el correo correcto abre la reserva', p2.url().replace(W, ''));

// F. Cancelar desde la interfaz
log.length = 0;
await pg.goto(W + `/cuenta/reservas/${loc}`, { waitUntil: 'networkidle' });
await visible(pg.getByRole('button', { name: /cancelar/i }));
await pg.getByRole('button', { name: /cancelar/i }).first().click().catch(() => {});
const conf = pg.getByRole('button', { name: /s[ií],? cancelar|confirmar|cancelar reserva/i });
await visible(conf);
if (await conf.count()) {
  const respuestaCancelar = respuesta(pg, 'POST', '/orders/');
  await conf.last().click();
  await respuestaCancelar;
}
await idle(); await visible(pg.getByText(/cancelad/i));
caso(tiene('200 POST /orders/') && (await texto()).toLowerCase().includes('cancelad'), 'Cancelar: la reserva queda cancelada');

// G. Login con clave incorrecta
await pg.goto(W + '/ingresar', { waitUntil: 'networkidle' });
await pg.evaluate(() => localStorage.clear()); await pg.reload({ waitUntil: 'networkidle' }); log.length = 0;
const ii = pg.locator('main input');
await ii.nth(0).fill(correo); await ii.nth(1).fill('clave-equivocada-1');
const respuesta401 = respuesta(pg, 'POST', '/auth/login');
await pg.getByRole('button', { name: /^Ingresar$/ }).last().click(); await respuesta401; await idle();
caso(tiene('401 POST /auth/login'), 'Login con clave incorrecta: 401 y se queda en la pantalla', pg.url().replace(W, ''));

caso(consola.length === 0, 'Recorrido sin errores de consola', consola.join(' / '));
await b.close();
console.log(`\n${res.filter(Boolean).length}/${res.length} casos OK`);
process.exit(res.every(Boolean) ? 0 : 1);
