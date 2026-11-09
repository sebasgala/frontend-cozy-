import type { KeyboardEvent } from 'react'
import { Check } from 'lucide-react'
import { formatearPrecio } from '@/lib/formato'
import { nombrePais } from '@/lib/paises'
import { cn } from '@/lib/utils'
import type { Destino } from '@/types/alojamientos'

interface SelectorDestinoProps {
  destinos: Destino[]
  seleccionadoId: number | null
  onElegir: (destino: Destino) => void
}

/** Lista de destinos agrupada por país (en el orden de los datos: Ecuador primero) */
export function SelectorDestino({ destinos, seleccionadoId, onElegir }: SelectorDestinoProps) {
  const paises = [...new Set(destinos.map((d) => d.pais))]

  // Flechas arriba y abajo recorren las opciones; Inicio y Fin van a los extremos
  const alPresionarTecla = (evento: KeyboardEvent<HTMLDivElement>) => {
    const opciones = [...evento.currentTarget.querySelectorAll<HTMLButtonElement>('button[data-destino]')]
    const actual = opciones.indexOf(document.activeElement as HTMLButtonElement)
    const indices: Record<string, number> = {
      ArrowDown: Math.min(opciones.length - 1, actual + 1),
      ArrowUp: Math.max(0, actual - 1),
      Home: 0,
      End: opciones.length - 1,
    }
    if (evento.key in indices) {
      evento.preventDefault()
      opciones[indices[evento.key]]?.focus()
    }
  }

  const primero = destinos[0]?.id
  const enfocarId = destinos.some((d) => d.id === seleccionadoId) ? seleccionadoId : primero

  return (
    <div
      onKeyDown={alPresionarTecla}
      className="max-h-[min(380px,55vh)] overflow-auto pb-2 [scrollbar-width:thin]"
    >
      {paises.map((pais) => (
        <div key={pais} role="group" aria-label={nombrePais(pais)}>
          <p className="px-5 pt-3.5 pb-1 text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {nombrePais(pais)}
          </p>
          {destinos
            .filter((d) => d.pais === pais)
            .map((destino) => {
              const elegido = destino.id === seleccionadoId
              const cantidad = destino.cantidadAlojamientos ?? 0
              return (
                <button
                  key={destino.id}
                  type="button"
                  data-destino={destino.id}
                  aria-pressed={elegido}
                  {...(destino.id === enfocarId ? { 'data-autofocus': '' } : {})}
                  onClick={() => onElegir(destino)}
                  className="grid min-h-14 w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-2 text-left text-ink outline-none hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-10 items-center justify-center rounded-full bg-surface-muted text-[15px] font-medium"
                  >
                    {destino.nombre[0]}
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[15px] font-medium">{destino.nombre}</span>
                    <span className="text-[13px] text-muted-foreground">
                      {cantidad === 1 ? '1 alojamiento' : `${cantidad} alojamientos`}
                    </span>
                  </span>
                  <span className="flex items-center gap-2.5 text-sm font-medium">
                    {destino.precioDesde !== undefined && <span>Desde {formatearPrecio(destino.precioDesde)}</span>}
                    <Check aria-hidden="true" className={cn('size-4', elegido ? 'opacity-100' : 'opacity-0')} />
                  </span>
                </button>
              )
            })}
        </div>
      ))}
    </div>
  )
}
