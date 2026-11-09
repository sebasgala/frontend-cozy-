import { BotonFavorito } from '@/components/BotonFavorito'
import { FotoPendiente } from '@/components/FotoPendiente'
import { Badge } from '@/components/ui/badge'
import { formatearNoches, formatearPrecio } from '@/lib/formato'
import { nombrePais } from '@/lib/paises'
import type { Oferta } from '@/types/alojamientos'

interface TarjetaOfertaProps {
  oferta: Oferta
  favorito: boolean
  onFavorito: (activo: boolean) => void
  /** Al elegir la oferta se completa el destino del buscador (como en el diseño) */
  onElegir: (oferta: Oferta) => void
}

/** Tarjeta de oferta (diseño L240–253). El descuento es SIMULADO (ver `Oferta.simulada`). */
export function TarjetaOferta({ oferta, favorito, onFavorito, onElegir }: TarjetaOfertaProps) {
  const { alojamiento } = oferta
  const pais = alojamiento.ciudad ? nombrePais(alojamiento.ciudad.pais) : ''
  const fotoLocal = alojamiento.fotos?.find((f) => f.startsWith('/fotos/'))
  const foto = alojamiento.fotos?.[0] ?? fotoLocal
  return (
    <article
      data-simulada={oferta.simulada}
      className="group relative flex w-[300px] flex-none snap-start flex-col overflow-hidden rounded-[20px] border border-border bg-white"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
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
            <FotoPendiente etiqueta={alojamiento.nombre} />
          )}
        </div>
        <Badge className="absolute top-3.5 left-3.5 rounded-sm px-2.5 py-1.5 text-[13px] font-bold">
          -{oferta.descuentoPorcentaje}%
        </Badge>
        <BotonFavorito
          forma="redonda"
          activo={favorito}
          onCambiar={onFavorito}
          className="absolute top-2.5 right-2.5"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <Badge variant="accent" className="rounded-sm px-2 py-1 font-bold">
          Oferta por tiempo limitado
        </Badge>
        <h3 className="mt-1.5 text-[17px] leading-snug font-semibold">
          <button
            type="button"
            onClick={() => onElegir(oferta)}
            className="text-left outline-none after:absolute after:inset-0 after:rounded-[20px] after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-primary"
          >
            {alojamiento.nombre}
          </button>
        </h3>
        <span className="text-sm text-muted-foreground">
          {alojamiento.destino}
          {pais && `, ${pais}`}
        </span>
        <p className="mt-auto flex items-baseline justify-end gap-2 pt-3.5 whitespace-nowrap">
          <span className="text-[13px] text-muted-foreground">{formatearNoches(oferta.noches)}</span>
          <s className="text-sm text-muted-foreground">
            <span className="sr-only">Antes </span>
            {formatearPrecio(oferta.precioAntes, alojamiento.moneda)}
          </s>
          <span className="text-xl font-bold">
            <span className="sr-only">Ahora </span>
            {formatearPrecio(oferta.precioAhora, alojamiento.moneda)}
          </span>
        </p>
      </div>
    </article>
  )
}
