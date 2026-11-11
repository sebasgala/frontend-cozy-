import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { CheckCircle2, Clock, History, LogIn, SlidersHorizontal, UserCheck, Users, BedDouble } from 'lucide-react'
import { CampoSelect } from '@/components/admin/CampoSelect'
import { ChipsPestanas } from '@/components/ChipsPestanas'
import {
  ModalAuditoria,
  ModalCheckin,
  ModalEarlyCheckin,
  ModalEdicion,
  ModalReasignar,
} from '@/components/recepcion/ModalesRecepcion'
import { Button } from '@/components/ui/button'
import { useAlojamientosAdmin } from '@/hooks/useAlojamientosAdmin'
import { useSesion } from '@/hooks/useSesion'
import { formatearFecha, formatearNoches } from '@/lib/formato'
import { horaGuayaquil, hoyGuayaquil, ventanaCheckin } from '@/lib/recepcion'
import { cn } from '@/lib/utils'
import { esErrorDeSesion, mensajeDeError } from '@/services/admin'
import { cerrarSesion } from '@/services/cuenta'
import { listarReservasRecepcion, obtenerContextoRecepcion } from '@/services/recepcion'
import type { EstadoReserva } from '@/types/admin'
import type { ContextoRecepcion, PaginaRecepcion, ReservaRecepcion } from '@/types/recepcion'
import { EncabezadoAdmin } from './EncabezadoAdmin'

const POR_PAGINA = 10

// 'por_llegar': reservas confirmadas que aún no hicieron check-in y cuya estancia no terminó (vista por defecto)
type FiltroEstado = 'por_llegar' | 'todas' | EstadoReserva
type FiltroFechaModo = 'hoy' | 'todas' | 'personalizado'

const ESTADOS: Record<EstadoReserva, { etiqueta: string; clase: string }> = {
  CONFIRMED: { etiqueta: 'Confirmada', clase: 'bg-success/12 text-success' },
  CHECKED_IN: { etiqueta: 'Alojado', clase: 'bg-primary/10 text-primary' },
  CHECKED_OUT: { etiqueta: 'Finalizada', clase: 'bg-[var(--dutch-white)] text-ink' },
  CANCELLED: { etiqueta: 'Cancelada', clase: 'bg-error/10 text-error' },
  PENDING: { etiqueta: 'Reservada', clase: 'bg-warning/10 text-warning' },
}

const OPCIONES_ESTADO: { id: FiltroEstado; etiqueta: string }[] = [
  { id: 'por_llegar', etiqueta: 'Por llegar' },
  { id: 'todas', etiqueta: 'Todas' },
  { id: 'PENDING', etiqueta: 'Reservadas' },
  { id: 'CONFIRMED', etiqueta: 'Confirmadas' },
  { id: 'CHECKED_IN', etiqueta: 'Alojados' },
  { id: 'CHECKED_OUT', etiqueta: 'Finalizadas' },
  { id: 'CANCELLED', etiqueta: 'Canceladas' },
]

type ModalActivo =
  | { tipo: 'checkin'; reserva: ReservaRecepcion }
  | { tipo: 'reasignar'; reserva: ReservaRecepcion }
  | { tipo: 'edicion'; reserva: ReservaRecepcion }
  | { tipo: 'early'; reserva: ReservaRecepcion }
  | { tipo: 'auditoria'; reserva: ReservaRecepcion }
  | null

type EstadoCarga = { clave: string; datos: PaginaRecepcion } | { clave: string; error: string }

export default function RecepcionPage() {
  const sesion = useSesion()
  const esAdminOSuper = sesion?.rol === 'administrador' || sesion?.rol === 'superadmin'
  const esSuperadmin = sesion?.rol === 'superadmin'
  const { alojamientos, error: errorAlojamientos } = useAlojamientosAdmin()
  const [params, setParams] = useSearchParams()

  const [contexto, setContexto] = useState<ContextoRecepcion | null>(null)
  const [estado, setEstado] = useState<FiltroEstado>('por_llegar')
  const [modoFecha, setModoFecha] = useState<FiltroFechaModo>('todas')
  const [llegadaDesde, setLlegadaDesde] = useState(hoyGuayaquil())
  const [llegadaHasta, setLlegadaHasta] = useState(hoyGuayaquil())
  const [pagina, setPagina] = useState(1)
  const [version, setVersion] = useState(0)

  // El superadmin puede elegir el alojamiento que desea gestionar vía selector o URL (?alojamiento=ID)
  const paramAlojamiento = params.get('alojamiento')
  const alojamientoSeleccionadoId = esSuperadmin && paramAlojamiento ? Number(paramAlojamiento) : undefined

  const [estadoCarga, setEstadoCarga] = useState<EstadoCarga | null>(null)
  const [aviso, setAviso] = useState('')

  const [modalActivo, setModalActivo] = useState<ModalActivo>(null)

  const desde = modoFecha === 'hoy' ? hoyGuayaquil() : modoFecha === 'personalizado' ? llegadaDesde : ''
  const hasta = modoFecha === 'hoy' ? hoyGuayaquil() : modoFecha === 'personalizado' ? llegadaHasta : ''
  const clave = `${alojamientoSeleccionadoId ?? ''}|${estado}|${modoFecha}|${desde}|${hasta}|${pagina}|${version}`
  const cargando = estadoCarga?.clave !== clave
  const resultado = estadoCarga && 'datos' in estadoCarga && estadoCarga.clave === clave ? estadoCarga.datos : null
  const error = estadoCarga && 'error' in estadoCarga && estadoCarga.clave === clave ? estadoCarga.error : ''

  // Contexto del alojamiento
  useEffect(() => {
    let vigente = true
    obtenerContextoRecepcion()
      .then((c) => vigente && setContexto(c))
      .catch((e: unknown) => {
        if (!vigente) return
        if (esErrorDeSesion(e)) void cerrarSesion()
      })
    return () => {
      vigente = false
    }
  }, [])

  // Listado de reservas
  useEffect(() => {
    let vigente = true

    listarReservasRecepcion({
      pendientesCheckin: estado === 'por_llegar',
      estado: estado === 'todas' || estado === 'por_llegar' ? undefined : estado,
      llegadaDesde: desde || undefined,
      llegadaHasta: hasta || undefined,
      alojamientoId: alojamientoSeleccionadoId,
      page: pagina,
      limit: POR_PAGINA,
    })
      .then((datos) => {
        if (!vigente) return
        if (datos.data.length === 0 && pagina > 1) {
          setPagina(Math.max(1, datos.meta.totalPages))
        } else {
          setEstadoCarga({ clave, datos })
        }
      })
      .catch((e: unknown) => {
        if (!vigente) return
        if (esErrorDeSesion(e)) {
          void cerrarSesion()
          return
        }
        setEstadoCarga({ clave, error: mensajeDeError(e, 'No se pudieron cargar las reservas de recepción.') })
      })

    return () => {
      vigente = false
    }
  }, [clave, estado, desde, hasta, pagina, alojamientoSeleccionadoId])

  const alCompletarModal = (reservaActualizada: ReservaRecepcion, mensajeAviso: string) => {
    setModalActivo(null)
    setAviso(mensajeAviso)
    setEstadoCarga((prev) => {
      if (!prev || !('datos' in prev)) return prev
      return {
        ...prev,
        datos: {
          ...prev.datos,
          data: prev.datos.data.map((r) => (r.orderId === reservaActualizada.orderId ? reservaActualizada : r)),
        },
      }
    })
    setVersion((v) => v + 1)
  }

  const alojamientoActual = alojamientos?.find((a) => a.id === alojamientoSeleccionadoId)
  const tituloAlojamiento = esSuperadmin
    ? alojamientoActual
      ? `${alojamientoActual.nombre} (ID: ${alojamientoActual.id})`
      : 'Todos los alojamientos'
    : contexto?.alojamientoNombre
      ? `${contexto.alojamientoNombre}${contexto.alojamientoCodigo ? ` (${contexto.alojamientoCodigo})` : ''}`
      : 'Alojamiento no asignado'

  return (
    <>
      <EncabezadoAdmin
        titulo="Recepción"
        descripcion={`Mostrador y check-in · ${tituloAlojamiento}`}
        acciones={
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock aria-hidden="true" className="size-4" />
            <span>Zona horaria: America/Guayaquil (UTC-5)</span>
          </div>
        }
      />

      {errorAlojamientos && (
        <p role="alert" className="mb-4 rounded-2xl bg-white p-4 text-sm font-medium text-error">
          {errorAlojamientos}
        </p>
      )}

      {aviso && (
        <div role="status" className="mb-6 flex items-center justify-between rounded-2xl bg-success/10 px-4 py-3 text-sm text-success">
          <div className="flex items-center gap-2">
            <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
            <span>{aviso}</span>
          </div>
          <button
            type="button"
            onClick={() => setAviso('')}
            className="text-xs font-semibold text-success/80 underline hover:text-success"
          >
            Descartar
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mb-6 rounded-2xl bg-white p-5 text-sm font-medium text-error">
          {error}
        </p>
      )}

      {/* Selector de alojamiento para Superadmin */}
      {esSuperadmin && alojamientos && alojamientos.length > 0 && (
        <div className="mb-6 max-w-md rounded-[20px] border border-border bg-white p-4">
          <CampoSelect
            etiqueta="Filtrar por Alojamiento (Superadmin)"
            value={paramAlojamiento ?? ''}
            onChange={(e) => {
              setPagina(1)
              setParams(e.target.value ? { alojamiento: e.target.value } : {}, { replace: true })
            }}
            className="h-11 w-full"
          >
            <option value="">Todos los alojamientos</option>
            {alojamientos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre} (ID: {a.id}){!a.activo ? ' - inactivo' : ''}
              </option>
            ))}
          </CampoSelect>
        </div>
      )}

      {/* Barra de Filtros */}
      <section aria-label="Filtros de recepción" className="mb-6 flex flex-col gap-4 rounded-[20px] border border-border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Estado de la reserva</span>
            <ChipsPestanas
              etiqueta="Filtrar por estado"
              opciones={OPCIONES_ESTADO}
              valor={estado}
              onCambiar={(nuevo) => {
                setEstado(nuevo)
                setPagina(1)
              }}
            />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Llegada</span>
              <div className="flex gap-1.5 rounded-xl border border-border bg-surface-muted p-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setModoFecha('hoy')
                    setPagina(1)
                  }}
                  className={cn(
                    'rounded-lg px-3 py-1.5 font-medium transition-colors',
                    modoFecha === 'hoy' ? 'bg-white text-ink shadow-sm' : 'text-muted-foreground hover:text-ink',
                  )}
                >
                  Llegadas de hoy ({hoyGuayaquil()})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModoFecha('todas')
                    setPagina(1)
                  }}
                  className={cn(
                    'rounded-lg px-3 py-1.5 font-medium transition-colors',
                    modoFecha === 'todas' ? 'bg-white text-ink shadow-sm' : 'text-muted-foreground hover:text-ink',
                  )}
                >
                  Todas las fechas
                </button>
                <button
                  type="button"
                  onClick={() => setModoFecha('personalizado')}
                  className={cn(
                    'rounded-lg px-3 py-1.5 font-medium transition-colors',
                    modoFecha === 'personalizado' ? 'bg-white text-ink shadow-sm' : 'text-muted-foreground hover:text-ink',
                  )}
                >
                  Rango
                </button>
              </div>
            </div>

            {modoFecha === 'personalizado' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  aria-label="Llegada desde"
                  value={llegadaDesde}
                  onChange={(e) => {
                    setLlegadaDesde(e.target.value)
                    setPagina(1)
                  }}
                  className="rounded-xl border border-border bg-white px-3 py-1.5 text-xs text-ink outline-none focus:border-primary"
                />
                <span className="text-xs text-muted-foreground">a</span>
                <input
                  type="date"
                  aria-label="Llegada hasta"
                  value={llegadaHasta}
                  onChange={(e) => {
                    setLlegadaHasta(e.target.value)
                    setPagina(1)
                  }}
                  className="rounded-xl border border-border bg-white px-3 py-1.5 text-xs text-ink outline-none focus:border-primary"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Listado de Reservas */}
      <section aria-label="Listado de reservas en mostrador" className="flex flex-col gap-4">
        {cargando ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-28 animate-pulse rounded-[20px] bg-white" />
            ))}
          </div>
        ) : !resultado || resultado.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[20px] border border-border bg-white p-12 text-center">
            <SlidersHorizontal aria-hidden="true" className="size-10 text-muted-foreground/60" />
            <p className="mt-3 font-medium text-ink">No se encontraron reservas</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {estado === 'por_llegar'
                ? 'No hay reservas confirmadas pendientes de check-in con estos filtros.'
                : modoFecha === 'hoy'
                  ? 'No hay llegadas registradas para hoy con los filtros aplicados.'
                  : 'Intenta cambiar los filtros de fecha o estado.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {resultado.data.map((reserva) => {
              const ventana = ventanaCheckin(reserva)
              const puedeCheckin = reserva.estado === 'CONFIRMED'
              const puedeReasignar = reserva.estado === 'CONFIRMED' || reserva.estado === 'CHECKED_IN'
              const estadoBadge = ESTADOS[reserva.estado] ?? { etiqueta: reserva.estado, clase: 'bg-surface-muted text-ink' }

              return (
                <article
                  key={reserva.orderId}
                  className="flex flex-col gap-4 rounded-[20px] border border-border bg-white p-5 shadow-sm transition-all hover:border-primary/40 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-ink">{reserva.codigoReserva}</span>
                      <span className="text-xs text-muted-foreground">({reserva.locator})</span>
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', estadoBadge.clase)}>
                        {estadoBadge.etiqueta}
                      </span>
                      {reserva.earlyCheckin.autorizado && (
                        <span className="rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning">
                          Early check-in
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-ink sm:grid-cols-2 xl:grid-cols-3">
                      <div>
                        <span className="text-muted-foreground">Titular: </span>
                        <span className="font-medium">{reserva.titular.nombre || 'Sin nombre'}</span>
                        <span className="ml-1 text-xs text-muted-foreground">
                          {reserva.titular.documentoRegistrado ? '(Doc registrado)' : '(Sin doc registrado)'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Habitación: </span>
                        <span className="font-medium">
                          {reserva.habitacionAsignada ? (
                            <>
                              <span className="text-primary font-semibold">{reserva.habitacionAsignada}</span>{' '}
                              <span className="text-xs text-muted-foreground">({reserva.habitacionNombre})</span>
                            </>
                          ) : (
                            reserva.habitacionNombre
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Estancia: </span>
                        <span className="font-medium">
                          {formatearFecha(reserva.llegada)} → {formatearFecha(reserva.salida)}
                        </span>{' '}
                        <span className="text-xs text-muted-foreground">({formatearNoches(reserva.noches)})</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Huéspedes: </span>
                        <span className="font-medium">
                          {reserva.huespedes.adultos} adulto{reserva.huespedes.adultos !== 1 ? 's' : ''}
                          {reserva.huespedes.ninos.length > 0 && `, ${reserva.huespedes.ninos.length} niño(s)`}
                        </span>
                      </div>
                      {reserva.checkInEn && (
                        <div>
                          <span className="text-muted-foreground">Check-in: </span>
                          <span className="font-medium text-success">{horaGuayaquil(reserva.checkInEn)}</span>
                        </div>
                      )}
                      {!reserva.checkInEn && reserva.estado === 'CONFIRMED' && (
                        <div>
                          <span className="text-muted-foreground">Horario check-in: </span>
                          <span className={cn('text-xs font-medium', ventana.habilitado ? 'text-success' : 'text-muted-foreground')}>
                            {ventana.habilitado ? 'Disponible ahora (desde 14:00)' : ventana.motivo}
                          </span>
                        </div>
                      )}
                    </div>

                    {reserva.observaciones && (
                      <p className="rounded-xl bg-surface-muted px-3 py-1.5 text-xs text-ink/80">
                        <span className="font-medium">Observaciones:</span> {reserva.observaciones}
                      </p>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 lg:border-t-0 lg:pt-0">
                    {puedeCheckin && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setModalActivo({ tipo: 'checkin', reserva })}
                        disabled={!ventana.habilitado}
                        title={!ventana.habilitado ? ventana.motivo : 'Aprobar check-in'}
                        className="gap-1.5"
                      >
                        <LogIn aria-hidden="true" className="size-4" />
                        Check-in
                      </Button>
                    )}

                    {puedeReasignar && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setModalActivo({ tipo: 'reasignar', reserva })}
                        className="gap-1.5"
                      >
                        <BedDouble aria-hidden="true" className="size-4" />
                        Reasignar
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setModalActivo({ tipo: 'edicion', reserva })}
                      className="gap-1.5"
                    >
                      <Users aria-hidden="true" className="size-4" />
                      Huéspedes
                    </Button>

                    {esAdminOSuper && puedeCheckin && !reserva.earlyCheckin.autorizado && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setModalActivo({ tipo: 'early', reserva })}
                        className="gap-1.5"
                      >
                        <UserCheck aria-hidden="true" className="size-4" />
                        Early check-in
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setModalActivo({ tipo: 'auditoria', reserva })}
                      title="Ver auditoría de recepción"
                      className="gap-1"
                    >
                      <History aria-hidden="true" className="size-4" />
                      <span className="sr-only lg:not-sr-only lg:inline">Auditoría</span>
                    </Button>
                  </div>
                </article>
              )
            })}

            {/* Paginación */}
            {resultado.meta.totalPages > 1 && (
              <nav aria-label="Paginación de recepción" className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pagina <= 1}
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <span className="text-xs text-muted-foreground">
                  Página {resultado.meta.currentPage} de {resultado.meta.totalPages} · {resultado.meta.totalItems} reservas
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pagina >= resultado.meta.totalPages}
                  onClick={() => setPagina((p) => p + 1)}
                >
                  Siguiente
                </Button>
              </nav>
            )}
          </div>
        )}
      </section>

      {/* Modales */}
      {modalActivo?.tipo === 'checkin' && (
        <ModalCheckin
          reserva={modalActivo.reserva}
          onCerrar={() => setModalActivo(null)}
          onHecho={alCompletarModal}
        />
      )}

      {modalActivo?.tipo === 'reasignar' && (
        <ModalReasignar
          reserva={modalActivo.reserva}
          onCerrar={() => setModalActivo(null)}
          onHecho={alCompletarModal}
        />
      )}

      {modalActivo?.tipo === 'edicion' && (
        <ModalEdicion
          reserva={modalActivo.reserva}
          onCerrar={() => setModalActivo(null)}
          onHecho={alCompletarModal}
        />
      )}

      {modalActivo?.tipo === 'early' && (
        <ModalEarlyCheckin
          reserva={modalActivo.reserva}
          onCerrar={() => setModalActivo(null)}
          onHecho={alCompletarModal}
        />
      )}

      {modalActivo?.tipo === 'auditoria' && (
        <ModalAuditoria
          reserva={modalActivo.reserva}
          onCerrar={() => setModalActivo(null)}
        />
      )}
    </>
  )
}
