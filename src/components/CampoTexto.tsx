import { useId, type ComponentProps } from 'react'
import { cn } from '@/lib/utils'

interface CampoTextoProps extends Omit<ComponentProps<'input'>, 'id'> {
  etiqueta: string
  error?: string
  ayuda?: string
}

/**
 * Campo de formulario (sistema-visual.md, Inputs/Fields): blanco con borde crema,
 * esquinas de 14px, etiqueta de 13px. Borde Gunmetal en foco. El error se anuncia con
 * `aria-invalid` y `aria-describedby`, en negro neutro (no en rojo, salvo el ícono).
 */
export function CampoTexto({ etiqueta, error, ayuda, className, required, ...props }: CampoTextoProps) {
  const id = useId()
  const errorId = `${id}-error`
  const ayudaId = `${id}-ayuda`

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-ink">
        {etiqueta}
        {required && (
          <span aria-hidden="true" className="text-error">
            {' '}
            *
          </span>
        )}
      </label>
      <input
        id={id}
        required={required}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={cn(error && errorId, ayuda && ayudaId) || undefined}
        className={cn(
          'h-12 rounded-[14px] border bg-white px-3.5 text-[15px] text-ink outline-none transition-colors placeholder:text-muted-foreground',
          error
            ? 'border-error focus:border-error'
            : 'border-border focus:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary',
          className,
        )}
        {...props}
      />
      {ayuda && !error && (
        <span id={ayudaId} className="text-xs text-muted-foreground">
          {ayuda}
        </span>
      )}
      {error && (
        <span id={errorId} role="alert" className="text-xs font-medium text-error">
          {error}
        </span>
      )}
    </div>
  )
}
