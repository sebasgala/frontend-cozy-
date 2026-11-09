import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BotonFavoritoProps {
  activo: boolean
  onCambiar: (activo: boolean) => void
  forma?: 'cuadrada' | 'redonda'
  className?: string
}

/** Guardar en favoritos (estado local por ahora; la persistencia se decide en el Detalle) */
export function BotonFavorito({ activo, onCambiar, forma = 'cuadrada', className }: BotonFavoritoProps) {
  return (
    <button
      type="button"
      aria-label="Guardar en favoritos"
      aria-pressed={activo}
      onClick={(evento) => {
        evento.stopPropagation()
        evento.preventDefault()
        onCambiar(!activo)
      }}
      className={cn(
        'z-10 flex size-11 items-center justify-center bg-white text-primary transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        forma === 'redonda' ? 'rounded-full' : 'rounded-md',
        className,
      )}
    >
      <Heart aria-hidden="true" className={cn('size-5', activo && 'fill-current')} />
    </button>
  )
}
