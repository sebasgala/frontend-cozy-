import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { DialogoConfirmacion } from '@/components/DialogoConfirmacion'
import { FotoPendiente } from '@/components/FotoPendiente'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatearFechaLarga, formatearNoches, formatearPrecio } from '@/lib/formato'
import { cancelarReserva, obtenerReservaPorLocalizador, politicaCancelacion } from '@/services/reservas'
import type { ReservaCompleta } from '@/types/reservas'
import NotFoundPage from '@/pages/NotFoundPage'

const ETIQUETA_ESTADO: Record<ReservaCompleta['estado'], { texto: string; variant: 'success' | 'muted' | 'error' }> = {
  CONFIRMED: { texto: 'Confirmada', variant: 'success' },
  PENDING: { texto: 'Pendiente', variant: 'muted' },
  CANCELLED: { texto: 'Cancelada', variant: 'error' },
  CHECKED_IN: { texto: 'Alojado', variant: 'success' },
  CHECKED_OUT: { texto: 'Finalizada', variant: 'muted' },
}

export default function DetalleReservaPage() {
  const { localizador } = useParams<{ localizador: string }>()
  const navigate = useNavigate()

  const [reserva, setReserva] = useState<ReservaCompleta | null>(null)
  const [cargando, setCargando] = useState(!!localizador)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const [errorCancelar, setErrorCancelar] = useState('')

  useEffect(() => {
    if (!localizador) return
    let vigente = true
    obtenerReservaPorLocalizador(localizador).then((r) => {
      if (!vigente) return
      setReserva(r)
      setCargando(false)
    })
    return () => {
      vigente = false
    }
  }, [localizador])

  const confirmarCancelacion = async () => {
    if (!localizador) return
    setCancelando(true)
    setErrorCancelar('')
    try {
      const actualizada = await cancelarReserva(reserva ?? { localizador })
      setReserva(actualizada)
      setDialogoAbierto(false)
    } catch (error) {
      setErrorCancelar(error instanceof Error ? error.message : 'No pudimos cancelar la reserva.')
    } finally {
      setCancelando(false)
    }
  }

  if (cargando) {
    return (
      <div className="mx-auto max-w-[720px] px-[clamp(20px,5vw,56px)] py-16">
        <div className="h-64 w-full animate-pulse rounded-[20px] bg-surface-muted" />
      </div>
    )
  }

  if (!reserva) return <NotFoundPage />

  const estado = ETIQUETA_ESTADO[reserva.estado]
  const politica = politicaCancelacion(reserva)
  // Con el huésped ya alojado (o ya salido) la reserva no se cancela
  const puedeCancelar = reserva.estado === 'CONFIRMED' || reserva.estado === 'PENDING'

  return (
    <div className="mx-auto max-w-[720px] px-[clamp(20px,5vw,56px)] py-10">
      <title>{`Reserva ${reserva.localizador} · Cozy`}</title>

      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink underline underline-offset-4 outline-none hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Volver a mis reservas
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-3xl font-medium tracking-tight text-ink">Reserva {reserva.localizador}</h1>
        <Badge variant={estado.variant}>{estado.texto}</Badge>
      </div>

      <div className="mt-6 flex flex-col gap-4 rounded-[20px] border border-border bg-white p-6">
        <div className="flex gap-4">
          <div className="size-24 shrink-0 overflow-hidden rounded-xl">
            {reserva.alojamientoFoto ? (
              <img src={reserva.alojamientoFoto} alt="" className="size-full object-cover" />
            ) : (
              <FotoPendiente etiqueta={reserva.alojamientoNombre} />
            )}
          </div>
          <div className="min-w-0">
            <Link
              to={`/alojamientos/${reserva.alojamientoId}`}
              className="font-semibold text-ink underline-offset-4 hover:underline"
            >
              {reserva.alojamientoNombre}
            </Link>
            <p className="text-sm text-muted-foreground">{reserva.destino}</p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border pt-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Entrada</dt>
            <dd className="font-medium text-ink">{formatearFechaLarga(reserva.entrada)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Salida</dt>
            <dd className="font-medium text-ink">{formatearFechaLarga(reserva.salida)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Estancia</dt>
            <dd className="font-medium text-ink">{formatearNoches(reserva.noches)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Huéspedes</dt>
            <dd className="font-medium text-ink">{reserva.huespedes}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Reservado el</dt>
            <dd className="font-medium text-ink">{formatearFechaLarga(reserva.creadoEn.slice(0, 10))}</dd>
          </div>
          {reserva.canceladoEn && (
            <div>
              <dt className="text-muted-foreground">Cancelado el</dt>
              <dd className="font-medium text-ink">{formatearFechaLarga(reserva.canceladoEn.slice(0, 10))}</dd>
            </div>
          )}
        </dl>

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <span className="text-sm font-semibold text-ink">Habitaciones</span>
          {reserva.lineas.map((linea) => (
            <div key={`${linea.habitacionId}-${linea.tarifa}`} className="flex justify-between gap-3 text-sm">
              <span className="text-ink">
                {linea.cantidad} × {linea.habitacionNombre}
                <span className="text-muted-foreground"> ({linea.tarifa === 'flexible' ? 'flexible' : 'estándar'})</span>
                {linea.mealPlan && <span className="text-muted-foreground"> · con desayuno</span>}
              </span>
              <span className="shrink-0 font-medium text-ink">{formatearPrecio(linea.subtotal, reserva.moneda)}</span>
            </div>
          ))}
        </div>

        <div className="flex items-baseline justify-between border-t border-border pt-4">
          <span className="font-semibold text-ink">Total</span>
          <span className="font-heading text-2xl font-semibold text-ink">
            {formatearPrecio(reserva.precioTotal, reserva.moneda)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {/* La referencia solo se conoce en el navegador que pagó: el detalle de la orden no la incluye */}
          {reserva.referenciaPago
            ? `Pago simulado con referencia ${reserva.referenciaPago}. No se realizó ningún cobro real.`
            : 'Pago simulado. No se realizó ningún cobro real.'}
        </p>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-[20px] border border-border bg-surface-muted p-5">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
        <div>
          <p className="font-semibold text-ink">{politica.titulo}</p>
          <p className="mt-1 text-sm text-ink">{politica.detalle}</p>
        </div>
      </div>

      {puedeCancelar && (
        <div className="mt-6">
          <Button type="button" variant="destructive" onClick={() => setDialogoAbierto(true)}>
            Cancelar esta reserva
          </Button>
        </div>
      )}

      <DialogoConfirmacion
        abierto={dialogoAbierto}
        onAbiertoCambia={setDialogoAbierto}
        titulo="¿Cancelar esta reserva?"
        etiquetaConfirmar="Sí, cancelar"
        etiquetaCancelar="No, mantenerla"
        destructivo
        confirmando={cancelando}
        onConfirmar={confirmarCancelacion}
      >
        <p>
          Vas a cancelar la reserva en <strong>{reserva.alojamientoNombre}</strong> del{' '}
          {formatearFechaLarga(reserva.entrada)} al {formatearFechaLarga(reserva.salida)}.
        </p>
        <p className="mt-3 rounded-lg bg-surface-muted p-3 text-xs">{politica.detalle}</p>
        {errorCancelar && (
          <p role="alert" className="mt-3 text-xs font-medium text-error">
            {errorCancelar}
          </p>
        )}
      </DialogoConfirmacion>
    </div>
  )
}
