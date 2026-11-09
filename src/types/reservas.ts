// Tipos del flujo de reserva conectados al contrato de órdenes del backend.
import type { Alojamiento } from './alojamientos'

export type TarifaHabitacion = 'estandar' | 'flexible'

/** Una línea del carrito: una habitación, una tarifa, una cantidad */
export interface SolicitudLineaReserva {
  habitacionId: string
  tarifa: TarifaHabitacion
  cantidad: number
}

export interface SolicitudReserva {
  alojamientoId: number
  entrada: string
  salida: string
  huespedes: number
  lineas: SolicitudLineaReserva[]
}

/** Línea ya resuelta contra los datos del backend (precio, nombre, condiciones, vista previa) */
export interface LineaReserva {
  habitacionId: string
  habitacionNombre: string
  tarifa: TarifaHabitacion
  cantidad: number
  /** Precio final devuelto por la API para esa habitación (sin impuestos calculados en frontend) */
  precioPorNoche: number
  subtotal: number
  mealPlan: string | null
  cancellationType: string | null
  /** ID de vista previa devuelto por POST /orders/preview */
  orderPreviewId?: string
  /**
   * Idempotency-Key de POST /orders/create para esta línea. Se genera una sola vez con la vista previa y se
   * reutiliza en los reintentos: si la respuesta se perdió, el backend devuelve la orden ya creada en vez de 409.
   */
  idempotencyKey?: string
}

/** Vista previa de la reserva: equivale a OrderPreviewResponse, vale 15 minutos en el backend */
export interface VistaPreviaReserva {
  previewId: string
  alojamientoId: number
  alojamientoNombre: string
  alojamientoFoto: string | null
  destino: string
  entrada: string
  salida: string
  noches: number
  huespedes: number
  lineas: LineaReserva[]
  totalHabitaciones: number
  /** Precio total calculado por el backend (sin cálculos en frontend) */
  precioTotal: number
  moneda: string
  creadoEn: string
  /** `creadoEn` + 15 minutos */
  expiraEn: string
}

export interface DatosHuesped {
  nombre: string
  apellido: string
  correo: string
  telefono?: string
}

export type EstadoReserva = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'CHECKED_IN' | 'CHECKED_OUT'

export interface ReservaCompleta {
  localizador: string
  /** Localizadores adicionales si la reserva involucró múltiples habitaciones creadas en órdenes separadas */
  localizadores?: string[]
  orderId?: string
  estado: EstadoReserva
  alojamientoId: number
  alojamientoNombre: string
  alojamientoFoto: string | null
  destino: string
  entrada: string
  salida: string
  noches: number
  huespedes: number
  lineas: LineaReserva[]
  totalHabitaciones: number
  precioTotal: number
  moneda: string
  datosHuesped: DatosHuesped
  /** Referencia del pago simulado: se guarda en backend, no se cobra */
  referenciaPago: string
  creadoEn: string
  canceladoEn?: string
}

export type TipoErrorReserva =
  | 'no-disponible'
  | 'precio-cambiado'
  | 'vista-previa-vencida'
  | 'parcial-fallo'
  | 'generico'

export interface ErrorReserva {
  tipo: TipoErrorReserva
  mensaje: string
  /** Solo 'precio-cambiado' */
  precioAntes?: number
  precioDespues?: number
  /** Solo 'no-disponible' o 'parcial-fallo' */
  habitacionNombre?: string
  /** Localizadores de órdenes que ya se crearon antes del fallo en carritos multi-habitación */
  ordenesExitosas?: string[]
}

export type ResultadoConfirmacion = { ok: true; reserva: ReservaCompleta } | { ok: false; error: ErrorReserva }

/** Reexportado por conveniencia en las pantallas que solo necesitan el alojamiento base */
export type { Alojamiento }
