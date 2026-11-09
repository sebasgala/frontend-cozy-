// Servicio de cuenta del cliente conectado a GraphQL (/graphql).
import type { Alojamiento } from '@/types/alojamientos'
import type { DatosIngreso, DatosRegistro, EstadoUsuario, RolUsuario, SesionCliente } from '@/types/cuenta'
import type { DetalleOrden } from '@/types/ordenes'
import type { ReservaCompleta } from '@/types/reservas'
import { ApiError, graphqlFetch, registrarRenovador } from './api'
import { alojamientoEnCatalogo, obtenerCatalogoApi } from './alojamientos'

const CLAVE_SESION = 'cozy:sesion'
const CLAVE_FAVORITOS = 'cozy:favoritos'
const EVENTO_SESION = 'cozy:sesion-cambio'

export const CLAVE_SESION_STORAGE = CLAVE_SESION
export const EVENTO_SESION_CAMBIO = EVENTO_SESION

// El token dura 10 minutos: se renueva 2 minutos antes de que venza (a los 8). La espera nunca baja de 15 segundos para
// no renovar en bucle si el reloj del equipo va adelantado respecto del servidor.
const MARGEN_RENOVACION_MS = 2 * 60_000
const ESPERA_MINIMA_MS = 15_000
const VIGENCIA_SUPUESTA_MS = 10 * 60_000
const REINTENTO_POR_RED_MS = 30_000

function iniciales(nombre: string, apellido: string): string {
  return `${nombre.trim().charAt(0)}${apellido.trim().charAt(0)}`.toUpperCase()
}

function establecerSesion(sesion: SesionCliente): void {
  try {
    localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion))
    if (sesion.token) {
      localStorage.setItem('cozy:token', sesion.token)
    }
  } catch {
    // no-op
  }
  programarRenovacion()
  window.dispatchEvent(new Event(EVENTO_SESION))
}

// ── Renovación del token ──

let temporizadorRenovacion: ReturnType<typeof setTimeout> | undefined
let renovacionEnCurso: Promise<boolean> | null = null

/** Instante de vencimiento (ms) que trae el propio token, o null si no se puede leer */
function vencimientoDelToken(token: string): number | null {
  try {
    const carga = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: unknown }
    return typeof carga.exp === 'number' ? carga.exp * 1000 : null
  } catch {
    return null
  }
}

function programarRenovacion(espera?: number): void {
  clearTimeout(temporizadorRenovacion)
  temporizadorRenovacion = undefined
  const token = obtenerSesion()?.token
  if (!token) return
  const vence = vencimientoDelToken(token) ?? Date.now() + VIGENCIA_SUPUESTA_MS
  const aEsperar = espera ?? Math.max(vence - MARGEN_RENOVACION_MS - Date.now(), ESPERA_MINIMA_MS)
  temporizadorRenovacion = setTimeout(() => void renovarToken(), aEsperar)
}

async function renovar(): Promise<boolean> {
  const sesion = obtenerSesion()
  if (!sesion?.token) return false
  try {
    const respuesta = await graphqlFetch<{
      renovarSesion: {
        access_token: string
        token_type: string
        expires_in: number
        usuario: UsuarioResponseDto
      }
    }>(`
      mutation RenovarSesion {
        renovarSesion {
          access_token
          token_type
          expires_in
          usuario {
            id
            email
            nombre
            apellido
            rol
            estado
          }
        }
      }
    `)
    const { access_token, usuario } = respuesta.renovarSesion
    // Si mientras tanto se cerró la sesión o entró otra cuenta, el token nuevo ya no corresponde
    if (obtenerSesion()?.id !== sesion.id) return false
    establecerSesion({
      ...sesion,
      token: access_token,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      correo: usuario.email,
      iniciales: iniciales(usuario.nombre, usuario.apellido),
      rol: usuario.rol,
      estado: usuario.estado,
    })
    return true
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      await cerrarSesion()
    } else {
      // Fallo de red o del servidor: la sesión sigue y se reintenta pronto
      programarRenovacion(REINTENTO_POR_RED_MS)
    }
    return false
  }
}

/**
 * Mutation renovarSesion
 * Cambia el token por uno nuevo de 10 minutos. Es la única llamada que vuelve a leer la cuenta: si fue suspendida (403)
 * o el token ya venció (401), cierra la sesión. Devuelve true si dejó un token nuevo guardado.
 */
export function renovarToken(): Promise<boolean> {
  renovacionEnCurso ??= renovar().finally(() => {
    renovacionEnCurso = null
  })
  return renovacionEnCurso
}

registrarRenovador(renovarToken)

let cacheSesionCruda: string | null = null
let cacheSesion: SesionCliente | null = null

/** Sesión actual, lectura síncrona y con referencia estable para useSyncExternalStore */
export function obtenerSesion(): SesionCliente | null {
  let cruda: string | null
  try {
    cruda = localStorage.getItem(CLAVE_SESION)
  } catch {
    cruda = null
  }
  if (cruda === cacheSesionCruda) return cacheSesion
  cacheSesionCruda = cruda
  try {
    cacheSesion = cruda ? (JSON.parse(cruda) as SesionCliente) : null
  } catch {
    cacheSesion = null
  }
  return cacheSesion
}

interface UsuarioResponseDto {
  id: string
  email: string
  nombre: string
  apellido: string
  rol: RolUsuario
  estado: EstadoUsuario
  createdAt: string
}

/**
 * GraphQL: mutation registrarse(datos: $datos)
 * Registra un cliente nuevo y automáticamente inicia sesión para emitir su token JWT.
 */
export async function registrarCliente(datos: DatosRegistro): Promise<SesionCliente> {
  const correo = datos.correo.trim().toLowerCase()
  // 1. Registro en backend vía GraphQL
  await graphqlFetch<{ registrarse: UsuarioResponseDto }>(
    `
    mutation RegistrarCliente($datos: RegistroInput!) {
      registrarse(datos: $datos) {
        id
        email
        nombre
        apellido
        rol
        estado
      }
    }
  `,
    {
      datos: {
        email: correo,
        password: datos.contrasena,
        nombre: datos.nombre.trim(),
        apellido: datos.apellido.trim(),
        rol: 'cliente',
      },
    },
  )

  // 2. Login inmediato para obtener token JWT
  return iniciarSesion({ correo, contrasena: datos.contrasena })
}

/**
 * GraphQL: mutation iniciarSesion(datos: $datos)
 * Autentica contra el backend NestJS y almacena el token JWT.
 */
export async function iniciarSesion(datos: DatosIngreso): Promise<SesionCliente> {
  const respuesta = await graphqlFetch<{
    iniciarSesion: {
      access_token: string
      token_type: string
      expires_in: number
      usuario: UsuarioResponseDto
    }
  }>(
    `
    mutation IniciarSesion($email: String!, $password: String!) {
      iniciarSesion(email: $email, password: $password) {
        access_token
        token_type
        expires_in
        usuario {
          id
          email
          nombre
          apellido
          rol
          estado
        }
      }
    }
  `,
    {
      email: datos.correo.trim().toLowerCase(),
      password: datos.contrasena,
    },
  )

  const { usuario, access_token } = respuesta.iniciarSesion
  const sesion: SesionCliente = {
    id: usuario.id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    correo: usuario.email,
    token: access_token,
    iniciales: iniciales(usuario.nombre, usuario.apellido),
    rol: usuario.rol,
    estado: usuario.estado,
  }
  establecerSesion(sesion)
  return sesion
}

/**
 * GraphQL: query yo
 * Consulta el perfil del usuario autenticado actualmente con su Bearer token.
 * Si el token ya no sirve (401) o la cuenta fue suspendida (403), cierra la sesión y devuelve null.
 * Ante un fallo de red devuelve la sesión guardada sin cambios.
 */
export async function obtenerPerfil(): Promise<SesionCliente | null> {
  const sesion = obtenerSesion()
  if (!sesion?.token) return null

  try {
    const respuesta = await graphqlFetch<{ yo: UsuarioResponseDto }>(`
      query ObtenerPerfil {
        yo {
          id
          email
          nombre
          apellido
          rol
          estado
        }
      }
    `)
    const usuario = respuesta.yo
    const actualizada: SesionCliente = {
      ...sesion,
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      correo: usuario.email,
      iniciales: iniciales(usuario.nombre, usuario.apellido),
      rol: usuario.rol,
      estado: usuario.estado,
    }
    establecerSesion(actualizada)
    return actualizada
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      await cerrarSesion()
      return null
    }
    return sesion
  }
}

/** true si la cuenta puede entrar al panel de administración */
export function esAdministracion(rol: RolUsuario | undefined): boolean {
  return rol === 'administrador' || rol === 'superadmin'
}

export function cerrarSesion(): Promise<void> {
  try {
    localStorage.removeItem(CLAVE_SESION)
    localStorage.removeItem('cozy:token')
  } catch {
    // no-op
  }
  cacheSesionCruda = null
  cacheSesion = null
  clearTimeout(temporizadorRenovacion)
  temporizadorRenovacion = undefined
  window.dispatchEvent(new Event(EVENTO_SESION))
  return Promise.resolve()
}

/** Mapea un DetalleOrden del backend al tipo completo que consume la interfaz */
export function mapearOrdenAReservaCompleta(orden: DetalleOrden): ReservaCompleta {
  const ad = orden.accommodation_details
  const adultos = ad.guests?.number_of_adults ?? 1
  const ninos = ad.guests?.children?.length ?? 0
  const noches = ad.nights || 1
  const cuartos = ad.rooms || 1
  const precioPorNoche = Math.round(orden.total_price / (noches * cuartos))

  // Enriquecer con foto y destino del catálogo de la API (cargado antes por listarMisReservas)
  const al = alojamientoEnCatalogo(ad.accommodation_id)

  return {
    localizador: orden.locator,
    orderId: orden.order_id,
    estado: orden.status,
    alojamientoId: ad.accommodation_id,
    alojamientoNombre: ad.name,
    alojamientoFoto: al?.fotos?.[0] ?? null,
    destino: al?.destino ?? '',
    entrada: ad.checkin,
    salida: ad.checkout,
    noches,
    huespedes: adultos + ninos,
    lineas: [
      {
        habitacionId: ad.product_id,
        habitacionNombre: ad.room_name,
        // Misma regla que el detalle del alojamiento: cancelación gratuita = tarifa flexible
        tarifa: ad.cancellation_type === 'free_cancellation' ? 'flexible' : 'estandar',
        cantidad: cuartos,
        precioPorNoche,
        subtotal: orden.total_price,
        mealPlan: null,
        cancellationType: ad.cancellation_type,
      },
    ],
    totalHabitaciones: cuartos,
    precioTotal: orden.total_price,
    moneda: orden.currency,
    datosHuesped: { nombre: '', apellido: '', correo: '' },
    referenciaPago: '',
    creadoEn: orden.creation_date,
  }
}

/**
 * GraphQL: query misReservas
 * "Mis reservas": consulta las órdenes reales asociadas al usuario autenticado.
 */
export async function listarMisReservas(): Promise<ReservaCompleta[]> {
  const sesion = obtenerSesion()
  if (!sesion?.token) return []

  try {
    const [respuesta] = await Promise.all([
      graphqlFetch<{
        misReservas: {
          data: DetalleOrden[]
        }
      }>(`
        query MisReservas {
          misReservas {
            data {
              order_id
              locator
              status
              total_price
              currency
              creation_date
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
            }
          }
        }
      `),
      obtenerCatalogoApi().catch(() => []),
    ])
    return (respuesta.misReservas?.data ?? []).map(mapearOrdenAReservaCompleta)
  } catch (error) {
    // Si la sesión expiró (401), cerramos sesión silenciosamente
    if (typeof error === 'object' && error !== null && 'status' in error && (error as { status: number }).status === 401) {
      await cerrarSesion()
    }
    return []
  }
}

// ── Favoritos ──
// NOTA DE ARQUITECTURA: El backend todavía no dispone de una tabla o módulo de favoritos de usuario
// ni de endpoints para persistirlos. Por esta razón, se mantienen almacenados en el localStorage del navegador
// bajo la clave 'cozy:favoritos'. Cuando el backend incorpore la persistencia de favoritos por cuenta de usuario,
// este bloque pasará a comunicarse mediante apiFetch.

function leerMapaFavoritos(): Record<number, boolean> {
  try {
    const guardado = localStorage.getItem(CLAVE_FAVORITOS)
    return guardado ? (JSON.parse(guardado) as Record<number, boolean>) : {}
  } catch {
    return {}
  }
}

export async function listarFavoritos(): Promise<Alojamiento[]> {
  const mapa = leerMapaFavoritos()
  const idsFavoritos = Object.keys(mapa)
    .filter((id) => mapa[Number(id)])
    .map(Number)
  const catalogo = await obtenerCatalogoApi().catch(() => [])
  return catalogo.filter((a) => idsFavoritos.includes(a.id) && a.activo)
}

export function quitarFavorito(alojamientoId: number): Promise<void> {
  const mapa = leerMapaFavoritos()
  delete mapa[alojamientoId]
  try {
    localStorage.setItem(CLAVE_FAVORITOS, JSON.stringify(mapa))
  } catch {
    // no-op
  }
  return Promise.resolve()
}

// Una sesión que sobrevive a la recarga de la página también se renueva a tiempo
programarRenovacion()
