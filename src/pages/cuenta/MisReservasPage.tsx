import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { CalendarX, Compass } from 'lucide-react'
import { ChipsPestanas } from '@/components/ChipsPestanas'
import { TarjetaReserva } from '@/components/TarjetaReserva'
import { Button } from '@/components/ui/button'
import { useSesion } from '@/hooks/useSesion'
import { listarMisReservas } from '@/services/cuenta'
import type { ReservaCompleta } from '@/types/reservas'
import { aIso } from '@/lib/fechas'

type Pestana = 'proximas' | 'pasadas' | 'canceladas'

export default function MisReservasPage() {
  const sesion = useSesion()
  const [reservas, setReservas] = useState<ReservaCompleta[] | null>(null)
  const [pestana, setPestana] = useState<Pestana>('proximas')

  useEffect(() => {
    if (!sesion) {
      setReservas([])
      return
    }
    let vigente = true
    listarMisReservas().then((lista) => {
      if (vigente) setReservas(lista)
    })
    return () => {
      vigente = false
    }
  }, [sesion])

  const hoy = aIso(new Date())

  const { proximas, pasadas, canceladas } = useMemo(() => {
    const lista = reservas ?? []
    return {
      proximas: lista.filter((r) => r.estado !== 'CANCELLED' && r.salida >= hoy),
      pasadas: lista.filter((r) => r.estado !== 'CANCELLED' && r.salida < hoy),
      canceladas: lista.filter((r) => r.estado === 'CANCELLED'),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `hoy` es estable durante la vida de la pantalla
  }, [reservas])

  const visibles = { proximas, pasadas, canceladas }[pestana]

  if (!sesion) {
    return (
      <div className="mx-auto max-w-[560px] px-[clamp(20px,5vw,56px)] py-16 text-center">
        <title>Mis reservas · Cozy</title>
        <h1 className="font-heading text-2xl font-medium tracking-tight text-ink sm:text-3xl">Mis reservas</h1>
        <p className="mt-3 text-muted-foreground">
          Ingresa a tu cuenta para ver tus reservas, o consulta una reserva puntual con su localizador y tu correo.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link to="/ingresar">Ingresar</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/consultar-reserva">Consultar una reserva</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[900px] px-[clamp(20px,5vw,56px)] py-10">
      <title>Mis reservas · Cozy</title>
      <h1 className="font-heading text-3xl font-medium tracking-tight text-ink">Mis reservas</h1>

      <div className="mt-6">
        <ChipsPestanas
          etiqueta="Filtrar mis reservas"
          valor={pestana}
          onCambiar={setPestana}
          idPanel="panel-mis-reservas"
          opciones={[
            { id: 'proximas', etiqueta: `Próximas (${proximas.length})` },
            { id: 'pasadas', etiqueta: `Pasadas (${pasadas.length})` },
            { id: 'canceladas', etiqueta: `Canceladas (${canceladas.length})` },
          ]}
        />
      </div>

      <div id="panel-mis-reservas" role="tabpanel" className="mt-6 flex flex-col gap-4">
        {reservas === null ? (
          <div className="h-32 animate-pulse rounded-[20px] bg-surface-muted" />
        ) : visibles.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-[20px] border border-border bg-white p-12 text-center">
            {pestana === 'canceladas' ? (
              <CalendarX aria-hidden="true" className="size-8 text-muted-foreground" />
            ) : (
              <Compass aria-hidden="true" className="size-8 text-muted-foreground" />
            )}
            <p className="font-medium text-ink">
              {pestana === 'proximas' && 'Todavía no tienes reservas próximas.'}
              {pestana === 'pasadas' && 'Todavía no tienes estadías pasadas.'}
              {pestana === 'canceladas' && 'No tienes reservas canceladas.'}
            </p>
            {pestana !== 'canceladas' && (
              <Button asChild>
                <Link to="/resultados">Explorar alojamientos</Link>
              </Button>
            )}
          </div>
        ) : (
          visibles.map((reserva) => <TarjetaReserva key={reserva.localizador} reserva={reserva} />)
        )}
      </div>
    </div>
  )
}
