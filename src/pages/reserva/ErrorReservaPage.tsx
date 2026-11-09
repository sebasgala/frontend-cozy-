import { useSearchParams } from 'react-router'
import { Link } from 'react-router'
import { AlertCircle, ArrowRightLeft, ClockAlert, RotateCcw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatearPrecio } from '@/lib/formato'
import type { TipoErrorReserva } from '@/types/reservas'

const CONTENIDO: Record<TipoErrorReserva, { titulo: string; Icono: typeof AlertCircle }> = {
  'no-disponible': { titulo: 'Esa habitación ya no está disponible', Icono: Search },
  'precio-cambiado': { titulo: 'El precio cambió', Icono: ArrowRightLeft },
  'vista-previa-vencida': { titulo: 'La vista previa venció', Icono: ClockAlert },
  'parcial-fallo': { titulo: 'Reserva parcialmente confirmada', Icono: AlertCircle },
  generico: { titulo: 'No pudimos completar tu reserva', Icono: AlertCircle },
}

/**
 * Pantalla de error del flujo de reserva. Muestra los problemas en formato problem+json
 * (no disponible, precio cambiado, vista previa vencida o fallos parciales en multi-habitación).
 */
export default function ErrorReservaPage() {
  const [parametros] = useSearchParams()
  const tipo = (parametros.get('tipo') as TipoErrorReserva) ?? 'generico'
  const mensaje = parametros.get('mensaje') ?? ''
  const habitacion = parametros.get('habitacion') ?? ''
  const antes = parametros.get('antes')
  const despues = parametros.get('despues')
  const moneda = parametros.get('moneda') ?? 'USD'
  const exitosas = parametros.get('exitosas')?.split(',').filter(Boolean) ?? []

  const { titulo, Icono } = CONTENIDO[tipo] ?? CONTENIDO.generico

  return (
    <div className="mx-auto max-w-[560px] px-[clamp(20px,5vw,56px)] py-16 text-center">
      <title>No pudimos completar tu reserva · Cozy</title>

      <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-surface-muted text-error">
        <Icono aria-hidden="true" className="size-8" />
      </span>

      <h1 className="mt-6 font-heading text-2xl font-medium tracking-tight text-ink sm:text-3xl">{titulo}</h1>

      {tipo === 'no-disponible' && habitacion ? (
        <p className="mt-2 text-muted-foreground">
          <span className="font-medium text-ink">{habitacion}</span> ya no tiene cupos para esas fechas.
        </p>
      ) : (
        mensaje && <p className="mt-2 text-muted-foreground">{mensaje}</p>
      )}

      {tipo === 'parcial-fallo' && exitosas.length > 0 && (
        <div className="mt-6 rounded-[20px] border border-border bg-white p-6 text-left">
          <p className="text-sm font-semibold text-ink">Habitaciones confirmadas con éxito:</p>
          <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
            {exitosas.map((loc) => (
              <li key={loc}>
                Localizador:{' '}
                <Link to={`/cuenta/reservas/${loc}`} className="font-mono font-medium text-primary hover:underline">
                  {loc}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            No se realizó ningún cargo por la habitación no confirmada. Puedes gestionar o cancelar tus reservas confirmadas desde Mis reservas.
          </p>
        </div>
      )}

      {tipo === 'precio-cambiado' && antes && despues && (
        <div className="mt-6 flex items-center justify-center gap-4 rounded-[20px] border border-border bg-white p-6">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Precio anterior</p>
            <p className="text-lg font-medium text-muted-foreground line-through">
              {formatearPrecio(Number(antes), moneda)}
            </p>
          </div>
          <ArrowRightLeft aria-hidden="true" className="size-5 text-primary" />
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Precio actual</p>
            <p className="text-lg font-semibold text-ink">{formatearPrecio(Number(despues), moneda)}</p>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {tipo === 'no-disponible' && (
          <Button asChild size="lg">
            <Link to="/resultados">Ver otras opciones</Link>
          </Button>
        )}
        {(tipo === 'precio-cambiado' || tipo === 'vista-previa-vencida') && (
          <Button asChild size="lg">
            <Link to="/reserva/resumen">Actualizar reserva</Link>
          </Button>
        )}
        {tipo === 'parcial-fallo' && (
          <Button asChild size="lg">
            <Link to="/cuenta/reservas">Ver reservas confirmadas</Link>
          </Button>
        )}
        {tipo === 'generico' && (
          <Button asChild size="lg">
            <Link to="/reserva/pago">
              <RotateCcw aria-hidden="true" />
              Reintentar
            </Link>
          </Button>
        )}
        <Button asChild size="lg" variant="outline">
          <Link to="/">Volver al inicio</Link>
        </Button>
      </div>
    </div>
  )
}
