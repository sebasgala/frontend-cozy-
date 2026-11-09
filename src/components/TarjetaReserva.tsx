import { Link } from 'react-router'
import { FotoPendiente } from '@/components/FotoPendiente'
import { Badge } from '@/components/ui/badge'
import { formatearFecha, formatearPrecio } from '@/lib/formato'
import type { ReservaCompleta } from '@/types/reservas'

const ETIQUETA_ESTADO: Record<ReservaCompleta['estado'], { texto: string; variant: 'success' | 'muted' | 'error' }> = {
  CONFIRMED: { texto: 'Confirmada', variant: 'success' },
  PENDING: { texto: 'Pendiente', variant: 'muted' },
  CANCELLED: { texto: 'Cancelada', variant: 'error' },
  CHECKED_IN: { texto: 'Alojado', variant: 'success' },
  CHECKED_OUT: { texto: 'Finalizada', variant: 'muted' },
}

/** Tarjeta de una reserva en "Mis reservas": foto, alojamiento, fechas, localizador, total y estado */
export function TarjetaReserva({ reserva }: { reserva: ReservaCompleta }) {
  const estado = ETIQUETA_ESTADO[reserva.estado]
  return (
    <Link
      to={`/cuenta/reservas/${reserva.localizador}`}
      className="group flex flex-col gap-4 rounded-[20px] border border-border bg-white p-4 outline-none transition-transform duration-[320ms] ease-expo hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:flex-row sm:items-center"
    >
      <div className="h-32 w-full shrink-0 overflow-hidden rounded-2xl sm:h-20 sm:w-28">
        {reserva.alojamientoFoto ? (
          <img src={reserva.alojamientoFoto} alt="" className="size-full object-cover" />
        ) : (
          <FotoPendiente etiqueta={reserva.alojamientoNombre} />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-ink">{reserva.alojamientoNombre}</h3>
          <Badge variant={estado.variant}>{estado.texto}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {formatearFecha(reserva.entrada)} – {formatearFecha(reserva.salida)} · {reserva.destino}
        </p>
        <p className="text-xs text-muted-foreground">
          Localizador <span className="font-mono font-medium text-ink">{reserva.localizador}</span>
        </p>
      </div>

      <div className="text-left sm:text-right">
        <p className="text-lg font-semibold text-ink">{formatearPrecio(reserva.precioTotal, reserva.moneda)}</p>
        <p className="text-xs text-muted-foreground">
          {reserva.totalHabitaciones === 1 ? '1 habitación' : `${reserva.totalHabitaciones} habitaciones`}
        </p>
      </div>
    </Link>
  )
}
