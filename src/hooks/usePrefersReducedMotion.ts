import { useSyncExternalStore } from 'react'

const CONSULTA = '(prefers-reduced-motion: reduce)'

function suscribir(avisar: () => void) {
  const media = window.matchMedia(CONSULTA)
  media.addEventListener('change', avisar)
  return () => media.removeEventListener('change', avisar)
}

/** true si el usuario pidió movimiento reducido; se actualiza si lo cambia en el sistema */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    suscribir,
    () => window.matchMedia(CONSULTA).matches,
    () => false,
  )
}
