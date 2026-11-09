import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Check, Copy, PartyPopper } from 'lucide-react'
import { FotoPendiente } from '@/components/FotoPendiente'
import { Button } from '@/components/ui/button'
import { formatearFechaLarga, formatearNoches, formatearPrecio } from '@/lib/formato'
import { obtenerReservaPorLocalizador } from '@/services/reservas'
import type { ReservaCompleta } from '@/types/reservas'
import NotFoundPage from '@/pages/NotFoundPage'

export default function ConfirmacionReservaPage() {
  const [parametros] = useSearchParams()
  const localizador = parametros.get('localizador') ?? ''

  const [reserva, setReserva] = useState<ReservaCompleta | null>(null)
  const [cargando, setCargando] = useState(!!localizador)
  const [copiado, setCopiado] = useState(false)

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

  const copiarLocalizador = async () => {
    try {
      await navigator.clipboard.writeText(localizador)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Sin permiso de portapapeles: el código ya está visible en pantalla para copiarlo a mano
    }
  }

  if (cargando) {
    return (
      <div className="mx-auto max-w-[640px] px-[clamp(20px,5vw,56px)] py-16">
        <div className="h-64 w-full animate-pulse rounded-[20px] bg-surface-muted" />
      </div>
    )
  }

  if (!reserva) return <NotFoundPage />

  return (
    <div className="mx-auto max-w-[640px] px-[clamp(20px,5vw,56px)] py-16 text-center">
      <title>Reserva confirmada · Cozy</title>

      <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary text-on-dark">
        <PartyPopper aria-hidden="true" className="size-8" />
      </span>

      <h1 className="mt-6 font-heading text-3xl font-medium tracking-tight text-ink">¡Tu reserva está confirmada!</h1>
      <p className="mt-2 text-muted-foreground">
        Guarda tu localizador: lo necesitarás para consultar o cancelar esta reserva.
      </p>

      <div className="mt-8 flex flex-col items-center gap-3 rounded-[20px] border border-border bg-white p-8">
        <span className="text-xs font-medium tracking-[0.1em] text-muted-foreground uppercase">Localizador</span>
        <div className="flex items-center gap-3">
          <span className="font-mono text-3xl font-bold tracking-[0.15em] text-ink">{reserva.localizador}</span>
          <button
            type="button"
            onClick={copiarLocalizador}
            aria-label="Copiar localizador"
            className="flex size-11 items-center justify-center rounded-full border border-border text-primary transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {copiado ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
          </button>
        </div>
        {copiado && (
          <span role="status" className="text-xs font-medium text-ink">
            Copiado al portapapeles
          </span>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-4 rounded-[20px] border border-border bg-white p-6 text-left">
        <div className="flex gap-3">
          <div className="size-16 shrink-0 overflow-hidden rounded-xl">
            {reserva.alojamientoFoto ? (
              <img src={reserva.alojamientoFoto} alt="" className="size-full object-cover" />
            ) : (
              <FotoPendiente etiqueta={reserva.alojamientoNombre} />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{reserva.alojamientoNombre}</p>
            <p className="text-xs text-muted-foreground">{reserva.destino}</p>
          </div>
        </div>
        <dl className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Entrada</dt>
            <dd className="font-medium text-ink">{formatearFechaLarga(reserva.entrada)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Salida</dt>
            <dd className="font-medium text-ink">{formatearFechaLarga(reserva.salida)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Estancia</dt>
            <dd className="font-medium text-ink">{formatearNoches(reserva.noches)}</dd>
          </div>
        </dl>
        <div className="flex items-baseline justify-between border-t border-border pt-4">
          <span className="font-semibold text-ink">Total pagado (simulado)</span>
          <span className="font-heading text-2xl font-semibold text-ink">
            {formatearPrecio(reserva.precioTotal, reserva.moneda)}
          </span>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild size="lg">
          <Link to="/cuenta/reservas">Ver mis reservas</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/">Volver al inicio</Link>
        </Button>
      </div>
    </div>
  )
}
