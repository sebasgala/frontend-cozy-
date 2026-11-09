// Servicio del flujo de reserva conectado a GraphQL (/graphql).
//
// DECISIÓN DE DISEÑO (Carrito multi-habitación):
// El contrato de OpenAPI de Cozy define que una orden de reserva admite un solo product_id
// (OrderPreviewRequestDto.product_id). Para permitir que el usuario reserve varias habitaciones
// distintas en una misma experiencia de compra (diseño de Detalle/Carrito), el servicio genera una
// vista previa y una orden en el backend por cada tipo de habitación. Si una de las órdenes falla
// a mitad del proceso (por ejemplo, porque la segunda habitación agotó cupos mientras se pagaba),
// se informa explícitamente en la interfaz qué órdenes sí fueron confirmadas con sus localizadores
// y qué habitación falló, para que el usuario pueda conservar o cancelar lo confirmado sin cobros sorpresa.
// Todo el pago es simulado y los precios e impuestos provienen 100% del backend.

import { nochesEntre } from '@/lib/fechas'
import type {
  DatosHuesped,
  LineaReserva,
  ReservaCompleta,
  ResultadoConfirmacion,
  SolicitudReserva,
  VistaPreviaReserva,
} from '@/types/reservas'
import type { DetalleOrden } from '@/types/ordenes'
import { ApiError, graphqlFetch } from './api'
import { mapearOrdenAReservaCompleta, obtenerSesion } from './cuenta'
import { alojamientoEnCatalogo, consultarDisponibilidad, obtenerCatalogoApi } from './alojamientos'
import { cancelarOrden, crearOrden, obtenerOrden, previsualizarOrden } from './ordenes'

const CLAVE_LOCALIZADORES = 'cozy:localizadores-ordenes'
const MINUTOS_VIGENCIA_PREVIEW = 15

interface RegistroOrdenLocal {
  orderId: string
  locator: string
  email: string
  alojamientoId: number
  creadoEn: string
}

function leerRegistrosOrdenes(): RegistroOrdenLocal[] {
  try {
    const raw = localStorage.getItem(CLAVE_LOCALIZADORES)
    return raw ? (JSON.parse(raw) as RegistroOrdenLocal[]) : []
  } catch {
    return []
  }
}

function guardarRegistroOrden(registro: RegistroOrdenLocal): void {
  try {
    const registros = leerRegistrosOrdenes()
    registros.unshift(registro)
    localStorage.setItem(CLAVE_LOCALIZADORES, JSON.stringify(registros.slice(0, 50)))
  } catch {
    // no-op
  }
}

/**
 * Genera la vista previa de la reserva llamando a POST /orders/preview en el backend para cada línea.
 * No calcula precios ni impuestos en el frontend: utiliza directamente los totales del backend.
 */
export async function crearVistaPreviaReserva(solicitud: SolicitudReserva): Promise<VistaPreviaReserva> {
  if (!solicitud.lineas.length) {
    throw new Error('Elige al menos una habitación.')
  }

  const noches = nochesEntre(solicitud.entrada, solicitud.salida).length
  if (noches <= 0) {
    throw new Error('La fecha de salida debe ser posterior a la fecha de entrada.')
  }

  // 1. Consultar disponibilidad real del alojamiento en el backend
  const disp = await consultarDisponibilidad(
    solicitud.alojamientoId,
    solicitud.entrada,
    solicitud.salida,
    {
      number_of_adults: solicitud.huespedes,
      number_of_rooms: solicitud.lineas.reduce((acc, l) => acc + l.cantidad, 0),
    },
  )

  const ahora = new Date()
  const lineasResueltas: LineaReserva[] = []
  let totalPrecioBackend = 0
  let moneda = disp.currency || 'USD'

  for (const linea of solicitud.lineas) {
    // Buscar el producto disponible que coincida con el ID de la habitación
    const producto = disp.products.find(
      (p) => p.product_id === linea.habitacionId || p.product_id.startsWith(`${linea.habitacionId}:`),
    )

    if (!producto) {
      throw new Error('Una de las habitaciones seleccionadas ya no está disponible para las fechas elegidas.')
    }

    // 2. Generar vista previa en el backend (/orders/preview) para cada línea de habitación
    const adultosPorLinea = Math.max(1, Math.floor(solicitud.huespedes / solicitud.lineas.length))
    const previewBackend = await previsualizarOrden({
      accommodation_id: solicitud.alojamientoId,
      product_id: producto.product_id,
      guests: {
        number_of_adults: adultosPorLinea,
        number_of_rooms: linea.cantidad,
      },
    })

    moneda = previewBackend.currency
    const subtotal = previewBackend.total_price
    totalPrecioBackend += subtotal
    const precioPorNoche = Math.round(subtotal / (noches * linea.cantidad))

    lineasResueltas.push({
      habitacionId: producto.product_id,
      habitacionNombre: producto.name,
      tarifa: linea.tarifa,
      cantidad: linea.cantidad,
      precioPorNoche,
      subtotal,
      mealPlan: producto.meal_plan,
      cancellationType: producto.cancellation_type,
      orderPreviewId: previewBackend.order_preview_id,
      idempotencyKey: crypto.randomUUID(),
    })
  }

  // Datos base del alojamiento (catálogo de la API)
  await obtenerCatalogoApi().catch(() => [])
  const al = alojamientoEnCatalogo(solicitud.alojamientoId)
  const expiraEn = new Date(ahora.getTime() + MINUTOS_VIGENCIA_PREVIEW * 60 * 1000)

  return {
    previewId: lineasResueltas[0]?.orderPreviewId ?? crypto.randomUUID(),
    alojamientoId: solicitud.alojamientoId,
    alojamientoNombre: al?.nombre ?? 'Alojamiento Cozy',
    alojamientoFoto: al?.fotos?.[0] ?? null,
    destino: al?.destino ?? '',
    entrada: solicitud.entrada,
    salida: solicitud.salida,
    noches,
    huespedes: solicitud.huespedes,
    lineas: lineasResueltas,
    totalHabitaciones: lineasResueltas.reduce((n, l) => n + l.cantidad, 0),
    precioTotal: totalPrecioBackend,
    moneda,
    creadoEn: ahora.toISOString(),
    expiraEn: expiraEn.toISOString(),
  }
}

/**
 * Confirma la reserva en el backend mediante POST /orders/create (con Idempotency-Key).
 * En carritos con varias habitaciones crea una orden por habitación y maneja fallos parciales.
 */
export async function confirmarReserva(
  vistaPrevia: VistaPreviaReserva,
  datosHuesped: DatosHuesped,
  referenciaPago: string,
): Promise<ResultadoConfirmacion> {
  if (new Date() > new Date(vistaPrevia.expiraEn)) {
    return {
      ok: false,
      error: {
        tipo: 'vista-previa-vencida',
        mensaje: 'La vista previa de esta reserva venció (15 minutos). Por favor revisa el precio actualizado.',
      },
    }
  }

  const ordenesCreadas: { orderId: string; locator: string }[] = []

  try {
    for (const linea of vistaPrevia.lineas) {
      if (!linea.orderPreviewId) {
        throw new Error(`La habitación ${linea.habitacionNombre} no tiene vista previa vigente.`)
      }

      const orden = await crearOrden(
        {
          order_preview_id: linea.orderPreviewId,
          payment_reference: referenciaPago,
          customer_details: {
            first_name: datosHuesped.nombre.trim(),
            last_name: datosHuesped.apellido.trim(),
            email: datosHuesped.correo.trim().toLowerCase(),
          },
        },
        linea.idempotencyKey,
      )

      ordenesCreadas.push({ orderId: orden.order_id, locator: orden.locator })

      // Guardar mapeo local de localizador a orden para consultas directas y cancelaciones
      guardarRegistroOrden({
        orderId: orden.order_id,
        locator: orden.locator,
        email: datosHuesped.correo.trim().toLowerCase(),
        alojamientoId: vistaPrevia.alojamientoId,
        creadoEn: orden.creation_date,
      })
    }
  } catch (error) {
    // Si ya se habían creado órdenes previas antes de este fallo:
    if (ordenesCreadas.length > 0) {
      const exitosos = ordenesCreadas.map((o) => o.locator)
      return {
        ok: false,
        error: {
          tipo: 'parcial-fallo',
          mensaje: `Se confirmaron ${ordenesCreadas.length} orden(es) con localizador(es) ${exitosos.join(', ')}, pero ocurrió un problema con una de las habitaciones restantes. No se cobró nada adicional.`,
          ordenesExitosas: exitosos,
        },
      }
    }

    if (error instanceof ApiError) {
      if (error.status === 409) {
        return {
          ok: false,
          error: {
            tipo: 'no-disponible',
            mensaje: error.problem?.detail ?? 'La habitación elegida ya no tiene cupos disponibles.',
          },
        }
      }
      if (error.problem?.code === 'PREVIEW_EXPIRED' || error.message.includes('vista previa')) {
        return {
          ok: false,
          error: {
            tipo: 'vista-previa-vencida',
            mensaje: 'La vista previa venció en el backend. Reintenta la reserva para actualizar el precio.',
          },
        }
      }
      return {
        ok: false,
        error: {
          tipo: 'generico',
          mensaje: error.problem?.detail ?? error.message,
        },
      }
    }

    return {
      ok: false,
      error: {
        tipo: 'generico',
        mensaje: error instanceof Error ? error.message : 'No pudimos procesar tu reserva.',
      },
    }
  }

  const primerOrden = ordenesCreadas[0]
  const reserva: ReservaCompleta = {
    localizador: primerOrden.locator,
    localizadores: ordenesCreadas.map((o) => o.locator),
    orderId: primerOrden.orderId,
    estado: 'CONFIRMED',
    alojamientoId: vistaPrevia.alojamientoId,
    alojamientoNombre: vistaPrevia.alojamientoNombre,
    alojamientoFoto: vistaPrevia.alojamientoFoto,
    destino: vistaPrevia.destino,
    entrada: vistaPrevia.entrada,
    salida: vistaPrevia.salida,
    noches: vistaPrevia.noches,
    huespedes: vistaPrevia.huespedes,
    lineas: vistaPrevia.lineas,
    totalHabitaciones: vistaPrevia.totalHabitaciones,
    precioTotal: vistaPrevia.precioTotal,
    moneda: vistaPrevia.moneda,
    datosHuesped,
    referenciaPago,
    creadoEn: new Date().toISOString(),
  }

  return { ok: true, reserva }
}

const FRAGMENTO_ORDEN_RESERVA = `
  order_id
  locator
  status
  total_price
  currency
  creation_date
  _links
  accommodation_details {
    accommodation_id
    name
    product_id
    room_name
    cancellation_type
    checkin
    checkout
    nights
    rooms
    guests
  }
`

/**
 * Consulta una reserva por su localizador.
 * Con sesión, la fuente es el servidor (GraphQL: query miReserva), así funciona desde cualquier
 * navegador. Sin sesión (o si no es de la cuenta), se usa el registro local que deja la consulta por
 * localizador y correo, que solo sirve de caché en este navegador.
 */
export async function obtenerReservaPorLocalizador(localizador: string): Promise<ReservaCompleta | null> {
  const loc = localizador.trim().toUpperCase()
  await obtenerCatalogoApi().catch(() => [])

  if (obtenerSesion()?.token) {
    try {
      const respuesta = await graphqlFetch<{ miReserva: DetalleOrden }>(
        `
        query MiReserva($localizador: String!) {
          miReserva(localizador: $localizador) {
            ${FRAGMENTO_ORDEN_RESERVA}
          }
        }
      `,
        { localizador: loc },
      )
      return mapearOrdenAReservaCompleta(respuesta.miReserva)
    } catch (error) {
      // 404 = no es de esta cuenta; 401 = sesión vencida. En los dos casos se prueba con el registro local.
      if (!(error instanceof ApiError && (error.status === 404 || error.status === 401))) throw error
    }
  }

  const registro = leerRegistrosOrdenes().find((r) => r.locator === loc)
  if (registro) {
    const orden = await obtenerOrden(registro.orderId)
    if (orden) {
      const mapeada = mapearOrdenAReservaCompleta(orden)
      mapeada.datosHuesped.correo = registro.email
      return mapeada
    }
  }

  return null
}

/**
 * GraphQL: query consultarReserva(localizador, correo)
 * Consulta una reserva sin necesidad de iniciar sesión, mediante localizador de 8 caracteres y correo.
 */
export async function buscarReservaPorLocalizadorYCorreo(
  localizador: string,
  correo: string,
): Promise<ReservaCompleta | null> {
  await obtenerCatalogoApi().catch(() => [])
  try {
    const respuesta = await graphqlFetch<{ consultarReserva: DetalleOrden }>(
      `
      query ConsultarReserva($localizador: String!, $correo: String!) {
        consultarReserva(localizador: $localizador, correo: $correo) {
          ${FRAGMENTO_ORDEN_RESERVA}
        }
      }
    `,
      {
        localizador: localizador.trim().toUpperCase(),
        correo: correo.trim().toLowerCase(),
      },
    )

    const orden = respuesta.consultarReserva

    // Guardar para que navegación subsiguiente a /cuenta/reservas/:localizador funcione de inmediato
    guardarRegistroOrden({
      orderId: orden.order_id,
      locator: orden.locator,
      email: correo.trim().toLowerCase(),
      alojamientoId: orden.accommodation_details.accommodation_id,
      creadoEn: orden.creation_date,
    })

    const mapeada = mapearOrdenAReservaCompleta(orden)
    mapeada.datosHuesped.correo = correo
    return mapeada
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null
    }
    throw error
  }
}

/** Todas las reservas de un correo registradas en el cliente o cuenta */
export async function listarReservasPorCorreo(correo: string): Promise<ReservaCompleta[]> {
  const mail = correo.trim().toLowerCase()
  const registros = leerRegistrosOrdenes().filter((r) => r.email === mail)
  await obtenerCatalogoApi().catch(() => [])

  const lista: ReservaCompleta[] = []
  for (const reg of registros) {
    const orden = await obtenerOrden(reg.orderId)
    if (orden) {
      const r = mapearOrdenAReservaCompleta(orden)
      r.datosHuesped.correo = mail
      lista.push(r)
    }
  }
  return lista
}

/**
 * Mutation cancelarOrden
 * Cancela una reserva real en el backend. Usa el order_id que trae la reserva (del servidor); el registro
 * local solo es respaldo para reservas consultadas sin sesión.
 */
export async function cancelarReserva(reserva: Pick<ReservaCompleta, 'localizador' | 'orderId'>): Promise<ReservaCompleta> {
  const loc = reserva.localizador.trim().toUpperCase()
  const orderId = reserva.orderId ?? leerRegistrosOrdenes().find((r) => r.locator === loc)?.orderId

  if (!orderId) {
    throw new Error('No encontramos el identificador de esa reserva para cancelarla.')
  }

  const cancelada = await cancelarOrden(orderId)
  await obtenerCatalogoApi().catch(() => [])
  return mapearOrdenAReservaCompleta(cancelada)
}

export function politicaCancelacion(reserva: ReservaCompleta): { titulo: string; detalle: string } {
  const todasLibres = reserva.lineas.every((l) => l.cancellationType === 'free_cancellation')
  const todasNoReembolsables = reserva.lineas.every((l) => l.cancellationType === 'non_refundable')
  if (todasLibres) {
    return {
      titulo: 'Cancelación gratuita',
      detalle:
        'Esta reserva tiene cancelación gratuita. Como el pago fue simulado, no hubo ningún cobro real que reembolsar: al cancelar, la reserva queda marcada como cancelada en el backend.',
    }
  }
  if (todasNoReembolsables) {
    return {
      titulo: 'No reembolsable',
      detalle:
        'Esta tarifa no es reembolsable según las condiciones del alojamiento. El pago fue simulado.',
    }
  }
  return {
    titulo: 'Condiciones mixtas',
    detalle:
      'Esta reserva combina habitaciones con cancelación gratuita y tarifas no reembolsables. Revisa cada habitación en el detalle.',
  }
}

// ── Carrito en curso (vive en sessionStorage: temporal, se pierde al cerrar la pestaña) ──

const CLAVE_CARRITO = 'cozy:reserva-en-curso'

export function guardarCarritoEnCurso(vistaPrevia: VistaPreviaReserva): void {
  try {
    sessionStorage.setItem(CLAVE_CARRITO, JSON.stringify(vistaPrevia))
  } catch {
    // Si falla, la pantalla de pago simplemente no encontrará el carrito y pedirá rehacer la reserva
  }
}

export function leerCarritoEnCurso(): VistaPreviaReserva | null {
  try {
    const guardado = sessionStorage.getItem(CLAVE_CARRITO)
    return guardado ? (JSON.parse(guardado) as VistaPreviaReserva) : null
  } catch {
    return null
  }
}

export function limpiarCarritoEnCurso(): void {
  try {
    sessionStorage.removeItem(CLAVE_CARRITO)
  } catch {
    // no-op
  }
}
