// Recepción del alojamiento (Bloque R) vía GraphQL (/graphql, dueño: reservas). El alojamiento lo pone el backend a
// partir del token: la UI nunca lo envía.
import type {
  ContextoRecepcion,
  DatosCheckin,
  DatosCheckout,
  EstadoLimpieza,
  FiltroRecepcion,
  HabitacionFisica,
  HabitacionReasignable,
  PaginaRecepcion,
  RegistroAuditoriaRecepcion,
  RespuestaCheckout,
  ReservaRecepcion,
} from '@/types/recepcion'
import { apiFetch, graphqlFetch, obtenerDeviceFingerprint } from './api'

const FRAGMENTO_RESERVA = `
  orderId
  locator
  codigoReserva
  estado
  alojamientoId
  alojamientoNombre
  habitacionId
  habitacionNombre
  habitacionAsignada
  llegada
  salida
  noches
  habitaciones
  titular { nombre email tipoDocumento documentoRegistrado }
  huespedes { adultos ninos }
  observaciones
  earlyCheckin { autorizado desde }
  checkinHabilitadoDesde
  checkinCierraEn
  checkInEn
`

export async function obtenerContextoRecepcion(): Promise<ContextoRecepcion> {
  const r = await graphqlFetch<{ contextoRecepcion: ContextoRecepcion }>(`
    query ContextoRecepcion {
      contextoRecepcion { alojamientoId alojamientoNombre alojamientoCodigo }
    }
  `)
  return r.contextoRecepcion
}

export async function listarReservasRecepcion(filtro: FiltroRecepcion = {}): Promise<PaginaRecepcion> {
  const r = await graphqlFetch<{ reservasRecepcion: PaginaRecepcion }>(
    `
    query ReservasRecepcion($filtro: FiltroRecepcionInput) {
      reservasRecepcion(filtro: $filtro) {
        data { ${FRAGMENTO_RESERVA} }
        meta { totalItems itemCount itemsPerPage totalPages currentPage }
      }
    }
  `,
    {
      filtro: {
        ...(filtro.pendientesCheckin && { pendientesCheckin: true }),
        ...(filtro.estado && { estado: filtro.estado }),
        ...(filtro.llegadaDesde && { llegadaDesde: filtro.llegadaDesde }),
        ...(filtro.llegadaHasta && { llegadaHasta: filtro.llegadaHasta }),
        ...(filtro.alojamientoId != null && { alojamientoId: filtro.alojamientoId }),
        ...(filtro.page != null && { page: filtro.page }),
        ...(filtro.limit != null && { limit: filtro.limit }),
      },
    },
  )
  return r.reservasRecepcion
}

export async function listarHabitacionesReasignables(orderId: string): Promise<HabitacionReasignable[]> {
  const r = await graphqlFetch<{ habitacionesReasignables: HabitacionReasignable[] }>(
    `
    query HabitacionesReasignables($id: ID!) {
      habitacionesReasignables(id: $id) { id nombre tipo actual }
    }
  `,
    { id: orderId },
  )
  return r.habitacionesReasignables ?? []
}

export async function listarAuditoriaRecepcion(orderId: string): Promise<RegistroAuditoriaRecepcion[]> {
  const r = await graphqlFetch<{ auditoriaRecepcion: RegistroAuditoriaRecepcion[] }>(
    `
    query AuditoriaRecepcion($id: ID!) {
      auditoriaRecepcion(id: $id) { id accion rol motivo datosPrevios datosNuevos creadoEn }
    }
  `,
    { id: orderId },
  )
  return r.auditoriaRecepcion ?? []
}

async function mutar<K extends string>(nombre: K, tipoDatos: string, orderId: string, datos: unknown): Promise<ReservaRecepcion> {
  const r = await graphqlFetch<Record<K, ReservaRecepcion>>(
    `
    mutation Recepcion($id: ID!, $datos: ${tipoDatos}) {
      ${nombre}(id: $id, datos: $datos) { ${FRAGMENTO_RESERVA} }
    }
  `,
    { id: orderId, datos },
  )
  return r[nombre]
}

export const aprobarCheckin = (orderId: string, datos: DatosCheckin) => mutar('aprobarCheckinRecepcion', 'AprobarCheckinInput!', orderId, datos)

export const reasignarHabitacion = (orderId: string, datos: { habitacionId: string; etiqueta?: string; motivo?: string }) =>
  mutar('reasignarHabitacionRecepcion', 'ReasignarHabitacionInput!', orderId, datos)

export const cambiarHuespedes = (orderId: string, datos: { adultos: number; ninos: number[]; motivo?: string }) =>
  mutar('cambiarHuespedesRecepcion', 'CambiarHuespedesInput!', orderId, datos)

export const cambiarObservaciones = (orderId: string, datos: { observaciones: string; motivo?: string }) =>
  mutar('cambiarObservacionesRecepcion', 'CambiarObservacionesInput!', orderId, datos)

/** Solo administrador del alojamiento o superadmin */
export const autorizarEarlyCheckin = (orderId: string, datos: { desde?: string; motivo?: string }) =>
  mutar('autorizarEarlyCheckin', 'AutorizarEarlyCheckinInput', orderId, datos)

// ───────────────────────── REST de reservas (vía gateway) ─────────────────────────

const cabecerasRest = (): HeadersInit => ({ 'X-Device-Fingerprint': obtenerDeviceFingerprint() })

/** POST /api/v2/alojamientos/orders/{orderId}/checkout: CHECKED_IN → CHECKED_OUT; revoca la clave digital y deja la habitación física SUCIA */
export const realizarCheckout = (orderId: string, datos: DatosCheckout) =>
  apiFetch<RespuestaCheckout>(`/api/v2/alojamientos/orders/${encodeURIComponent(orderId)}/checkout`, {
    method: 'POST',
    headers: cabecerasRest(),
    body: JSON.stringify(datos),
  })

/** GET /api/v1/admin/recepcion/habitaciones-fisicas (del alojamiento del token) */
export const listarHabitacionesFisicas = () =>
  apiFetch<HabitacionFisica[]>('/api/v1/admin/recepcion/habitaciones-fisicas', { headers: cabecerasRest() })

/** POST /api/v1/admin/recepcion/habitaciones-fisicas/{id}/limpieza: cambia el estado interno y deja historial; no toca la reserva */
export const cambiarLimpieza = (id: string, estadoLimpieza: EstadoLimpieza, motivo?: string) =>
  apiFetch<HabitacionFisica>(`/api/v1/admin/recepcion/habitaciones-fisicas/${encodeURIComponent(id)}/limpieza`, {
    method: 'POST',
    headers: cabecerasRest(),
    body: JSON.stringify({ estadoLimpieza, ...(motivo?.trim() && { motivo: motivo.trim() }) }),
  })
