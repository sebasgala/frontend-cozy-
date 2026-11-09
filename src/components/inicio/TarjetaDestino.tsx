import { FotoPendiente } from '@/components/FotoPendiente'
import { formatearPrecio } from '@/lib/formato'
import { obtenerFotoDestino } from '@/lib/fotos'
import { nombrePais } from '@/lib/paises'
import { cn } from '@/lib/utils'
import type { Destino } from '@/types/alojamientos'

interface TarjetaDestinoProps {
  destino: Destino
  onElegir: (destino: Destino) => void
  className?: string
}

const zoom = 'absolute inset-0 transition-transform duration-[600ms] ease-expo group-hover:scale-[1.04]'

function Foto({ destino, fondoBlanco }: { destino: Destino; fondoBlanco?: boolean }) {
  const foto = destino.foto ?? obtenerFotoDestino(destino.nombre)
  return foto ? (
    <img src={foto} alt="" className="size-full object-cover" />
  ) : (
    <FotoPendiente etiqueta={destino.nombre} className={fondoBlanco ? 'bg-white' : undefined} />
  )
}

/**
 * Tarjeta grande del mosaico "Destinos de moda" (diseño L162–169). Con foto real:
 * velo Gunmetal arriba y texto blanco. Sin foto: tarjeta blanca y texto oscuro.
 * Sube 4 px y la foto se acerca en hover.
 */
export function TarjetaDestinoMosaico({ destino, onElegir, className }: TarjetaDestinoProps) {
  const pais = nombrePais(destino.pais)
  const foto = destino.foto ?? obtenerFotoDestino(destino.nombre)
  const conFoto = Boolean(foto)
  return (
    <button
      type="button"
      onClick={() => onElegir(destino)}
      aria-label={`${destino.nombre}, ${pais}. Elegir como destino`}
      className={cn(
        'group relative block size-full overflow-hidden rounded-[20px] text-left transition-transform duration-[320ms] ease-expo hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-primary',
        conFoto ? 'bg-primary' : 'border border-border bg-white',
        className,
      )}
    >
      <span className={cn(zoom, 'block')}>
        <Foto destino={destino} fondoBlanco />
      </span>
      {conFoto && (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 block h-[55%] bg-[linear-gradient(to_bottom,rgba(28,57,63,0.72),rgba(28,57,63,0))]"
        />
      )}
      <span
        className={cn(
          'absolute top-5 right-[22px] left-[22px] flex flex-col gap-0.5',
          conFoto ? 'text-on-dark' : 'text-ink',
        )}
      >
        <span className="font-heading text-[clamp(24px,2.4vw,32px)] leading-[1.1] font-medium tracking-[-0.02em]">
          {destino.nombre}
        </span>
        <span className="text-sm font-medium">{pais}</span>
      </span>
    </button>
  )
}

/** Tarjeta del carrusel del planificador (diseño L186–192): foto 4:5, nombre y precio desde */
export function TarjetaDestinoCarrusel({ destino, onElegir }: TarjetaDestinoProps) {
  const pais = nombrePais(destino.pais)
  return (
    <button
      type="button"
      onClick={() => onElegir(destino)}
      aria-label={`${destino.nombre}, ${pais}. Elegir como destino`}
      className="group flex w-[212px] flex-none snap-start flex-col gap-3 rounded-lg text-left text-ink focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-primary"
    >
      <span className="relative block aspect-[4/5] w-full overflow-hidden rounded-lg">
        <span className={cn(zoom, 'block')}>
          <Foto destino={destino} />
        </span>
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-base font-semibold">{destino.nombre}</span>
        <span className="text-sm text-muted-foreground">
          {destino.precioDesde !== undefined ? `Desde ${formatearPrecio(destino.precioDesde)} / noche` : pais}
        </span>
      </span>
    </button>
  )
}
