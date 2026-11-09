import { useId, type ComponentProps } from 'react'
import { cn } from '@/lib/utils'

interface CampoSelectProps extends Omit<ComponentProps<'select'>, 'id'> {
  etiqueta: string
  error?: string
  ayuda?: string
}

/** Selector con el mismo aspecto y accesibilidad que CampoTexto */
export function CampoSelect({ etiqueta, error, ayuda, className, required, children, ...props }: CampoSelectProps) {
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
      <select
        id={id}
        required={required}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={cn(error && errorId, ayuda && ayudaId) || undefined}
        className={cn(
          'h-12 rounded-[14px] border bg-white px-3 text-[15px] text-ink outline-none transition-colors',
          error ? 'border-error focus:border-error' : 'border-border focus:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary',
          className,
        )}
        {...props}
      >
        {children}
      </select>
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
