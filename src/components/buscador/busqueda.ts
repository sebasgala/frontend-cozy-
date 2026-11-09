// Tipos y utilidades de la búsqueda, compartidos por el buscador y las pantallas.

export interface EstadoBusqueda {
  destinoId: number | null
  /** YYYY-MM-DD */
  entrada: string
  /** YYYY-MM-DD, siempre posterior a la entrada */
  salida: string
  huespedes: number
}

export const BUSQUEDA_INICIAL: EstadoBusqueda = { destinoId: null, entrada: '', salida: '', huespedes: 2 }

export const HUESPEDES_MIN = 1
export const HUESPEDES_MAX = 16

export const textoHuespedes = (n: number) => (n === 1 ? '1 huésped' : `${n} huéspedes`)

/** URL de resultados con los parámetros de la búsqueda */
export function rutaResultados({ destinoId, entrada, salida, huespedes }: EstadoBusqueda): string {
  const parametros = new URLSearchParams({
    destino: String(destinoId),
    entrada,
    salida,
    huespedes: String(huespedes),
  })
  return `/resultados?${parametros}`
}
