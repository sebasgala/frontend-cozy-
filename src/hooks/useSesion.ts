import { useCallback, useSyncExternalStore } from 'react'
import { CLAVE_SESION_STORAGE, EVENTO_SESION_CAMBIO, obtenerSesion } from '@/services/cuenta'
import type { SesionCliente } from '@/types/cuenta'

function suscribir(avisar: () => void) {
  // 'storage' avisa entre pestañas; el evento propio avisa dentro de la misma pestaña
  // (el navegador no dispara 'storage' en la pestaña que hizo el cambio)
  window.addEventListener('storage', avisar)
  window.addEventListener(EVENTO_SESION_CAMBIO, avisar)
  return () => {
    window.removeEventListener('storage', avisar)
    window.removeEventListener(EVENTO_SESION_CAMBIO, avisar)
  }
}

/** Sesión del cliente, reactiva: se actualiza al iniciar o cerrar sesión, sin recargar la página */
export function useSesion(): SesionCliente | null {
  return useSyncExternalStore(
    suscribir,
    useCallback(() => obtenerSesion(), []),
    () => null,
  )
}

// Referencia para quien necesite escuchar cambios de localStorage de la sesión manualmente
export { CLAVE_SESION_STORAGE }
