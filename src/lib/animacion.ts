/** Limita `x` al rango [min, max] */
export const acotar = (x: number, min = 0, max = 1) => Math.min(max, Math.max(min, x))

/** Interpolación suave (smoothstep) de 0 a 1 */
export const suavizar = (x: number) => x * x * (3 - 2 * x)

export function prefiereMovimientoReducido(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Desplaza la página hasta un elemento (o una posición) con animación suave,
 * salvo que el usuario pida movimiento reducido. `desfase` descuenta barras fijas.
 */
export function desplazarA(destino: HTMLElement | number, desfase = 0): void {
  const top =
    typeof destino === 'number' ? destino : destino.getBoundingClientRect().top + window.scrollY - desfase
  window.scrollTo({ top, behavior: prefiereMovimientoReducido() ? 'auto' : 'smooth' })
}

/**
 * Lleva la página al final de una sección alta con contenido fijo (sticky), donde
 * su animación de scroll queda completa. En el Inicio: el buscador del hero visible.
 */
export function desplazarAlFinal(seccion: HTMLElement | null): void {
  if (!seccion) return
  desplazarA(seccion.getBoundingClientRect().top + window.scrollY + seccion.offsetHeight - window.innerHeight)
}
