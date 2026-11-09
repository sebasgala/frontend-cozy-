import type { ComponentProps, ReactNode } from 'react'
import { Link } from 'react-router'

export interface EnlaceNav {
  etiqueta: string
  /** Ruta ("/resultados"), ruta con ancla ("/#destinos") o ancla de la página ("#destinos") */
  href: string
}

type Props = Omit<ComponentProps<'a'>, 'href'> & { href: string; children: ReactNode }

/** Enlace interno: usa el enrutador para rutas y un <a> normal para anclas de la misma página */
export function EnlaceNavegacion({ href, children, ...props }: Props) {
  if (href.startsWith('/')) {
    return (
      <Link to={href} {...props}>
        {children}
      </Link>
    )
  }
  return (
    <a href={href} {...props}>
      {children}
    </a>
  )
}
