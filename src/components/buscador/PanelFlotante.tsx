import { useRef, type ReactElement, type ReactNode } from 'react'
import { Dialog, Popover } from 'radix-ui'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'

interface PanelFlotanteProps {
  abierto: boolean
  onAbiertoCambia: (abierto: boolean) => void
  /** Botón que abre el panel (el campo del buscador) */
  disparador: ReactElement
  titulo: string
  /** Muestra el título arriba del panel; si no, queda solo para lectores de pantalla */
  tituloVisible?: boolean
  /** Ancho del popover en escritorio, en px */
  ancho: number
  children: ReactNode
}

/**
 * Panel del buscador: popover anclado al campo en escritorio (640 px o más) y hoja
 * inferior en móvil. Ambos atrapan el foco, se cierran con Escape o al tocar fuera
 * y devuelven el foco al campo. Al abrir, enfoca el elemento marcado con
 * `data-autofocus` (el día elegido, el destino elegido…) o el primer botón.
 */
export function PanelFlotante({
  abierto,
  onAbiertoCambia,
  disparador,
  titulo,
  tituloVisible = false,
  ancho,
  children,
}: PanelFlotanteProps) {
  const esEscritorio = useMediaQuery('(min-width: 640px)')
  const contenido = useRef<HTMLDivElement>(null)

  const enfocarInicial = (evento: Event) => {
    evento.preventDefault()
    const panel = contenido.current
    const objetivo =
      panel?.querySelector<HTMLElement>('[data-autofocus]') ??
      panel?.querySelector<HTMLElement>('button:not([disabled])')
    objetivo?.focus()
  }

  const encabezado = (
    <p className={cn('px-5 pt-5 pb-2 text-[17px] font-medium', !tituloVisible && 'sr-only')}>{titulo}</p>
  )

  if (esEscritorio) {
    return (
      <Popover.Root open={abierto} onOpenChange={onAbiertoCambia} modal>
        <Popover.Trigger asChild>{disparador}</Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            ref={contenido}
            align="start"
            sideOffset={8}
            collisionPadding={16}
            aria-label={titulo}
            onOpenAutoFocus={enfocarInicial}
            className="z-[91] max-h-[var(--radix-popover-content-available-height)] overflow-auto rounded-[20px] border border-border bg-popover text-ink shadow-float outline-none animate-au-pop"
            style={{ width: `min(${ancho}px, calc(100vw - 32px))` }}
          >
            {tituloVisible && encabezado}
            {children}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    )
  }

  return (
    <Dialog.Root open={abierto} onOpenChange={onAbiertoCambia}>
      <Dialog.Trigger asChild>{disparador}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-[rgba(28,57,63,0.4)] animate-au-fade" />
        <Dialog.Content
          ref={contenido}
          aria-describedby={undefined}
          onOpenAutoFocus={enfocarInicial}
          className="fixed inset-x-0 bottom-0 z-[91] max-h-[88svh] overflow-auto rounded-t-[24px] bg-popover pb-[env(safe-area-inset-bottom)] text-ink outline-none animate-au-sheet"
        >
          <Dialog.Title asChild>{encabezado}</Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
