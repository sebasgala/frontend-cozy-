import type { KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

interface Opcion<T extends string> {
  id: T
  etiqueta: string
}

interface ChipsPestanasProps<T extends string> {
  etiqueta: string
  opciones: Opcion<T>[]
  valor: T
  onCambiar: (valor: T) => void
  /** id del panel que controlan las pestañas */
  idPanel?: string
}

/**
 * Chips de selección única con el patrón de pestañas: Tab entra al chip elegido,
 * ← → Inicio y Fin cambian de chip. Elegido: borde Gunmetal sobre gris claro.
 */
export function ChipsPestanas<T extends string>({ etiqueta, opciones, valor, onCambiar, idPanel }: ChipsPestanasProps<T>) {
  const alPresionarTecla = (evento: KeyboardEvent<HTMLDivElement>) => {
    const actual = opciones.findIndex((o) => o.id === valor)
    const siguiente: Record<string, number> = {
      ArrowRight: (actual + 1) % opciones.length,
      ArrowLeft: (actual - 1 + opciones.length) % opciones.length,
      Home: 0,
      End: opciones.length - 1,
    }
    if (!(evento.key in siguiente)) return
    evento.preventDefault()
    const opcion = opciones[siguiente[evento.key]]
    onCambiar(opcion.id)
    evento.currentTarget.querySelector<HTMLButtonElement>(`[data-chip="${opcion.id}"]`)?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label={etiqueta}
      onKeyDown={alPresionarTecla}
      className="-mx-0.5 flex gap-2 overflow-x-auto px-0.5 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {opciones.map((opcion) => {
        const elegido = opcion.id === valor
        return (
          <button
            key={opcion.id}
            type="button"
            role="tab"
            data-chip={opcion.id}
            aria-selected={elegido}
            aria-controls={idPanel}
            tabIndex={elegido ? 0 : -1}
            onClick={() => onCambiar(opcion.id)}
            className={cn(
              'min-h-11 flex-none rounded-md border px-[18px] text-[15px] whitespace-nowrap text-ink transition-[background-color,border-color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              elegido ? 'border-primary bg-surface-muted font-medium' : 'border-border hover:bg-surface-muted',
            )}
          >
            {opcion.etiqueta}
          </button>
        )
      })}
    </div>
  )
}
