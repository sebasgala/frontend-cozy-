// Recorrido E2E de punta a punta exclusivamente por /graphql (9 pasos).
// Verifica en cada paso que la UI consume /graphql con data y sin errors,
// y que no se emite ninguna llamada a /api/v1.
import { chromium } from 'playwright';

const W = process.env.COZY_WEB ?? 'http://localhost:5173';
const SA_EMAIL = process.env.SA_EMAIL;
const SA_PASSWORD = process.env.SA_PASSWORD;
if (!SA_EMAIL || !SA_PASSWORD) {
  console.error('Faltan SA_EMAIL y SA_PASSWORD en el entorno.');
  process.exit(1);
}

const TOPE = 15000;
const dia = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const res = [];
const caso = (ok, n, nota = '') => {
  res.push(ok);
  console.log(`${ok ? 'OK   ' : 'FALLA'} ${n}${nota ? ' — ' + nota : ''}`);
};
const vis = (loc) => loc.first().waitFor({ state: 'visible', timeout: TOPE }).then(() => true, () => false);

const esPostGraphql = (r, op = '') => {
  if (r.request().method() !== 'POST') return false;
  try {
    if (!new URL(r.url()).pathname.endsWith('/graphql')) return false;
  } catch {
    return false;
  }
  if (!op) return true;
  const body = r.request().postData() ?? '';
  return body.includes(op);
};

const leerGraphql = async (r) => {
  const status = r.status();
  const json = await r.json().catch(() => null);
  const sinErrores = !Array.isArray(json?.errors) || json.errors.length === 0;
  const conData = json !== null && typeof json === 'object' && json.data != null;
  return { ok: status === 200 && conData && sinErrores, status, json };
};

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
const pg = await ctx.newPage();

const llamadasV1 = [];
let v1Cursor = 0;
pg.on('request', (req) => {
  if (req.url().includes('/api/v1')) {
    llamadasV1.push(`${req.method()} ${req.url()}`);
  }
});

const sinV1EnPaso = () => {
  const nuevas = llamadasV1.slice(v1Cursor);
  v1Cursor = llamadasV1.length;
  return nuevas.length === 0;
};

try {
  const entrada = dia(30);
  const salida = dia(32);
  const correo = `gql.${Date.now()}@cozy.test`;
  const clave = 'Clave123!';

  // ── Paso 1: Inicio (/) ──
  const pInicio = pg.waitForResponse((r) => esPostGraphql(r, 'ObtenerAlojamientos'), { timeout: TOPE });
  await pg.goto(W + '/');
  const rInicio = await leerGraphql(await pInicio);
  const listaCat = rInicio.json?.data?.alojamientos ?? [];
  const alojSeed = listaCat.find((a) => /mirador andino/i.test(a.name)) ?? listaCat[0];
  const okInicioDom = await vis(pg.getByText('Mirador Andino'));
  const okV1Paso1 = sinV1EnPaso();
  caso(
    rInicio.ok && Boolean(alojSeed?.id) && okInicioDom && okV1Paso1,
    'Paso 1 (inicio): carga catálogo por /graphql con data, sin errors y 0 llamadas a /api/v1',
    `HTTP ${rInicio.status}, alojamientos=${listaCat.length}, v1=${llamadasV1.length}`,
  );
  if (!alojSeed?.id) throw new Error('Catálogo vacío en inicio');

  // ── Paso 2: Búsqueda (/resultados) ──
  const pBusqueda = pg.waitForResponse((r) => esPostGraphql(r, 'BuscarAlojamientos'), { timeout: TOPE });
  await pg.goto(`${W}/resultados?entrada=${entrada}&salida=${salida}&huespedes=2`);
  const rBusqueda = await leerGraphql(await pBusqueda);
  const itemsBusq = rBusqueda.json?.data?.buscarAlojamientos?.data ?? [];
  const okBusqDom = await vis(pg.getByText('Mirador Andino'));
  const okV1Paso2 = sinV1EnPaso();
  caso(
    rBusqueda.ok && itemsBusq.length > 0 && okBusqDom && okV1Paso2,
    'Paso 2 (búsqueda): buscarAlojamientos por /graphql con data, sin errors y 0 llamadas a /api/v1',
    `HTTP ${rBusqueda.status}, resultados=${itemsBusq.length}, v1=${llamadasV1.length}`,
  );

  // ── Paso 3: Detalle (/alojamientos/:id) ──
  const pDetalle = pg.waitForResponse((r) => esPostGraphql(r, 'ObtenerAlojamiento'), { timeout: TOPE });
  await pg.goto(`${W}/alojamientos/${alojSeed.id}`);
  const rDetalle = await leerGraphql(await pDetalle);
  const det = rDetalle.json?.data?.alojamiento;
  const okDetDom = await vis(pg.getByRole('heading', { name: /Mirador Andino/i }));
  const okV1Paso3 = sinV1EnPaso();
  caso(
    rDetalle.ok && det?.id === alojSeed.id && okDetDom && okV1Paso3,
    'Paso 3 (detalle): alojamiento(id) por /graphql con data, sin errors y 0 llamadas a /api/v1',
    `HTTP ${rDetalle.status}, id=${det?.id}, v1=${llamadasV1.length}`,
  );

  // ── Paso 4: Disponibilidad (/alojamientos/:id?entrada=...&salida=...&huespedes=2) ──
  const pDisp = pg.waitForResponse((r) => esPostGraphql(r, 'ConsultarDisponibilidad'), { timeout: TOPE });
  await pg.goto(`${W}/alojamientos/${alojSeed.id}?entrada=${entrada}&salida=${salida}&huespedes=2`);
  const rDisp = await leerGraphql(await pDisp);
  const prods = rDisp.json?.data?.disponibilidad?.products ?? [];
  const selHab = pg.locator('select[aria-label^="Seleccionar cantidad"]').first();
  const okDispDom = await vis(selHab);
  const okV1Paso4 = sinV1EnPaso();
  caso(
    rDisp.ok && prods.length > 0 && okDispDom && okV1Paso4,
    'Paso 4 (disponibilidad): disponibilidad por /graphql con data, sin errors y 0 llamadas a /api/v1',
    `HTTP ${rDisp.status}, productos=${prods.length}, v1=${llamadasV1.length}`,
  );

  // ── Paso 5: Orden — cotización (/reserva/resumen) ──
  await selHab.selectOption('1');
  const pCotizar = pg.waitForResponse((r) => esPostGraphql(r, 'CotizarOrden'), { timeout: TOPE });
  await pg.getByRole('button', { name: /Reservar/i }).first().click();
  const rCotizar = await leerGraphql(await pCotizar);
  const preview = rCotizar.json?.data?.cotizarOrden;
  const okResumenDom = await vis(pg.getByLabel('Nombre'));
  const okV1Paso5 = sinV1EnPaso();
  caso(
    rCotizar.ok && Boolean(preview?.order_preview_id) && okResumenDom && okV1Paso5,
    'Paso 5 (orden — cotización): cotizarOrden por /graphql con data, sin errors y 0 llamadas a /api/v1',
    `HTTP ${rCotizar.status}, preview=${preview?.order_preview_id}, v1=${llamadasV1.length}`,
  );

  // ── Paso 6: Orden — creación y confirmación (/reserva/pago → /reserva/confirmacion) ──
  await pg.getByLabel('Nombre').fill('Ana');
  await pg.getByLabel('Apellido').fill('Prueba');
  await pg.getByLabel('Correo electrónico').fill(correo);
  await pg.getByRole('button', { name: /Continuar al pago/i }).click();
  await pg.waitForURL(/\/reserva\/pago/);
  await pg.getByLabel('Número de tarjeta').fill('4242424242424242');
  await pg.getByLabel('Nombre del titular').fill('Ana Prueba');
  await pg.getByLabel('Vencimiento').fill('12/30');
  await pg.getByLabel('CVV').fill('123');
  const pCrearOrden = pg.waitForResponse((r) => esPostGraphql(r, 'CrearOrden'), { timeout: TOPE });
  const pObtenerOrden = pg.waitForResponse((r) => esPostGraphql(r, 'ObtenerOrden'), { timeout: TOPE });
  await pg.getByRole('button', { name: /Pagar/i }).click();
  const rCrearOrden = await leerGraphql(await pCrearOrden);
  const rObtenerOrden = await leerGraphql(await pObtenerOrden);
  await pg.waitForURL(/\/reserva\/confirmacion\?localizador=/);
  const loc = new URL(pg.url()).searchParams.get('localizador') ?? '';
  const okConfDom = Boolean(loc) && (await vis(pg.getByText(loc).first()));
  const okV1Paso6 = sinV1EnPaso();
  caso(
    rCrearOrden.ok &&
      rObtenerOrden.ok &&
      rCrearOrden.json?.data?.crearOrden?.locator === loc &&
      rObtenerOrden.json?.data?.orden?.locator === loc &&
      okConfDom &&
      okV1Paso6,
    'Paso 6 (orden — confirmación): crearOrden y orden por /graphql con data, sin errors y 0 llamadas a /api/v1',
    `localizador=${loc}, v1=${llamadasV1.length}`,
  );

  // ── Paso 7: Cuenta — registro e inicio de sesión (/registro) ──
  await pg.goto(W + '/registro');
  await pg.getByLabel('Nombre').fill('Ana');
  await pg.getByLabel('Apellido').fill('Prueba');
  await pg.getByLabel('Correo electrónico').fill(correo);
  await pg.getByLabel('Contraseña').fill(clave);
  const pRegistro = pg.waitForResponse((r) => esPostGraphql(r, 'RegistrarCliente'), { timeout: TOPE });
  const pLoginCliente = pg.waitForResponse((r) => esPostGraphql(r, 'IniciarSesion'), { timeout: TOPE });
  await pg.getByRole('button', { name: /Crear cuenta/i }).click();
  const rRegistro = await leerGraphql(await pRegistro);
  const rLoginCliente = await leerGraphql(await pLoginCliente);
  await pg.waitForURL(/\/cuenta\/reservas/, { timeout: TOPE });
  const okV1Paso7 = sinV1EnPaso();
  caso(
    rRegistro.ok &&
      rLoginCliente.ok &&
      Boolean(rRegistro.json?.data?.registrarse?.id) &&
      Boolean(rLoginCliente.json?.data?.iniciarSesion?.access_token) &&
      okV1Paso7,
    'Paso 7 (cuenta — registro y sesión): registrarse e iniciarSesion por /graphql con data, sin errors y 0 llamadas a /api/v1',
    `usuario=${rRegistro.json?.data?.registrarse?.email}, v1=${llamadasV1.length}`,
  );

  // ── Paso 8: Cuenta — mis reservas y consulta por localizador (/cuenta/reservas y /consultar-reserva) ──
  const pMisReservas = pg.waitForResponse((r) => esPostGraphql(r, 'MisReservas'), { timeout: TOPE });
  await pg.goto(W + '/cuenta/reservas');
  const rMisReservas = await leerGraphql(await pMisReservas);
  await pg.goto(W + '/consultar-reserva');
  await pg.getByLabel('Localizador').fill(loc);
  await pg.getByLabel('Correo electrónico').fill(correo);
  const pConsulta = pg.waitForResponse((r) => esPostGraphql(r, 'ConsultarReserva'), { timeout: TOPE });
  await pg.getByRole('button', { name: /Buscar reserva/i }).click();
  const rConsulta = await leerGraphql(await pConsulta);
  const okConsultaDom = await vis(pg.getByText('Encontramos tu reserva:'));
  const okV1Paso8 = sinV1EnPaso();
  caso(
    rMisReservas.ok &&
      Array.isArray(rMisReservas.json?.data?.misReservas?.data) &&
      rConsulta.ok &&
      rConsulta.json?.data?.consultarReserva?.locator === loc &&
      okConsultaDom &&
      okV1Paso8,
    'Paso 8 (cuenta — reservas): misReservas y consultarReserva por /graphql con data, sin errors y 0 llamadas a /api/v1',
    `localizador=${loc}, v1=${llamadasV1.length}`,
  );

  // ── Paso 9: Admin — ingreso y panel de administración (/admin) ──
  await pg.evaluate(() => localStorage.clear());
  await pg.goto(W + '/ingresar');
  await pg.getByLabel('Correo electrónico').fill(SA_EMAIL);
  await pg.getByLabel('Contraseña').fill(SA_PASSWORD);
  const pLoginAdmin = pg.waitForResponse((r) => esPostGraphql(r, 'IniciarSesion'), { timeout: TOPE });
  const pAlojAdmin = pg.waitForResponse((r) => esPostGraphql(r, 'ContarAlojamientos'), { timeout: TOPE });
  const pResAdmin = pg.waitForResponse((r) => esPostGraphql(r, 'ContarReservas'), { timeout: TOPE });
  const pUsuAdmin = pg.waitForResponse((r) => esPostGraphql(r, 'ContarUsuarios'), { timeout: TOPE });
  await pg.getByRole('button', { name: 'Ingresar' }).click();
  const [rLoginAdmin, rAlojAdmin, rResAdmin, rUsuAdmin] = await Promise.all([
     pLoginAdmin.then(leerGraphql),
    pAlojAdmin.then(leerGraphql),
    pResAdmin.then(leerGraphql),
    pUsuAdmin.then(leerGraphql),
  ]);
  await pg.waitForURL(/\/admin/, { timeout: TOPE });
  const okAdminDom = await vis(pg.getByText('Alojamientos activos'));
  const total = (r, k) => r.json?.data?.[k]?.meta?.totalItems;
  const esNumero = (v) => typeof v === 'number' && Number.isFinite(v);
  const contadoresOk =
    esNumero(total(rAlojAdmin, 'alojamientosAdmin')) &&
    esNumero(total(rResAdmin, 'reservasAdmin')) &&
    esNumero(total(rUsuAdmin, 'usuariosAdmin'));

  // Pestañas: alojamientos, reservas y usuarios (navegación por el menú del panel)
  const pestana = async (nombre, op, campo) => {
    const p = pg.waitForResponse((r) => esPostGraphql(r, op), { timeout: TOPE });
    await pg.getByRole('link', { name: nombre, exact: true }).first().click();
    const r = await leerGraphql(await p);
    return r.ok && Array.isArray(r.json?.data?.[campo]?.data);
  };
  const okTabAloj = await pestana('Alojamientos', 'ListarAlojamientosAdmin', 'alojamientosAdmin');
  const okTabRes = await pestana('Reservas', 'ListarReservasAdmin', 'reservasAdmin');
  const okTabUsu = await pestana('Usuarios', 'ListarUsuariosAdmin', 'usuariosAdmin');
  const okV1Paso9 = sinV1EnPaso();
  caso(
    rLoginAdmin.ok &&
      rAlojAdmin.ok &&
      rResAdmin.ok &&
      rUsuAdmin.ok &&
      contadoresOk &&
      okAdminDom &&
      okTabAloj &&
      okTabRes &&
      okTabUsu &&
      okV1Paso9 &&
      llamadasV1.length === 0,
    'Paso 9 (admin): panel y pestañas por /graphql con data, sin errors y 0 llamadas a /api/v1 en todo el recorrido',
    `contadores=${total(rAlojAdmin, 'alojamientosAdmin')}/${total(rResAdmin, 'reservasAdmin')}/${total(rUsuAdmin, 'usuariosAdmin')}, tabs=${okTabAloj}/${okTabRes}/${okTabUsu}, v1Total=${llamadasV1.length}`,
  );
} finally {
  await b.close();
}

console.log(`\n${res.filter(Boolean).length}/${res.length} casos OK`);
process.exit(res.every(Boolean) ? 0 : 1);

