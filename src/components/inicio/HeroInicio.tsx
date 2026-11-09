import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { Buscador } from '@/components/buscador/Buscador'
import type { EstadoBusqueda } from '@/components/buscador/busqueda'
import type { EnlaceNav } from '@/components/EnlaceNavegacion'
import { SiteHeader } from '@/components/SiteHeader'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useScrollProgress } from '@/hooks/useScrollProgress'
import { acotar, desplazarAlFinal, suavizar } from '@/lib/animacion'
import { cn } from '@/lib/utils'
import type { Destino } from '@/types/alojamientos'

const VIDEO = '/media/hero.mp4'
const POSTER = '/media/hero-poster.webp'

interface HeroInicioProps {
  seccionRef: RefObject<HTMLElement | null>
  destinos: Destino[]
  busqueda: EstadoBusqueda
  onCambiarBusqueda: (busqueda: EstadoBusqueda) => void
  enlaces: EnlaceNav[]
  ingresarHref: string
  /**
   * Como la propiedad `buscador` del diseño: `scroll` (el buscador aparece al bajar,
   * por defecto) o `siempre` (visible desde el inicio).
   */
  modoBuscador?: 'scroll' | 'siempre'
  /** Avisa cuando el hero sale de pantalla (para mostrar la barra fija) */
  onPasarHero: (pasado: boolean) => void
}

/**
 * Hero del Inicio (Cozy Landing, L116–155): sección de 200vh con un bloque fijo de
 * 100vh. Al bajar, el video avanza con el scroll, el subtítulo se desvanece, el
 * buscador sube y el video se recorta para que el buscador quede montado entre el
 * hero y la página. Con movimiento reducido: 100vh, primer cuadro estático y el
 * buscador visible desde el inicio.
 */
export function HeroInicio({
  seccionRef,
  destinos,
  busqueda,
  onCambiarBusqueda,
  enlaces,
  ingresarHref,
  modoBuscador = 'scroll',
  onPasarHero,
}: HeroInicioProps) {
  const reducido = usePrefersReducedMotion()
  const esAncho = useMediaQuery('(min-width: 760px)')
  const siempre = modoBuscador === 'siempre'

  const recorte = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const titular = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const tiempo = useRef(0)
  const progreso = useRef(0)
  // Separación inferior y alto del buscador, medidos fuera del bucle de animación
  const medidas = useRef({ separacion: 24, alto: 0 })

  const pintar = useCallback(
    (p: number, continuo = false) => {
      const pn = panel.current
      const hd = titular.current
      const clip = recorte.current
      if (!pn || !hd || !clip) return
      progreso.current = p

      if (!reducido) {
        const v = video.current
        if (v && v.duration) {
          const objetivo = acotar((p - 0.15) / 0.85) * v.duration
          // Suavizado cuadro a cuadro; fuera del bucle (al montar o al salir de pantalla) salta al valor final
          tiempo.current = continuo ? tiempo.current + (objetivo - tiempo.current) * 0.12 : objetivo
          // En el bucle no se encadenan saltos mientras el video aún busca; el salto final se asigna siempre
          if ((!continuo || !v.seeking) && Math.abs(v.currentTime - tiempo.current) > 0.008) v.currentTime = tiempo.current
        }
        const h = 1 - suavizar(acotar((p - 0.3) / 0.25))
        hd.style.opacity = String(h)
        hd.style.transform = `translateY(${(1 - h) * -16}px)`
      }

      const fijo = reducido || siempre
      const q = fijo ? 1 : suavizar(acotar((p - 0.7) / 0.25))
      pn.style.opacity = String(q)
      pn.style.transform = `translate(-50%, ${(1 - q) * 48}px)`
      pn.style.pointerEvents = fijo || p >= 0.95 ? 'auto' : 'none'

      const { separacion, alto } = medidas.current
      const borde = separacion + alto / 2
      clip.style.clipPath = `inset(0 0 ${(borde * q).toFixed(1)}px 0)`
      hd.style.bottom = `${borde * q + (esAncho ? 56 : 32) + (fijo ? alto / 2 : 0)}px`
    },
    [reducido, siempre, esAncho],
  )

  // Medidas del buscador: al montar y cada vez que cambia su tamaño
  useLayoutEffect(() => {
    const pn = panel.current
    const seccion = seccionRef.current
    if (!pn || !seccion) return
    const medir = () => {
      medidas.current = { separacion: parseFloat(getComputedStyle(pn).bottom) || 24, alto: pn.offsetHeight }
      const caja = seccion.getBoundingClientRect()
      pintar(acotar(-caja.top / Math.max(1, caja.height - window.innerHeight)))
    }
    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(pn)
    window.addEventListener('resize', medir)
    return () => {
      observador.disconnect()
      window.removeEventListener('resize', medir)
    }
  }, [pintar, seccionRef])

  // Avance con el scroll: solo con movimiento permitido y mientras el hero se ve
  useScrollProgress(seccionRef, pintar, !reducido)

  // El video nunca se reproduce solo: avanza con el scroll. iOS necesita
  // reproducirlo y pausarlo una vez para permitir saltos de tiempo.
  useEffect(() => {
    const v = video.current
    if (!v || reducido) return
    v.muted = true
    const intento = v.play()
    if (intento) intento.then(() => v.pause()).catch(() => {})
  }, [reducido])

  // Barra fija: aparece cuando el final del hero pasa por debajo de la barra (64 px)
  useEffect(() => {
    const seccion = seccionRef.current
    if (!seccion) return
    const observador = new IntersectionObserver(
      ([entrada]) => onPasarHero(!entrada.isIntersecting && entrada.boundingClientRect.top < 0),
      { rootMargin: '-64px 0px 0px 0px' },
    )
    observador.observe(seccion)
    return () => observador.disconnect()
  }, [seccionRef, onPasarHero])

  // Teclado: si el foco entra al buscador mientras aún está oculto, se baja hasta él
  const revelarSiOculto = () => {
    if (!reducido && !siempre && progreso.current < 0.95) desplazarAlFinal(seccionRef.current)
  }

  return (
    <section
      ref={seccionRef}
      aria-label="Portada"
      className={cn('relative bg-white', reducido ? 'h-svh' : 'h-[200vh]')}
    >
      <div className="sticky top-0 h-svh overflow-hidden">
        <div ref={recorte} className="absolute inset-0 bg-primary [clip-path:inset(0_0_0_0)]">
          <div className="absolute inset-0 animate-au-focus will-change-[filter,transform]">
            {reducido ? (
              <img
                src={POSTER}
                alt=""
                className="absolute inset-0 size-full object-cover object-[42%_50%]"
              />
            ) : (
              <video
                ref={video}
                src={VIDEO}
                poster={POSTER}
                muted
                playsInline
                preload="auto"
                aria-hidden="true"
                className="absolute inset-0 size-full object-cover object-[42%_50%]"
              />
            )}
          </div>
          {/* Velos Gunmetal para que el texto blanco se lea sobre la foto: abajo el del
              diseño (más alto cuando el subtítulo queda fijo arriba del buscador) y arriba
              uno suave para la barra (el cielo claro no daba 4.5:1). */}
          <div
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-0',
              reducido || siempre
                ? 'bg-[linear-gradient(to_top,rgba(28,57,63,0.7)_0%,rgba(28,57,63,0.5)_40%,rgba(28,57,63,0)_72%)]'
                : 'bg-[linear-gradient(to_top,rgba(28,57,63,0.62)_0%,rgba(28,57,63,0)_42%)]',
            )}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(to_bottom,rgba(28,57,63,0.5)_0%,rgba(28,57,63,0)_100%)]"
          />
        </div>

        <SiteHeader variante="hero" conEntrada enlaces={enlaces} ingresarHref={ingresarHref} />

        {/* La palabra "Cozy" está pintada en el video: el título real es para lectores de pantalla */}
        <h1 className="sr-only">Cozy: quédate donde se siente bien</h1>

        <div
          ref={titular}
          className="absolute right-[clamp(20px,5vw,56px)] bottom-[clamp(32px,8vh,72px)] left-[clamp(20px,5vw,56px)] max-w-[620px] text-on-dark"
        >
          <p
            className="mt-4 max-w-[460px] animate-au-drop text-[clamp(15px,1.3vw,18px)] leading-normal text-pretty [animation-duration:1050ms] [animation-timing-function:var(--ease-expo)]"
            style={{ animationDelay: '480ms' }}
          >
            Hoteles, cabañas y casas con disponibilidad real y precio final desde el primer clic.
          </p>
        </div>

        <div
          ref={panel}
          onFocusCapture={revelarSiOculto}
          className="absolute bottom-[clamp(16px,4vh,40px)] left-1/2 w-[min(1120px,calc(100%-32px))]"
        >
          <Buscador destinos={destinos} valor={busqueda} onCambiar={onCambiarBusqueda} />
        </div>
      </div>
    </section>
  )
}
