import type { ComponentPropsWithoutRef, CSSProperties, ElementType } from 'react'
import { useReveal } from '@/hooks/useReveal'
import { cn } from '@/lib/utils'

type RevelarProps<T extends ElementType> = {
  as?: T
  /** Retraso en ms, para escalonar varios elementos */
  retraso?: number
  className?: string
  style?: CSSProperties
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className' | 'style'>

/** Envuelve contenido que aparece (sube 16 px y se hace visible) al entrar en pantalla */
export function Revelar<T extends ElementType = 'div'>({
  as,
  retraso = 0,
  className,
  style,
  ...props
}: RevelarProps<T>) {
  const Componente: ElementType = as ?? 'div'
  const { ref, visible } = useReveal<HTMLElement>()

  return (
    <Componente
      ref={ref}
      className={cn(
        'transition-[opacity,translate] duration-[380ms] ease-expo',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
        className,
      )}
      style={{ transitionDelay: retraso ? `${retraso}ms` : undefined, ...style }}
      {...props}
    />
  )
}
