// Cliente HTTP para la API de Cozy (fase 9, paso 9.5b): la UI se comunica por GraphQL (/graphql).
// En desarrollo se conecta por defecto a http://localhost:3000/graphql (gateway) o a la URL configurada.

const API_LOCAL = 'http://localhost:3000'
const API_CONFIGURADA = import.meta.env.VITE_API_URL?.trim()
if (!API_CONFIGURADA && import.meta.env.PROD) {
  console.error('VITE_API_URL no está definida en este build: las llamadas a la API no funcionarán.')
}
export const API_URL = API_CONFIGURADA || (import.meta.env.PROD ? '' : API_LOCAL)

const GRAPHQL_LOCAL = 'http://localhost:3000/graphql'
const GRAPHQL_CONFIGURADA = import.meta.env.VITE_GRAPHQL_URL?.trim()
export const GRAPHQL_URL =
  GRAPHQL_CONFIGURADA ||
  (API_CONFIGURADA
    ? API_CONFIGURADA.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '') + '/graphql'
    : import.meta.env.PROD
      ? '/graphql'
      : GRAPHQL_LOCAL)

/** Error en formato ProblemDetails (RFC 7807) que devuelve el backend o las extensions de GraphQL */
export interface ProblemDetails {
  type: string
  title: string
  status: number
  code: string
  detail?: string
  invalidParams?: { name: string; reason: string }[]
}

export class ApiError extends Error {
  readonly status: number
  readonly problem?: ProblemDetails
  readonly retryAfter?: number

  constructor(status: number, message: string, problem?: ProblemDetails, retryAfter?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.problem = problem
    this.retryAfter = retryAfter
  }
}

/** Obtiene el token de autenticación JWT almacenado en localStorage si existe sesión activa */
export function obtenerTokenAuth(): string | null {
  try {
    const sesionCruda = localStorage.getItem('cozy:sesion')
    if (sesionCruda) {
      const parsed = JSON.parse(sesionCruda) as { token?: string }
      if (parsed?.token) return parsed.token
    }
    return localStorage.getItem('cozy:token')
  } catch {
    return null
  }
}

/** Obtiene o genera un identificador persistente de dispositivo para cabeceras obligatorias (X-Device-Fingerprint) */
export function obtenerDeviceFingerprint(): string {
  try {
    const guardado = localStorage.getItem('cozy:device-fingerprint')
    if (guardado) return guardado
    const nuevo = 'fp_' + crypto.randomUUID().replace(/-/g, '')
    localStorage.setItem('cozy:device-fingerprint', nuevo)
    return nuevo
  } catch {
    return 'fp_default_cozy_web'
  }
}

// El servicio de cuenta registra aquí cómo renovar el token (evita que api.ts dependa de cuenta.ts).
// Devuelve true si dejó un token nuevo guardado.
let renovador: (() => Promise<boolean>) | null = null
export function registrarRenovador(fn: () => Promise<boolean>): void {
  renovador = fn
}

export interface GraphQLErrorExtensions {
  code?: string
  status?: number
  detail?: string
  instance?: string
  retryAfter?: number
  problem?: ProblemDetails
  [key: string]: unknown
}

export interface GraphQLErrorItem {
  message: string
  locations?: { line: number; column: number }[]
  path?: (string | number)[]
  extensions?: GraphQLErrorExtensions
}

export interface GraphQLResponse<T> {
  data?: T
  errors?: GraphQLErrorItem[]
}

/**
 * Cliente GraphQL de la UI (§9). Realiza un POST a /graphql enviando la consulta o mutación,
 * variables y cabeceras de autorización y de huella de dispositivo.
 * Transforma las `extensions` del error de GraphQL en la clase `ApiError` de la UI.
 */
export async function graphqlFetch<T>(
  query: string,
  variables: Record<string, unknown> = {},
  initHeaders: HeadersInit = {},
): Promise<T> {
  const headers = new Headers(initHeaders)
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const fingerprint = obtenerDeviceFingerprint()
  if (!headers.has('X-Device-Fingerprint')) {
    headers.set('X-Device-Fingerprint', fingerprint)
  }

  const token = obtenerTokenAuth()
  const conTokenDeLaSesion = Boolean(token) && !headers.has('Authorization')
  if (token && conTokenDeLaSesion) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const cuerpo = JSON.stringify({ query, variables })
  let response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers,
    body: cuerpo,
  })

  // Errores a nivel HTTP de red o gateway
  if (!response.ok) {
    const problem = (await response.json().catch(() => undefined)) as ProblemDetails | undefined
    const retryAfterHeader = response.headers.get('Retry-After')
    const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined
    const mensaje =
      problem?.detail ??
      problem?.invalidParams?.[0]?.reason ??
      problem?.title ??
      response.statusText
    throw new ApiError(response.status, mensaje, problem, retryAfter)
  }

  let json = (await response.json()) as GraphQLResponse<T>

  // Manejo de errores de negocio devueltos en HTTP 200 con errors[]
  if (json.errors && json.errors.length > 0) {
    const primerError = json.errors[0]
    const status = primerError.extensions?.status ?? 400

    // Si es 401 con el token de la sesión y no es la propia mutación de renovar, intenta renovar antes de fallar
    if (status === 401 && conTokenDeLaSesion && renovador && !query.includes('renovarSesion') && (await renovador())) {
      headers.set('Authorization', `Bearer ${obtenerTokenAuth()}`)
      response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers,
        body: cuerpo,
      })
      if (!response.ok) {
        const problem = (await response.json().catch(() => undefined)) as ProblemDetails | undefined
        throw new ApiError(response.status, problem?.detail ?? response.statusText, problem)
      }
      json = (await response.json()) as GraphQLResponse<T>
      if (!json.errors || json.errors.length === 0) {
        return json.data as T
      }
    }

    const err = json.errors[0]
    const ext = err.extensions ?? {}
    const problem: ProblemDetails = ext.problem ?? {
      type: 'https://cozy.ec/errors/' + (ext.code || 'GRAPHQL_ERROR'),
      title: ext.code || 'GRAPHQL_ERROR',
      status: ext.status || 400,
      code: ext.code || 'GRAPHQL_ERROR',
      detail: ext.detail || err.message,
    }

    throw new ApiError(
      ext.status || 400,
      ext.detail || err.message,
      problem,
      ext.retryAfter,
    )
  }

  return json.data as T
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  // Envía Authorization: Bearer cuando haya sesión y no se haya especificado otra cabecera
  const token = obtenerTokenAuth()
  const conTokenDeLaSesion = Boolean(token) && !headers.has('Authorization')
  if (token && conTokenDeLaSesion) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let response = await fetch(`${API_URL}${path}`, { ...init, headers })

  // Un 401 con el token de la sesión se intenta salvar renovándolo una vez antes de rendirse. Las rutas /auth/ quedan
  // fuera: un 401 en el login es "credenciales incorrectas" y la renovación no puede renovarse a sí misma.
  if (response.status === 401 && conTokenDeLaSesion && renovador && !path.startsWith('/auth/') && (await renovador())) {
    headers.set('Authorization', `Bearer ${obtenerTokenAuth()}`)
    response = await fetch(`${API_URL}${path}`, { ...init, headers })
  }

  if (!response.ok) {
    const problem = (await response.json().catch(() => undefined)) as ProblemDetails | undefined
    const retryAfterHeader = response.headers.get('Retry-After')
    const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined
    const mensaje =
      problem?.detail ??
      problem?.invalidParams?.[0]?.reason ??
      problem?.title ??
      response.statusText
    throw new ApiError(response.status, mensaje, problem, retryAfter)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
