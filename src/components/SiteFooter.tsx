import { EnlaceNavegacion, type EnlaceNav } from '@/components/EnlaceNavegacion'

const anio = new Date().getFullYear()

/** Pie claro: fondo blanco, línea crema arriba y texto en negro neutro */
export function SiteFooter({ enlaces }: { enlaces: EnlaceNav[] }) {
  return (
    <footer className="border-t border-border bg-white text-ink">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-5 px-[clamp(20px,5vw,56px)] py-8 text-sm">
        <nav aria-label="Pie de página">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {enlaces.map((enlace) => (
              <li key={enlace.href + enlace.etiqueta}>
                <EnlaceNavegacion
                  href={enlace.href}
                  className="rounded-md underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {enlace.etiqueta}
                </EnlaceNavegacion>
              </li>
            ))}
          </ul>
        </nav>
        <span className="text-muted-foreground">© {anio} Cozy</span>
      </div>
    </footer>
  )
}
