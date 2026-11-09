import type { KeyboardEvent } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HUESPEDES_MAX, HUESPEDES_MIN, textoHuespedes } from './busqueda'

interface ContadorHuespedesProps {
  valor: number
  onCambiar: (valor: number) => void
  onListo: () => void
}

/** Contador de huéspedes; también responde a las flechas del teclado */
export function ContadorHuespedes({ valor, onCambiar, onListo }: ContadorHuespedesProps) {
  const cambiar = (delta: number) =>
    onCambiar(Math.min(HUESPEDES_MAX, Math.max(HUESPEDES_MIN, valor + delta)))

  const alPresionarTecla = (evento: KeyboardEvent<HTMLDivElement>) => {
    const delta = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[evento.key]
    if (delta) {
      evento.preventDefault()
      cambiar(delta)
    }
  }

  const botonPaso =
    'flex size-11 items-center justify-center rounded-md border border-primary text-ink transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-40'

  return (
    <div className="flex flex-col gap-4 px-5 pt-1 pb-5">
      <div className="flex items-center justify-between gap-4" onKeyDown={alPresionarTecla}>
        <button
          type="button"
          aria-label="Quitar huésped"
          disabled={valor <= HUESPEDES_MIN}
          onClick={() => cambiar(-1)}
          className={botonPaso}
        >
          <Minus aria-hidden="true" className="size-[18px]" />
        </button>
        <span aria-live="polite" className="text-base font-medium">
          {textoHuespedes(valor)}
        </span>
        <button
          type="button"
          aria-label="Agregar huésped"
          data-autofocus=""
          disabled={valor >= HUESPEDES_MAX}
          onClick={() => cambiar(1)}
          className={botonPaso}
        >
          <Plus aria-hidden="true" className="size-[18px]" />
        </button>
      </div>
      <div className="flex justify-end">
        <Button type="button" onClick={onListo}>
          Listo
        </Button>
      </div>
    </div>
  )
}
