// Tipos de las rutas internas de administración (GraphQL).
// Siguen el contrato interno: contracts/cozy-interno-openapi.yaml.
import type { EstadoUsuario, RolUsuario } from './cuenta'

/** Metadatos de los listados paginados del backend (PaginaMetaDto) */
export interface MetaPagina {
  totalItems: number
  itemCount: number
  itemsPerPage: number
  totalPages: number
  currentPage: number
}

export interface Pagina<T> {
  data: T[]
  meta: MetaPagina
}

/** Usuario tal como lo devuelve el backend (UsuarioResponseDto) */
export interface UsuarioAdmin {
  id: string
  email: string
  nombre: string
  apellido: string
  rol: RolUsuario
  estado: EstadoUsuario
  createdAt: string
}

/** Errores de un formulario por nombre de campo, a partir de invalidParams */
export type ErroresCampo = Record<string, string>

/** Ciudad del catálogo común (CiudadResponseDto). pais es ISO 3166-1 alfa-2 en minúsculas. */
export interface CiudadAdmin {
  id: number
  nombre: string
  pais: string
}

/** Alojamiento tal como lo devuelve /admin/alojamientos (AlojamientoResponseDto) */
export interface AlojamientoAdmin {
  id: number
  nombre: string
  /** Se copia solo del nombre de la ciudad; no se envía al crear */
  destino: string
  ciudadId: number | null
  ciudad: CiudadAdmin | null
  descripcion: string | null
  moneda: string
  precioPorNoche: number
  capacidadAdultos: number
  capacidadNinos: number
  /** Habitaciones activas (se calcula contando la tabla; no se envía al crear) */
  habitaciones: number
  tienePiscina: boolean
  fotos: string[] | null
  facilidades: string[] | null
  politicas: Record<string, unknown> | null
  /** false = dado de baja (borrado lógico) */
  activo: boolean
  updatedAt: string
  /** Código público del contrato v2 (HTL-COZY-UIO-001); se genera solo y no cambia */
  codigo: string
  estrellas: number
  tipoPropiedad: TipoPropiedad
  direccion: string | null
  latitud: number | null
  longitud: number | null
}

export type TipoPropiedad = 'HOTEL' | 'RESORT' | 'APARTAMENTO' | 'HOSTAL' | 'HOSTERIA'

/** Cuerpo de POST/PATCH /admin/alojamientos (CreateAlojamientoDto). Un campo que no esté aquí da 400. */
export interface DatosAlojamiento {
  nombre: string
  ciudadId: number
  descripcion?: string | null
  moneda?: string
  precioPorNoche: number
  capacidadAdultos: number
  capacidadNinos: number
  tienePiscina: boolean
  fotos?: string[]
  facilidades?: string[]
  politicas?: Record<string, unknown>
  activo?: boolean
  estrellas?: number
  tipoPropiedad?: TipoPropiedad
  direccion?: string | null
}

/** Habitación de un alojamiento (HabitacionAdminResponseDto) */
export interface HabitacionAdmin {
  id: string
  alojamientoId: number
  nombre: string
  tipo: string
  capacidadAdultos: number
  capacidadNinos: number
  /** Precio de catálogo; el precio real de cada noche está en la disponibilidad */
  precioBase: number
  mealPlan: string | null
  cancellationType: string | null
  /** false = desactivada: no se vende, pero sus reservas siguen vigentes */
  activo: boolean
}

/** Cuerpo de POST/PATCH de habitaciones (CrearHabitacionDto). El estado se cambia con desactivar/reactivar. */
export interface DatosHabitacion {
  nombre: string
  tipo: string
  capacidadAdultos: number
  capacidadNinos: number
  precioBase: number
  mealPlan?: string | null
  cancellationType?: string | null
}

/** Un día de disponibilidad: habitaciones que existen (cuposTotales), que quedan (cupos) y vendidas */
export interface DiaDisponibilidad {
  fecha: string
  cuposTotales: number
  cupos: number
  vendidas: number
  precio: number
}

export interface DisponibilidadAdmin {
  habitacionId: string
  desde: string
  hasta: string
  /** Solo los días que tienen fila: un día sin fila no se vende */
  dias: DiaDisponibilidad[]
}

/** Cuerpo de PATCH /admin/habitaciones/{id}/disponibilidad (EditarRangoDto) */
export interface DatosEdicionDisponibilidad {
  desde: string
  hasta: string
  cuposTotales?: number
  precio?: number
  /** 0 = domingo … 6 = sábado. Sin valor: todos los días del rango */
  diasSemana?: number[]
  /** true = solo devuelve lo que cambiaría, sin guardar */
  dryRun?: boolean
}

export interface CambioDisponibilidad {
  fecha: string
  accion: 'crear' | 'actualizar' | 'sin_cambios'
  antes: DiaDisponibilidad | null
  despues: DiaDisponibilidad
}

export interface EdicionDisponibilidad {
  habitacionId: string
  dryRun: boolean
  resumen: { creados: number; actualizados: number; sinCambios: number }
  cambios: CambioDisponibilidad[]
}

/** Estado de una reserva (ordenes.status en el backend) */
export type EstadoReserva = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'POR_LIMPIAR' | 'LIMPIA_LISTA'

/** Quién reservó: viene en la lista de administración (no en la cuenta del cliente) */
export interface ClienteReserva {
  first_name: string
  last_name: string
  email: string
}

/** Reserva tal como la devuelve /admin/reservas (ReservaAdminDto) */
export interface ReservaAdmin {
  order_id: string
  locator: string
  status: EstadoReserva
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
    guests: Record<string, unknown>
  }
  total_price: number
  currency: string
  /** ISO 8601 con hora */
  creation_date: string
  customer_details: ClienteReserva
  /** Cuenta del cliente; null = compra sin cuenta */
  cliente_id: string | null
}
