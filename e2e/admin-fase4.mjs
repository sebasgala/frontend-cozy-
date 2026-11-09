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
const dow = (iso) => new Date(iso + 'T00:00:00Z').getUTCDay();
const sfx = Date.now().toString(36), clave = 'Clave-prueba-123';
const correo = (n) => `${n}.${sfx}@prueba.test`;
const tSA = (await api('POST', '/auth/login', { body: { email: process.env.SA_EMAIL, password: process.env.SA_PASSWORD } })).j.access_token;
const crearAdmin = async (n) => {
  const u = (await api('POST', '/auth/registro', { body: { email: correo(n), password: clave, nombre: 'Admin', apellido: n + sfx, rol: 'administrador' } })).j;
  await api('POST', `/admin/usuarios/${u.id}/aprobar`, { token: tSA });
  return { ...u, token: (await api('POST', '/auth/login', { body: { email: correo(n), password: clave } })).j.access_token };
};
const adminA = await crearAdmin('dispA');
const adminB = await crearAdmin('dispB');
// Ciudad del seed, buscada por nombre: no se asume su id. Si no está, la prueba no sigue.
const ciudades = (await api('GET', '/admin/ciudades', { token: tSA })).j;
const ciudadSeed = Array.isArray(ciudades) ? ciudades.find((c) => c.nombre === 'Quito') : undefined;
if (!ciudadSeed) { console.log('FALLA Falta la ciudad del seed «Quito»: corre el seed sobre esta base. La prueba no continúa.'); process.exit(1); }
const aloj = (await api('POST', '/admin/alojamientos', { token: adminA.token, body: { nombre: `Posada F4 ${sfx}`, ciudadId: ciudadSeed.id, precioPorNoche: 60, capacidadAdultos: 4, capacidadNinos: 2, tienePiscina: false } })).j;

const b = await chromium.launch(); // con CORS real: el navegador de prueba no lo desactiva
const res = [];
const caso = (ok, n, nota = '') => { res.push(ok); console.log(`${ok ? 'OK   ' : 'FALLA'} ${n}${nota ? ' — ' + nota : ''}`); };
const nueva = async (vp = { width: 1440, height: 900 }) => {
  const pg = await (await b.newContext({ viewport: vp })).newPage();
  pg.errores = []; pg.api = []; pg.cuerpos = [];
  pg.on('pageerror', (e) => pg.errores.push(e.message));
  pg.on('console', (m) => m.type() === 'error' && !m.text().includes('status of 4') && pg.errores.push(m.text()));
  pg.on('response', (r) => r.url().startsWith(A) && pg.api.push(`${r.status()} ${r.request().method()} ${r.url().slice(A.length)}`));
  pg.on('request', (r) => r.url().includes('/disponibilidad') && r.method() === 'PATCH' && pg.cuerpos.push(JSON.parse(r.postData())));
  return pg;
};
const ingresar = async (pg, email, pass = clave) => {
  await pg.goto(W + '/ingresar', { waitUntil: 'networkidle' });
  const i = pg.locator('main input');
  await i.nth(0).fill(email); await i.nth(1).fill(pass);
  await pg.getByRole('button', { name: /^Ingresar$/ }).last().click();
  await pg.waitForTimeout(1500); await pg.waitForLoadState('networkidle');
};
const ruta = (pg) => new URL(pg.url()).pathname;
const esperar = async (pg) => { await pg.waitForLoadState('networkidle'); await pg.waitForTimeout(350); await pg.locator('[aria-busy="true"]').first().waitFor({ state: 'detached', timeout: 8000 }).catch(() => {}); };
const lbl = (pg, t) => pg.getByLabel(new RegExp('^' + t));
const fila = (pg, t) => pg.locator('#lista-habitaciones li', { hasText: t });
const celda = (pg, f) => pg.locator(`[data-fecha="${f}"]`);
const diasApi = async (habId, desde, hasta, token = adminA.token) => (await api('GET', `/admin/habitaciones/${habId}/disponibilidad?desde=${desde}&hasta=${hasta}`, { token })).j;

// ═══ Habitaciones ═══
const pg = await nueva();
await ingresar(pg, correo('dispA'));
await pg.goto(W + `/admin/habitaciones?alojamiento=${aloj.id}`, { waitUntil: 'networkidle' }); await esperar(pg);
caso((await pg.locator('main').innerText()).includes('todavía no tiene habitaciones') && (await pg.getByRole('link', { name: 'Agregar la primera' }).count()) === 1, 'Habitaciones: alojamiento sin habitaciones con invitación');
await pg.getByRole('link', { name: 'Nueva habitación' }).click(); await esperar(pg);
caso(ruta(pg) === '/admin/habitaciones/nueva' && (await lbl(pg, 'Alojamiento').inputValue()) === String(aloj.id), 'Nueva habitación: el alojamiento viene elegido');
await pg.getByRole('button', { name: 'Crear habitación' }).click(); await pg.waitForTimeout(300);
const al = (await pg.getByRole('alert').allInnerTexts()).join(' | ');
caso(/al menos 2 caracteres/.test(al) && /tipo/.test(al) && /precio de 0 o más/.test(al) && !pg.api.some((x) => x.includes('POST /admin/alojamientos')), 'Nueva habitación: valida nombre, tipo y precio sin llamar a la API');
await lbl(pg, 'Nombre').fill('Doble Prueba'); await lbl(pg, 'Tipo').fill('doble');
await lbl(pg, 'Adultos').fill('2'); await lbl(pg, 'Niños').fill('1'); await lbl(pg, 'Precio base').fill('70,5');
await lbl(pg, 'Plan de comidas').selectOption({ label: 'Desayuno incluido' }); await lbl(pg, 'Cancelación').selectOption({ label: 'Cancelación gratuita' });
await pg.getByRole('button', { name: 'Crear habitación' }).click(); await esperar(pg);
caso(ruta(pg) === '/admin/habitaciones' && (await pg.getByText(/^Creaste Doble Prueba\. Ahora carga/).count()) === 1, 'Crear: vuelve a la lista y sugiere cargar la disponibilidad');
const habs1 = (await api('GET', `/admin/alojamientos/${aloj.id}/habitaciones`, { token: adminA.token })).j;
const doble = habs1.find((h) => h.nombre === 'Doble Prueba');
caso(doble && doble.precioBase === 70.5 && doble.mealPlan === 'breakfast_included' && doble.cancellationType === 'free_cancellation' && doble.activo, 'Crear: la API guardó precio con coma y los códigos de plan y cancelación', JSON.stringify({ p: doble?.precioBase, m: doble?.mealPlan }));
caso((await fila(pg, 'Doble Prueba').innerText()).includes('Desayuno incluido') && (await fila(pg, 'Doble Prueba').innerText()).includes('Activa'), 'Crear: la fila muestra las etiquetas en español');
await pg.goto(W + `/admin/habitaciones/nueva?alojamiento=${aloj.id}`, { waitUntil: 'networkidle' }); await esperar(pg);
await lbl(pg, 'Nombre').fill('Suite Prueba'); await lbl(pg, 'Tipo').fill('suite'); await lbl(pg, 'Precio base').fill('120');
await pg.getByRole('button', { name: 'Crear habitación' }).click(); await esperar(pg);
const suite = (await api('GET', `/admin/alojamientos/${aloj.id}/habitaciones`, { token: adminA.token })).j.find((h) => h.nombre === 'Suite Prueba');
caso(suite && suite.mealPlan === null && suite.cancellationType === null, '"Sin especificar" se guarda como null');

await fila(pg, 'Doble Prueba').getByRole('link', { name: 'Editar' }).click(); await esperar(pg);
caso((await lbl(pg, 'Nombre').inputValue()) === 'Doble Prueba' && (await lbl(pg, 'Precio base').inputValue()) === '70.5' && (await lbl(pg, 'Plan de comidas').inputValue()) === 'breakfast_included', 'Editar: el formulario viene con los datos guardados');
await lbl(pg, 'Precio base').fill('75'); await lbl(pg, 'Cancelación').selectOption({ label: 'No reembolsable' });
await pg.getByRole('button', { name: 'Guardar cambios' }).click(); await esperar(pg);
const dobleEd = (await api('GET', `/admin/habitaciones/${doble.id}`, { token: adminA.token })).j;
caso(dobleEd.precioBase === 75 && dobleEd.cancellationType === 'non_refundable' && (await pg.getByText('Guardaste los cambios de Doble Prueba.').count()) === 1, 'Editar: PATCH guarda y vuelve con aviso');

await fila(pg, 'Suite Prueba').getByRole('button', { name: 'Desactivar' }).click();
await pg.getByRole('dialog').getByRole('button', { name: 'Desactivar' }).click(); await esperar(pg);
caso((await fila(pg, 'Suite Prueba').innerText()).includes('Desactivada'), 'Desactivar (sin reservas): queda Desactivada');
await pg.getByLabel('Mostrar desactivadas').uncheck(); await esperar(pg);
const ocultada = (await fila(pg, 'Suite Prueba').count()) === 0;
await pg.getByLabel('Mostrar desactivadas').check(); await esperar(pg);
caso(ocultada && (await fila(pg, 'Suite Prueba').count()) === 1, '"Mostrar desactivadas" la oculta y la vuelve a mostrar');
await fila(pg, 'Suite Prueba').getByRole('button', { name: 'Reactivar' }).click();
await pg.getByRole('dialog').getByRole('button', { name: 'Reactivar' }).click(); await esperar(pg);
caso((await fila(pg, 'Suite Prueba').innerText()).includes('Activa'), 'Reactivar: vuelve a Activa');
await pg.screenshot({ path: 'e2e/capturas/f4-habitaciones.png', fullPage: true });

// ═══ Disponibilidad ═══
await fila(pg, 'Doble Prueba').getByRole('link', { name: 'Disponibilidad' }).click(); await esperar(pg);
const u = new URL(pg.url());
caso(u.pathname === '/admin/disponibilidad' && u.searchParams.get('habitacion') === doble.id, 'Desde la fila se abre la disponibilidad de esa habitación');
caso((await pg.locator('[data-fecha]').count()) === 28 && (await celda(pg, dia(5)).innerText()).includes('—'), 'Calendario: 4 semanas desde hoy; sin cupos cargados se ve «—»', `${await pg.locator('[data-fecha]').count()} días`);

// Vista previa: crea 7 días
await lbl(pg, 'Desde').fill(dia(5)); await lbl(pg, 'Hasta').fill(dia(11));
await lbl(pg, 'Cupos totales').fill('2'); await lbl(pg, 'Precio por noche').fill('80');
pg.cuerpos.length = 0;
await pg.getByRole('button', { name: 'Ver vista previa' }).click(); await esperar(pg);
caso(pg.cuerpos.at(-1)?.dryRun === true && pg.cuerpos.at(-1)?.cuposTotales === 2 && !('diasSemana' in pg.cuerpos.at(-1)), 'Vista previa: envía dryRun=true (sin diasSemana si están los 7 días)', JSON.stringify(pg.cuerpos.at(-1)));
caso((await pg.getByText(/7 días nuevos, 0 actualizados/).count()) === 1, 'Vista previa: resume 7 días nuevos');
const resaltadas = await pg.locator('[data-fecha].bg-\\[var\\(--dutch-white\\)\\]').count();
caso(resaltadas === 7 && (await celda(pg, dia(5)).innerText()).includes('$80'), 'Vista previa: resalta los 7 días con el valor propuesto', `${resaltadas} resaltados`);
caso((await diasApi(doble.id, dia(0), dia(30))).dias.length === 0, 'Vista previa: no guardó nada');
await pg.screenshot({ path: 'e2e/capturas/f4-vista-previa.png', fullPage: true });
await lbl(pg, 'Precio por noche').fill('85');
caso((await pg.getByRole('button', { name: 'Guardar cambios' }).count()) === 0 && (await pg.getByRole('button', { name: 'Ver vista previa' }).count()) === 1, 'Cambiar un dato invalida la vista previa');
await pg.getByRole('button', { name: 'Ver vista previa' }).click(); await esperar(pg);
pg.cuerpos.length = 0;
await pg.getByRole('button', { name: 'Guardar cambios' }).click(); await esperar(pg);
caso(pg.cuerpos.at(-1)?.dryRun === false && (await pg.getByText(/7 días nuevos y 0 días actualizados/).count()) === 1, 'Guardar: envía dryRun=false y confirma');
const tras1 = (await diasApi(doble.id, dia(5), dia(11))).dias;
caso(tras1.length === 7 && tras1.every((d) => d.cuposTotales === 2 && d.cupos === 2 && d.precio === 85), 'Guardar: la API tiene los 7 días con 2 cupos a $85');
caso((await celda(pg, dia(5)).innerText()).includes('$85') && (await celda(pg, dia(5)).innerText()).includes('2/2'), 'El calendario se actualiza tras guardar');

// Solo fines de semana
const finesDeSemana = [5, 6, 7, 8, 9, 10, 11].map(dia).filter((f) => [0, 6].includes(dow(f)));
for (const d of ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']) await pg.getByRole('checkbox', { name: d }).uncheck({ force: true });
await lbl(pg, 'Cupos totales').fill(''); await lbl(pg, 'Precio por noche').fill('99');
pg.cuerpos.length = 0;
await pg.getByRole('button', { name: 'Ver vista previa' }).click(); await esperar(pg);
caso(JSON.stringify(pg.cuerpos.at(-1)?.diasSemana) === '[0,6]' && (await pg.getByText(new RegExp(`0 días nuevos, ${finesDeSemana.length} actualizados`)).count()) === 1, 'Días de la semana: solo sábado y domingo', `${finesDeSemana.length} días de fin de semana`);
await pg.getByRole('button', { name: 'Guardar cambios' }).click(); await esperar(pg);
const tras2 = (await diasApi(doble.id, dia(5), dia(11))).dias;
caso(tras2.every((d) => d.precio === ([0, 6].includes(dow(d.fecha)) ? 99 : 85)), 'Días de la semana: solo los fines de semana quedan a $99');
for (const d of ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']) await pg.getByRole('checkbox', { name: d }).check({ force: true });

// El catálogo público vende lo cargado
const noche = dia(9);
const disp = await api('POST', '/availability', { body: { accommodation: aloj.id, booker: { country: 'ec', platform: 'desktop' }, checkin: noche, checkout: dia(10), guests: { number_of_adults: 2, number_of_rooms: 1 } } });
const prod = disp.j?.data?.products?.find((p) => p.id?.startsWith?.(doble.id) || JSON.stringify(p).includes(doble.id));
caso(disp.s === 200 && !!prod, 'Catálogo público: /availability ya ofrece la habitación en esas fechas', `status ${disp.s}`);

// Reserva real de los 2 cupos en 2 noches → conflictos
const preview = await api('POST', '/orders/preview', { body: { accommodation_id: aloj.id, product_id: `${doble.id}:${dia(6)}:${dia(8)}`, guests: { number_of_adults: 2, number_of_rooms: 2 } } });
const orden = await api('POST', '/orders/create', { headers: { 'Idempotency-Key': randomUUID() }, body: { order_preview_id: preview.j?.data?.order_preview_id, payment_reference: 'PAY-SIM-F4', customer_details: { first_name: 'Prueba', last_name: 'F4', email: correo('huesped') } } });
caso(orden.s === 201, 'Se creó una reserva real de 2 habitaciones (2 noches)', `${preview.s}/${orden.s} ${orden.j?.locator ?? JSON.stringify(orden.j)}`);
await pg.reload({ waitUntil: 'networkidle' }); await esperar(pg);
caso((await celda(pg, dia(6)).innerText()).includes('Agotado') && (await celda(pg, dia(7)).innerText()).includes('Agotado'), 'El calendario muestra «Agotado» en las noches vendidas');
await lbl(pg, 'Desde').fill(dia(5)); await lbl(pg, 'Hasta').fill(dia(11));
await lbl(pg, 'Cupos totales').fill('1'); await lbl(pg, 'Precio por noche').fill('');
pg.api.length = 0;
await pg.getByRole('button', { name: 'Ver vista previa' }).click(); await esperar(pg);
const textoConflicto = await pg.locator('form[aria-label="Editar disponibilidad"] [role="alert"]').innerText().catch(() => '');
caso(pg.api.some((x) => x.startsWith(`409 PATCH /admin/habitaciones/${doble.id}/disponibilidad`)) && /No se guardó nada/.test(textoConflicto) && (textoConflicto.match(/ya hay 2 habitaciones vendidas/g) || []).length === 2, '409: lista las 2 fechas que bloquean con su motivo', textoConflicto.replace(/\s+/g, ' ').slice(0, 160));
const marcadas = await pg.locator('[data-fecha].border-error').evaluateAll((els) => els.map((e) => e.dataset.fecha).sort());
caso(JSON.stringify(marcadas) === JSON.stringify([dia(6), dia(7)]), '409: marca en rojo exactamente esas fechas del calendario', marcadas.join(', '));
caso((await diasApi(doble.id, dia(5), dia(11))).dias.every((d) => d.cuposTotales === 2), '409: no se guardó nada (todo o nada)');
await pg.screenshot({ path: 'e2e/capturas/f4-conflicto.png', fullPage: true });
await lbl(pg, 'Cupos totales').fill('3');
caso((await pg.locator('[data-fecha].border-error').count()) === 0, 'Cambiar los datos limpia el conflicto');
await pg.getByRole('button', { name: 'Ver vista previa' }).click(); await esperar(pg);
await pg.getByRole('button', { name: 'Guardar cambios' }).click(); await esperar(pg);
const tras3 = (await diasApi(doble.id, dia(5), dia(11))).dias;
caso(tras3.find((d) => d.fecha === dia(6)).cupos === 1 && tras3.find((d) => d.fecha === dia(6)).vendidas === 2 && tras3.find((d) => d.fecha === dia(5)).cupos === 3, 'Subir a 3 cupos: lo vendido se respeta (1 libre en noches vendidas)');

// Fechas, rango y clic en el calendario
await lbl(pg, 'Desde').fill(dia(-1));
await pg.getByRole('button', { name: 'Ver vista previa' }).click(); await pg.waitForTimeout(300);
caso((await pg.getByText(/No se pueden editar días pasados/).count()) === 1, 'Días pasados: el formulario no los acepta');
const pasado = await api('PATCH', `/admin/habitaciones/${doble.id}/disponibilidad`, { token: adminA.token, body: { desde: dia(-1), hasta: dia(2), precio: 10, dryRun: true } });
caso(pasado.s === 400, 'Días pasados: el backend también responde 400', JSON.stringify(pasado.j?.invalidParams));
await celda(pg, dia(9)).click();
const tras4 = [await lbl(pg, 'Desde').inputValue(), await lbl(pg, 'Hasta').inputValue()];
await celda(pg, dia(12)).click({ modifiers: ['Shift'] });
const tras5 = [await lbl(pg, 'Desde').inputValue(), await lbl(pg, 'Hasta').inputValue()];
caso(tras4.join() === `${dia(9)},${dia(9)}` && tras5.join() === `${dia(9)},${dia(12)}`, 'Clic elige un día y Mayús+clic extiende el rango', `${tras4} → ${tras5}`);
const desdePg = await lbl(pg, 'Ver desde').inputValue();
await lbl(pg, 'Ver hasta').fill(dia(420)); await esperar(pg);
caso((await pg.getByText(/no puede pasar de 366 días/).count()) >= 1 && (await pg.locator('[data-fecha]').count()) === 0, 'Rango visible de más de 366 días: avisa y no consulta');
await pg.getByRole('button', { name: '1 año' }).click(); await esperar(pg);
caso((await pg.locator('[data-fecha]').count()) === 365 && desdePg === hoy, 'Rango rápido de 1 año: 365 días en el calendario');
await pg.getByRole('button', { name: '4 semanas' }).click(); await esperar(pg);
caso(pg.errores.length === 0, 'Administrador A: sin errores de consola', pg.errores.join(' / '));

// ═══ 409 al dar de baja con reservas vigentes ═══
await pg.goto(W + `/admin/habitaciones?alojamiento=${aloj.id}`, { waitUntil: 'networkidle' }); await esperar(pg);
await fila(pg, 'Doble Prueba').getByRole('button', { name: 'Desactivar' }).click();
await pg.getByRole('dialog').getByRole('button', { name: 'Desactivar' }).click(); await esperar(pg);
const msgHab = await pg.getByRole('dialog').getByRole('alert').innerText().catch(() => '');
caso(msgHab.includes(orden.j.locator) && !/POST \/admin/.test(msgHab) && (await pg.getByRole('dialog').count()) === 1, 'Desactivar con reserva vigente: 409 con el localizador, sin rutas de la API', msgHab);
await pg.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click(); await esperar(pg);
caso((await fila(pg, 'Doble Prueba').innerText()).includes('Activa'), 'La habitación sigue activa');
await pg.screenshot({ path: 'e2e/capturas/f4-409-desactivar.png' });
await pg.goto(W + '/admin/alojamientos', { waitUntil: 'networkidle' }); await esperar(pg);
await pg.locator('#lista-alojamientos li', { hasText: aloj.nombre }).getByRole('button', { name: 'Dar de baja' }).click();
await pg.getByRole('dialog').getByRole('button', { name: 'Dar de baja' }).click(); await esperar(pg);
const msgAloj = await pg.getByRole('dialog').getByRole('alert').innerText().catch(() => '');
caso(msgAloj.includes(orden.j.locator) && /el alojamiento/.test(msgAloj) && !/POST \/admin/.test(msgAloj), 'Dar de baja el alojamiento con reserva vigente: 409 explicado', msgAloj);
await pg.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();

// ═══ Administrador B: no llega a lo de A ═══
const pb = await nueva();
await ingresar(pb, correo('dispB'));
await pb.goto(W + `/admin/disponibilidad?alojamiento=${aloj.id}&habitacion=${doble.id}`, { waitUntil: 'networkidle' }); await esperar(pb);
caso((await pb.locator('main').innerText()).includes('No encontramos este alojamiento o esta habitación') && (await pb.locator('[data-fecha]').count()) === 0, 'B: la disponibilidad de A se muestra como no encontrada');
await pb.goto(W + `/admin/habitaciones/${doble.id}/editar`, { waitUntil: 'networkidle' }); await esperar(pb);
caso((await pb.locator('h1').innerText()) === 'Habitación no encontrada', 'B: editar la habitación de A muestra "no encontrada"');
await pb.goto(W + `/admin/habitaciones?alojamiento=${aloj.id}`, { waitUntil: 'networkidle' }); await esperar(pb);
caso((await pb.locator('main').innerText()).includes('No encontramos este alojamiento entre los que administras'), 'B: las habitaciones de A se muestran como no encontradas');
const bPatch = await api('PATCH', `/admin/habitaciones/${doble.id}/disponibilidad`, { token: adminB.token, body: { desde: dia(5), hasta: dia(5), precio: 1 } });
const bDes = await api('POST', `/admin/habitaciones/${doble.id}/desactivar`, { token: adminB.token });
caso(bPatch.s === 404 && bDes.s === 404, 'B: la API responde 404 a editar disponibilidad o desactivar lo de A', `${bPatch.s}/${bDes.s}`);
caso(pb.errores.length === 0, 'Administrador B: sin errores de consola', pb.errores.join(' / '));

// ═══ Superadmin ═══
const ps = await nueva();
await ingresar(ps, process.env.SA_EMAIL, process.env.SA_PASSWORD);
await ps.goto(W + `/admin/disponibilidad?alojamiento=${aloj.id}&habitacion=${doble.id}`, { waitUntil: 'networkidle' }); await esperar(ps);
caso((await celda(ps, dia(5)).innerText()).includes('3/3'), 'Superadmin: ve la disponibilidad de la habitación de A');
await lbl(ps, 'Desde').fill(dia(5)); await lbl(ps, 'Hasta').fill(dia(5)); await lbl(ps, 'Precio por noche').fill('90');
await ps.getByRole('button', { name: 'Ver vista previa' }).click(); await esperar(ps);
caso((await ps.getByText(/0 días nuevos, 1 actualizado/).count()) === 1, 'Superadmin: puede previsualizar cambios en lo de A');
caso(ps.errores.length === 0, 'Superadmin: sin errores de consola', ps.errores.join(' / '));

// ═══ Teléfono ═══
const tel = await nueva({ width: 390, height: 844 });
await ingresar(tel, correo('dispA'));
for (const [nombre, url] of [['disponibilidad', `/admin/disponibilidad?alojamiento=${aloj.id}&habitacion=${doble.id}`], ['habitaciones', `/admin/habitaciones?alojamiento=${aloj.id}`], ['formulario', `/admin/habitaciones/${doble.id}/editar`]]) {
  await tel.goto(W + url, { waitUntil: 'networkidle' }); await esperar(tel);
  const ancho = await tel.evaluate(() => document.documentElement.scrollWidth);
  caso(ancho <= 390, `Teléfono (${nombre}): sin desplazamiento horizontal`, `${ancho}px`);
  if (nombre === 'disponibilidad') await tel.screenshot({ path: 'e2e/capturas/f4-telefono.png', fullPage: true });
}

await b.close();
console.log(`\n${res.filter(Boolean).length}/${res.length} casos OK`);
process.exit(res.every(Boolean) ? 0 : 1);
