import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cn } from '@/lib/utils'

interface CarruselProps {
  /** Nombre accesible de la región desplazable */
  etiqueta: string
  id?: string
  /** Posición vertical de las flechas, en px desde arriba (centradas sobre las fotos) */
  flechasTop: number
  /**
   * Cuando cambia, el carrusel vuelve al inicio y sus tarjetas entran escalonadas
   * (como al cambiar de estilo en el planificador del diseño).
   */
  claveContenido?: string
  children: ReactNode
  className?: string
}

/**
 * Carrusel horizontal con encaje (scroll-snap). Las flechas aparecen solo si hay
 * contenido hacia ese lado; con el foco en la región, ← y → desplazan. Los hijos
 * deben llevar `flex-none snap-start`.
 */
export function Carrusel({ etiqueta, id, flechasTop, claveContenido, children, className }: CarruselProps) {
  const pista = useRef<HTMLDivElement>(null)
  const reducido = usePrefersReducedMotion()
  const [puede, setPuede] = useState({ izquierda: false, derecha: false })
  const primeraVez = useRef(true)

  const actualizar = useCallback(() => {
    const el = pista.current
    if (!el) return
    const izquierda = el.scrollLeft > 8
    const derecha = el.scrollLeft + el.clientWidth < el.scrollWidth - 8
    setPuede((p) => (p.izquierda === izquierda && p.derecha === derecha ? p : { izquierda, derecha }))
  }, [])

  useEffect(() => {
    const el = pista.current
    if (!el) return
    actualizar()
    const observador = new ResizeObserver(actualizar)
    observador.observe(el)
    return () => observador.disconnect()
  }, [actualizar, claveContenido])

  // Cambio de contenido: vuelve al inicio y las tarjetas entran escalonadas (300 ms, 60 ms entre cada una)
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false
      return
    }
    const el = pista.current
    if (!el) return
    el.scrollLeft = 0
    if (!reducido && typeof el.animate === 'function') {
      Array.from(el.children).forEach((hijo, i) =>
        hijo.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], {
          duration: 300,
          delay: i * 60,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'backwards',
        }),
      )
    }
    actualizar()
  }, [claveContenido, reducido, actualizar])

  const mover = (direccion: 1 | -1) => {
    const el = pista.current
    el?.scrollBy({ left: direccion * el.clientWidth * 0.8, behavior: reducido ? 'auto' : 'smooth' })
  }

  const alPresionarTecla = (evento: KeyboardEvent<HTMLDivElement>) => {
    if (evento.target !== evento.currentTarget) return
    if (evento.key === 'ArrowRight' || evento.key === 'ArrowLeft') {
      evento.preventDefault()
      mover(evento.key === 'ArrowRight' ? 1 : -1)
    }
  }

  const flecha =
    'absolute z-10 flex size-11 items-center justify-center rounded-full border border-border bg-white text-ink shadow-float transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

  return (
    <div className={cn('relative', className)}>
      <div
        ref={pista}
        id={id}
        role="region"
        aria-label={etiqueta}
        tabIndex={0}
        onScroll={actualizar}
        onKeyDown={alPresionarTecla}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto rounded-md px-0.5 py-1 [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      {puede.izquierda && (
        <button
          type="button"
          aria-label="Ver anteriores"
          onClick={() => mover(-1)}
          className={cn(flecha, '-left-1.5')}
          style={{ top: flechasTop }}
        >
          <ChevronLeft aria-hidden="true" className="size-[18px]" />
        </button>
      )}
      {puede.derecha && (
        <button
          type="button"
          aria-label="Ver siguientes"
          onClick={() => mover(1)}
          className={cn(flecha, '-right-1.5')}
          style={{ top: flechasTop }}
        >
          <ChevronRight aria-hidden="true" className="size-[18px]" />
        </button>
      )}
    </div>
  )
}
