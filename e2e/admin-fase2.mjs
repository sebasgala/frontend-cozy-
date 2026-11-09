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
const reg = async (n, rol, ap = 'F2' + sfx) => (await api('POST', '/auth/registro', { body: { email: correo(n), password: clave, nombre: 'Nuevo', apellido: n + ap, rol } })).j;

// Datos: el administrador del flujo, un administrador "por suspender" ya aprobado y un cliente
const nuevoAdmin = await reg('nuevoadmin', 'administrador');
const activo = await reg('activo', 'administrador');
await api('POST', `/admin/usuarios/${activo.id}/aprobar`, { token: tSA });
const clienteUsr = await reg('clienteuno', 'cliente');
const pendiente2 = await reg('pendiente2', 'administrador');
// La paginación aparece con más de 10 cuentas (UsuariosPage muestra 10 por página). En una base nueva puede haber menos:
// se registran las cuentas cliente que falten hasta llegar a 11. En una base que ya tiene más no se crea ninguna.
const POR_PAGINA_UI = 10;
const cuentas = await api('GET', '/admin/usuarios?limit=1', { token: tSA });
if (cuentas.s !== 200 || typeof cuentas.j?.meta?.totalItems !== 'number') { console.log(`FALLA GET /admin/usuarios respondió ${cuentas.s} al contar las cuentas. La prueba no continúa.`); process.exit(1); }
for (let i = cuentas.j.meta.totalItems; i <= POR_PAGINA_UI; i++) {
  const r = await api('POST', '/auth/registro', { body: { email: correo(`relleno${i}`), password: clave, nombre: 'Relleno', apellido: `R${i}F2${sfx}`, rol: 'cliente' } });
  if (r.s !== 201) { console.log(`FALLA no se pudo registrar la cuenta de relleno ${i} (${r.s}). La prueba no continúa.`); process.exit(1); }
}

const b = await chromium.launch(); // con CORS real: el navegador de prueba no lo desactiva
const res = [];
const caso = (ok, n, nota = '') => { res.push(ok); console.log(`${ok ? 'OK   ' : 'FALLA'} ${n}${nota ? ' — ' + nota : ''}`); };
const nueva = async (vp = { width: 1366, height: 900 }) => {
  const pg = await (await b.newContext({ viewport: vp })).newPage();
  pg.errores = []; pg.api = [];
  pg.on('pageerror', (e) => pg.errores.push(e.message));
  pg.on('console', (m) => m.type() === 'error' && !m.text().includes('409') && !m.text().includes('status of 4') && pg.errores.push(m.text()));
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
const fila = (pg, texto) => pg.locator('#lista-usuarios li', { hasText: texto });
const esperar = async (pg) => { await pg.waitForLoadState('networkidle'); await pg.waitForTimeout(300); await pg.locator('#lista-usuarios[aria-busy="false"]').waitFor({ timeout: 8000 }).catch(() => {}); };
const dialogo = (pg) => pg.getByRole('dialog');
const chip = (pg, nombre) => pg.getByRole('tab', { name: new RegExp('^' + nombre) });

// ── Permisos ──
let pg = await nueva();
await ingresar(pg, correo('activo'));
await pg.goto(W + '/admin/usuarios', { waitUntil: 'networkidle' });
caso(ruta(pg) === '/admin', 'Administrador no entra a /admin/usuarios', ruta(pg));
const directo = await api('GET', '/admin/usuarios', { token: (await api('POST', '/auth/login', { body: { email: correo('activo'), password: clave } })).j.access_token });
caso(directo.s === 403 && directo.j.code === 'FORBIDDEN', 'La API responde 403 FORBIDDEN al administrador', `${directo.s} ${directo.j.code}`);

// ── Superadmin: lista y filtros ──
pg = await nueva();
await ingresar(pg, process.env.SA_EMAIL, process.env.SA_PASSWORD);
await pg.goto(W + '/admin/usuarios', { waitUntil: 'networkidle' }); await esperar(pg);
caso((await pg.locator('h1').innerText()) === 'Usuarios', 'Superadmin entra a Usuarios');
caso((await chip(pg, 'Pendientes').getAttribute('aria-selected')) === 'true', 'Abre en el filtro Pendientes');
const rotulos = await pg.getByRole('tab').allInnerTexts();
caso(rotulos.every((t) => /\(\d+\)/.test(t)), 'Cada chip muestra su conteo', rotulos.join(' | '));
caso((await fila(pg, nuevoAdmin.apellido).count()) === 1 && (await fila(pg, nuevoAdmin.apellido).innerText()).includes('Pendiente'), 'El administrador nuevo aparece como pendiente');
caso((await fila(pg, clienteUsr.apellido).count()) === 0, 'Un cliente no aparece entre los pendientes');
await pg.screenshot({ path: 'e2e/capturas/f2-pendientes.png', fullPage: true });

await chip(pg, 'Activas').click(); await esperar(pg);
caso((await pg.locator('#lista-usuarios li span', { hasText: /^Pendiente$/ }).count()) === 0 && (await fila(pg, activo.apellido).count()) === 1, 'Filtro Activas');
await pg.selectOption('select >> nth=0', 'cliente'); await esperar(pg);
const soloClientes = await pg.locator('#lista-usuarios li').allInnerTexts();
caso(soloClientes.length > 0 && soloClientes.every((t) => t.includes('Cliente')), 'Filtro por rol Cliente', `${soloClientes.length} filas`);
await pg.selectOption('select >> nth=0', ''); await chip(pg, 'Todas').click(); await esperar(pg);
const paginado = await pg.getByRole('navigation', { name: 'Páginas' }).count();
caso(paginado === 1, 'Con más de 10 cuentas aparece la paginación');
if (paginado) {
  const antes = await pg.locator('#lista-usuarios li').first().innerText();
  await pg.getByRole('button', { name: 'Siguiente' }).click(); await esperar(pg);
  const despues = await pg.locator('#lista-usuarios li').first().innerText();
  caso(antes !== despues && (await pg.getByText(/Página 2 de/).count()) === 1, 'Siguiente página trae otras cuentas');
  await pg.getByRole('button', { name: 'Anterior' }).click(); await esperar(pg);
  caso((await pg.getByText(/Página 1 de/).count()) === 1, 'Anterior vuelve a la página 1');
}

// ── Flujo pedido: aprobar → el administrador entra ──
await chip(pg, 'Pendientes').click(); await esperar(pg);
const pr = await nueva(); await ingresar(pr, correo('nuevoadmin'));
caso(ruta(pr) === '/admin/pendiente', 'Antes de aprobar: el administrador va a la pantalla de pendiente', ruta(pr));
await fila(pg, nuevoAdmin.apellido).getByRole('button', { name: 'Aprobar' }).click();
caso((await dialogo(pg).count()) === 1 && (await dialogo(pg).innerText()).includes(nuevoAdmin.email), 'Aprobar pide confirmación con los datos de la cuenta');
await pg.screenshot({ path: 'e2e/capturas/f2-dialogo.png' });
await dialogo(pg).getByRole('button', { name: 'Cancelar' }).click();
caso((await dialogo(pg).count()) === 0 && (await fila(pg, nuevoAdmin.apellido).count()) === 1, 'Cancelar el diálogo no cambia nada');
pg.api.length = 0;
await fila(pg, nuevoAdmin.apellido).getByRole('button', { name: 'Aprobar' }).click();
await dialogo(pg).getByRole('button', { name: 'Aprobar' }).click(); await esperar(pg);
caso(pg.api.some((x) => x.startsWith(`200 POST /admin/usuarios/${nuevoAdmin.id}/aprobar`)), 'Confirmar llama a POST /aprobar (200)');
caso((await pg.getByText(/^Aprobaste la cuenta/).count()) === 1, 'Muestra el aviso de éxito');
caso((await fila(pg, nuevoAdmin.apellido).count()) === 0, 'Sale de la lista de pendientes');
const tras = await nueva(); await ingresar(tras, correo('nuevoadmin'));
caso(ruta(tras) === '/admin', 'Después de aprobar: el administrador entra al panel', ruta(tras));

// ── Suspender → ACCOUNT_SUSPENDED ──
await chip(pg, 'Activas').click(); await esperar(pg);
await fila(pg, nuevoAdmin.apellido).getByRole('button', { name: 'Suspender' }).click();
caso((await dialogo(pg).innerText()).includes('dejará de funcionar'), 'Suspender advierte que la sesión dejará de funcionar');
await dialogo(pg).getByRole('button', { name: 'Suspender' }).click(); await esperar(pg);
caso((await fila(pg, nuevoAdmin.apellido).count()) === 0, 'Sale de Activas al suspenderla');
const login = await api('POST', '/auth/login', { body: { email: correo('nuevoadmin'), password: clave } });
caso(login.s === 403 && login.j.code === 'ACCOUNT_SUSPENDED', 'Login del suspendido: 403 ACCOUNT_SUSPENDED', `${login.s} ${login.j.code}`);
// Fase 8.1: el token dura 10 minutos y no se consulta la cuenta en cada petición. La suspensión surte efecto (a) cuando el
// token vence y (b) cuando falla la renovación. El reloj de pruebas mide el vencimiento 11 minutos después.
const tTras = await tras.evaluate(() => localStorage.getItem('cozy:token') ?? JSON.parse(localStorage.getItem('cozy:sesion') ?? '{}').token);
const antes = await api('GET', '/auth/me', { token: tTras });
const vencido = await api('GET', '/auth/me', { token: tTras, headers: { 'X-Prueba-Token-Ahora': new Date(Date.now() + 11 * 60_000).toISOString() } });
caso(antes.s === 200 && vencido.s === 401, '(a) Su token sigue valiendo hasta vencer y al vencer deja de valer', `${antes.s} → ${vencido.s}`);
const renovar = await api('POST', '/auth/renovar', { token: tTras });
caso(renovar.s === 403 && renovar.j?.code === 'ACCOUNT_SUSPENDED', '(b) Renovar con la cuenta suspendida: 403 ACCOUNT_SUSPENDED', `${renovar.s} ${renovar.j?.code}`);

// ── Reactivar ──
await chip(pg, 'Suspendidas').click(); await esperar(pg);
await fila(pg, nuevoAdmin.apellido).getByRole('button', { name: 'Reactivar' }).click();
await dialogo(pg).getByRole('button', { name: 'Reactivar' }).click(); await esperar(pg);
const relogin = await api('POST', '/auth/login', { body: { email: correo('nuevoadmin'), password: clave } });
caso(relogin.s === 200, 'Reactivar: el administrador vuelve a iniciar sesión', `${relogin.s}`);

// ── Cambiar rol ──
await chip(pg, 'Todas').click(); await esperar(pg);
await pg.selectOption('select >> nth=0', 'cliente'); await esperar(pg);
await fila(pg, clienteUsr.apellido).getByRole('button', { name: 'Cambiar rol' }).click();
await dialogo(pg).locator('select').selectOption('administrador');
await dialogo(pg).getByRole('button', { name: 'Cambiar rol' }).click(); await esperar(pg);
const nuevoRol = (await api('GET', '/admin/usuarios?rol=administrador&limit=100', { token: tSA })).j.data.find((u) => u.id === clienteUsr.id);
caso(!!nuevoRol && nuevoRol.estado === 'activo', 'Cambiar rol: ahora es administrador y sigue activo', nuevoRol?.estado);
await pg.selectOption('select >> nth=0', ''); await esperar(pg);

// ── 409 con su motivo ──
// a) Aprobar una cuenta suspendida: se suspende por API y se intenta aprobar desde una lista ya cargada
await chip(pg, 'Pendientes').click(); await esperar(pg);
await api('POST', `/admin/usuarios/${pendiente2.id}/aprobar`, { token: tSA });
await api('POST', `/admin/usuarios/${pendiente2.id}/suspender`, { token: tSA });
await fila(pg, pendiente2.apellido).getByRole('button', { name: 'Aprobar' }).click();
await dialogo(pg).getByRole('button', { name: 'Aprobar' }).click(); await esperar(pg);
const alerta = await dialogo(pg).getByRole('alert').innerText().catch(() => '');
caso(/suspendida/i.test(alerta) && /reactivar/i.test(alerta), '409 al aprobar una cuenta suspendida: muestra el motivo', alerta);
caso((await dialogo(pg).count()) === 1, 'El diálogo queda abierto tras el 409');
await pg.screenshot({ path: 'e2e/capturas/f2-conflicto.png' });
await dialogo(pg).getByRole('button', { name: 'Cancelar' }).click(); await esperar(pg);
caso((await fila(pg, pendiente2.apellido).count()) === 0, 'La lista se actualizó tras el 409 (ya no está pendiente)');

// b) Cuenta propia: sin acciones en la fila y la API rechaza con 409
await chip(pg, 'Todas').click(); await esperar(pg);
await pg.selectOption('select >> nth=0', 'superadmin'); await esperar(pg);
const propia = pg.locator('#lista-usuarios li', { hasText: '(tú)' });
caso((await propia.count()) === 1 && (await propia.getByRole('button').count()) === 0, 'Cuenta propia: aparece como (tú) y sin botones');
const idSA = (await api('GET', '/auth/me', { token: tSA })).j.id;
const c1 = await api('POST', `/admin/usuarios/${idSA}/suspender`, { token: tSA });
const c2 = await api('PATCH', `/admin/usuarios/${idSA}/rol`, { token: tSA, body: { rol: 'cliente' } });
caso(c1.s === 409 && c2.s === 409, 'La API rechaza suspenderse o cambiarse el rol (409)', `${c1.s} / ${c2.s}`);
await pg.selectOption('select >> nth=0', ''); await esperar(pg);

// c) Suspender una cuenta pendiente (la lista se cargó antes de que se aprobara por API, caso inverso)
const p3 = await reg('pendiente3', 'administrador');
await chip(pg, 'Pendientes').click(); await esperar(pg);
await api('POST', `/admin/usuarios/${p3.id}/aprobar`, { token: tSA });   // por API pasa a activa; desde la lista aún se ve pendiente
await fila(pg, p3.apellido).getByRole('button', { name: 'Aprobar' }).click();
await dialogo(pg).getByRole('button', { name: 'Aprobar' }).click(); await esperar(pg);
caso((await dialogo(pg).count()) === 0, 'Aprobar una cuenta ya aprobada es idempotente (sin error)');

// ── Sesión y errores ──
caso(pg.errores.length === 0, 'Superadmin: sin errores de consola', pg.errores.join(' / '));

// ── Teléfono ──
const tel = await nueva({ width: 390, height: 844 });
await ingresar(tel, process.env.SA_EMAIL, process.env.SA_PASSWORD);
await tel.goto(W + '/admin/usuarios', { waitUntil: 'networkidle' }); await esperar(tel);
const ancho = await tel.evaluate(() => document.documentElement.scrollWidth);
caso(ancho <= 390, 'Teléfono: sin desplazamiento horizontal', `${ancho}px`);
await tel.screenshot({ path: 'e2e/capturas/f2-telefono.png', fullPage: true });

await b.close();
console.log(`\n${res.filter(Boolean).length}/${res.length} casos OK`);
process.exit(res.every(Boolean) ? 0 : 1);
