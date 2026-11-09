import { Link } from 'react-router'
import { BotonFavorito } from '@/components/BotonFavorito'
import { FotoPendiente } from '@/components/FotoPendiente'
import { Badge } from '@/components/ui/badge'
import { formatearPrecio } from '@/lib/formato'
import { nombrePais } from '@/lib/paises'
import type { Alojamiento } from '@/types/alojamientos'

interface TarjetaAlojamientoProps {
  alojamiento: Alojamiento
  /** Ruta a la que lleva toda la tarjeta */
  href: string
  favorito: boolean
  onFavorito: (activo: boolean) => void
}

/**
 * Tarjeta de alojamiento (diseño L206–228): foto 4:3 con país y favorito, nombre,
 * ciudad y precio por noche. Toda la tarjeta es un enlace (el del título se
 * extiende con ::after); el favorito queda por encima. Sube 4 px y la foto se
 * acerca en hover.
 */
export function TarjetaAlojamiento({ alojamiento, href, favorito, onFavorito }: TarjetaAlojamientoProps) {
  const pais = alojamiento.ciudad ? nombrePais(alojamiento.ciudad.pais) : ''
  const fotoLocal = alojamiento.fotos?.find((f) => f.startsWith('/fotos/'))
  const foto = alojamiento.fotos?.[0] ?? fotoLocal
  return (
    <article className="group relative flex flex-col gap-4 transition-transform duration-[320ms] ease-expo hover:-translate-y-1">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] border border-border bg-white">
        <div className="absolute inset-0 transition-transform duration-[700ms] ease-expo group-hover:scale-[1.04]">
          {foto ? (
            <img
              src={foto}
              alt=""
              className="size-full object-cover"
              onError={(e) => {
                if (fotoLocal && e.currentTarget.src !== fotoLocal) {
                  e.currentTarget.src = fotoLocal
                }
              }}
            />
          ) : (
            <FotoPendiente etiqueta={alojamiento.nombre} className="bg-white" />
          )}
        </div>
        {pais && (
          <Badge variant="accent" className="absolute top-3.5 left-3.5 rounded-sm px-2.5 py-1.5">
            {pais}
          </Badge>
        )}
        <BotonFavorito activo={favorito} onCambiar={onFavorito} className="absolute top-2.5 right-2.5" />
      </div>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-lg leading-snug font-medium">
            <Link
              to={href}
              className="outline-none after:absolute after:inset-0 after:rounded-[20px] after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-primary"
            >
              {alojamiento.nombre}
            </Link>
          </h3>
          <span className="text-sm text-muted-foreground">
            {alojamiento.destino}
            {pais && `, ${pais}`}
          </span>
        </div>
        <p className="text-right whitespace-nowrap">
          <span className="text-sm text-muted-foreground">Precio base desde </span>
          <span className="text-lg font-bold">{formatearPrecio(alojamiento.precioPorNoche, alojamiento.moneda)}</span>
          <span className="text-sm text-muted-foreground"> / noche</span>
        </p>
      </div>
    </article>
  )
}
