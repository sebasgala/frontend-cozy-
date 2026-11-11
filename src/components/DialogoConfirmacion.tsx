import type { ReactNode } from 'react'
import { Dialog } from 'radix-ui'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DialogoConfirmacionProps {
  abierto: boolean
  onAbiertoCambia: (abierto: boolean) => void
  titulo: string
  children: ReactNode
  etiquetaConfirmar: string
  etiquetaCancelar?: string
  onConfirmar: () => void
  /** El botón de confirmar queda en rojo (para acciones destructivas como cancelar una reserva) */
  destructivo?: boolean
  confirmando?: boolean
  /** Deja el botón de confirmar deshabilitado (formularios incompletos) */
  confirmarDeshabilitado?: boolean
  /** Diálogo más ancho y con desplazamiento, para formularios */
  amplio?: boolean
}

/** Diálogo centrado, modal, con foco atrapado (patrón ya usado en buscador/PanelFlotante.tsx) */
export function DialogoConfirmacion({
  abierto,
  onAbiertoCambia,
  titulo,
  children,
  etiquetaConfirmar,
  etiquetaCancelar = 'Cancelar',
  onConfirmar,
  destructivo = false,
  confirmando = false,
  confirmarDeshabilitado = false,
  amplio = false,
}: DialogoConfirmacionProps) {
  return (
    <Dialog.Root open={abierto} onOpenChange={onAbiertoCambia}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-[rgba(28,57,63,0.4)] animate-au-fade" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            'fixed top-1/2 left-1/2 z-[91] -translate-x-1/2 -translate-y-1/2 rounded-[20px] bg-white p-6 text-ink shadow-float outline-none animate-au-pop',
            amplio ? 'max-h-[calc(100svh-32px)] w-[min(560px,calc(100vw-32px))] overflow-y-auto' : 'w-[min(440px,calc(100vw-32px))]',
          )}
        >
          <Dialog.Title className="text-lg font-semibold text-ink">{titulo}</Dialog.Title>
          <div className="mt-3 text-sm text-ink">{children}</div>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Dialog.Close asChild>
              <Button type="button" variant="outline">
                {etiquetaCancelar}
              </Button>
            </Dialog.Close>
            <Button
              type="button"
              variant={destructivo ? 'destructive' : 'default'}
              onClick={onConfirmar}
              disabled={confirmando || confirmarDeshabilitado}
            >
              {confirmando ? 'Un momento…' : etiquetaConfirmar}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
