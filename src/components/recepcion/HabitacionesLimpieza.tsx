import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { esErrorDeSesion, mensajeDeError } from '@/services/admin'
import { cerrarSesion } from '@/services/cuenta'
import { cambiarLimpieza, listarHabitacionesFisicas } from '@/services/recepcion'
import type { EstadoLimpieza, HabitacionFisica } from '@/types/recepcion'

const ESTADOS: Record<EstadoLimpieza, { etiqueta: string; clase: string }> = {
  LIMPIA: { etiqueta: 'Limpia', clase: 'bg-success/12 text-success' },
  OCUPADA: { etiqueta: 'Ocupada', clase: 'bg-primary/10 text-primary' },
  SUCIA: { etiqueta: 'Sucia', clase: 'bg-error/10 text-error' },
  EN_LIMPIEZA: { etiqueta: 'En limpieza', clase: 'bg-warning/10 text-warning' },
  MANTENIMIENTO: { etiqueta: 'Mantenimiento', clase: 'bg-[var(--dutch-white)] text-ink' },
}

/** Habitaciones físicas del alojamiento y su limpieza (SUCIA → LIMPIA). No cambia el estado de ninguna reserva. */
export function HabitacionesLimpieza() {
  const [habitaciones, setHabitaciones] = useState<HabitacionFisica[] | null>(null)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [trabajando, setTrabajando] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    try {
      setHabitaciones(await listarHabitacionesFisicas())
      setError('')
    } catch (e) {
      if (esErrorDeSesion(e)) {
        void cerrarSesion()
        return
      }
      setHabitaciones((h) => h ?? [])
      setError(mensajeDeError(e, 'No se pudieron cargar las habitaciones.'))
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const cambiar = async (h: HabitacionFisica, nuevo: EstadoLimpieza) => {
    setTrabajando(h.id)
    setError('')
    setAviso('')
    try {
      const r = await cambiarLimpieza(h.id, nuevo)
      setHabitaciones((lista) => lista?.map((x) => (x.id === r.id ? { ...x, estadoLimpieza: r.estadoLimpieza } : x)) ?? lista)
      setAviso(`Habitación ${h.numero}: ${ESTADOS[r.estadoLimpieza].etiqueta.toLowerCase()}.`)
    } catch (e) {
      if (esErrorDeSesion(e)) {
        void cerrarSesion()
        return
      }
      setError(mensajeDeError(e, 'No se pudo cambiar el estado de la habitación.'))
      void cargar()
    } finally {
      setTrabajando(null)
    }
  }

  const conteo = (e: EstadoLimpieza) => habitaciones?.filter((h) => h.estadoLimpieza === e).length ?? 0

  return (
    <section aria-label="Habitaciones y limpieza" className="flex flex-col gap-4" aria-busy={habitaciones === null}>
      {aviso && (
        <p role="status" className="rounded-2xl bg-success/10 px-4 py-3 text-sm text-success">
          {aviso}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-2xl bg-white p-4 text-sm font-medium text-error">
          {error}
        </p>
      )}

      {habitaciones === null ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-16 animate-pulse rounded-[20px] bg-white" />
          ))}
        </div>
      ) : habitaciones.length === 0 ? (
        <p className="rounded-[20px] border border-border bg-white p-8 text-center text-sm text-muted-foreground">
          Este alojamiento no tiene habitaciones físicas registradas: el check-in no asigna habitación ni controla la limpieza.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {(Object.keys(ESTADOS) as EstadoLimpieza[]).map((e) => `${ESTADOS[e].etiqueta}: ${conteo(e)}`).join(' · ')}
          </p>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {habitaciones.map((h) => {
              const est = ESTADOS[h.estadoLimpieza] ?? { etiqueta: h.estadoLimpieza, clase: 'bg-surface-muted text-ink' }
              const ocupada = h.estadoLimpieza === 'OCUPADA'
              const ocupado = trabajando === h.id
              return (
                <li key={h.id} className="flex flex-col gap-3 rounded-[20px] border border-border bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-heading text-lg font-medium text-ink">Hab. {h.numero}</span>
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', est.clase)}>{est.etiqueta}</span>
                  </div>
                  {ocupada ? (
                    <p className="text-xs text-muted-foreground">Ocupada por un huésped: se libera sola al hacer el check-out de su reserva.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {h.estadoLimpieza === 'SUCIA' && (
                        <Button type="button" variant="outline" size="sm" disabled={ocupado} onClick={() => void cambiar(h, 'EN_LIMPIEZA')}>
                          Iniciar limpieza
                        </Button>
                      )}
                      {(h.estadoLimpieza === 'SUCIA' || h.estadoLimpieza === 'EN_LIMPIEZA') && (
                        <Button type="button" size="sm" disabled={ocupado} onClick={() => void cambiar(h, 'LIMPIA')}>
                          Marcar como Limpia
                        </Button>
                      )}
                      {h.estadoLimpieza === 'MANTENIMIENTO' && (
                        <Button type="button" variant="outline" size="sm" disabled={ocupado} onClick={() => void cambiar(h, 'LIMPIA')}>
                          Terminar mantenimiento
                        </Button>
                      )}
                      {h.estadoLimpieza === 'LIMPIA' && <span className="text-xs text-muted-foreground">Lista para el próximo check-in.</span>}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
