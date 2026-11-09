// Servicio base del panel de administración (GraphQL). Todas las rutas exigen el token de una cuenta
// administrador o superadmin; apiFetch ya envía Authorization: Bearer.
import type { ErroresCampo } from '@/types/admin'
import { ApiError, graphqlFetch } from './api'

/** Construye la query string sin los valores vacíos */
export function query(parametros: Record<string, string | number | boolean | undefined | null>): string {
  const p = new URLSearchParams()
  for (const [clave, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== null && valor !== '') p.set(clave, String(valor))
  }
  const texto = p.toString()
  return texto ? `?${texto}` : ''
}

/** Total de elementos de un listado sin traer todos los datos (consulta solo los metadatos vía GraphQL) */
export async function contar(
  recurso: string,
  filtros: Record<string, string | number | boolean | undefined> = {},
): Promise<number> {
  if (recurso.includes('alojamientos')) {
    const respuesta = await graphqlFetch<{ alojamientosAdmin: { meta: { totalItems: number } } }>(
      `
      query ContarAlojamientos($filtro: FiltroAlojamientosAdminInput) {
        alojamientosAdmin(filtro: $filtro) {
          meta {
            totalItems
          }
        }
      }
    `,
      {
        filtro: {
          ...(filtros.ciudadId != null && { ciudadId: Number(filtros.ciudadId) }),
          ...(filtros.activo !== undefined && { activo: Boolean(filtros.activo) }),
          limit: 1,
        },
      },
    )
    return respuesta.alojamientosAdmin?.meta?.totalItems ?? 0
  }

  if (recurso.includes('reservas')) {
    const respuesta = await graphqlFetch<{ reservasAdmin: { meta: { totalItems: number } } }>(
      `
      query ContarReservas($filtro: FiltroReservasAdminInput) {
        reservasAdmin(filtro: $filtro) {
          meta {
            totalItems
          }
        }
      }
    `,
      {
        filtro: {
          ...(filtros.estado && { estado: filtros.estado }),
          ...(filtros.alojamientoId != null && { alojamientoId: Number(filtros.alojamientoId) }),
          limit: 1,
        },
      },
    )
    return respuesta.reservasAdmin?.meta?.totalItems ?? 0
  }

  if (recurso.includes('usuarios')) {
    const respuesta = await graphqlFetch<{ usuariosAdmin: { meta: { totalItems: number } } }>(
      `
      query ContarUsuarios($filtro: FiltroUsuariosInput) {
        usuariosAdmin(filtro: $filtro) {
          meta {
            totalItems
          }
        }
      }
    `,
      {
        filtro: {
          ...(filtros.rol && { rol: filtros.rol }),
          ...(filtros.estado && { estado: filtros.estado }),
          limit: 1,
        },
      },
    )
    return respuesta.usuariosAdmin?.meta?.totalItems ?? 0
  }

  return 0
}

// El backend valida con class-validator y casi todos sus mensajes salen en inglés. Se traducen los más comunes;
// el resto se muestra tal cual. Los mensajes propios del backend (ya en español) pasan sin cambios.
const TRADUCCIONES: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/should not exist$/, () => 'Campo no permitido.'],
  [/must be longer than or equal to (\d+) characters/, (m) => `Debe tener al menos ${m[1]} caracteres.`],
  [/must be shorter than or equal to (\d+) characters/, (m) => `No puede superar ${m[1]} caracteres.`],
  [/must be a positive number/, () => 'Debe ser mayor que 0.'],
  [/must not be less than (-?\d+)/, (m) => `No puede ser menor que ${m[1]}.`],
  [/must not be greater than (-?\d+)/, (m) => `No puede ser mayor que ${m[1]}.`],
  [/must be an integer number/, () => 'Debe ser un número entero.'],
  [/must be a number conforming/, () => 'Debe ser un número con máximo 2 decimales.'],
  [/must be a boolean value/, () => 'Debe ser sí o no.'],
  [/each value in .* must be a URL address/, () => 'Cada dirección debe ser una URL válida (https://…).'],
  [/must be a string/, () => 'Debe ser texto.'],
  [/should not be empty/, () => 'Es obligatorio.'],
]

/** Traduce el motivo de un campo inválido; si trae varios motivos juntos ("; "), traduce cada uno */
export function traducirRazon(razon: string): string {
  return razon
    .split('; ')
    .map((parte) => {
      for (const [patron, traducir] of TRADUCCIONES) {
        const m = parte.match(patron)
        if (m) return traducir(m)
      }
      return parte
    })
    .join(' ')
}

/**
 * Errores de formulario por campo a partir de invalidParams del ProblemDetails, ya en español.
 * "customer_details.email" se guarda también como "email" para que el formulario lo encuentre con su nombre corto.
 */
export function erroresPorCampo(error: unknown): ErroresCampo {
  if (!(error instanceof ApiError) || !error.problem?.invalidParams) return {}
  const errores: ErroresCampo = {}
  for (const { name, reason } of error.problem.invalidParams) {
    const texto = traducirRazon(reason)
    errores[name] = texto
    const corto = name.split('.').pop()
    if (corto && !(corto in errores)) errores[corto] = texto
  }
  return errores
}

const MENSAJES_POR_CODIGO: Record<string, string> = {
  UNAUTHORIZED: 'Tu sesión venció. Vuelve a ingresar.',
  FORBIDDEN: 'Tu rol no tiene permiso para esta acción.',
  ACCOUNT_SUSPENDED: 'Tu cuenta está suspendida.',
  ACCOUNT_PENDING: 'Tu cuenta de administrador aún no fue aprobada.',
  RATE_LIMIT_EXCEEDED: 'Demasiados intentos. Espera un momento y vuelve a probar.',
}

/** Quita las referencias a rutas de la API que algunos mensajes del backend traen para desarrolladores */
const sinRutasApi = (texto: string) => texto.replace(/\s*\((?:GET|POST|PUT|PATCH|DELETE) \/[^)]*\)/g, '')

/** Mensaje general para mostrar al usuario a partir de cualquier error de la API */
export function mensajeDeError(error: unknown, porDefecto = 'No se pudo completar la operación.'): string {
  if (error instanceof ApiError) {
    const code = error.problem?.code
    if (code && MENSAJES_POR_CODIGO[code]) return MENSAJES_POR_CODIGO[code]
    // Un 5xx no trae un mensaje útil para la persona (y a veces llega en inglés desde el servidor)
    if (error.status >= 500) return 'El servidor tuvo un problema. Intenta de nuevo en un momento.'
    if (error.status === 404) return sinRutasApi(error.problem?.detail ?? 'No encontramos lo que buscabas.')
    return sinRutasApi(error.problem?.detail ?? error.message ?? porDefecto)
  }
  if (error instanceof TypeError) return 'No hay conexión con el servidor.'
  return error instanceof Error ? error.message : porDefecto
}

/** true si el error significa que la sesión ya no sirve (token vencido, inválido o cuenta suspendida) */
export function esErrorDeSesion(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.problem?.code === 'ACCOUNT_SUSPENDED')
}
