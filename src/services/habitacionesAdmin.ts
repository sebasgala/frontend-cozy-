// Habitaciones y disponibilidad por fecha para administración vía GraphQL (/graphql).
import type {
  DatosEdicionDisponibilidad,
  DatosHabitacion,
  DisponibilidadAdmin,
  EdicionDisponibilidad,
  HabitacionAdmin,
} from '@/types/admin'
import { graphqlFetch } from './api'

const FRAGMENTO_HABITACION = `
  id
  alojamientoId
  nombre
  tipo
  capacidadAdultos
  capacidadNinos
  precioBase
  mealPlan
  cancellationType
  activo
`

/** GraphQL: query habitaciones(alojamientoId) */
export async function listarHabitaciones(alojamientoId: number, incluirInactivas = false): Promise<HabitacionAdmin[]> {
  const respuesta = await graphqlFetch<{ habitaciones: HabitacionAdmin[] }>(
    `
    query ListarHabitaciones($alojamientoId: Int!) {
      habitaciones(alojamientoId: $alojamientoId) {
        ${FRAGMENTO_HABITACION}
      }
    }
  `,
    { alojamientoId },
  )
  const todas = respuesta.habitaciones ?? []
  return incluirInactivas ? todas : todas.filter((h) => h.activo)
}

/** GraphQL: query habitacion(id) */
export async function obtenerHabitacion(id: string): Promise<HabitacionAdmin> {
  const respuesta = await graphqlFetch<{ habitacion: HabitacionAdmin }>(
    `
    query ObtenerHabitacion($id: ID!) {
      habitacion(id: $id) {
        ${FRAGMENTO_HABITACION}
      }
    }
  `,
    { id },
  )
  return respuesta.habitacion
}

/** GraphQL: mutation crearHabitacion(alojamientoId, datos) */
export async function crearHabitacion(alojamientoId: number, datos: DatosHabitacion): Promise<HabitacionAdmin> {
  const respuesta = await graphqlFetch<{ crearHabitacion: HabitacionAdmin }>(
    `
    mutation CrearHabitacion($alojamientoId: Int!, $datos: DatosHabitacionInput!) {
      crearHabitacion(alojamientoId: $alojamientoId, datos: $datos) {
        ${FRAGMENTO_HABITACION}
      }
    }
  `,
    { alojamientoId, datos },
  )
  return respuesta.crearHabitacion
}

/** GraphQL: mutation actualizarHabitacion(id, datos) */
export async function actualizarHabitacion(id: string, datos: Partial<DatosHabitacion>): Promise<HabitacionAdmin> {
  const respuesta = await graphqlFetch<{ actualizarHabitacion: HabitacionAdmin }>(
    `
    mutation ActualizarHabitacion($id: ID!, $datos: ActualizarHabitacionInput!) {
      actualizarHabitacion(id: $id, datos: $datos) {
        ${FRAGMENTO_HABITACION}
      }
    }
  `,
    { id, datos },
  )
  return respuesta.actualizarHabitacion
}

/** GraphQL: mutation desactivarHabitacion(id) */
export async function desactivarHabitacion(id: string): Promise<HabitacionAdmin> {
  const respuesta = await graphqlFetch<{ desactivarHabitacion: HabitacionAdmin }>(
    `
    mutation DesactivarHabitacion($id: ID!) {
      desactivarHabitacion(id: $id) {
        ${FRAGMENTO_HABITACION}
      }
    }
  `,
    { id },
  )
  return respuesta.desactivarHabitacion
}

/** GraphQL: mutation reactivarHabitacion(id) */
export async function reactivarHabitacion(id: string): Promise<HabitacionAdmin> {
  const respuesta = await graphqlFetch<{ reactivarHabitacion: HabitacionAdmin }>(
    `
    mutation ReactivarHabitacion($id: ID!) {
      reactivarHabitacion(id: $id) {
        ${FRAGMENTO_HABITACION}
      }
    }
  `,
    { id },
  )
  return respuesta.reactivarHabitacion
}

/** GraphQL: query disponibilidadAdmin(habitacionId, desde, hasta) */
export async function listarDisponibilidad(habitacionId: string, desde: string, hasta: string): Promise<DisponibilidadAdmin> {
  const respuesta = await graphqlFetch<{ disponibilidadAdmin: DisponibilidadAdmin }>(
    `
    query ListarDisponibilidadAdmin($habitacionId: ID!, $desde: String!, $hasta: String!) {
      disponibilidadAdmin(habitacionId: $habitacionId, desde: $desde, hasta: $hasta) {
        habitacionId
        desde
        hasta
        dias {
          fecha
          cuposTotales
          cupos
          vendidas
          precio
        }
      }
    }
  `,
    { habitacionId, desde, hasta },
  )
  return respuesta.disponibilidadAdmin
}

/** GraphQL: mutation editarDisponibilidad(habitacionId, datos) */
export async function editarDisponibilidad(habitacionId: string, datos: DatosEdicionDisponibilidad): Promise<EdicionDisponibilidad> {
  const respuesta = await graphqlFetch<{ editarDisponibilidad: EdicionDisponibilidad }>(
    `
    mutation EditarDisponibilidad($habitacionId: ID!, $datos: EdicionDisponibilidadInput!) {
      editarDisponibilidad(habitacionId: $habitacionId, datos: $datos) {
        habitacionId
        dryRun
        resumen {
          creados
          actualizados
          sinCambios
        }
        cambios {
          fecha
          accion
          antes {
            fecha
            cuposTotales
            cupos
            vendidas
            precio
          }
          despues {
            fecha
            cuposTotales
            cupos
            vendidas
            precio
          }
        }
      }
    }
  `,
    { habitacionId, datos },
  )
  return respuesta.editarDisponibilidad
}
