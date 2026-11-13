// Tipos de la recepción del alojamiento (Bloque R). Siguen las respuestas de /admin/recepcion vía GraphQL.
import type { EstadoReserva, Pagina } from './admin'

export interface ContextoRecepcion {
  alojamientoId: number | null
  alojamientoNombre: string | null
  alojamientoCodigo: string | null
}

export interface ReservaRecepcion {
  orderId: string
  locator: string
  /** BK-HOTEL-… */
  codigoReserva: string
  estado: EstadoReserva
  alojamientoId: number
  alojamientoNombre: string
  habitacionId: string
  /** Tipo de habitación vendido (contrato); no cambia al reasignar */
  habitacionNombre: string
  /** Habitación física asignada en recepción */
  habitacionAsignada: string | null
  llegada: string
  salida: string
  noches: number
  habitaciones: number
  titular: {
    nombre: string
    email: string
    tipoDocumento: string | null
    /** false en reservas sin documento registrado: el documento presentado no se puede contrastar */
    documentoRegistrado: boolean
  }
  huespedes: { adultos: number; ninos: number[] }
  observaciones: string | null
  earlyCheckin: { autorizado: boolean; desde: string | null }
  /** Instante (ISO) desde el que se puede aprobar el check-in: 14:00 de Guayaquil o el early autorizado */
  checkinHabilitadoDesde: string
  /** Primer instante (ISO) en que ya no se puede aprobar el check-in */
  checkinCierraEn: string
  checkInEn: string | null
  /** true si la reserva fue archivada y retirada del mostrador de recepción */
  archivadaRecepcion?: boolean
}

export type PaginaRecepcion = Pagina<ReservaRecepcion>

export interface FiltroRecepcion {
  /** CONFIRMED sin check-in con la estancia vigente */
  pendientesCheckin?: boolean
  estado?: EstadoReserva
  archivadaRecepcion?: boolean
  llegadaDesde?: string
  llegadaHasta?: string
  alojamientoId?: number
  page?: number
  limit?: number
}

export interface HabitacionReasignable {
  id: string
  nombre: string
  tipo: string
  actual: boolean
}

export interface DatosCheckin {
  documentoPresentado: string
  huespedesPresentes: number
  codigoRecepcionista: string
  observaciones?: string
  documentoVerificadoFisicamente: boolean
}

export interface RegistroAuditoriaRecepcion {
  id: string
  accion: string
  rol: string
  motivo: string | null
  datosPrevios: Record<string, unknown> | null
  datosNuevos: Record<string, unknown> | null
  creadoEn: string
}

/** Estado operativo interno de una habitación física (no es un OrdenStatus del contrato) */
export type EstadoLimpieza = 'LIMPIA' | 'OCUPADA' | 'SUCIA' | 'EN_LIMPIEZA' | 'MANTENIMIENTO'

/** GET /api/v1/admin/recepcion/habitaciones-fisicas */
export interface HabitacionFisica {
  id: string
  alojamientoId: number
  tipoHabitacionId: string
  numero: string
  estadoLimpieza: EstadoLimpieza
  activa: boolean
}

export type MetodoPagoConsumos = 'TARJETA_REGISTRADA' | 'EFECTIVO' | 'CARGO_A_RESERVA'

/** CheckOutRequestV2: solo estos campos viajan al backend */
export interface DatosCheckout {
  consumosMinibar?: { item: string; cantidad?: number; precio: string }[]
  metodoPagoConsumos?: MetodoPagoConsumos
}

/** Respuesta de POST /api/v2/alojamientos/orders/{orderId}/checkout */
export interface RespuestaCheckout {
  orderId: string
  estado: 'CHECKED_OUT'
  habitacionLiberada: string
  checkOutHora: string
  consumosAdicionales: string
  claveDigitalRevocada: boolean
}
