// Fase 5 (paginación y filtros combinados): crea 12 reservas reales en un alojamiento y comprueba la paginación en
// pantalla y en la API. Se usa un administrador nuevo para no mezclar con otras pruebas.
import { chromium } from 'playwright';
import { randomUUID } from 'node:crypto';
const W = process.env.COZY_WEB ?? 'http://localhost:5173', A = process.env.COZY_API ?? 'http://localhost:3000/api/v1';
const api = async (m, r, { token, body, headers = {} } = {}) => {
  const x = await fetch(A + r, { method: m, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }), ...headers }, body: body && JSON.stringify(body) });
  const t = await x.text();
  return { s: x.status, j: t ? JSON.parse(t) : null };
};
const sfx = Date.now().toString(36), clave = 'Clave-prueba-123';
const res = [];
const caso = (ok, n, nota = '') => { res.push(ok); console.log(`${ok ? 'OK   ' : 'FALLA'} ${n}${nota ? ' — ' + nota : ''}`); };

const tSA = (await api('POST', '/auth/login', { body: { email: process.env.SA_EMAIL, password: process.env.SA_PASSWORD } })).j.access_token;
const u = (await api('POST', '/auth/registro', { body: { email: `pag.${sfx}@prueba.test`, password: clave, nombre: 'Pag', apellido: sfx, rol: 'administrador' } })).j;
await api('POST', `/admin/usuarios/${u.id}/aprobar`, { token: tSA });
const tok = (await api('POST', '/auth/login', { body: { email: `pag.${sfx}@prueba.test`, password: clave } })).j.access_token;
// Ciudad del seed, buscada por nombre: no se asume su id. Si no está, la prueba no sigue.
const ciudades = (await api('GET', '/admin/ciudades', { token: tSA })).j;
const ciudadSeed = Array.isArray(ciudades) ? ciudades.find((c) => c.nombre === 'Quito') : undefined;
if (!ciudadSeed) { console.log('FALLA Falta la ciudad del seed «Quito»: corre el seed sobre esta base. La prueba no continúa.'); process.exit(1); }
const aloj = (await api('POST', '/admin/alojamientos', { token: tok, body: { nombre: `Pag F5 ${sfx}`, ciudadId: ciudadSeed.id, precioPorNoche: 10, capacidadAdultos: 2, capacidadNinos: 0, tienePiscina: false } })).j;
const hab = (await api('POST', `/admin/alojamientos/${aloj.id}/habitaciones`, { token: tok, body: { nombre: 'Pag', tipo: 'doble', capacidadAdultos: 2, capacidadNinos: 0, precioBase: 10 } })).j;
const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const dia = (n) => new Date(Date.parse(hoy + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
await api('PATCH', `/admin/habitaciones/${hab.id}/disponibilidad`, { token: tok, body: { desde: dia(60), hasta: dia(80), cuposTotales: 20, precio: 10 } });
for (let i = 0; i < 12; i++) {
  const pv = await api('POST', '/orders/preview', { body: { accommodation_id: aloj.id, product_id: `${hab.id}:${dia(60 + i)}:${dia(61 + i)}`, guests: { number_of_adults: 1, number_of_rooms: 1 } } });
  const o = await api('POST', '/orders/create', { headers: { 'Idempotency-Key': randomUUID() }, body: { order_preview_id: pv.j.data.order_preview_id, payment_reference: 'PAY-SIM-PAG', customer_details: { first_name: 'P' + i, last_name: 'Pag', email: `p${i}.${sfx}@prueba.test` } } });
  if (o.s !== 201) throw new Error('reserva ' + o.s);
}

const b = await chromium.launch(); // con CORS real: el navegador de prueba no lo desactiva
const pg = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errores = [];
pg.on('pageerror', (e) => errores.push(e.message));
await pg.goto(W + '/ingresar', { waitUntil: 'networkidle' });
const i = pg.locator('main input');
await i.nth(0).fill(`pag.${sfx}@prueba.test`); await i.nth(1).fill(clave);
await pg.getByRole('button', { name: /^Ingresar$/ }).last().click(); await pg.waitForTimeout(1500);
await pg.goto(W + `/admin/reservas?alojamiento=${aloj.id}`, { waitUntil: 'networkidle' }); await pg.waitForTimeout(800);
const c1 = await pg.locator('#lista-reservas li').count();
const nav = pg.getByRole('navigation', { name: 'Páginas' });
const txt1 = await nav.innerText();
await pg.getByRole('button', { name: 'Siguiente' }).click(); await pg.waitForTimeout(700);
const c2 = await pg.locator('#lista-reservas li').count();
const txt2 = await nav.innerText();
await pg.getByRole('tab', { name: 'Confirmadas' }).click(); await pg.waitForTimeout(700);
const pagConfirm = await pg.getByText(/Página 1 de/).count();

caso(c1 === 10 && /Página 1 de 2 · 12 reservas/.test(txt1), 'Paginación: la primera página trae 10 y dice "Página 1 de 2 · 12 reservas"', `${c1} filas`);
caso(c2 === 2 && /Página 2 de 2/.test(txt2), 'Paginación: la segunda página trae las 2 que faltan', `${c2} filas`);
caso(pagConfirm === 1, 'Paginación: se mantiene al cambiar de filtro');
caso(errores.length === 0, 'Paginación: sin errores de página', errores.join(' / '));

const p2 = await api('GET', `/admin/reservas?alojamientoId=${aloj.id}&page=2&limit=10`, { token: tok });
caso(p2.j.data.length === 2 && p2.j.meta.totalItems === 12, 'API: page=2 devuelve 2 y total 12 con alojamientoId');
const comb = await api('GET', `/admin/reservas?alojamientoId=${aloj.id}&estado=CONFIRMED&limit=100`, { token: tok });
const todas = await api('GET', `/admin/reservas?alojamientoId=${aloj.id}&limit=100`, { token: tok });
caso(comb.j.meta.totalItems === 12 && todas.j.meta.totalItems === 12, 'API: estado y alojamiento se combinan (12 confirmadas de 12)');

await b.close();
console.log(`\n${res.filter(Boolean).length}/${res.length} casos OK`);
process.exit(res.every(Boolean) ? 0 : 1);
