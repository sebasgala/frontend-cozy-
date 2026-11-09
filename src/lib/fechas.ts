/** Fechas (YYYY-MM-DD) de cada noche entre checkin (incluido) y checkout (excluido) */
export function nochesEntre(checkin: string, checkout: string): string[] {
  const noches: string[] = []
  const fecha = new Date(`${checkin}T00:00:00Z`)
  const fin = new Date(`${checkout}T00:00:00Z`)
  while (fecha < fin) {
    noches.push(fecha.toISOString().slice(0, 10))
    fecha.setUTCDate(fecha.getUTCDate() + 1)
  }
  return noches
}

/** Fecha local (no UTC) en formato YYYY-MM-DD */
export function aIso(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

/** Hoy en la zona horaria del navegador, YYYY-MM-DD */
export function hoyIso(): string {
  return aIso(new Date())
}

/**
 * Fechas de una búsqueda que vienen de fuera (URL): solo se aceptan si son reales, la entrada no es
 * anterior a hoy y la salida es posterior a la entrada. Si no, se descartan las dos ("sin fechas").
 */
export function fechasValidas(entrada: string | null, salida: string | null): { entrada: string; salida: string } {
  const formato = /^\d{4}-\d{2}-\d{2}$/
  if (!entrada || !salida || !formato.test(entrada) || !formato.test(salida)) return { entrada: '', salida: '' }
  if (entrada < hoyIso() || salida <= entrada) return { entrada: '', salida: '' }
  return { entrada, salida }
}

/**
 * Próximo fin de semana: viernes (hoy, si ya es viernes) a domingo.
 * `finaliza` es el domingo a las 23:59:59, para la cuenta regresiva de las ofertas.
 */
export function proximoFinDeSemana(base: Date = new Date()): {
  entrada: string
  salida: string
  finaliza: Date
} {
  const viernes = new Date(base.getFullYear(), base.getMonth(), base.getDate() + ((5 - base.getDay() + 7) % 7))
  const domingo = new Date(viernes.getFullYear(), viernes.getMonth(), viernes.getDate() + 2)
  return {
    entrada: aIso(viernes),
    salida: aIso(domingo),
    finaliza: new Date(domingo.getFullYear(), domingo.getMonth(), domingo.getDate(), 23, 59, 59),
  }
}

/** Días y horas que faltan hasta `hasta` (0 si ya pasó) */
export function tiempoRestante(hasta: Date, ahora: Date = new Date()): { dias: number; horas: number } {
  const ms = Math.max(0, hasta.getTime() - ahora.getTime())
  return { dias: Math.floor(ms / 864e5), horas: Math.floor((ms % 864e5) / 36e5) }
}
