// Gestión de cuentas por el superadmin vía GraphQL (/graphql, dueño: usuarios).
import type { CuentaCreadaAdmin, DatosNuevoUsuarioAdmin, Pagina, UsuarioAdmin } from '@/types/admin'
import type { EstadoUsuario, RolUsuario } from '@/types/cuenta'
import { graphqlFetch } from './api'

export interface FiltroUsuarios {
  rol?: RolUsuario
  estado?: EstadoUsuario
  page?: number
  limit?: number
}

const FRAGMENTO_USUARIO_ADMIN = `
  id
  email
  nombre
  apellido
  rol
  estado
  alojamientoId
  requiereCambioClave
  createdAt
`

/** GraphQL: query usuariosAdmin(filtro) */
export async function listarUsuarios(filtro: FiltroUsuarios = {}): Promise<Pagina<UsuarioAdmin>> {
  const respuesta = await graphqlFetch<{ usuariosAdmin: Pagina<UsuarioAdmin> }>(
    `
    query ListarUsuariosAdmin($filtro: FiltroUsuariosInput) {
      usuariosAdmin(filtro: $filtro) {
        data {
          ${FRAGMENTO_USUARIO_ADMIN}
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
        ...(filtro.rol && { rol: filtro.rol }),
        ...(filtro.estado && { estado: filtro.estado }),
        ...(filtro.page != null && { page: filtro.page }),
        ...(filtro.limit != null && { limit: filtro.limit }),
      },
    },
  )
  return respuesta.usuariosAdmin
}

/** GraphQL: mutation aprobarUsuario(id) */
export async function aprobarUsuario(id: string): Promise<UsuarioAdmin> {
  const respuesta = await graphqlFetch<{ aprobarUsuario: UsuarioAdmin }>(
    `
    mutation AprobarUsuario($id: ID!) {
      aprobarUsuario(id: $id) {
        ${FRAGMENTO_USUARIO_ADMIN}
      }
    }
  `,
    { id },
  )
  return respuesta.aprobarUsuario
}

/** GraphQL: mutation suspenderUsuario(id) */
export async function suspenderUsuario(id: string): Promise<UsuarioAdmin> {
  const respuesta = await graphqlFetch<{ suspenderUsuario: UsuarioAdmin }>(
    `
    mutation SuspenderUsuario($id: ID!) {
      suspenderUsuario(id: $id) {
        ${FRAGMENTO_USUARIO_ADMIN}
      }
    }
  `,
    { id },
  )
  return respuesta.suspenderUsuario
}

/** GraphQL: mutation reactivarUsuario(id) */
export async function reactivarUsuario(id: string): Promise<UsuarioAdmin> {
  const respuesta = await graphqlFetch<{ reactivarUsuario: UsuarioAdmin }>(
    `
    mutation ReactivarUsuario($id: ID!) {
      reactivarUsuario(id: $id) {
        ${FRAGMENTO_USUARIO_ADMIN}
      }
    }
  `,
    { id },
  )
  return respuesta.reactivarUsuario
}

/** GraphQL: mutation crearUsuarioAdmin(datos) */
export async function crearUsuarioAdmin(datos: DatosNuevoUsuarioAdmin): Promise<CuentaCreadaAdmin> {
  const respuesta = await graphqlFetch<{ crearUsuarioAdmin: CuentaCreadaAdmin }>(
    `
    mutation CrearUsuarioAdmin($datos: CrearUsuarioAdminInput!) {
      crearUsuarioAdmin(datos: $datos) {
        ${FRAGMENTO_USUARIO_ADMIN}
        claveTemporal
      }
    }
  `,
    {
      datos: {
        email: datos.email,
        nombre: datos.nombre,
        apellido: datos.apellido,
        ...(datos.password ? { password: datos.password } : {}),
        rol: datos.rol,
        ...(datos.alojamientoId != null ? { alojamientoId: datos.alojamientoId } : {}),
      },
    },
  )
  return respuesta.crearUsuarioAdmin
}

/** GraphQL: mutation cambiarRolUsuario(id, rol, alojamientoId) */
export async function cambiarRolUsuario(id: string, rol: RolUsuario, alojamientoId?: number | null): Promise<UsuarioAdmin> {
  const respuesta = await graphqlFetch<{ cambiarRolUsuario: UsuarioAdmin }>(
    `
    mutation CambiarRolUsuario($id: ID!, $rol: String!, $alojamientoId: Int) {
      cambiarRolUsuario(id: $id, rol: $rol, alojamientoId: $alojamientoId) {
        ${FRAGMENTO_USUARIO_ADMIN}
      }
    }
  `,
    { id, rol, ...(alojamientoId != null && { alojamientoId }) },
  )
  return respuesta.cambiarRolUsuario
}
