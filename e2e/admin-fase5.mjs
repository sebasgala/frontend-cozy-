import { chromium } from 'playwright';
import { randomUUID } from 'node:crypto';
const W = process.env.COZY_WEB ?? 'http://localhost:5173', A = process.env.COZY_API ?? 'http://localhost:3000/api/v1';
const api = async (m, r, { token, body, headers = {} } = {}) => {
  const x = await fetch(A + r, { method: m, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }), ...headers }, body: body && JSON.stringify(body) });
  const t = await x.text();
  return { s: x.status, j: t ? JSON.parse(t) : null };
};
const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const dia = (n) => new Date(Date.parse(hoy + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const sfx = Date.now().toString(36), clave = 'Clave-prueba-123';
const correo = (n) => `${n}.${sfx}@prueba.test`;
const tSA = (await api('POST', '/auth/login', { body: { email: process.env.SA_EMAIL, password: process.env.SA_PASSWORD } })).j.access_token;
const crearAdmin = async (n) => {
  const u = (await api('POST', '/auth/registro', { body: { email: correo(n), password: clave, nombre: 'Admin', apellido: n + sfx, rol: 'administrador' } })).j;
  await api('POST', `/admin/usuarios/${u.id}/aprobar`, { token: tSA });
  return { ...u, token: (await api('POST', '/auth/login', { body: { email: correo(n), password: clave } })).j.access_token };
};
const adminA = await crearAdmin('resA');
const adminB = await crearAdmin('resB');
// Ciudad del seed, buscada por nombre: no se asume su id. Si no está, la prueba no sigue.
const ciudades = (await api('GET', '/admin/ciudades', { token: tSA })).j;
const ciudadSeed = Array.isArray(ciudades) ? ciudades.find((c) => c.nombre === 'Quito') : undefined;
if (!ciudadSeed) { console.log('FALLA Falta la ciudad del seed «Quito»: corre el seed sobre esta base. La prueba no continúa.'); process.exit(1); }
const aloj = (await api('POST', '/admin/alojamientos', { token: adminA.token, body: { nombre: `Hostal F5 ${sfx}`, ciudadId: ciudadSeed.id, precioPorNoche: 50, capacidadAdultos: 2, capacidadNinos: 0, tienePiscina: false } })).j;
const hab = (await api('POST', `/admin/alojamientos/${aloj.id}/habitaciones`, { token: adminA.token, body: { nombre: 'Doble F5', tipo: 'doble', capacidadAdultos: 2, capacidadNinos: 0, precioBase: 50 } })).j;
await api('PATCH', `/admin/habitaciones/${hab.id}/disponibilidad`, { token: adminA.token, body: { desde: dia(20), hasta: dia(40), cuposTotales: 5, precio: 50 } });

// 3 reservas reales con cuenta/sin cuenta: se hacen con el flujo público (sin token, compra sin cuenta)
const reservar = async (noches, nombre, apellido, email) => {
  const pv = await api('POST', '/orders/preview', { body: { accommodation_id: aloj.id, product_id: `${hab.id}:${dia(20 + noches * 0)}:${dia(20 + noches)}`, guests: { number_of_adults: 2, number_of_rooms: 1 } } });
  const o = await api('POST', '/orders/create', { headers: { 'Idempotency-Key': randomUUID() }, body: { order_preview_id: pv.j.data.order_preview_id, payment_reference: 'PAY-SIM-F5', customer_details: { first_name: nombre, last_name: apellido, email } } });
  if (o.s !== 201) throw new Error('reserva ' + o.s + ' ' + JSON.stringify(o.j));
  return o.j;
};
const r1 = await reservar(2, 'Ana', 'Pérez' + sfx, correo('ana'));
const r2 = await reservar(3, 'Luis', 'Mora' + sfx, correo('luis'));
const r3 = await reservar(1, 'Sofía', 'Vega' + sfx, correo('sofia'));
// Una de ellas, cancelada por la API antes de probar la pantalla
await api('POST', `/admin/reservas/${r3.order_id}/cancelar`, { token: adminA.token });

const b = await chromium.launch(); // con CORS real: el navegador de prueba no lo desactiva
const res = [];
const caso = (ok, n, nota = '') => { res.push(ok); console.log(`${ok ? 'OK   ' : 'FALLA'} ${n}${nota ? ' — ' + nota : ''}`); };
const nueva = async (vp = { width: 1440, height: 900 }) => {
  const pg = await (await b.newContext({ viewport: vp })).newPage();
  pg.errores = []; pg.api = [];
  pg.on('pageerror', (e) => pg.errores.push(e.message));
  pg.on('console', (m) => m.type() === 'error' && !m.text().includes('status of 4') && pg.errores.push(m.text()));
  pg.on('response', (r) => r.url().startsWith(A) && pg.api.push(`${r.status()} ${r.request().method()} ${r.url().slice(A.length)}`));
  return pg;
};
const ingresar = async (pg, email, pass = clave) => {
  await pg.goto(W + '/ingresar', { waitUntil: 'networkidle' });
  const i = pg.locator('main input');
  await i.nth(0).fill(email); await i.nth(1).fill(pass);
  await pg.getByRole('button', { name: /^Ingresar$/ }).last().click();
  await pg.waitForTimeout(1500); await pg.waitForLoadState('networkidle');
};
const ruta = (pg) => new URL(pg.url()).pathname + new URL(pg.url()).search;
const esperar = async (pg) => { await pg.waitForLoadState('networkidle'); await pg.waitForTimeout(350); await pg.locator('[aria-busy="true"]').first().waitFor({ state: 'detached', timeout: 8000 }).catch(() => {}); };
const tarjeta = (pg, loc) => pg.locator('#lista-reservas li', { hasText: loc });
const chip = (pg, n) => pg.getByRole('tab', { name: new RegExp('^' + n) });

// ═══ Administrador A ═══
const pg = await nueva();
await ingresar(pg, correo('resA'));
await pg.goto(W + '/admin/reservas', { waitUntil: 'networkidle' }); await esperar(pg);
caso((await tarjeta(pg, r1.locator).count()) === 1 && (await tarjeta(pg, r2.locator).count()) === 1 && (await tarjeta(pg, r3.locator).count()) === 1, 'Lista: muestra las 3 reservas de sus alojamientos');
const tr1 = await tarjeta(pg, r1.locator).innerText();
caso(tr1.includes('Ana') && tr1.includes(correo('ana')) && tr1.includes('Compra sin cuenta') && tr1.includes('Confirmada') && tr1.includes('Doble F5'), 'Tarjeta: huésped, correo, origen de la compra, estado y habitación', tr1.replace(/\s+/g, ' ').slice(0, 170));
caso(tr1.includes('2 noches') && tr1.includes('1 habitación') && tr1.includes('$100'), 'Tarjeta: noches, habitaciones y total ($100 = 2 noches × $50)');
caso((await tarjeta(pg, r3.locator).innerText()).includes('Cancelada') && (await tarjeta(pg, r3.locator).innerText()).includes('Sin acciones'), 'Reserva cancelada: sin botón de cancelar');
caso((await tarjeta(pg, r2.locator).getByRole('button', { name: 'Cancelar reserva' }).count()) === 1, 'Reserva confirmada: tiene botón Cancelar reserva');

// Filtros
await chip(pg, 'Confirmadas').click(); await esperar(pg);
const confirmadas = await pg.locator('#lista-reservas li').allInnerTexts();
caso(confirmadas.length >= 2 && confirmadas.every((t) => t.includes('Confirmada')), 'Filtro Confirmadas: solo confirmadas', `${confirmadas.length} filas`);
await chip(pg, 'Canceladas').click(); await esperar(pg);
caso((await pg.locator('#lista-reservas li').allInnerTexts()).every((t) => t.includes('Cancelada')) && (await tarjeta(pg, r3.locator).count()) === 1, 'Filtro Canceladas: solo canceladas');
await chip(pg, 'Todas').click(); await esperar(pg);
await pg.getByLabel('Alojamiento').selectOption({ label: aloj.nombre }); await esperar(pg);
caso(ruta(pg).includes(`alojamiento=${aloj.id}`) && (await pg.locator('#lista-reservas li').count()) >= 3, 'Filtro por alojamiento: queda en la URL y muestra sus reservas');
await chip(pg, 'Confirmadas').click(); await esperar(pg);
caso(ruta(pg).includes(`alojamiento=${aloj.id}`) && ruta(pg).includes('estado') === false, 'Los filtros se combinan sin perder el alojamiento');
await pg.goto(W + `/admin/reservas?alojamiento=${aloj.id}`, { waitUntil: 'networkidle' }); await esperar(pg);
caso((await pg.getByLabel('Alojamiento').inputValue()) === String(aloj.id), 'Un enlace con ?alojamiento= deja el filtro elegido');

// Paginación (limit 10 en la pantalla; con 3 reservas no hay más de una página: se prueba el estado vacío)
await pg.goto(W + '/admin/reservas', { waitUntil: 'networkidle' }); await esperar(pg);
caso((await pg.getByRole('navigation', { name: 'Páginas' }).count()) === 0, 'Pocas reservas: sin paginación');
await pg.goto(W + '/admin/reservas?alojamiento=999999', { waitUntil: 'networkidle' }); await esperar(pg);
caso((await pg.locator('main').innerText()).includes('Todavía no hay reservas') || (await pg.locator('main').innerText()).includes('No hay reservas'), 'Sin reservas: mensaje vacío');

// Cancelar con confirmación
await pg.goto(W + '/admin/reservas', { waitUntil: 'networkidle' }); await esperar(pg);
await tarjeta(pg, r2.locator).getByRole('button', { name: 'Cancelar reserva' }).click();
const dlg = pg.getByRole('dialog');
caso((await dlg.count()) === 1 && (await dlg.innerText()).includes(r2.locator) && (await dlg.innerText()).includes('Luis'), 'Cancelar pide confirmación con localizador y huésped');
await dlg.getByRole('button', { name: 'Volver' }).click();
caso((await dlg.count()) === 0 && (await tarjeta(pg, r2.locator).innerText()).includes('Confirmada'), 'Volver no cancela nada');
pg.api.length = 0;
await tarjeta(pg, r2.locator).getByRole('button', { name: 'Cancelar reserva' }).click();
await pg.getByRole('dialog').getByRole('button', { name: 'Cancelar reserva' }).click(); await esperar(pg);
caso(pg.api.some((x) => x.startsWith(`200 POST /admin/reservas/${r2.order_id}/cancelar`)), 'Confirmar llama a POST /cancelar (200)');
caso((await pg.getByText(`Cancelaste la reserva ${r2.locator}.`).count()) === 1, 'Muestra el aviso de cancelación');
const estadoApi = (await api('GET', `/admin/reservas?estado=CANCELLED&limit=100`, { token: adminA.token })).j.data.find((x) => x.order_id === r2.order_id);
caso(!!estadoApi, 'La API la tiene como cancelada');
const disp = (await api('GET', `/admin/habitaciones/${hab.id}/disponibilidad?desde=${dia(22)}&hasta=${dia(24)}`, { token: adminA.token })).j.dias;
caso(disp.every((d) => d.cupos === 5), 'Cancelar devolvió los cupos (vuelven a 5 libres)', disp.map((d) => d.cupos).join(','));
caso((await tarjeta(pg, r2.locator).getByRole('button').count()) === 0, 'Ya cancelada: sin botón');

// Cancelar dos veces no devuelve cupos dos veces (idempotencia de la API)
const otra = await api('POST', `/admin/reservas/${r2.order_id}/cancelar`, { token: adminA.token });
const disp2 = (await api('GET', `/admin/habitaciones/${hab.id}/disponibilidad?desde=${dia(22)}&hasta=${dia(24)}`, { token: adminA.token })).j.dias;
caso(otra.s === 200 && disp2.every((d) => d.cupos === 5), 'Cancelar otra vez: 200 y sin devolver cupos de nuevo', `${otra.s}`);

// Cancelar sobre lo ajeno desde la API: 404
const ajena = await api('POST', `/admin/reservas/${r1.order_id}/cancelar`, { token: adminB.token });
caso(ajena.s === 404 && ajena.j.code === 'NOT_FOUND', 'B no puede cancelar la reserva de A: 404 NOT_FOUND', `${ajena.s}`);
caso((await api('GET', `/admin/reservas?limit=100`, { token: adminA.token })).j.data.find((x) => x.order_id === r1.order_id).status === 'CONFIRMED', 'La reserva de A sigue confirmada tras el intento de B');

caso(pg.errores.length === 0, 'Administrador A: sin errores de consola', pg.errores.join(' / '));

// ═══ Administrador B: ve solo lo suyo (nada) ═══
const pb = await nueva();
await ingresar(pb, correo('resB'));
await pb.goto(W + '/admin/reservas', { waitUntil: 'networkidle' }); await esperar(pb);
caso((await pb.locator('main').innerText()).includes('Todavía no hay reservas') && (await tarjeta(pb, r1.locator).count()) === 0, 'B: no ve las reservas de A');
caso(pb.errores.length === 0, 'Administrador B: sin errores de consola', pb.errores.join(' / '));

// ═══ Superadmin: ve todas ═══
const ps = await nueva();
await ingresar(ps, process.env.SA_EMAIL, process.env.SA_PASSWORD);
await ps.goto(W + '/admin/reservas', { waitUntil: 'networkidle' }); await esperar(ps);
caso((await ps.locator('main').innerText()).includes('Reservas de todos los alojamientos'), 'Superadmin: la pantalla indica que ve todas');
caso((await tarjeta(ps, r1.locator).count()) === 1, 'Superadmin: ve las reservas de A');
caso(ps.errores.length === 0, 'Superadmin: sin errores de consola', ps.errores.join(' / '));

// ═══ Teléfono ═══
const tel = await nueva({ width: 390, height: 844 });
await ingresar(tel, correo('resA'));
await tel.goto(W + '/admin/reservas', { waitUntil: 'networkidle' }); await esperar(tel);
const ancho = await tel.evaluate(() => document.documentElement.scrollWidth);
caso(ancho <= 390, 'Teléfono: sin desplazamiento horizontal', `${ancho}px`);
await tel.screenshot({ path: 'e2e/capturas/f5-telefono.png', fullPage: true });

await pg.screenshot({ path: 'e2e/capturas/f5-reservas.png', fullPage: true });
await b.close();
console.log(`\n${res.filter(Boolean).length}/${res.length} casos OK`);
process.exit(res.every(Boolean) ? 0 : 1);
