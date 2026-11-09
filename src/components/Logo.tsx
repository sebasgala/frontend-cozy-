import { cn } from '@/lib/utils'

const RUTA = '/media/logo.png'

/**
 * Símbolo de Cozy (gota con llave). El PNG se usa como máscara: el color sale de
 * `currentColor`, así que da blanco exacto sobre oscuro (`text-on-dark`) o el color
 * de texto sobre claro, sin filtros aproximados. Si llega el logo en SVG, solo
 * cambia esta ruta o este componente.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Cozy"
      className={cn('inline-block aspect-[1434/998] h-9 shrink-0 bg-current', className)}
      style={{
        WebkitMaskImage: `url(${RUTA})`,
        maskImage: `url(${RUTA})`,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
      }}
    />
  )
}
