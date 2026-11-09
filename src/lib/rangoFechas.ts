// Aritmética de fechas de calendario (YYYY-MM-DD) en UTC, igual que el backend: sumar días no se desfasa por la
// zona horaria ni por los cambios de horario.

const UN_DIA = 86_400_000
const aMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`)
const aIsoUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10)

export const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/

/** true si es una fecha real (rechaza 2026-02-30) */
export function esFechaReal(iso: string): boolean {
  return FORMATO_FECHA.test(iso) && aIsoUtc(aMs(iso)) === iso
}

export function sumarDias(iso: string, dias: number): string {
  return aIsoUtc(aMs(iso) + dias * UN_DIA)
}

/** Días de desde a hasta, ambos incluidos (1 si son iguales) */
export function diasIncluidos(desde: string, hasta: string): number {
  return Math.round((aMs(hasta) - aMs(desde)) / UN_DIA) + 1
}

/** 0 = domingo … 6 = sábado, como espera el backend en diasSemana */
export function diaSemana(iso: string): number {
  return new Date(aMs(iso)).getUTCDay()
}

/** Todas las fechas de desde a hasta, ambas incluidas */
export function fechasDelRango(desde: string, hasta: string): string[] {
  const total = diasIncluidos(desde, hasta)
  return Array.from({ length: Math.max(0, total) }, (_, i) => sumarDias(desde, i))
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** "2026-11-06" -> "noviembre 2026" */
export function nombreMes(iso: string): string {
  return `${MESES[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`
}
