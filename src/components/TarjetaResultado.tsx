import { Link } from 'react-router'
import { ChevronRight, Star } from 'lucide-react'
import { BotonFavorito } from '@/components/BotonFavorito'
import { FotoPendiente } from '@/components/FotoPendiente'
import { Button } from '@/components/ui/button'
import { formatearDistancia, formatearPrecio } from '@/lib/formato'
import { cn } from '@/lib/utils'
import type { Alojamiento } from '@/types/alojamientos'

interface TarjetaResultadoProps {
  alojamiento: Alojamiento
  noches: number
  huespedes: number
  vista: 'lista' | 'cuadricula'
  favorito: boolean
  onFavorito: (activo: boolean) => void
  href: string
}

function etiquetaPuntuacion(punt: number): string {
  if (punt >= 9.5) return 'Excepcional'
  if (punt >= 9.0) return 'Excelente'
  if (punt >= 8.5) return 'Fantástico'
  if (punt >= 8.0) return 'Muy bueno'
  return 'Bueno'
}

export function TarjetaResultado({
  alojamiento,
  noches,
  huespedes,
  vista,
  favorito,
  onFavorito,
  href,
}: TarjetaResultadoProps) {
  const foto = alojamiento.fotos?.[0]
  // Sin reseñas en el backend no hay puntuación: la insignia solo aparece si existe el dato
  const punt = alojamiento.puntuacion
  const puntTexto = punt !== undefined ? punt.toFixed(1).replace('.', ',') : ''
  const etiquetaPunt = punt !== undefined ? etiquetaPuntuacion(punt) : ''
  const comentarios = alojamiento.comentariosConteo ?? 0

  // Con fechas, el total real de la estadía (habitación más barata disponible, de /availability).
  // Sin fechas solo hay precio base de catálogo por noche: se rotula como tal para no confundirlo.
  const conPrecioReal = noches > 0 && alojamiento.precioEstancia !== undefined
  const total = conPrecioReal ? (alojamiento.precioEstancia as number) : alojamiento.precioPorNoche
  const tieneDescuento = (alojamiento.descuentoPorcentaje ?? 0) > 0
  const precioAntes = tieneDescuento
    ? Math.round(total * (1 + (alojamiento.descuentoPorcentaje ?? 20) / 100))
    : null

  const esFila = vista === 'lista'

  return (
    <article
      className={cn(
        'group relative flex overflow-hidden rounded-[20px] border border-border bg-white transition-[border-color,box-shadow] duration-200 hover:border-primary animate-au-rise',
        esFila ? 'flex-col md:flex-row' : 'flex-col',
      )}
    >
      {/* Contenedor de la foto */}
      <div
        className={cn(
          'relative overflow-hidden bg-surface-muted',
          esFila
            ? 'w-full md:w-[260px] md:min-h-[220px] md:shrink-0 md:m-3 md:rounded-[14px]'
            : 'aspect-[4/3] w-full',
        )}
      >
        <div className="absolute inset-0 transition-transform duration-700 ease-expo group-hover:scale-[1.04]">
          {foto ? (
            <img
              src={foto}
              alt={alojamiento.nombre}
              className="size-full object-cover"
              loading="lazy"
            />
          ) : (
            <FotoPendiente etiqueta={alojamiento.nombre} className="bg-white" />
          )}
        </div>

        {/* Botón de favorito */}
        <BotonFavorito
          forma="redonda"
          activo={favorito}
          onCambiar={onFavorito}
          className="absolute top-3 right-3 shadow-sm"
        />
      </div>

      {/* Cuerpo y detalles */}
      <div
        className={cn(
          'flex flex-1 flex-col justify-between gap-4 p-5 md:p-6',
          esFila && 'md:flex-row',
        )}
      >
        {/* Información principal */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {alojamiento.tipo && (
              <span className="rounded-md bg-surface-muted px-2.5 py-1 text-xs font-medium text-ink">
                {alojamiento.tipo}
              </span>
            )}
            {alojamiento.estrellas && (
              <div
                className="flex items-center gap-0.5 text-ecru"
                aria-label={`${alojamiento.estrellas} estrellas`}
              >
                {Array.from({ length: alojamiento.estrellas }, (_, i) => (
                  <Star key={i} aria-hidden="true" className="size-3.5 fill-current" />
                ))}
              </div>
            )}
          </div>

          <h2 className="font-heading text-xl font-medium tracking-[-0.01em] text-ink">
            <Link
              to={href}
              className="hover:text-primary transition-colors outline-none focus-visible:underline focus-visible:underline-offset-4"
            >
              {alojamiento.nombre}
            </Link>
          </h2>

          <p className="text-sm text-muted-foreground">
            {alojamiento.zona ? `${alojamiento.zona}, ` : ''}
            {alojamiento.destino}
            {alojamiento.distanciaMetros !== undefined && (
              <> · a {formatearDistancia(alojamiento.distanciaMetros)} del centro</>
            )}
          </p>

          {/* Facilidades destacadas */}
          {alojamiento.facilidades && alojamiento.facilidades.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
              {alojamiento.facilidades.slice(0, 3).map((f) => (
                <li key={f} className="rounded-sm border border-border px-2 py-0.5">
                  {f}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Puntuación, precio y acción */}
        <div
          className={cn(
            'flex flex-col justify-between gap-3 border-t border-border pt-4 md:border-t-0 md:pt-0',
            esFila ? 'md:w-[220px] md:items-end md:text-right' : 'items-start text-left',
          )}
        >
          {/* Insignia de puntuación (solo con datos reales de reseñas) */}
          {punt !== undefined ? (
            <div className="flex items-center gap-2.5">
              <div className="flex flex-col leading-tight">
                <span className="text-[13px] font-semibold text-ink">{etiquetaPunt}</span>
                <span className="text-[12px] text-muted-foreground">{comentarios} comentarios</span>
              </div>
              <span
                className="flex size-10 items-center justify-center rounded-[10px_10px_10px_2px] bg-primary text-base font-bold text-on-dark"
                aria-label={`Puntuación ${puntTexto}`}
              >
                {puntTexto}
              </span>
            </div>
          ) : (
            <span className="text-[12px] text-muted-foreground">Sin reseñas todavía</span>
          )}

          {/* Precios e impuestos */}
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">
              {conPrecioReal
                ? `Desde, ${noches} ${noches === 1 ? 'noche' : 'noches'}, ${huespedes} ${huespedes === 1 ? 'huésped' : 'huéspedes'}`
                : 'Precio base desde, por noche'}
            </span>
            <div className="flex items-baseline gap-2">
              {precioAntes && (
                <span className="text-xs text-muted-foreground line-through">
                  {formatearPrecio(precioAntes, alojamiento.moneda)}
                </span>
              )}
              <span className="font-heading text-2xl font-bold tracking-tight text-ink">
                {total > 0 ? formatearPrecio(total, alojamiento.moneda) : 'Sin precio publicado'}
              </span>
            </div>
            <span className="text-[12px] text-muted-foreground">
              {conPrecioReal ? 'Impuestos y cargos incluidos' : 'Elige fechas para ver el precio real'}
            </span>
          </div>

          {/* Botón de acción */}
          <Button asChild size="default" className="w-full gap-1 md:w-auto">
            <Link to={href}>
              Ver disponibilidad
              <ChevronRight aria-hidden="true" className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  )
}
