import { Button } from '@/components/ui/button'
import { EnlaceNavegacion, type EnlaceNav } from '@/components/EnlaceNavegacion'
import { Logo } from '@/components/Logo'
import { MenuUsuario } from '@/components/MenuUsuario'
import { useSesion } from '@/hooks/useSesion'
import { cn } from '@/lib/utils'

interface SiteHeaderProps {
  /**
   * `hero`: transparente sobre el video; todo el texto y el logo van en blanco.
   * `solida`: blanca con borde crema; texto en negro neutro.
   */
  variante: 'hero' | 'solida'
  enlaces: EnlaceNav[]
  ingresarHref: string
  /** Solo `solida`: queda fija arriba y se muestra u oculta según `visible` */
  fija?: boolean
  visible?: boolean
  /** Solo `hero`: reproduce la animación de entrada al cargar */
  conEntrada?: boolean
  className?: string
}

const ESCALONADO = { logo: 1000, enlaces: [1080, 1130, 1180], idioma: 1280, ingresar: 1320 }

const retraso = (ms: number, activo: boolean) => (activo ? { animationDelay: `${ms}ms` } : undefined)

export function SiteHeader({
  variante,
  enlaces,
  ingresarHref,
  fija = false,
  visible = true,
  conEntrada = false,
  className,
}: SiteHeaderProps) {
  const sobreHero = variante === 'hero'
  const anima = sobreHero && conEntrada
  const sesion = useSesion()

  return (
    <header
      // Fuera de pantalla la barra fija no debe recibir foco ni lectores de pantalla
      inert={fija && !visible}
      className={cn(
        sobreHero && 'absolute inset-x-0 top-0 z-10 text-on-dark',
        !sobreHero && 'border-b border-border bg-white text-ink',
        !sobreHero &&
          fija &&
          'fixed inset-x-0 top-0 z-50 bg-white/95 backdrop-blur-md transition-transform duration-[420ms] ease-expo',
        !sobreHero && fija && (visible ? 'translate-y-0' : '-translate-y-full'),
        className,
      )}
    >
      {/* Sobre el hero la barra ocupa todo el ancho (diseño L124); la sólida se limita a 1280 px (L102) */}
      <div className={cn('px-[clamp(20px,5vw,56px)]', !sobreHero && 'mx-auto max-w-[1280px]')}>
        <div className="flex h-16 items-center justify-between gap-6">
          <EnlaceNavegacion
            href="/"
            aria-label="Cozy, ir al inicio"
            className={cn(
              '-mx-1 rounded-md px-1 outline-none focus-visible:ring-2',
              sobreHero ? 'focus-visible:ring-on-dark' : 'focus-visible:ring-ring',
              anima && 'animate-au-drop',
            )}
            style={retraso(ESCALONADO.logo, anima)}
          >
            <Logo className={sobreHero ? 'text-on-dark' : 'text-ink'} />
          </EnlaceNavegacion>

          <nav aria-label="Principal" className="hidden min-[760px]:block">
            <ul className="flex gap-[clamp(32px,5vw,64px)] text-sm font-bold">
              {enlaces.map((enlace, i) => (
                <li key={enlace.href + enlace.etiqueta}>
                  <EnlaceNavegacion
                    href={enlace.href}
                    className={cn(
                      'inline-block rounded-md py-2 outline-none underline-offset-8 hover:underline focus-visible:ring-2',
                      sobreHero ? 'text-on-dark focus-visible:ring-on-dark' : 'text-ink focus-visible:ring-ring',
                      anima && 'animate-au-drop',
                    )}
                    style={retraso(ESCALONADO.enlaces[i] ?? ESCALONADO.enlaces[2], anima)}
                  >
                    {enlace.etiqueta}
                  </EnlaceNavegacion>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-4">
            {/* Selector de idioma: de momento solo informativo (la interfaz es solo en español) */}
            <span
              className={cn(
                'text-[13px] font-bold',
                sobreHero ? 'text-on-dark' : 'text-muted-foreground',
                anima && 'animate-au-drop [animation-duration:600ms]',
              )}
              style={retraso(ESCALONADO.idioma, anima)}
            >
              ES
            </span>
            {sesion ? (
              <div
                className={cn(anima && 'animate-au-wipe')}
                style={retraso(ESCALONADO.ingresar, anima)}
              >
                <MenuUsuario sesion={sesion} sobreOscuro={sobreHero} />
              </div>
            ) : (
              <Button
                asChild
                variant={sobreHero ? 'light' : 'default'}
                className={cn(anima && 'animate-au-wipe')}
                style={retraso(ESCALONADO.ingresar, anima)}
              >
                <EnlaceNavegacion href={ingresarHref}>Ingresar</EnlaceNavegacion>
              </Button>
            )}
          </div>
        </div>

        {sobreHero && (
          <div
            aria-hidden="true"
            className={cn(
              'h-px origin-left bg-[color-mix(in_srgb,var(--dutch-white)_55%,transparent)]',
              anima && 'animate-au-draw',
            )}
            style={retraso(540, anima)}
          />
        )}
      </div>
    </header>
  )
}
