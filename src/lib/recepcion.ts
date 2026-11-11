// Reglas de horario de la recepción. Guayaquil no tiene horario de verano: siempre UTC-05:00.
import type { ReservaRecepcion } from '@/types/recepcion'

const DESFASE_GUAYAQUIL_MS = -5 * 3_600_000

/** Fecha de hoy en Guayaquil, YYYY-MM-DD */
export function hoyGuayaquil(ahora: Date = new Date()): string {
  return new Date(ahora.getTime() + DESFASE_GUAYAQUIL_MS).toISOString().slice(0, 10)
}

/** "2026-11-20T19:00:00.000Z" -> "20/11 14:00" (hora de Guayaquil) */
export function horaGuayaquil(iso: string): string {
  const d = new Date(new Date(iso).getTime() + DESFASE_GUAYAQUIL_MS)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mi = String(d.getUTCMinutes()).padStart(2, '0')
  return `${dd}/${mm} ${hh}:${mi}`
}

export type VentanaCheckin =
  | { habilitado: true }
  | { habilitado: false; motivo: string }

/**
 * Si el botón "Aprobar check-in" puede usarse ahora. Abre a las 14:00 de Guayaquil del día de llegada, o antes si el
 * administrador autorizó un early check-in; cierra al terminar el día de salida. El backend vuelve a comprobarlo.
 */
export function ventanaCheckin(r: Pick<ReservaRecepcion, 'estado' | 'checkinHabilitadoDesde' | 'checkinCierraEn' | 'earlyCheckin'>, ahora: Date = new Date()): VentanaCheckin {
  if (r.estado !== 'CONFIRMED') return { habilitado: false, motivo: 'Solo las reservas confirmadas admiten check-in.' }
  const desde = Date.parse(r.checkinHabilitadoDesde)
  if (ahora.getTime() < desde) {
    const sufijo = r.earlyCheckin.autorizado ? ' (early check-in autorizado)' : ' (hora de Guayaquil)'
    return { habilitado: false, motivo: `Check-in disponible desde el ${horaGuayaquil(r.checkinHabilitadoDesde)}${sufijo}.` }
  }
  if (ahora.getTime() >= Date.parse(r.checkinCierraEn)) return { habilitado: false, motivo: 'La estancia ya terminó.' }
  return { habilitado: true }
}

/** Valor de un <input type="datetime-local"> interpretado en hora de Guayaquil, en ISO con zona */
export function datetimeLocalAGuayaquil(valor: string): string {
  return `${valor.length === 16 ? `${valor}:00` : valor}-05:00`
}
