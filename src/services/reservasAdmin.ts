// Reservas de los alojamientos del administrador vía GraphQL (/graphql, dueño: reservas).
import type { EstadoReserva, Pagina, ReservaAdmin } from '@/types/admin'
import { graphqlFetch } from './api'

export interface FiltroReservas {
  estado?: EstadoReserva
  alojamientoId?: number
  page?: number
  limit?: number
}

const FRAGMENTO_RESERVA_ADMIN = `
  order_id
  locator
  status
  total_price
  currency
  creation_date
  cliente_id
  customer_details {
    first_name
    last_name
    email
  }
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

/** GraphQL: query reservasAdmin(filtro) */
export async function listarReservasAdmin(filtro: FiltroReservas = {}): Promise<Pagina<ReservaAdmin>> {
  const respuesta = await graphqlFetch<{ reservasAdmin: Pagina<ReservaAdmin> }>(
    `
    query ListarReservasAdmin($filtro: FiltroReservasAdminInput) {
      reservasAdmin(filtro: $filtro) {
        data {
          ${FRAGMENTO_RESERVA_ADMIN}
        }
        meta {
          totalItems
          itemCount
          itemsPerPage
          totalPages
          currentPage
        }
      }
    }
  `,
    {
      filtro: {
        ...(filtro.estado && { estado: filtro.estado }),
        ...(filtro.alojamientoId != null && { alojamientoId: filtro.alojamientoId }),
        ...(filtro.page != null && { page: filtro.page }),
        ...(filtro.limit != null && { limit: filtro.limit }),
      },
    },
  )
  return respuesta.reservasAdmin
}

/** GraphQL: mutation cancelarReservaAdmin(id) */
export async function cancelarReservaAdmin(orderId: string): Promise<unknown> {
  const respuesta = await graphqlFetch<{ cancelarReservaAdmin: unknown }>(
    `
    mutation CancelarReservaAdmin($id: ID!) {
      cancelarReservaAdmin(id: $id) {
        order_id
        locator
        status
        total_price
        currency
      }
    }
  `,
    { id: orderId },
  )
  return respuesta.cancelarReservaAdmin
}
