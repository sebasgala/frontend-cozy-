import { useEffect, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { CampoSelect } from '@/components/admin/CampoSelect'
import { ChipsPestanas } from '@/components/ChipsPestanas'
import { DialogoConfirmacion } from '@/components/DialogoConfirmacion'
import { Button } from '@/components/ui/button'
import { useAlojamientosAdmin } from '@/hooks/useAlojamientosAdmin'
import { useSesion } from '@/hooks/useSesion'
import { esErrorDeSesion, mensajeDeError } from '@/services/admin'
import { cancelarReservaAdmin, listarReservasAdmin } from '@/services/reservasAdmin'
import { cerrarSesion } from '@/services/cuenta'
import type { EstadoReserva, Pagina, ReservaAdmin } from '@/types/admin'
import { formatearFecha, formatearPrecio } from '@/lib/formato'
import { cn } from '@/lib/utils'
import { EncabezadoAdmin } from './EncabezadoAdmin'

const POR_PAGINA = 10

type FiltroEstado = 'todas' | EstadoReserva
type Resultado = { clave: string; datos: Pagina<ReservaAdmin> } | { clave: string; error: string }

const ESTADOS: Record<EstadoReserva, { etiqueta: string; clase: string }> = {
  PENDING: { etiqueta: 'Reservada', clase: 'bg-[var(--dutch-white)] text-ink' },
  CONFIRMED: { etiqueta: 'Confirmada', clase: 'bg-success/12 text-success' },
  CHECKED_IN: { etiqueta: 'Alojada', clase: 'bg-success/12 text-success' },
  CHECKED_OUT: { etiqueta: 'Finalizada', clase: 'bg-[var(--dutch-white)] text-ink' },
  CANCELLED: { etiqueta: 'Cancelada', clase: 'bg-error/10 text-error' },
}

const nombreHuesped = (r: ReservaAdmin) => `${r.customer_details.first_name} ${r.customer_details.last_name}`.trim()

/**
 * Reservas de los alojamientos que administra el usuario (el superadmin ve todas). Muestra quién reservó y si la
 * compra fue con cuenta o sin ella. Cancelar pide confirmación; cancelar dos veces no devuelve cupos dos veces.
 */
export default function ReservasAdminPage() {
  const sesion = useSesion()
  const { alojamientos, error: errorAlojamientos } = useAlojamientosAdmin()
  const [params, setParams] = useSearchParams()
  const { state } = useLocation() as { state: { aviso?: string } | null }

  const [estado, setEstado] = useState<FiltroEstado>('todas')
  // El alojamiento viene de la URL (?alojamiento=ID) o del selector; el selector escribe en la URL
  const alojamientoId = params.get('alojamiento') ?? ''
  const [pagina, setPagina] = useState(1)
  const [version, setVersion] = useState(0)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  const [cancelar, setCancelar] = useState<ReservaAdmin | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [errorAccion, setErrorAccion] = useState('')
  const [aviso, setAviso] = useState(state?.aviso ?? '')

  const clave = `${estado}|${alojamientoId}|${pagina}|${version}`
  const cargando = resultado?.clave !== clave

  useEffect(() => {
    let vigente = true
    listarReservasAdmin({
      estado: estado === 'todas' ? undefined : estado,
      alojamientoId: alojamientoId ? Number(alojamientoId) : undefined,
      page: pagina,
      limit: POR_PAGINA,
    })
      .then((datos) => {
        if (!vigente) return
        if (datos.data.length === 0 && pagina > 1) setPagina(Math.max(1, datos.meta.totalPages))
        else setResultado({ clave, datos })
      })
      .catch((e: unknown) => {
        if (!vigente) return
        if (esErrorDeSesion(e)) void cerrarSesion()
        setResultado({ clave, error: mensajeDeError(e, 'No se pudieron cargar las reservas.') })
      })
    return () => {
      vigente = false
    }
  }, [clave, estado, alojamientoId, pagina])

  const confirmarCancelacion = async () => {
    if (!cancelar) return
    const reserva = cancelar
    setConfirmando(true)
    setErrorAccion('')
    try {
      await cancelarReservaAdmin(reserva.order_id)
      setAviso(`Cancelaste la reserva ${reserva.locator}. Los cupos volvieron a quedar libres.`)
      setCancelar(null)
      setVersion((v) => v + 1)
    } catch (e) {
      if (esErrorDeSesion(e)) {
        await cerrarSesion()
        return
      }
      setErrorAccion(mensajeDeError(e, 'No se pudo cancelar la reserva.'))
      setVersion((v) => v + 1)
    } finally {
      setConfirmando(false)
    }
  }

  const datos = resultado && 'datos' in resultado ? resultado.datos : null
  const errorLista = resultado && 'error' in resultado ? resultado.error : ''
  const hayFiltros = estado !== 'todas' || alojamientoId !== ''
  const esSuperadmin = sesion?.rol === 'superadmin'

  return (
    <>
      <EncabezadoAdmin
        titulo="Reservas"
        descripcion={esSuperadmin ? 'Reservas de todos los alojamientos.' : 'Reservas de tus alojamientos.'}
      />

      {errorAlojamientos && (
        <p role="alert" className="mb-4 rounded-2xl bg-white p-4 text-sm font-medium text-error">
          {errorAlojamientos}
        </p>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <ChipsPestanas<FiltroEstado>
          etiqueta="Estado de la reserva"
          idPanel="lista-reservas"
          valor={estado}
          onCambiar={(v) => {
            setEstado(v)
            setPagina(1)
          }}
          opciones={[
            { id: 'todas', etiqueta: 'Todas' },
            { id: 'PENDING', etiqueta: 'Reservada' },
            { id: 'CONFIRMED', etiqueta: 'Confirmada' },
            { id: 'CHECKED_IN', etiqueta: 'Alojada' },
            { id: 'CHECKED_OUT', etiqueta: 'Finalizada' },
            { id: 'CANCELLED', etiqueta: 'Cancelada' },
          ]}
        />
        {alojamientos && alojamientos.length > 0 && (
          <CampoSelect
            etiqueta="Alojamiento"
            value={alojamientoId}
            onChange={(e) => {
              setPagina(1)
              setParams(e.target.value ? { alojamiento: e.target.value } : {}, { replace: true })
            }}
            className="h-11 min-w-[220px]"
          >
            <option value="">Todos los alojamientos</option>
            {alojamientos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </CampoSelect>
        )}
      </div>

      {aviso && (
        <p role="status" className="mt-4 rounded-2xl bg-[var(--dutch-white)] px-4 py-3 text-sm text-ink">
          {aviso}
        </p>
      )}

      <div id="lista-reservas" role="tabpanel" className="mt-4" aria-busy={cargando}>
        {errorLista ? (
          <p role="alert" className="rounded-2xl bg-white p-5 text-sm font-medium text-error">
            {errorLista}
          </p>
        ) : cargando && !datos ? (
          <div className="flex flex-col gap-3" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[120px] animate-pulse rounded-[20px] bg-white" />
            ))}
          </div>
        ) : datos && datos.data.length === 0 ? (
          <p className="rounded-[20px] border border-border bg-white p-6 text-muted-foreground">
            {hayFiltros ? 'No hay reservas con estos filtros.' : 'Todavía no hay reservas en tus alojamientos.'}
          </p>
        ) : (
          <ul className={cn('flex flex-col gap-3 transition-opacity', cargando && 'opacity-60')}>
            {datos?.data.map((r) => {
              const est = ESTADOS[r.status] ?? ESTADOS.PENDING
              const d = r.accommodation_details
              return (
                <li key={r.order_id} className="flex flex-col gap-4 rounded-[20px] border border-border bg-white p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold tracking-wide text-ink">{r.locator}</span>
                      <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', est.clase)}>{est.etiqueta}</span>
                    </div>
                    <p className="mt-1.5 truncate font-medium text-ink">
                      {d.name} · {d.room_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatearFecha(d.checkin)} → {formatearFecha(d.checkout)} · {d.nights} {d.nights === 1 ? 'noche' : 'noches'} ·{' '}
                      {d.rooms} {d.rooms === 1 ? 'habitación' : 'habitaciones'}
                    </p>
                    <p className="mt-2 text-sm text-ink">
                      <span className="font-medium">{nombreHuesped(r) || 'Sin nombre'}</span>{' '}
                      <span className="text-muted-foreground">· {r.customer_details.email}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.cliente_id ? 'Compra con cuenta' : 'Compra sin cuenta'} · reservada el {formatearFecha(r.creation_date.slice(0, 10))}
                    </p>
                  </div>
                  <div className="flex flex-row items-center justify-between gap-3 lg:flex-col lg:items-end">
                    <p className="font-heading text-xl font-medium text-ink">{formatearPrecio(r.total_price, r.currency)}</p>
                    {(r.status === 'CONFIRMED' || r.status === 'PENDING') ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCancelar(r)
                          setErrorAccion('')
                          setAviso('')
                        }}
                      >
                        Cancelar reserva
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground">Sin acciones</span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {datos && datos.meta.totalPages > 1 && (
          <nav aria-label="Páginas" className="mt-6 flex items-center justify-between gap-3">
            <Button variant="outline" size="sm" disabled={pagina <= 1 || cargando} onClick={() => setPagina((p) => p - 1)}>
              Anterior
            </Button>
            <p className="text-sm text-muted-foreground">
              Página {datos.meta.currentPage} de {datos.meta.totalPages} · {datos.meta.totalItems} reservas
            </p>
            <Button variant="outline" size="sm" disabled={pagina >= datos.meta.totalPages || cargando} onClick={() => setPagina((p) => p + 1)}>
              Siguiente
            </Button>
          </nav>
        )}
      </div>

      {cancelar && (
        <DialogoConfirmacion
          abierto
          onAbiertoCambia={(abierto) => !abierto && !confirmando && setCancelar(null)}
          titulo="Cancelar la reserva"
          etiquetaConfirmar="Cancelar reserva"
          etiquetaCancelar="Volver"
          destructivo
          confirmando={confirmando}
          onConfirmar={confirmarCancelacion}
        >
          <p>
            <strong>{cancelar.locator}</strong> · {nombreHuesped(cancelar) || 'Sin nombre'}
          </p>
          <p className="mt-1 text-muted-foreground">
            {cancelar.accommodation_details.name}, del {formatearFecha(cancelar.accommodation_details.checkin)} al{' '}
            {formatearFecha(cancelar.accommodation_details.checkout)}.
          </p>
          <p className="mt-2 text-muted-foreground">
            La reserva quedará cancelada y sus cupos volverán a estar libres para vender. No se puede deshacer desde aquí.
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
