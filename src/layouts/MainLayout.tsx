import { Outlet } from 'react-router'
import type { EnlaceNav } from '@/components/EnlaceNavegacion'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteHeader } from '@/components/SiteHeader'

// Desde las demás pantallas, los enlaces llevan a las secciones del Inicio
const ENLACES: EnlaceNav[] = [
  { etiqueta: 'Explorar', href: '/#destacados' },
  { etiqueta: 'Destinos', href: '/#moda' },
]

/** Plantilla de las pantallas sin hero: barra blanca, contenido y pie */
export default function MainLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader variante="solida" enlaces={ENLACES} ingresarHref="/ingresar" />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter enlaces={ENLACES} />
    </div>
  )
}
