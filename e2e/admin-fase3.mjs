import { chromium } from 'playwright';
const W = process.env.COZY_WEB ?? 'http://localhost:5173', A = process.env.COZY_API ?? 'http://localhost:3000/api/v1';
const api = async (m, r, { token, body } = {}) => {
  const x = await fetch(A + r, { method: m, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) }, body: body && JSON.stringify(body) });
  const t = await x.text();
  return { s: x.status, j: t ? JSON.parse(t) : null };
};
const sfx = Date.now().toString(36), clave = 'Clave-prueba-123';
const correo = (n) => `${n}.${sfx}@prueba.test`;
const tSA = (await api('POST', '/auth/login', { body: { email: process.env.SA_EMAIL, password: process.env.SA_PASSWORD } })).j.access_token;
// Alojamiento del seed, buscado por nombre con el listado del superadmin: su id depende de la base (en una base nueva el
// seed no empieza en 1). Si no está, la prueba no sigue.
const NOMBRE_ALOJ_SEED = 'Cozy Boutique Quito';
let alojSeed;
for (let pagina = 1, paginas = 1; !alojSeed && pagina <= paginas; pagina++) {
  const r = await api('GET', `/admin/alojamientos?limit=100&page=${pagina}`, { token: tSA });
  if (r.s !== 200) { console.log(`FALLA GET /admin/alojamientos respondió ${r.s} al buscar el alojamiento del seed`); process.exit(1); }
  alojSeed = r.j.data.find((a) => a.nombre === NOMBRE_ALOJ_SEED);
  paginas = r.j.meta.totalPages;
}
if (!alojSeed) { console.log(`FALLA Falta el alojamiento del seed «${NOMBRE_ALOJ_SEED}»: corre el seed sobre esta base. La prueba no continúa.`); process.exit(1); }
const crearAdmin = async (n) => {
  const u = (await api('POST', '/auth/registro', { body: { email: correo(n), password: clave, nombre: 'Admin', apellido: n + sfx, rol: 'administrador' } })).j;
  await api('POST', `/admin/usuarios/${u.id}/aprobar`, { token: tSA });
  return { ...u, token: (await api('POST', '/auth/login', { body: { email: correo(n), password: clave } })).j.access_token };
};
const adminA = await crearAdmin('adminA');
const adminB = await crearAdmin('adminB');

const b = await chromium.launch(); // con CORS real: el navegador de prueba no lo desactiva
const res = [];
const caso = (ok, n, nota = '') => { res.push(ok); console.log(`${ok ? 'OK   ' : 'FALLA'} ${n}${nota ? ' — ' + nota : ''}`); };
const nueva = async (vp = { width: 1366, height: 900 }) => {
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
const ruta = (pg) => new URL(pg.url()).pathname;
const esperar = async (pg) => { await pg.waitForLoadState('networkidle'); await pg.waitForTimeout(300); await pg.locator('[aria-busy="true"]').first().waitFor({ state: 'detached', timeout: 8000 }).catch(() => {}); };
const lbl = (pg, t) => pg.getByLabel(new RegExp('^' + t));
const filas = (pg) => pg.locator('#lista-alojamientos li');
const ciudadNombre = `Ciudad ${sfx}`;
const alojNombre = `Hostal UI ${sfx}`;

// ═══ Administrador A: lista vacía ═══
let pg = await nueva();
await ingresar(pg, correo('adminA'));
await pg.goto(W + '/admin/alojamientos', { waitUntil: 'networkidle' }); await esperar(pg);
caso((await pg.locator('main').innerText()).includes('Todavía no tienes alojamientos') && (await pg.getByRole('link', { name: 'Crear el primero' }).count()) === 1, 'Administrador nuevo: lista vacía con invitación a crear');

// ═══ Ciudades ═══
await pg.goto(W + '/admin/ciudades', { waitUntil: 'networkidle' }); await esperar(pg);
const nCiudades0 = await pg.locator('section[aria-label="Ciudades existentes"] li').count();
caso(nCiudades0 >= 3, 'Ciudades: lista el catálogo común', `${nCiudades0} ciudades`);
await pg.getByRole('button', { name: 'Agregar', exact: true }).click();
caso((await pg.getByText(/al menos 2 caracteres/).count()) === 1 && (await pg.getByText(/código de país de 2 letras/).count()) === 1, 'Ciudades: formulario vacío marca ambos campos');
await lbl(pg, 'Nombre').fill(ciudadNombre); await lbl(pg, 'País').fill('e1');
await pg.getByRole('button', { name: 'Agregar', exact: true }).click();
caso((await pg.getByText(/código de país de 2 letras/).count()) === 1, 'Ciudades: país con un dígito se rechaza');
await lbl(pg, 'País').fill('EC');
pg.api.length = 0;
await pg.getByRole('button', { name: 'Agregar', exact: true }).click(); await esperar(pg);
const creadaApi = (await api('GET', '/admin/ciudades', { token: adminA.token })).j.find((c) => c.nombre === ciudadNombre);
caso(pg.api.some((x) => x.startsWith('201 POST /admin/ciudades')) && creadaApi?.pais === 'ec', 'Ciudades: crear guarda el país en minúsculas', `pais=${creadaApi?.pais}`);
caso((await pg.getByText(/^Agregaste /).count()) === 1 && (await pg.locator('section[aria-label="Ciudades existentes"] li', { hasText: ciudadNombre }).count()) === 1, 'Ciudades: aviso y la ciudad aparece en la lista');
await lbl(pg, 'Nombre').fill(' ' + ciudadNombre.toLowerCase() + ' '); await lbl(pg, 'País').fill('ec');
pg.api.length = 0;
await pg.getByRole('button', { name: 'Agregar', exact: true }).click(); await esperar(pg);
const textoDup = await pg.getByRole('alert').allInnerTexts();
caso(pg.api.some((x) => x.startsWith('409 POST /admin/ciudades')) && textoDup.some((t) => /ya existe/i.test(t)), '409 al repetir ciudad (distinto uso de mayúsculas): muestra el motivo', textoDup.join(' | '));
await pg.screenshot({ path: 'e2e/capturas/f3-ciudades.png', fullPage: true });

// ═══ Crear alojamiento ═══
await pg.goto(W + '/admin/alojamientos/nuevo', { waitUntil: 'networkidle' }); await esperar(pg);
await pg.getByRole('button', { name: 'Crear alojamiento' }).click(); await pg.waitForTimeout(300);
const alertas = await pg.getByRole('alert').allInnerTexts();
caso(alertas.length >= 3 && alertas.some((t) => /nombre de al menos 3/.test(t)) && alertas.some((t) => /Elige la ciudad/.test(t)) && alertas.some((t) => /precio mayor que 0/.test(t)), 'Crear: formulario vacío marca nombre, ciudad y precio', `${alertas.length} avisos`);
caso(await pg.evaluate(() => document.activeElement?.getAttribute('aria-invalid') === 'true'), 'Crear: el foco va al primer campo con error');
caso(!pg.api.some((x) => x.includes('POST /admin/alojamientos')), 'Crear: con errores no se llama a la API');

await lbl(pg, 'Nombre').fill(alojNombre);
await lbl(pg, 'Ciudad').selectOption({ label: ciudadNombre });
await lbl(pg, 'Descripción').fill('Creado por la prueba de la fase 3.');
await lbl(pg, 'Moneda').fill('usd');
await lbl(pg, 'Precio por noche').fill('85,5');
await lbl(pg, 'Adultos').fill('3'); await lbl(pg, 'Niños').fill('1');
await pg.getByLabel('Tiene piscina').check();
await pg.getByLabel('Foto 1', { exact: true }).fill('http://localhost/foto.jpg'); // pasa el filtro del cliente y lo rechaza el servidor
await pg.getByRole('button', { name: 'Agregar foto' }).click();
await pg.getByLabel('Foto 2', { exact: true }).fill('https://picsum.photos/seed/hostal-ui-2/800/600');
await pg.getByLabel('Facilidad 1', { exact: true }).fill('wifi');
await pg.getByRole('button', { name: 'Agregar facilidad' }).click(); await pg.getByLabel('Facilidad 2', { exact: true }).fill('desayuno');
await pg.getByRole('button', { name: 'Agregar política' }).click();
await pg.getByLabel('Política 1: nombre', { exact: true }).fill('checkin'); await pg.getByLabel('Política 1: valor', { exact: true }).fill('15:00');
await pg.getByRole('button', { name: 'Agregar política' }).click();
await pg.getByLabel('Política 2: nombre', { exact: true }).fill('mascotas'); await pg.getByLabel('Política 2: valor', { exact: true }).fill('true');
await pg.getByRole('button', { name: 'Agregar política' }).click();
await pg.getByLabel('Política 3: nombre', { exact: true }).fill('minimo_noches'); await pg.getByLabel('Política 3: valor', { exact: true }).fill('2');
pg.api.length = 0;
await pg.getByRole('button', { name: 'Crear alojamiento' }).click(); await esperar(pg);
const errFoto = (await pg.getByRole('alert').allInnerTexts()).join(' | ');
caso(pg.api.some((x) => x.startsWith('400 POST /admin/alojamientos')) && /URL válida/.test(errFoto), '400 del servidor: el error aparece bajo el campo, en español', errFoto);
caso(ruta(pg) === '/admin/alojamientos/nuevo', 'Con el 400 se queda en el formulario con lo escrito', (await lbl(pg, 'Nombre').inputValue()));
await pg.screenshot({ path: 'e2e/capturas/f3-error-servidor.png', fullPage: true });
await pg.getByLabel('Foto 1', { exact: true }).fill('https://picsum.photos/seed/hostal-ui-1/800/600');
pg.api.length = 0;
await pg.getByRole('button', { name: 'Crear alojamiento' }).click(); await esperar(pg);
caso(pg.api.some((x) => x.startsWith('201 POST /admin/alojamientos')) && ruta(pg) === '/admin/alojamientos', 'Crear: 201 y vuelve a la lista', ruta(pg));
caso((await pg.getByText(`Creaste ${alojNombre}.`).count()) === 1, 'Crear: aviso de éxito');
const fila = filas(pg).filter({ hasText: alojNombre });
caso((await fila.count()) === 1 && (await fila.innerText()).includes('Activo') && (await fila.innerText()).includes('$86'), 'Crear: aparece en la lista como activo', (await fila.innerText()).replace(/\s+/g, ' ').slice(0, 100));
const listaA = (await api('GET', '/admin/alojamientos?limit=100', { token: adminA.token })).j.data;
const creado = listaA.find((a) => a.nombre === alojNombre);
const ok1 = creado && creado.destino === ciudadNombre && creado.moneda === 'USD' && creado.precioPorNoche === 85.5 && creado.capacidadAdultos === 3 && creado.capacidadNinos === 1
  && creado.tienePiscina === true && creado.activo === true && creado.fotos?.length === 2 && JSON.stringify(creado.facilidades) === '["wifi","desayuno"]'
  && JSON.stringify(creado.politicas) === '{"checkin":"15:00","mascotas":true,"minimo_noches":2}' && creado.descripcion === 'Creado por la prueba de la fase 3.';
caso(!!ok1, 'Crear: la API guardó todos los campos (moneda en mayúsculas, precio con coma, políticas con tipos)', JSON.stringify({ destino: creado?.destino, moneda: creado?.moneda, precio: creado?.precioPorNoche, politicas: creado?.politicas }));
await pg.screenshot({ path: 'e2e/capturas/f3-lista.png', fullPage: true });

// ═══ Editar ═══
await fila.getByRole('link', { name: 'Editar' }).click(); await esperar(pg);
caso(/\/admin\/alojamientos\/\d+\/editar/.test(ruta(pg)), 'Editar: abre el formulario', ruta(pg));
caso((await lbl(pg, 'Nombre').inputValue()) === alojNombre && (await lbl(pg, 'Precio por noche').inputValue()) === '85.5' && (await pg.getByLabel('Foto 2', { exact: true }).inputValue()).includes('hostal-ui-2')
  && (await pg.getByLabel('Política 3: valor', { exact: true }).inputValue()) === '2' && (await pg.getByLabel('Tiene piscina').isChecked()) && (await lbl(pg, 'Ciudad').inputValue()) === String(creado.ciudadId), 'Editar: el formulario viene con los datos guardados');
await lbl(pg, 'Nombre').fill('Ab');
await pg.getByRole('button', { name: 'Guardar cambios' }).click(); await pg.waitForTimeout(300);
caso((await pg.getByText(/nombre de al menos 3/).count()) === 1, 'Editar: un nombre muy corto se rechaza');
await lbl(pg, 'Nombre').fill(alojNombre);
await lbl(pg, 'Precio por noche').fill('99');
await lbl(pg, 'Descripción').fill('');
await pg.getByRole('button', { name: 'Quitar política 3' }).click();
await pg.getByRole('button', { name: 'Agregar política' }).click();
await pg.getByLabel('Política 3: nombre', { exact: true }).fill('checkout'); await pg.getByLabel('Política 3: valor', { exact: true }).fill('12:00');
pg.api.length = 0;
await pg.getByRole('button', { name: 'Guardar cambios' }).click(); await esperar(pg);
const editado = (await api('GET', `/admin/alojamientos/${creado.id}`, { token: adminA.token })).j;
caso(pg.api.some((x) => x.startsWith(`200 PATCH /admin/alojamientos/${creado.id}`)) && editado.precioPorNoche === 99 && editado.descripcion === null
  && JSON.stringify(Object.entries(editado.politicas).sort()) === JSON.stringify(Object.entries({ checkin: '15:00', mascotas: true, checkout: '12:00' }).sort()), 'Editar: PATCH guarda precio, descripción vacía (null) y políticas', JSON.stringify({ precio: editado.precioPorNoche, desc: editado.descripcion, pol: editado.politicas }));
caso(ruta(pg) === '/admin/alojamientos' && (await pg.getByText(`Guardaste los cambios de ${alojNombre}.`).count()) === 1, 'Editar: vuelve a la lista con aviso');

// ═══ Baja y reactivación ═══
const estaEnCatalogo = async () => (await api('POST', '/details', { body: {} })).j.data.some((x) => x.id === creado.id);
const enCatalogoAntes = await estaEnCatalogo();
await filas(pg).filter({ hasText: alojNombre }).getByRole('button', { name: 'Dar de baja' }).click();
caso((await pg.getByRole('dialog').innerText()).includes('reservas que ya tiene se conservan'), 'Baja: pide confirmación y aclara que se conservan los datos');
await pg.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();
caso((await api('GET', `/admin/alojamientos/${creado.id}`, { token: adminA.token })).j.activo === true, 'Baja: cancelar el diálogo no cambia nada');
pg.api.length = 0;
await filas(pg).filter({ hasText: alojNombre }).getByRole('button', { name: 'Dar de baja' }).click();
await pg.getByRole('dialog').getByRole('button', { name: 'Dar de baja' }).click(); await esperar(pg);
caso(pg.api.some((x) => x.startsWith(`204 DELETE /admin/alojamientos/${creado.id}`)), 'Baja: DELETE responde 204');
caso((await filas(pg).filter({ hasText: alojNombre }).innerText()).includes('Dado de baja') && (await filas(pg).filter({ hasText: alojNombre }).getByRole('button', { name: 'Reactivar' }).count()) === 1, 'Baja: la fila pasa a "Dado de baja" con botón Reactivar');
const bajaApi = (await api('GET', `/admin/alojamientos/${creado.id}`, { token: adminA.token })).j;
caso(bajaApi.activo === false && (await estaEnCatalogo()) === false, 'Baja: queda inactivo y desaparece del catálogo público', `estaba en catálogo antes: ${enCatalogoAntes}`);
await pg.getByRole('tab', { name: 'Activos' }).click(); await esperar(pg);
const enActivos = await filas(pg).filter({ hasText: alojNombre }).count();
await pg.getByRole('tab', { name: 'Dados de baja' }).click(); await esperar(pg);
const enBaja = await filas(pg).filter({ hasText: alojNombre }).count();
caso(enActivos === 0 && enBaja === 1, 'Filtros: no está en Activos y sí en Dados de baja');
await pg.screenshot({ path: 'e2e/capturas/f3-baja.png', fullPage: true });
pg.api.length = 0;
await filas(pg).filter({ hasText: alojNombre }).getByRole('button', { name: 'Reactivar' }).click();
await pg.getByRole('dialog').getByRole('button', { name: 'Reactivar' }).click(); await esperar(pg);
const reactApi = (await api('GET', `/admin/alojamientos/${creado.id}`, { token: adminA.token })).j;
caso(reactApi.activo === true && reactApi.precioPorNoche === 99 && (await estaEnCatalogo()) === enCatalogoAntes, 'Reactivar: vuelve a estar activo, conserva sus datos y regresa al catálogo como antes', `en catálogo: ${await estaEnCatalogo()}`);
caso(pg.errores.length === 0, 'Administrador A: sin errores de consola', pg.errores.join(' / '));

// ═══ Administrador B: no ve lo de A ═══
const pb = await nueva();
await ingresar(pb, correo('adminB'));
await pb.goto(W + '/admin/alojamientos', { waitUntil: 'networkidle' }); await esperar(pb);
caso((await pb.locator('#lista-alojamientos li', { hasText: alojNombre }).count()) === 0 && (await pb.locator('main').innerText()).includes('Todavía no tienes alojamientos'), 'B: no ve el alojamiento de A en su lista');
pb.api.length = 0;
await pb.goto(W + `/admin/alojamientos/${creado.id}/editar`, { waitUntil: 'networkidle' }); await esperar(pb);
caso(pb.api.some((x) => x.startsWith(`404 GET /admin/alojamientos/${creado.id}`)), 'B: la API responde 404 al pedir el alojamiento de A');
caso((await pb.locator('h1').innerText()) === 'Alojamiento no encontrado' && (await pb.getByRole('link', { name: 'Volver a alojamientos' }).count()) === 1 && (await pb.getByRole('alert').count()) === 0, 'B: la pantalla dice "no encontrado", no un error de sistema');
await pb.screenshot({ path: 'e2e/capturas/f3-no-encontrado.png' });
await pb.goto(W + '/admin/alojamientos/abc/editar', { waitUntil: 'networkidle' }); await esperar(pb);
caso((await pb.locator('h1').innerText()) === 'Alojamiento no encontrado', 'Un id que no es número también muestra "no encontrado"');
const get404 = await api('GET', `/admin/alojamientos/${creado.id}`, { token: adminB.token });
const patch404 = await api('PATCH', `/admin/alojamientos/${creado.id}`, { token: adminB.token, body: { precioPorNoche: 1 } });
const del404 = await api('DELETE', `/admin/alojamientos/${creado.id}`, { token: adminB.token });
caso([get404, patch404, del404].every((r) => r.s === 404 && r.j.code === 'NOT_FOUND'), 'B: GET, PATCH y DELETE sobre lo de A dan 404 NOT_FOUND', `${get404.s}/${patch404.s}/${del404.s}`);
caso((await api('GET', `/admin/alojamientos/${creado.id}`, { token: adminA.token })).j.activo === true && (await api('GET', `/admin/alojamientos/${creado.id}`, { token: adminA.token })).j.precioPorNoche === 99, 'B no pudo modificar nada de A');
await pb.goto(W + '/admin/alojamientos/nuevo', { waitUntil: 'networkidle' }); await esperar(pb);
const opcionesB = await lbl(pb, 'Ciudad').locator('option').allInnerTexts();
caso(opcionesB.includes(ciudadNombre), 'B: ve la ciudad creada por A (catálogo común)');
caso(pb.errores.length === 0, 'Administrador B: sin errores de consola', pb.errores.join(' / '));

// ═══ Superadmin: ve y edita todo ═══
const ps = await nueva();
await ingresar(ps, process.env.SA_EMAIL, process.env.SA_PASSWORD);
await ps.goto(W + '/admin/alojamientos', { waitUntil: 'networkidle' }); await esperar(ps);
caso((await ps.locator('main').innerText()).includes('Todos los alojamientos del sistema'), 'Superadmin: la pantalla indica que ve todos');
await lbl(ps, 'Ciudad').selectOption({ label: ciudadNombre }); await esperar(ps);
caso((await filas(ps).count()) === 1 && (await filas(ps).first().innerText()).includes(alojNombre), 'Superadmin: ve el alojamiento de A y el filtro por ciudad funciona');
await lbl(ps, 'Ciudad').selectOption(''); await esperar(ps);
const totalSA = await ps.getByText(/alojamientos$/).first().innerText().catch(() => '');
const seed = (await api('GET', '/admin/alojamientos?limit=100', { token: tSA })).j.data;
caso(seed.some((a) => a.id === alojSeed.id) && seed.length > listaA.length, 'Superadmin: ve además los alojamientos sin propietario (seed)', `${seed.length} vs ${listaA.length} de A`);
await ps.goto(W + `/admin/alojamientos/${creado.id}/editar`, { waitUntil: 'networkidle' }); await esperar(ps);
caso((await lbl(ps, 'Nombre').inputValue()) === alojNombre, 'Superadmin: abre el alojamiento de A para editarlo');
await lbl(ps, 'Precio por noche').fill('120');
await ps.getByRole('button', { name: 'Guardar cambios' }).click(); await esperar(ps);
caso((await api('GET', `/admin/alojamientos/${creado.id}`, { token: adminA.token })).j.precioPorNoche === 120, 'Superadmin: la edición se guarda (A la ve actualizada)');
await ps.goto(W + `/admin/alojamientos/${alojSeed.id}/editar`, { waitUntil: 'networkidle' }); await esperar(ps);
caso((await lbl(ps, 'Nombre').inputValue()) === NOMBRE_ALOJ_SEED, 'Superadmin: abre un alojamiento sin propietario');
caso(ps.errores.length === 0, 'Superadmin: sin errores de consola', ps.errores.join(' / '));

// ═══ Teléfono ═══
const tel = await nueva({ width: 390, height: 844 });
await ingresar(tel, correo('adminA'));
for (const [nombre, url] of [['lista', '/admin/alojamientos'], ['formulario', '/admin/alojamientos/nuevo'], ['edición', `/admin/alojamientos/${creado.id}/editar`], ['ciudades', '/admin/ciudades']]) {
  await tel.goto(W + url, { waitUntil: 'networkidle' }); await esperar(tel);
  const ancho = await tel.evaluate(() => document.documentElement.scrollWidth);
  caso(ancho <= 390, `Teléfono (${nombre}): sin desplazamiento horizontal`, `${ancho}px`);
  if (nombre === 'edición') await tel.screenshot({ path: 'e2e/capturas/f3-telefono-edicion.png', fullPage: true });
}

await b.close();
console.log(`\n${res.filter(Boolean).length}/${res.length} casos OK`);
process.exit(res.every(Boolean) ? 0 : 1);
