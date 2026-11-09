const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** 1234.5 -> "$1.235" (sin decimales, separador de miles en español) */
export function formatearPrecio(valor: number, moneda = 'USD'): string {
  const simbolo = moneda === 'USD' ? '$' : `${moneda} `
  return `${simbolo}${Math.round(valor).toLocaleString('es')}`
}

/** "2026-11-06" -> "vie 6 nov" */
export function formatearFecha(iso: string): string {
  if (!iso) return ''
  const fecha = new Date(`${iso}T00:00:00`)
  return `${DIAS[fecha.getDay()]} ${fecha.getDate()} ${MESES[fecha.getMonth()]}`
}

/** 1 -> "1 noche", 3 -> "3 noches" */
export function formatearNoches(noches: number): string {
  return `${noches} ${noches === 1 ? 'noche' : 'noches'}`
}

const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** "2026-10-16" -> "16 de octubre" */
export function formatearFechaLarga(iso: string): string {
  if (!iso) return ''
  const fecha = new Date(`${iso}T00:00:00`)
  return `${fecha.getDate()} de ${MESES_LARGOS[fecha.getMonth()]}`
}

/** 450 -> "450 m", 1200 -> "1,2 km" */
export function formatearDistancia(metros: number): string {
  if (metros >= 1000) {
    const km = (metros / 1000).toFixed(1).replace('.', ',')
    return `${km} km`
  }
  return `${metros} m`
}
