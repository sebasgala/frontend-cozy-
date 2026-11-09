// Tipos de alojamientos. Siguen los DTOs del backend (módulo alojamientos)
// para que el cambio de mocks a API real no toque las pantallas.

export interface Ciudad {
  id: number
  nombre: string
  /** Código ISO 3166-1 alpha-2 en minúsculas, ej. "ec" */
  pais: string
}

export interface Alojamiento {
  id: number
  nombre: string
  destino: string
  ciudadId: number | null
  ciudad: Ciudad | null
  descripcion: string | null
  /** Moneda ISO 4217, ej. "USD" */
  moneda: string
  /**
   * Con fechas: promedio por noche de la habitación más barata disponible (sale de /availability).
   * Sin fechas: precio base de catálogo (el menor base_price de /details), que NO es un precio real de reserva.
   */
  precioPorNoche: number
  /** Total real de la estadía para las fechas buscadas (habitación más barata disponible). Solo con fechas. */
  precioEstancia?: number
  capacidadAdultos: number
  capacidadNinos: number
  habitaciones: number
  tienePiscina: boolean
  fotos: string[] | null
  facilidades: string[] | null
  politicas: Record<string, string> | null
  activo: boolean
  updatedAt: string
  /** Tipo de alojamiento (ej. "Hotel", "Cabaña", "Resort", "Hostal") */
  tipo?: string
  /** Zona o barrio dentro de la ciudad (ej. "Centro Histórico", "Malecón") */
  zona?: string
  /** Distancia al centro en metros */
  distanciaMetros?: number
  /** Calificación en estrellas (1 a 5) */
  estrellas?: number
  /** Puntuación general de reseñas sobre 10 (ej. 9.2) */
  puntuacion?: number
  /** Cantidad de comentarios recibidos */
  comentariosConteo?: number
  /** Porcentaje de descuento simulado si aplica */
  descuentoPorcentaje?: number
}

export interface Subpuntuacion {
  nombre: string
  puntuacion: number
}

export type TipoViajeResena = 'pareja' | 'familia' | 'solo' | 'trabajo'

export interface Resena {
  id: string
  alojamientoId: number
  nombre: string
  pais: string
  /** Marca de tiempo o fecha ISO */
  fecha: string
  tipoViaje: TipoViajeResena
  puntuacion: number
  titulo: string
  comentario: string
  aFavor?: string
  enContra?: string
  utiles: number
}

export interface DetalleAlojamientoCompleto extends Alojamiento {
  subpuntuaciones: Subpuntuacion[]
  resenas: Resena[]
}

export interface FiltrosCatalogo {
  destinoId?: number
  entrada?: string
  salida?: string
  huespedes?: number
  tipos?: string[]
  precioMin?: number
  precioMax?: number
  estrellas?: number[]
  comodidades?: string[]
  orden?: 'destacados' | 'precio-asc' | 'precio-desc' | 'puntuacion'
  pagina?: number
  limite?: number
}

export interface ResultadoCatalogo {
  items: Alojamiento[]
  total: number
  precioMinimoCatalogo: number
  precioMaximoCatalogo: number
  histogramaPrecios: number[]
  tiposDisponibles: { tipo: string; cantidad: number }[]
  estrellasDisponibles: { estrellas: number; cantidad: number }[]
  comodidadesDisponibles: { comodidad: string; cantidad: number }[]
}

export interface Huespedes {
  number_of_adults: number
  number_of_rooms: number
  /** Edades de los niños */
  children?: number[]
}

export interface BusquedaAlojamientos {
  ciudadId?: number
  checkin: string
  checkout: string
  guests: Huespedes
}

export interface PrecioNoche {
  date: string
  price: number
}

/** Oferta concreta (habitación + fechas) devuelta por /availability */
export interface ProductoDisponible {
  /** Formato `<uuid-habitación>:<checkin>:<checkout>` */
  product_id: string
  name: string
  type: string
  meal_plan: string | null
  cancellation_type: string | null
  max_adults: number
  max_children: number
  rooms_left: number
  price: {
    currency: string
    total: number
    nights: PrecioNoche[]
  }
}

export interface Disponibilidad {
  id: number
  currency: string
  products: ProductoDisponible[]
}

export interface Paginado<T> {
  data: T[]
  meta: {
    totalItems: number
    itemCount: number
    itemsPerPage: number
    totalPages: number
    currentPage: number
  }
}

export type EstiloViaje = 'playa' | 'montana' | 'historicas' | 'romantico' | 'familia'

/**
 * Ciudad enriquecida para el Inicio. `destacado`, `estilos`, `foto` y `precioDesde`
 * NO existen en el backend (GET /ciudades solo devuelve id, nombre y pais): la UI
 * debe tolerar su ausencia al conectar la API real.
 */
export interface Destino extends Ciudad {
  destacado?: boolean
  estilos?: EstiloViaje[]
  /** URL de la foto; null mientras no exista (se muestra FotoPendiente) */
  foto?: string | null
  /** Precio por noche más bajo entre sus alojamientos activos */
  precioDesde?: number
  /** Cantidad de alojamientos activos en el destino */
  cantidadAlojamientos?: number
}

export interface EstiloViajeInfo {
  id: EstiloViaje
  etiqueta: string
}

/**
 * Oferta por tiempo limitado. SIMULADA: el backend no tiene ofertas ni descuentos.
 * Cuando se conecte la API real, listarOfertas() devolverá una lista vacía y la
 * sección se oculta sola.
 */
export interface Oferta {
  alojamiento: Alojamiento
  noches: number
  descuentoPorcentaje: number
  precioAntes: number
  precioAhora: number
  /** Siempre true mientras los descuentos sean datos de ejemplo */
  simulada: true
}
