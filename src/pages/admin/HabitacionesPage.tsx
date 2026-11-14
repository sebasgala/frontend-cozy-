import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { Plus } from 'lucide-react'
import { CampoSelect } from '@/components/admin/CampoSelect'
import { DialogoConfirmacion } from '@/components/DialogoConfirmacion'
import { Button, buttonVariants } from '@/components/ui/button'
import { useAlojamientosAdmin } from '@/hooks/useAlojamientosAdmin'
import { ApiError } from '@/services/api'
import { esErrorDeSesion, mensajeDeError } from '@/services/admin'
import { cerrarSesion } from '@/services/cuenta'
import { desactivarHabitacion, listarHabitaciones, reactivarHabitacion } from '@/services/habitacionesAdmin'
import type { HabitacionAdmin } from '@/types/admin'
import { formatearPrecio } from '@/lib/formato'
import { etiquetaCancelacion, etiquetaPlan } from '@/lib/habitaciones'
import { cn } from '@/lib/utils'
import { EncabezadoAdmin } from './EncabezadoAdmin'

interface Accion {
  tipo: 'desactivar' | 'reactivar'
  habitacion: HabitacionAdmin
}
type Resultado = { clave: string; habitaciones: HabitacionAdmin[] } | { clave: string; error: string; noEncontrado?: boolean }

/**
 * Habitaciones de un alojamiento (?alojamiento=ID; sin él, el primero de la lista). Desactivar es un borrado lógico:
 * la habitación deja de venderse pero sus reservas siguen; si tiene reservas confirmadas vigentes el backend responde
 * 409 con sus localizadores y no se desactiva.
 */
export default function HabitacionesPage() {
  const { alojamientos, error: errorAlojamientos } = useAlojamientosAdmin()
  const [params, setParams] = useSearchParams()
  const { state } = useLocation() as { state: { aviso?: string } | null }
  const alojamientoId = Number(params.get('alojamiento')) || alojamientos?.[0]?.id
  const alojamiento = alojamientos?.find((a) => a.id === alojamientoId)

  const [incluirInactivas, setIncluirInactivas] = useState(true)
  const [version, setVersion] = useState(0)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [accion, setAccion] = useState<Accion | null>(null)
  const [errorAccion, setErrorAccion] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [aviso, setAviso] = useState(state?.aviso ?? '')

  const clave = `${alojamientoId}|${incluirInactivas}|${version}`
  const cargando = alojamientoId !== undefined && resultado?.clave !== clave

  useEffect(() => {
    if (alojamientoId === undefined) return
    let vigente = true
    listarHabitaciones(alojamientoId, incluirInactivas)
      .then((habitaciones) => vigente && setResultado({ clave, habitaciones }))
      .catch((e: unknown) => {
        if (!vigente) return
        if (esErrorDeSesion(e)) void cerrarSesion()
        const noEncontrado = e instanceof ApiError && (e.status === 404 || e.status === 400)
        setResultado({ clave, error: mensajeDeError(e, 'No se pudieron cargar las habitaciones.'), noEncontrado })
      })
    return () => {
      vigente = false
    }
  }, [clave, alojamientoId, incluirInactivas])

  const confirmar = async () => {
    if (!accion) return
    const { tipo, habitacion } = accion
    setConfirmando(true)
    setErrorAccion('')
    try {
      if (tipo === 'desactivar') await desactivarHabitacion(habitacion.id)
      else await reactivarHabitacion(habitacion.id)
      setAviso(tipo === 'desactivar' ? `Desactivaste ${habitacion.nombre}.` : `Reactivaste ${habitacion.nombre}.`)
      setAccion(null)
      setVersion((v) => v + 1)
    } catch (e) {
      if (esErrorDeSesion(e)) {
        await cerrarSesion()
        return
      }
      setErrorAccion(mensajeDeError(e))
    } finally {
      setConfirmando(false)
    }
  }

  const habitaciones = resultado && 'habitaciones' in resultado ? resultado.habitaciones : null
  const errorLista = resultado && 'error' in resultado ? resultado : null
  const moneda = alojamiento?.moneda ?? 'USD'

  return (
    <>
      <EncabezadoAdmin
        titulo="Habitaciones"
        descripcion="Tipos de habitación de cada alojamiento. Los cupos y precios por fecha se cargan en Disponibilidad."
        acciones={
          alojamientoId !== undefined && (
            <Link to={`/admin/habitaciones/nueva?alojamiento=${alojamientoId}`} className={buttonVariants({ size: 'lg' })}>
              <Plus aria-hidden="true" />
              Nueva habitación
            </Link>
          )
        }
      />

      {errorAlojamientos ? (
        <p role="alert" className="rounded-2xl bg-white p-5 text-sm font-medium text-error">
          {errorAlojamientos}
        </p>
      ) : alojamientos && alojamientos.length === 0 && !params.get('alojamiento') ? (
        // Sin alojamientos propios. Si la URL pide uno concreto (enlace ajeno), se intenta y el 404 dice "no encontrado".
        <div className="rounded-[20px] border border-border bg-white p-6">
          <p className="text-muted-foreground">Primero crea un alojamiento; después podrás agregarle habitaciones.</p>
          <Link to="/admin/alojamientos/nuevo" className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}>
            Crear alojamiento
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-[240px] flex-1 sm:max-w-md">
              <CampoSelect
                etiqueta="Alojamiento"
                value={alojamientoId ?? ''}
                onChange={(e) => {
                  setParams({ alojamiento: e.target.value })
                  setAviso('')
                }}
                disabled={!alojamientos}
              >
                {!alojamientos && <option value="">Cargando…</option>}
                {alojamientos?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                    {a.activo ? '' : ' (dado de baja)'}
                  </option>
                ))}
              </CampoSelect>
            </div>
            <label className="flex min-h-11 items-center gap-3 text-[15px] text-ink">
              <input type="checkbox" checked={incluirInactivas} onChange={(e) => setIncluirInactivas(e.target.checked)} className="size-5 accent-[var(--primary)]" />
              Mostrar desactivadas
            </label>
          </div>

          {alojamiento && !alojamiento.activo && (
            <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-muted-foreground">
              Este alojamiento está dado de baja: ninguna de sus habitaciones se vende mientras siga así.
            </p>
          )}
          {aviso && (
            <p role="status" className="mt-4 rounded-2xl bg-[var(--dutch-white)] px-4 py-3 text-sm text-ink">
              {aviso}
            </p>
          )}

          <div id="lista-habitaciones" className="mt-4" aria-busy={cargando || !alojamientos}>
            {errorLista ? (
              errorLista.noEncontrado ? (
                <div className="rounded-[20px] border border-border bg-white p-6">
                  <p className="text-muted-foreground">No encontramos este alojamiento entre los que administras.</p>
                </div>
              ) : (
                <p role="alert" className="rounded-2xl bg-white p-5 text-sm font-medium text-error">
                  {errorLista.error}
                </p>
              )
            ) : !habitaciones ? (
              <div className="flex flex-col gap-3" aria-hidden="true">
                {[0, 1].map((i) => (
                  <div key={i} className="h-[96px] animate-pulse rounded-[20px] bg-white" />
                ))}
              </div>
            ) : habitaciones.length === 0 ? (
              <div className="rounded-[20px] border border-border bg-white p-6">
                <p className="text-muted-foreground">Este alojamiento todavía no tiene habitaciones.</p>
                <Link to={`/admin/habitaciones/nueva?alojamiento=${alojamientoId}`} className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}>
                  Agregar la primera
                </Link>
              </div>
            ) : (
              <ul className={cn('flex flex-col gap-3 transition-opacity', cargando && 'opacity-60')}>
                {habitaciones.map((h) => (
                  <li key={h.id} className="flex flex-col gap-4 rounded-[20px] border border-border bg-white p-5 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{h.nombre}</p>
                      <p className="text-sm text-muted-foreground">
                        {h.tipo}
                        {h.camas && ` · ${h.camas}`} · {h.capacidadAdultos} {h.capacidadAdultos === 1 ? 'adulto' : 'adultos'}
                        {h.capacidadNinos > 0 && ` y ${h.capacidadNinos} ${h.capacidadNinos === 1 ? 'niño' : 'niños'}`} · desde {formatearPrecio(h.precioBase, moneda)}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className={cn('rounded-full px-2.5 py-1 font-medium', h.activo ? 'bg-success/12 text-success' : 'bg-error/10 text-error')}>
                          {h.activo ? 'Activa' : 'Desactivada'}
                        </span>
                        <span className="rounded-full bg-surface-muted px-2.5 py-1 font-medium text-ink">{etiquetaPlan(h.mealPlan)}</span>
                        <span className="rounded-full bg-surface-muted px-2.5 py-1 font-medium text-ink">{etiquetaCancelacion(h.cancellationType)}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/admin/disponibilidad?alojamiento=${h.alojamientoId}&habitacion=${h.id}`} className={buttonVariants({ size: 'sm' })}>
                        Disponibilidad
                      </Link>
                      <Link to={`/admin/habitaciones/${h.id}/editar`} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                        Editar
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setAccion({ tipo: h.activo ? 'desactivar' : 'reactivar', habitacion: h })
                          setErrorAccion('')
                          setAviso('')
                        }}
                      >
                        {h.activo ? 'Desactivar' : 'Reactivar'}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {accion && (
        <DialogoConfirmacion
          abierto
          onAbiertoCambia={(abierto) => !abierto && !confirmando && setAccion(null)}
          titulo={accion.tipo === 'desactivar' ? 'Desactivar la habitación' : 'Reactivar la habitación'}
          etiquetaConfirmar={accion.tipo === 'desactivar' ? 'Desactivar' : 'Reactivar'}
          destructivo={accion.tipo === 'desactivar'}
          confirmando={confirmando}
          onConfirmar={confirmar}
        >
          <p>
            <strong>{accion.habitacion.nombre}</strong>
          </p>
          <p className="mt-2 text-muted-foreground">
            {accion.tipo === 'desactivar'
              ? 'Dejará de venderse en las búsquedas y en el detalle del alojamiento. No se puede desactivar si tiene reservas confirmadas por venir: primero hay que cancelarlas.'
              : 'Volverá a venderse en las fechas que tengan cupos cargados.'}
          </p>
          {errorAccion && (
            <p role="alert" className="mt-4 text-sm font-medium text-error">
              {errorAccion}
            </p>
          )}
        </DialogoConfirmacion>
      )}
    </>
  )
}
