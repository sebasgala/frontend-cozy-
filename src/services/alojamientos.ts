// Servicio de alojamientos conectado a GraphQL (/graphql).
// De los mocks solo quedan recursos de diseño: fotos locales, foto/estilos de cada ciudad y los estilos de viaje.
import { alojamientos, ciudades as ciudadesVisuales, estilosViaje } from '@/mocks/data'
import { nochesEntre } from '@/lib/fechas'
import { obtenerFotoAlojamiento, obtenerFotoDestino } from '@/lib/fotos'
import type {
  Alojamiento,
  BusquedaAlojamientos,
  Ciudad,
  Destino,
  DetalleAlojamientoCompleto,
  Disponibilidad,
  EstiloViajeInfo,
  Huespedes,
  Oferta,
} from '@/types/alojamientos'
import { graphqlFetch } from './api'

interface DetailsRoomDto {
  product_id: string
  name: string
  type: string
  max_adults: number
  max_children: number
  base_price: number
  meal_plan: string | null
  cancellation_type: string | null
}

interface DetailsCityDto {
  id: number
  name: string
  country: string
}

interface AccommodationDetailsItemDto {
  id: number
  name: string
  city: DetailsCityDto | null
  currency: string
  description: string | null
  photos: string[] | null
  facilities: string[] | null
  policies: Record<string, unknown> | null
  rooms: DetailsRoomDto[]
}

// Solo datos de la API. Lo que el backend no tiene (estrellas, puntuación, reseñas, tipo, zona, distancia,
// descuentos) queda sin valor y las pantallas no lo muestran. Las fotos locales son solo respaldo visual.
function mapearDetalleItemAAlojamiento(item: AccommodationDetailsItemDto): Alojamiento {
  const habitaciones = item.rooms ?? []
  // Sin habitaciones activas no hay precio: 0 se muestra como "sin precio publicado"
  const precioMin = habitaciones.length > 0 ? Math.min(...habitaciones.map((r) => r.base_price)) : 0
  const maxAdultos = habitaciones.length > 0 ? Math.max(...habitaciones.map((r) => r.max_adults)) : 0
  const maxNinos = habitaciones.length > 0 ? Math.max(...habitaciones.map((r) => r.max_children)) : 0

  const mock = alojamientos.find((a) => a.id === item.id)
  const fotoLocal = obtenerFotoAlojamiento(item.id)
  const fotosMock = mock?.fotos && mock.fotos.length > 0 ? mock.fotos : (fotoLocal ? [fotoLocal] : [])
  const fotosApi = Array.isArray(item.photos)
    ? item.photos.filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
    : []

  // Si la API trae fotos, se respetan y se añaden las fotos locales al final como respaldo.
  // Si la API no trae fotos, se usan las fotos locales.
  const fotos = fotosApi.length > 0
    ? [...fotosApi, ...fotosMock.filter((f) => !fotosApi.includes(f))]
    : fotosMock

  return {
    id: item.id,
    nombre: item.name,
    destino: item.city?.name ?? '',
    ciudadId: item.city?.id ?? null,
    ciudad: item.city ? { id: item.city.id, nombre: item.city.name, pais: item.city.country } : null,
    descripcion: item.description ?? null,
    moneda: item.currency ?? 'USD',
    precioPorNoche: precioMin,
    capacidadAdultos: maxAdultos,
    capacidadNinos: maxNinos,
    habitaciones: habitaciones.length,
    tienePiscina: item.facilities?.some((f) => f.toLowerCase().includes('piscina')) ?? false,
    fotos,
    facilidades: item.facilities ?? [],
    politicas: (item.policies as Record<string, string>) ?? null,
    activo: true,
    updatedAt: new Date().toISOString(),
  }
}

const VIGENCIA_CATALOGO_MS = 60_000
let catalogoApi: { cargadoEn: number; promesa: Promise<Alojamiento[]> } | null = null
let catalogoEnMemoria: Alojamiento[] = []

const FRAGMENTO_ALOJAMIENTO = `
  id
  name
  city {
    id
    name
    country
  }
  currency
  description
  photos
  facilities
  policies
  rooms {
    id: product_id
    name
    base_price
    max_adults
    max_children
  }
`

/**
 * GraphQL: query alojamientos (resuelve en catalogo).
 * Es la fuente de verdad del catálogo (ids de alojamiento y de ciudad); se guarda 60 s en memoria.
 */
export function obtenerCatalogoApi(): Promise<Alojamiento[]> {
  if (catalogoApi && Date.now() - catalogoApi.cargadoEn < VIGENCIA_CATALOGO_MS) return catalogoApi.promesa
  const promesa = graphqlFetch<{ alojamientos: AccommodationDetailsItemDto[] }>(`
    query ObtenerAlojamientos {
      alojamientos {
        ${FRAGMENTO_ALOJAMIENTO}
      }
    }
  `)
    .then((respuesta) => {
      catalogoEnMemoria = respuesta.alojamientos.map(mapearDetalleItemAAlojamiento)
      return catalogoEnMemoria
    })
    .catch((error: unknown) => {
      catalogoApi = null
      throw error
    })
  catalogoApi = { cargadoEn: Date.now(), promesa }
  return promesa
}

/** Alojamiento del último catálogo cargado (síncrono; llama antes a obtenerCatalogoApi) */
export function alojamientoEnCatalogo(id: number): Alojamiento | undefined {
  return catalogoEnMemoria.find((a) => a.id === id)
}

/**
 * Ciudades con alojamientos, tal como las devuelve la API (los ids son los de la base de datos).
 */
export async function listarCiudades(): Promise<Ciudad[]> {
  const catalogo = await obtenerCatalogoApi()
  const porId = new Map<number, Ciudad>()
  for (const a of catalogo) if (a.ciudad) porId.set(a.ciudad.id, a.ciudad)
  return [...porId.values()].sort((a, b) => a.nombre.localeCompare(b.nombre))
}

/**
 * GraphQL: query buscarAlojamientos(criterio)
 * Resuelve búsqueda, detalles de catálogo y disponibilidad en una sola respuesta.
 */
export async function buscarAlojamientos(busqueda: BusquedaAlojamientos): Promise<Alojamiento[]> {
  const criterio: Record<string, unknown> = {
    checkin: busqueda.checkin,
    checkout: busqueda.checkout,
    guests: {
      number_of_adults: busqueda.guests.number_of_adults,
      number_of_rooms: busqueda.guests.number_of_rooms,
      children: busqueda.guests.children ?? [],
    },
    booker: { country: 'ec', platform: 'desktop' },
  }

  if (busqueda.ciudadId) {
    criterio.city = busqueda.ciudadId
  } else {
    criterio.country = 'ec'
  }

  const respuesta = await graphqlFetch<{
    buscarAlojamientos: {
      data: Array<{
        alojamiento: AccommodationDetailsItemDto
        precioEstancia: number
        disponibilidad: Disponibilidad
      }>
      next_page?: string | null
    }
  }>(
    `
    query BuscarAlojamientos($criterio: CriterioBusquedaInput!) {
      buscarAlojamientos(criterio: $criterio) {
        data {
          alojamiento {
            ${FRAGMENTO_ALOJAMIENTO}
          }
          precioEstancia
          disponibilidad {
            id
            currency
            url
            products {
              product_id
              name
              type
              meal_plan
              cancellation_type
              max_adults
              max_children
              rooms_left
              price {
                currency
                total
                nights {
                  date
                  price
                }
              }
            }
          }
        }
        next_page
      }
    }
  `,
    { criterio },
  )

  const noches = nochesEntre(busqueda.checkin, busqueda.checkout).length || 1
  return (respuesta.buscarAlojamientos?.data ?? []).map((item) => {
    const al = mapearDetalleItemAAlojamiento(item.alojamiento)
    return {
      ...al,
      precioEstancia: item.precioEstancia,
      precioPorNoche: Math.round((item.precioEstancia / noches) * 100) / 100,
    }
  })
}

/**
 * GraphQL: query alojamiento(id: $id)
 * Obtiene la ficha de un alojamiento por su ID.
 */
export async function obtenerAlojamiento(id: number): Promise<Alojamiento | null> {
  try {
    const respuesta = await graphqlFetch<{ alojamiento: AccommodationDetailsItemDto | null }>(
      `
      query ObtenerAlojamiento($id: Int!) {
        alojamiento(id: $id) {
          ${FRAGMENTO_ALOJAMIENTO}
        }
      }
    `,
      { id },
    )
    return respuesta.alojamiento ? mapearDetalleItemAAlojamiento(respuesta.alojamiento) : null
  } catch {
    return null
  }
}

/**
 * Query alojamiento. Sin reseñas: /reviews todavía es una ruta de relleno sin base de datos, así que
 * no se inventan reseñas ni puntuaciones; la ficha muestra "sin reseñas".
 */
export async function obtenerDetalleAlojamiento(id: number): Promise<DetalleAlojamientoCompleto | null> {
  const al = await obtenerAlojamiento(id)
  if (!al) return null

  return { ...al, subpuntuaciones: [], resenas: [] }
}

/**
 * GraphQL: query disponibilidad(alojamientoId, fechas, ocupantes)
 * Consulta la disponibilidad real de habitaciones y precios para un rango de fechas.
 */
export async function consultarDisponibilidad(
  alojamientoId: number,
  checkin: string,
  checkout: string,
  guests: Huespedes,
): Promise<Disponibilidad> {
  const respuesta = await graphqlFetch<{ disponibilidad: Disponibilidad }>(
    `
    query ConsultarDisponibilidad($alojamientoId: Int!, $checkin: String!, $checkout: String!, $guests: HuespedesInput!) {
      disponibilidad(alojamientoId: $alojamientoId, checkin: $checkin, checkout: $checkout, guests: $guests) {
        id
        currency
        url
        products {
          product_id
          name
          type
          meal_plan
          cancellation_type
          max_adults
          max_children
          rooms_left
          price {
            currency
            total
            nights {
              date
              price
            }
          }
        }
      }
    }
  `,
    {
      alojamientoId,
      checkin,
      checkout,
      guests: {
        number_of_adults: guests.number_of_adults,
        number_of_rooms: guests.number_of_rooms,
        children: guests.children ?? [],
      },
    },
  )
  return respuesta.disponibilidad
}

/**
 * Destinos del Inicio: SOLO las ciudades que devuelve la API (con alojamientos activos), con su id real.
 * De los datos de diseño (`mocks/data.ts`) solo se toman `destacado`, `estilos` y `foto` de la ciudad
 * con el mismo nombre y país; una ciudad de diseño que no está en la API no se muestra.
 */
export async function listarDestinos(): Promise<Destino[]> {
  const catalogo = await obtenerCatalogoApi()
  const ciudadesApi = await listarCiudades()

  return ciudadesApi.map((c) => {
    const visual = ciudadesVisuales.find(
      (v) => v.nombre.toLowerCase() === c.nombre.toLowerCase() && v.pais.toLowerCase() === c.pais.toLowerCase(),
    )
    const precios = catalogo.filter((a) => a.ciudadId === c.id && a.precioPorNoche > 0).map((a) => a.precioPorNoche)
    return {
      ...c,
      destacado: visual?.destacado ?? false,
      estilos: visual?.estilos,
      foto: obtenerFotoDestino(c.nombre) ?? visual?.foto ?? null,
      precioDesde: precios.length ? Math.min(...precios) : undefined,
      cantidadAlojamientos: catalogo.filter((a) => a.ciudadId === c.id).length,
    }
  })
}

/** Constante de la interfaz: estilos del planificador de viaje */
export function listarEstilosViaje(): Promise<EstiloViajeInfo[]> {
  return Promise.resolve(estilosViaje)
}

/** Alojamientos destacados para el Inicio: solo los reales del catálogo (sin completar con ejemplos) */
export async function listarDestacados(limite = 6): Promise<Alojamiento[]> {
  const catalogo = await obtenerCatalogoApi()
  return catalogo.filter((a) => a.activo).slice(0, limite)
}

/**
 * Ofertas: el backend no tiene ofertas ni descuentos, así que no hay ninguna que mostrar (antes se
 * inventaban a partir de `descuentosSimulados`). La sección del Inicio no se muestra con la lista vacía.
 */
export async function listarOfertas(): Promise<Oferta[]> {
  return []
}

/** Precio por noche más bajo del catálogo (precio base de alojamientos con habitaciones) */
export async function precioMinimoPorNoche(): Promise<{ precio: number; moneda: string } | null> {
  const activos = (await obtenerCatalogoApi()).filter((a) => a.activo && a.precioPorNoche > 0)
  if (!activos.length) return null
  const masBarato = activos.reduce((min, a) => (a.precioPorNoche < min.precioPorNoche ? a : min))
  return { precio: masBarato.precioPorNoche, moneda: masBarato.moneda }
}
