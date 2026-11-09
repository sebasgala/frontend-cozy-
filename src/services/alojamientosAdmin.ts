// CRUD de alojamientos y ciudades para administración vía GraphQL (/graphql, dueño: catalogo).
import type { AlojamientoAdmin, CiudadAdmin, DatosAlojamiento, Pagina } from '@/types/admin'
import { graphqlFetch } from './api'

export interface FiltroAlojamientos {
  ciudadId?: number
  /** true = solo activos, false = solo dados de baja, sin valor = todos */
  activo?: boolean
  page?: number
  limit?: number
}

const FRAGMENTO_ALOJAMIENTO_ADMIN = `
  id
  nombre
  destino
  ciudadId
  ciudad {
    id
    nombre
    pais
  }
  descripcion
  moneda
  precioPorNoche
  capacidadAdultos
  capacidadNinos
  habitaciones
  tienePiscina
  fotos
  facilidades
  politicas
  propietarioId
  activo
  createdAt
  updatedAt
  _links
`

/** GraphQL: query alojamientosAdmin(filtro) */
export async function listarAlojamientos(filtro: FiltroAlojamientos = {}): Promise<Pagina<AlojamientoAdmin>> {
  const respuesta = await graphqlFetch<{ alojamientosAdmin: Pagina<AlojamientoAdmin> }>(
    `
    query ListarAlojamientosAdmin($filtro: FiltroAlojamientosAdminInput) {
      alojamientosAdmin(filtro: $filtro) {
        data {
          ${FRAGMENTO_ALOJAMIENTO_ADMIN}
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
        ...(filtro.ciudadId != null && { ciudadId: filtro.ciudadId }),
        ...(filtro.activo !== undefined && { activo: filtro.activo }),
        ...(filtro.page != null && { page: filtro.page }),
        ...(filtro.limit != null && { limit: filtro.limit }),
      },
    },
  )
  return respuesta.alojamientosAdmin
}

/** GraphQL: query alojamientoAdmin(id) */
export async function obtenerAlojamientoAdmin(id: number | string): Promise<AlojamientoAdmin> {
  const respuesta = await graphqlFetch<{ alojamientoAdmin: AlojamientoAdmin }>(
    `
    query ObtenerAlojamientoAdmin($id: ID!) {
      alojamientoAdmin(id: $id) {
        ${FRAGMENTO_ALOJAMIENTO_ADMIN}
      }
    }
  `,
    { id: String(id) },
  )
  return respuesta.alojamientoAdmin
}

/** GraphQL: mutation crearAlojamiento(datos) */
export async function crearAlojamiento(datos: DatosAlojamiento): Promise<AlojamientoAdmin> {
  const respuesta = await graphqlFetch<{ crearAlojamiento: AlojamientoAdmin }>(
    `
    mutation CrearAlojamiento($datos: DatosAlojamientoInput!) {
      crearAlojamiento(datos: $datos) {
        ${FRAGMENTO_ALOJAMIENTO_ADMIN}
      }
    }
  `,
    { datos },
  )
  return respuesta.crearAlojamiento
}

/** GraphQL: mutation actualizarAlojamiento(id, datos) */
export async function actualizarAlojamiento(id: number, datos: Partial<DatosAlojamiento>): Promise<AlojamientoAdmin> {
  const respuesta = await graphqlFetch<{ actualizarAlojamiento: AlojamientoAdmin }>(
    `
    mutation ActualizarAlojamiento($id: ID!, $datos: ActualizarAlojamientoInput!) {
      actualizarAlojamiento(id: $id, datos: $datos) {
        ${FRAGMENTO_ALOJAMIENTO_ADMIN}
      }
    }
  `,
    { id: String(id), datos },
  )
  return respuesta.actualizarAlojamiento
}

/** GraphQL: mutation eliminarAlojamiento(id) */
export async function darDeBajaAlojamiento(id: number): Promise<void> {
  await graphqlFetch<{ eliminarAlojamiento: boolean }>(
    `
    mutation EliminarAlojamiento($id: ID!) {
      eliminarAlojamiento(id: $id)
    }
  `,
    { id: String(id) },
  )
}

/** Reactivar un alojamiento dado de baja (PATCH activo = true) */
export function reactivarAlojamiento(id: number): Promise<AlojamientoAdmin> {
  return actualizarAlojamiento(id, { activo: true })
}

/** GraphQL: query ciudades */
export async function listarCiudadesAdmin(): Promise<CiudadAdmin[]> {
  const respuesta = await graphqlFetch<{ ciudades: CiudadAdmin[] }>(`
    query ListarCiudadesAdmin {
      ciudades {
        id
        nombre
        pais
      }
    }
  `)
  return respuesta.ciudades
}

/** GraphQL: mutation crearCiudad(datos) */
export async function crearCiudad(datos: { nombre: string; pais: string }): Promise<CiudadAdmin> {
  const respuesta = await graphqlFetch<{ crearCiudad: CiudadAdmin }>(
    `
    mutation CrearCiudad($datos: CrearCiudadInput!) {
      crearCiudad(datos: $datos) {
        id
        nombre
        pais
      }
    }
  `,
    { datos },
  )
  return respuesta.crearCiudad
}
