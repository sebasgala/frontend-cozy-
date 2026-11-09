/**
 * Mapeo centralizado de fotografías locales de Cozy.
 *
 * Contiene las fotos locales de destinos (destinos/) y alojamientos (alojamientos/)
 * para asegurar que ninguna tarjeta visible comparta foto y que las rutas sean consistentes.
 */

export const FOTOS_DESTINOS: Record<string, string> = {
  Quito: '/fotos/destinos/quito.webp',
  Cuenca: '/fotos/destinos/cuenca.webp',
  'Puerto Ayora': '/fotos/destinos/puerto-ayora.webp',
  Baños: '/fotos/destinos/banos.webp',
  Guayaquil: '/fotos/destinos/guayaquil.webp',
  Otavalo: '/fotos/destinos/otavalo.webp',
  Cartagena: '/fotos/destinos/cartagena.webp',
  Cusco: '/fotos/destinos/cusco.webp',
  Bariloche: '/fotos/destinos/bariloche.webp',
  Oaxaca: '/fotos/destinos/oaxaca.webp',
  'Punta del Este': '/fotos/destinos/punta-del-este.webp',
  'San Andrés': '/fotos/destinos/san-andres.webp',
}

export const FOTOS_ALOJAMIENTOS: Record<number, string> = {
  1: '/fotos/alojamientos/alojamiento-01-fachada.webp',
  2: '/fotos/alojamientos/alojamiento-02-habitacion.webp',
  3: '/fotos/alojamientos/alojamiento-03-piscina.webp',
  4: '/fotos/alojamientos/alojamiento-07-cabana.webp',
  5: '/fotos/alojamientos/alojamiento-05-fachada.webp',
  6: '/fotos/alojamientos/alojamiento-12-hacienda.webp',
  7: '/fotos/alojamientos/alojamiento-08-terraza.webp',
  8: '/fotos/alojamientos/alojamiento-06-habitacion.webp',
  9: '/fotos/alojamientos/alojamiento-04-interior.webp',
  10: '/fotos/alojamientos/alojamiento-09-piscina.webp',
  11: '/fotos/alojamientos/alojamiento-11-suite.webp',
  12: '/fotos/alojamientos/alojamiento-10-bungalow.webp',
}

/**
 * Obtiene la foto de una ciudad por su nombre (insensible a acentos y mayúsculas).
 */
export function obtenerFotoDestino(nombre: string): string | null {
  if (!nombre) return null
  if (FOTOS_DESTINOS[nombre]) return FOTOS_DESTINOS[nombre]

  const nombreNormalizado = nombre
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  for (const [clave, ruta] of Object.entries(FOTOS_DESTINOS)) {
    const claveNormalizada = clave
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    if (claveNormalizada === nombreNormalizado) return ruta
  }

  return null
}

/**
 * Obtiene la foto de respaldo para un alojamiento por su ID.
 */
export function obtenerFotoAlojamiento(id: number): string | null {
  if (FOTOS_ALOJAMIENTOS[id]) return FOTOS_ALOJAMIENTOS[id]

  const ids = Object.keys(FOTOS_ALOJAMIENTOS).map(Number)
  if (!ids.length) return null
  const indice = ((Math.abs(id) - 1) % ids.length) + 1
  return FOTOS_ALOJAMIENTOS[indice] ?? null
}
