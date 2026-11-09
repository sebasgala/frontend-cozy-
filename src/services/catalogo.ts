// Servicio de catálogo para la pantalla de Resultados.
// Siempre consulta la API real: con fechas usa /search + /details (solo lo disponible) y sin fechas
// el catálogo completo de /details. Los histogramas y facetas se calculan sobre esos datos.

import type {
  FiltrosCatalogo,
  ResultadoCatalogo,
} from '@/types/alojamientos'
import { buscarAlojamientos, obtenerCatalogoApi } from './alojamientos'

const BINS_HISTOGRAMA = 12

/**
 * Consulta el catálogo de alojamientos con filtros, orden y metadatos de agregación.
 * Si se incluyen fechas de entrada y salida, consulta el endpoint real POST /search + POST /details.
 */
export async function listarCatalogo(filtros: FiltrosCatalogo = {}): Promise<ResultadoCatalogo> {
  // Con fechas: solo lo disponible (/search + /details). Sin fechas: el catálogo completo de la API.
  // Los errores de red se propagan: la pantalla muestra su estado de error.
  const baseAlojamientos =
    filtros.entrada && filtros.salida
      ? await buscarAlojamientos({
          ciudadId: filtros.destinoId,
          checkin: filtros.entrada,
          checkout: filtros.salida,
          guests: {
            number_of_adults: filtros.huespedes ?? 2,
            number_of_rooms: 1,
          },
        })
      : (await obtenerCatalogoApi()).filter((a) => a.activo)

  // Subconjunto base por destino (si se especificó destino) para calcular rangos y agregados
  const baseDestino = filtros.destinoId
    ? baseAlojamientos.filter((a) => a.ciudadId === filtros.destinoId)
    : baseAlojamientos

  // Precios mínimo y máximo entre todos los alojamientos del destino/catálogo
  const todosLosPrecios = baseDestino.map((a) => a.precioPorNoche)
  const precioMinimoCatalogo = todosLosPrecios.length ? Math.min(...todosLosPrecios) : 0
  const maxBruto = todosLosPrecios.length ? Math.max(...todosLosPrecios) : 250
  const precioMaximoCatalogo = Math.ceil(maxBruto / 50) * 50

  // Histograma de distribución de precios
  const histogramaPrecios = Array(BINS_HISTOGRAMA).fill(0)
  const paso = precioMaximoCatalogo / BINS_HISTOGRAMA
  baseDestino.forEach((a) => {
    if (paso > 0) {
      const indice = Math.min(BINS_HISTOGRAMA - 1, Math.floor(a.precioPorNoche / paso))
      histogramaPrecios[indice]++
    }
  })

  // Agregados de tipos disponibles
  const conteoTipos = new Map<string, number>()
  baseDestino.forEach((a) => {
    if (a.tipo) {
      conteoTipos.set(a.tipo, (conteoTipos.get(a.tipo) ?? 0) + 1)
    }
  })
  const tiposDisponibles = Array.from(conteoTipos.entries())
    .map(([tipo, cantidad]) => ({ tipo, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)

  // Agregados de estrellas disponibles
  const conteoEstrellas = new Map<number, number>()
  baseDestino.forEach((a) => {
    if (a.estrellas) {
      conteoEstrellas.set(a.estrellas, (conteoEstrellas.get(a.estrellas) ?? 0) + 1)
    }
  })
  const estrellasDisponibles = Array.from(conteoEstrellas.entries())
    .map(([estrellas, cantidad]) => ({ estrellas, cantidad }))
    .sort((a, b) => b.estrellas - a.estrellas)

  // Agregados de comodidades disponibles
  const conteoComodidades = new Map<string, number>()
  baseDestino.forEach((a) => {
    a.facilidades?.forEach((f) => {
      conteoComodidades.set(f, (conteoComodidades.get(f) ?? 0) + 1)
    })
  })
  const comodidadesDisponibles = Array.from(conteoComodidades.entries())
    .map(([comodidad, cantidad]) => ({ comodidad, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)

  // Aplicación de los filtros al listado
  let items = baseDestino.filter((a) => {
    // Presupuesto
    if (filtros.precioMin !== undefined && a.precioPorNoche < filtros.precioMin) {
      return false
    }
    if (filtros.precioMax !== undefined && a.precioPorNoche > filtros.precioMax) {
      return false
    }

    // Tipo de alojamiento
    if (filtros.tipos && filtros.tipos.length > 0) {
      if (!a.tipo || !filtros.tipos.includes(a.tipo)) {
        return false
      }
    }

    // Estrellas
    if (filtros.estrellas && filtros.estrellas.length > 0) {
      if (!a.estrellas || !filtros.estrellas.includes(a.estrellas)) {
        return false
      }
    }

    // Comodidades
    if (filtros.comodidades && filtros.comodidades.length > 0) {
      const facilidades = a.facilidades ?? []
      const cumpleTodas = filtros.comodidades.every((comodidad) =>
        facilidades.some((f) => f.toLowerCase() === comodidad.toLowerCase()),
      )
      if (!cumpleTodas) return false
    }

    // Huéspedes mínimos
    if (filtros.huespedes !== undefined && filtros.huespedes > 0) {
      if (a.capacidadAdultos + a.capacidadNinos < filtros.huespedes) {
        return false
      }
    }

    return true
  })

  // Orden
  const orden = filtros.orden ?? 'destacados'
  if (orden === 'precio-asc') {
    items = [...items].sort((a, b) => a.precioPorNoche - b.precioPorNoche)
  } else if (orden === 'precio-desc') {
    items = [...items].sort((a, b) => b.precioPorNoche - a.precioPorNoche)
  } else if (orden === 'puntuacion') {
    items = [...items].sort((a, b) => (b.puntuacion ?? 0) - (a.puntuacion ?? 0))
  } else {
    // 'destacados': por puntuación
    items = [...items].sort((a, b) => (b.puntuacion ?? 0) - (a.puntuacion ?? 0))
  }

  return {
    items,
    total: items.length,
    precioMinimoCatalogo,
    precioMaximoCatalogo,
    histogramaPrecios,
    tiposDisponibles,
    estrellasDisponibles,
    comodidadesDisponibles,
  }
}
