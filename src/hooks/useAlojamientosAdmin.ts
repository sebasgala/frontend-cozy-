import { useEffect, useState } from 'react'
import { esErrorDeSesion, mensajeDeError } from '@/services/admin'
import { listarAlojamientos } from '@/services/alojamientosAdmin'
import { cerrarSesion } from '@/services/cuenta'
import type { AlojamientoAdmin } from '@/types/admin'

/**
 * Alojamientos que el usuario administra (los suyos, o todos si es superadmin), incluidos los dados de baja, para los
 * selectores de habitaciones y disponibilidad. Trae hasta 100: el máximo por página del backend.
 */
export function useAlojamientosAdmin(): { alojamientos: AlojamientoAdmin[] | null; error: string } {
  const [estado, setEstado] = useState<{ alojamientos: AlojamientoAdmin[] | null; error: string }>({ alojamientos: null, error: '' })
  useEffect(() => {
    let vigente = true
    listarAlojamientos({ limit: 100 })
      .then((pagina) => vigente && setEstado({ alojamientos: pagina.data, error: '' }))
      .catch((e: unknown) => {
        if (!vigente) return
        if (esErrorDeSesion(e)) void cerrarSesion()
        setEstado({ alojamientos: null, error: mensajeDeError(e, 'No se pudieron cargar los alojamientos.') })
      })
    return () => {
      vigente = false
    }
  }, [])
  return estado
}
