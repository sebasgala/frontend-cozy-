// Servicio de órdenes (reservas) conectado a GraphQL (/graphql, dueño: reservas).
import type {
  CrearOrdenRequest,
  DetalleOrden,
  PreviewOrden,
  PreviewOrdenRequest,
} from '@/types/ordenes'
import { graphqlFetch } from './api'

const FRAGMENTO_ORDEN = `
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
 * GraphQL: mutation cotizarOrden(solicitud: $solicitud)
 * Genera una vista previa de la orden válida por 15 minutos en el backend.
 */
export async function previsualizarOrden(solicitud: PreviewOrdenRequest): Promise<PreviewOrden> {
  const respuesta = await graphqlFetch<{ cotizarOrden: PreviewOrden }>(
    `
    mutation CotizarOrden($solicitud: SolicitudCotizacionInput!) {
      cotizarOrden(solicitud: $solicitud) {
        order_preview_id
        total_price
        currency
      }
    }
  `,
    {
      solicitud: {
        accommodation_id: solicitud.accommodation_id,
        product_id: solicitud.product_id,
        guests: {
          number_of_adults: solicitud.guests.number_of_adults,
          number_of_rooms: solicitud.guests.number_of_rooms,
          children: solicitud.guests.children ?? [],
        },
      },
    },
  )
  return respuesta.cotizarOrden
}

/**
 * GraphQL: mutation crearOrden(idempotencyKey: $idempotencyKey, solicitud: $solicitud)
 * Crea una orden con pago simulado en el backend.
 * Requiere Idempotency-Key (UUID).
 * Envía Authorization: Bearer cuando hay sesión iniciada.
 */
export async function crearOrden(
  solicitud: CrearOrdenRequest,
  idempotencyKey: string = crypto.randomUUID(),
): Promise<DetalleOrden> {
  const respuesta = await graphqlFetch<{ crearOrden: DetalleOrden }>(
    `
    mutation CrearOrden($idempotencyKey: String!, $solicitud: SolicitudOrdenInput!) {
      crearOrden(idempotencyKey: $idempotencyKey, solicitud: $solicitud) {
        ${FRAGMENTO_ORDEN}
      }
    }
  `,
    {
      idempotencyKey,
      solicitud: {
        order_preview_id: solicitud.order_preview_id,
        payment_reference: solicitud.payment_reference,
        customer_details: {
          first_name: solicitud.customer_details.first_name,
          last_name: solicitud.customer_details.last_name,
          email: solicitud.customer_details.email,
        },
      },
    },
  )
  return respuesta.crearOrden
}

/**
 * GraphQL: query orden(id: $id)
 * Consulta el estado y detalle de una orden por su identificador UUID.
 */
export async function obtenerOrden(orderId: string): Promise<DetalleOrden | null> {
  try {
    const respuesta = await graphqlFetch<{ orden: DetalleOrden | null }>(
      `
      query ObtenerOrden($id: ID!) {
        orden(id: $id) {
          ${FRAGMENTO_ORDEN}
        }
      }
    `,
      { id: orderId },
    )
    return respuesta.orden
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'status' in error && (error as { status: number }).status === 404) {
      return null
    }
    throw error
  }
}

/**
 * GraphQL: mutation cancelarOrden(id: $id, idempotencyKey: $idempotencyKey)
 * Cancela una orden confirmada en el backend.
 */
export async function cancelarOrden(orderId: string): Promise<DetalleOrden> {
  const idempotencyKey = crypto.randomUUID()
  const respuesta = await graphqlFetch<{ cancelarOrden: DetalleOrden }>(
    `
    mutation CancelarOrden($id: ID!, $idempotencyKey: String) {
      cancelarOrden(id: $id, idempotencyKey: $idempotencyKey) {
        ${FRAGMENTO_ORDEN}
      }
    }
  `,
    { id: orderId, idempotencyKey },
  )
  return respuesta.cancelarOrden
}
