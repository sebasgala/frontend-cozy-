import test from 'node:test'
import assert from 'node:assert/strict'

// Lógica de cálculo horario de recepción en hora de Guayaquil (UTC-05:00)
const DESFASE_GUAYAQUIL_MS = -5 * 3_600_000

function hoyGuayaquil(ahora = new Date()) {
  return new Date(ahora.getTime() + DESFASE_GUAYAQUIL_MS).toISOString().slice(0, 10)
}

function horaGuayaquil(iso) {
  const d = new Date(new Date(iso).getTime() + DESFASE_GUAYAQUIL_MS)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mi = String(d.getUTCMinutes()).padStart(2, '0')
  return `${dd}/${mm} ${hh}:${mi}`
}

function ventanaCheckin(r, ahora = new Date()) {
  if (r.estado !== 'CONFIRMED') return { habilitado: false, motivo: 'Solo las reservas confirmadas admiten check-in.' }
  const desde = Date.parse(r.checkinHabilitadoDesde)
  if (ahora.getTime() < desde) {
    const sufijo = r.earlyCheckin.autorizado ? ' (early check-in autorizado)' : ' (hora de Guayaquil)'
    return { habilitado: false, motivo: `Check-in disponible desde el ${horaGuayaquil(r.checkinHabilitadoDesde)}${sufijo}.` }
  }
  if (ahora.getTime() >= Date.parse(r.checkinCierraEn)) return { habilitado: false, motivo: 'La estancia ya terminó.' }
  return { habilitado: true }
}

function datetimeLocalAGuayaquil(valor) {
  return `${valor.length === 16 ? `${valor}:00` : valor}-05:00`
}

test('hoyGuayaquil calcula la fecha local UTC-05:00', () => {
  // 2026-11-20T03:00:00Z -> en Guayaquil son las 22:00 del 2026-11-19
  const fechaUtcMadrugada = new Date('2026-11-20T03:00:00.000Z')
  assert.equal(hoyGuayaquil(fechaUtcMadrugada), '2026-11-19')

  // 2026-11-20T06:00:00Z -> en Guayaquil son las 01:00 del 2026-11-20
  const fechaUtcDia = new Date('2026-11-20T06:00:00.000Z')
  assert.equal(hoyGuayaquil(fechaUtcDia), '2026-11-20')
})

test('horaGuayaquil formatea DD/MM HH:mm en zona UTC-5', () => {
  // 19:00 UTC = 14:00 Guayaquil
  assert.equal(horaGuayaquil('2026-11-20T19:00:00.000Z'), '20/11 14:00')
  // 15:30 UTC = 10:30 Guayaquil
  assert.equal(horaGuayaquil('2026-11-20T15:30:00.000Z'), '20/11 10:30')
})

test('ventanaCheckin: no permite reservas no confirmadas', () => {
  const r = {
    estado: 'PENDING',
    checkinHabilitadoDesde: '2026-11-20T19:00:00.000Z',
    checkinCierraEn: '2026-11-22T17:00:00.000Z',
    earlyCheckin: { autorizado: false, desde: null },
  }
  assert.deepEqual(ventanaCheckin(r, new Date('2026-11-20T19:30:00.000Z')), {
    habilitado: false,
    motivo: 'Solo las reservas confirmadas admiten check-in.',
  })
})

test('ventanaCheckin: bloquea antes de las 14:00 Guayaquil si no hay early check-in', () => {
  const r = {
    estado: 'CONFIRMED',
    checkinHabilitadoDesde: '2026-11-20T19:00:00.000Z', // 14:00 GYE
    checkinCierraEn: '2026-11-22T17:00:00.000Z',
    earlyCheckin: { autorizado: false, desde: null },
  }
  // A las 13:00 Guayaquil (18:00 UTC)
  const antes = new Date('2026-11-20T18:00:00.000Z')
  const v = ventanaCheckin(r, antes)
  assert.equal(v.habilitado, false)
  assert.match(v.motivo, /Check-in disponible desde el 20\/11 14:00 \(hora de Guayaquil\)/)
})

test('ventanaCheckin: habilita a partir de las 14:00 Guayaquil', () => {
  const r = {
    estado: 'CONFIRMED',
    checkinHabilitadoDesde: '2026-11-20T19:00:00.000Z', // 14:00 GYE
    checkinCierraEn: '2026-11-22T17:00:00.000Z',
    earlyCheckin: { autorizado: false, desde: null },
  }
  // A las 14:00 Guayaquil (19:00 UTC)
  const justo = new Date('2026-11-20T19:00:00.000Z')
  assert.deepEqual(ventanaCheckin(r, justo), { habilitado: true })

  // A las 16:30 Guayaquil (21:30 UTC)
  const despues = new Date('2026-11-20T21:30:00.000Z')
  assert.deepEqual(ventanaCheckin(r, despues), { habilitado: true })
})

test('ventanaCheckin: admite early check-in autorizado por administrador', () => {
  const r = {
    estado: 'CONFIRMED',
    checkinHabilitadoDesde: '2026-11-20T15:00:00.000Z', // 10:00 GYE anticipado
    checkinCierraEn: '2026-11-22T17:00:00.000Z',
    earlyCheckin: { autorizado: true, desde: '2026-11-20T15:00:00.000Z' },
  }
  // A las 09:00 GYE (14:00 UTC) -> aún no
  assert.equal(ventanaCheckin(r, new Date('2026-11-20T14:00:00.000Z')).habilitado, false)
  // A las 10:01 GYE (15:01 UTC) -> habilitado
  assert.deepEqual(ventanaCheckin(r, new Date('2026-11-20T15:01:00.000Z')), { habilitado: true })
})

test('datetimeLocalAGuayaquil formatea ISO con offset -05:00', () => {
  assert.equal(datetimeLocalAGuayaquil('2026-11-20T10:00'), '2026-11-20T10:00:00-05:00')
  assert.equal(datetimeLocalAGuayaquil('2026-11-20T10:00:30'), '2026-11-20T10:00:30-05:00')
})

