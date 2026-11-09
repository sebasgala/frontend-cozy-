import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

interface OpcionesReveal {
  /** Fracción del elemento que debe verse para revelarlo */
  umbral?: number
  margen?: string
}

/**
 * Aparición al hacer scroll: devuelve `visible` en true cuando el elemento entra
 * en pantalla (una sola vez). Con movimiento reducido, o sin IntersectionObserver,
 * `visible` es true desde el inicio y no hay nada que animar.
 */
export function useReveal<T extends HTMLElement = HTMLElement>({
  umbral = 0.15,
  margen = '0px 0px -40px 0px',
}: OpcionesReveal = {}) {
  const ref = useRef<T>(null)
  const reducido = usePrefersReducedMotion()
  const [revelado, setRevelado] = useState(false)
  const sinObservador = typeof IntersectionObserver === 'undefined'

  useEffect(() => {
    const elemento = ref.current
    if (!elemento || reducido || sinObservador) return

    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setRevelado(true)
          observador.disconnect()
        }
      },
      { threshold: umbral, rootMargin: margen },
    )
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [reducido, sinObservador, umbral, margen])

  return { ref, visible: reducido || sinObservador || revelado }
}
