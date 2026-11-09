// Tipos de órdenes (reservas). Siguen los DTOs del backend (orders/*).
import type { Huespedes } from './alojamientos'

export type EstadoOrden = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'CHECKED_IN' | 'CHECKED_OUT'

export interface PreviewOrdenRequest {
  accommodation_id: number
  product_id: string
  guests: Huespedes
}

export interface PreviewOrden {
  /** Vale 15 minutos */
  order_preview_id: string
  total_price: number
  currency: string
}

export interface DatosCliente {
  first_name: string
  last_name: string
  email: string
}

export interface CrearOrdenRequest {
  order_preview_id: string
  /** Pago simulado: se guarda, no se cobra */
  payment_reference: string
  customer_details: DatosCliente
}

export interface DetalleOrden {
  order_id: string
  /** Código de confirmación de 8 caracteres */
  locator: string
  status: EstadoOrden
  accommodation_details: {
    accommodation_id: number
    name: string
    product_id: string
    room_name: string
    cancellation_type: string | null
    checkin: string
    checkout: string
    nights: number
    rooms: number
    guests: Huespedes
  }
  total_price: number
  currency: string
  creation_date: string
}
