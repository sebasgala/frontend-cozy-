import { useEffect, useRef, type RefObject } from 'react'
import { acotar } from '@/lib/animacion'

/**
 * Progreso de scroll (0 a 1) de una sección alta con contenido fijo (*sticky*):
 * 0 cuando su borde superior toca el de la ventana y 1 cuando su borde inferior
 * toca el de la ventana.
 *
 * Ejecuta `alCambiar` en cada cuadro SOLO mientras la sección está en pantalla
 * (`continuo` = true). Al montar y al salir de pantalla lo llama con `continuo` =
 * false, para que lo que se suaviza cuadro a cuadro salte directo a su valor final.
 */
export function useScrollProgress(
  seccion: RefObject<HTMLElement | null>,
  alCambiar: (progreso: number, continuo: boolean) => void,
  activo = true,
) {
  const callback = useRef(alCambiar)
  useEffect(() => {
    callback.current = alCambiar
  })

  useEffect(() => {
    const elemento = seccion.current
    if (!elemento || !activo || typeof IntersectionObserver === 'undefined') return

    let cuadro = 0
    let enPantalla = false

    const medir = (continuo: boolean) => {
      const caja = elemento.getBoundingClientRect()
      const total = Math.max(1, caja.height - window.innerHeight)
      callback.current(acotar(-caja.top / total), continuo)
    }
    const bucle = () => {
      medir(true)
      if (enPantalla) cuadro = requestAnimationFrame(bucle)
    }

    const observador = new IntersectionObserver(([entrada]) => {
      enPantalla = entrada.isIntersecting
      cancelAnimationFrame(cuadro)
      if (enPantalla) cuadro = requestAnimationFrame(bucle)
      else medir(false)
    })
    observador.observe(elemento)
    medir(false)

    return () => {
      cancelAnimationFrame(cuadro)
      observador.disconnect()
    }
  }, [seccion, activo])
}
