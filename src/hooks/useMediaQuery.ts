import { useCallback, useSyncExternalStore } from 'react'

/** true mientras la media query coincide; se actualiza al cambiar el tamaño */
export function useMediaQuery(consulta: string): boolean {
  const suscribir = useCallback(
    (avisar: () => void) => {
      const media = window.matchMedia(consulta)
      media.addEventListener('change', avisar)
      return () => media.removeEventListener('change', avisar)
    },
    [consulta],
  )
  return useSyncExternalStore(
    suscribir,
    () => window.matchMedia(consulta).matches,
    () => false,
  )
}
