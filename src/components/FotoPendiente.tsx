import { ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Marcador de una foto que todavía no existe (no hay fotografía real, PRODUCT.md).
 * Llena el contenedor que lo contiene. Gris claro, sin degradados ni crema. Es un
 * <span> de bloque para poder usarse dentro de botones y enlaces.
 */
export function FotoPendiente({ etiqueta, className }: { etiqueta?: string; className?: string }) {
  return (
    <span
      role="img"
      aria-label={etiqueta ? `${etiqueta}: foto pendiente` : 'Foto pendiente'}
      className={cn(
        'flex size-full items-end gap-2 bg-surface-muted p-4 text-xs text-muted-foreground',
        className,
      )}
    >
      <ImageIcon aria-hidden="true" className="size-4 shrink-0" />
      Foto pendiente
    </span>
  )
}
