import { useEffect, useState, type ReactNode } from 'react'
import { Carrusel } from '@/components/Carrusel'
import { ChipsPestanas } from '@/components/ChipsPestanas'
import { EncabezadoSeccion } from '@/components/EncabezadoSeccion'
import { Revelar } from '@/components/Revelar'
import { TarjetaAlojamiento } from '@/components/TarjetaAlojamiento'
import { proximoFinDeSemana, tiempoRestante } from '@/lib/fechas'
import { formatearFechaLarga, formatearPrecio } from '@/lib/formato'
import { cn } from '@/lib/utils'
import type { Alojamiento, Destino, EstiloViaje, EstiloViajeInfo, Oferta } from '@/types/alojamientos'
import { TarjetaDestinoCarrusel, TarjetaDestinoMosaico } from './TarjetaDestino'
import { TarjetaOferta } from './TarjetaOferta'

/** Ancho y márgenes laterales comunes a todas las secciones (como el diseño) */
function Contenedor({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto max-w-[1280px] px-[clamp(20px,5vw,56px)]', className)}>{children}</div>
}

const RITMO = 'py-[clamp(64px,9vw,112px)]'

// ── Destinos de moda (diseño L157–173) ─────────────────────────────────────────

const FORMAS_MOSAICO = [
  'col-span-6 h-[280px] min-[760px]:col-span-3 min-[760px]:h-[340px]',
  'col-span-6 h-[210px] min-[760px]:col-span-3 min-[760px]:h-[340px]',
  'col-span-6 h-[210px] min-[760px]:col-span-2 min-[760px]:h-[300px]',
  'col-span-6 h-[210px] min-[760px]:col-span-2 min-[760px]:h-[300px]',
  'col-span-6 h-[210px] min-[760px]:col-span-2 min-[760px]:h-[300px]',
]

export function DestinosDeModa({ destinos, onElegir }: { destinos: Destino[]; onElegir: (d: Destino) => void }) {
  const moda = destinos.filter((d) => d.destacado).slice(0, FORMAS_MOSAICO.length)
  if (!moda.length) return null
  return (
    <section id="moda" aria-labelledby="titulo-moda" className={cn('scroll-mt-16 bg-surface-muted', RITMO)}>
      <Contenedor>
        <EncabezadoSeccion
          id="titulo-moda"
          titulo="Destinos de moda"
          subtitulo="Los lugares más buscados por nuestra comunidad viajera."
          className="mb-[clamp(28px,4vw,44px)]"
        />
        <ul className="grid grid-cols-6 gap-4 min-[760px]:gap-5">
          {moda.map((destino, i) => (
            <Revelar as="li" key={destino.id} className={FORMAS_MOSAICO[i]}>
              <TarjetaDestinoMosaico destino={destino} onElegir={onElegir} />
            </Revelar>
          ))}
        </ul>
      </Contenedor>
    </section>
  )
}

// ── Planificador (diseño L175–199) ─────────────────────────────────────────────

export function Planificador({
  destinos,
  estilos,
  onElegir,
}: {
  destinos: Destino[]
  estilos: EstiloViajeInfo[]
  onElegir: (d: Destino) => void
}) {
  const [estilo, setEstilo] = useState<EstiloViaje>('playa')
  const delEstilo = destinos.filter((d) => d.estilos?.includes(estilo))
  if (!estilos.length) return null
  return (
    <section aria-labelledby="titulo-planificador" className={cn('bg-white', RITMO)}>
      <Contenedor>
        <EncabezadoSeccion
          id="titulo-planificador"
          titulo="Planifica tu viaje de forma rápida y sencilla"
          subtitulo="Elige un estilo y descubre dónde quedarte."
          className="mb-[clamp(24px,3vw,32px)]"
        />
        <div className="mb-7">
          <ChipsPestanas
            etiqueta="Estilo de viaje"
            opciones={estilos}
            valor={estilo}
            onCambiar={setEstilo}
            idPanel="destinos-del-estilo"
          />
        </div>
        <Carrusel
          id="destinos-del-estilo"
          etiqueta="Destinos del estilo elegido"
          flechasTop={120}
          claveContenido={estilo}
        >
          {delEstilo.map((destino) => (
            <TarjetaDestinoCarrusel key={destino.id} destino={destino} onElegir={onElegir} />
          ))}
        </Carrusel>
      </Contenedor>
    </section>
  )
}

// ── Alojamientos destacados (diseño L201–233) ──────────────────────────────────

export function Destacados({
  alojamientos,
  favoritos,
  onFavorito,
}: {
  alojamientos: Alojamiento[]
  favoritos: Set<number>
  onFavorito: (id: number) => void
}) {
  if (!alojamientos.length) return null
  return (
    <div className="bg-surface-muted pb-[clamp(64px,9vw,112px)]">
      <section
        id="destacados"
        aria-labelledby="titulo-destacados"
        className="scroll-mt-16 pt-[clamp(96px,12vw,160px)]"
      >
        <Contenedor>
          <EncabezadoSeccion id="titulo-destacados" titulo="Alojamientos destacados" className="mb-10" />
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-6">
            {alojamientos.map((alojamiento) => (
              <Revelar as="li" key={alojamiento.id}>
                <TarjetaAlojamiento
                  alojamiento={alojamiento}
                  href={`/resultados?destino=${alojamiento.ciudadId}&huespedes=2`}
                  favorito={favoritos.has(alojamiento.id)}
                  onFavorito={() => onFavorito(alojamiento.id)}
                />
              </Revelar>
            ))}
          </ul>
        </Contenedor>
      </section>
    </div>
  )
}

// ── Ofertas por tiempo limitado (diseño L235–259) ──────────────────────────────

export function Ofertas({
  ofertas,
  favoritos,
  onFavorito,
  onElegir,
}: {
  ofertas: Oferta[]
  favoritos: Set<number>
  onFavorito: (id: number) => void
  onElegir: (oferta: Oferta) => void
}) {
  const [finDeSemana] = useState(() => proximoFinDeSemana())
  const [restante, setRestante] = useState(() => tiempoRestante(finDeSemana.finaliza))

  // La cuenta regresiva se actualiza cada minuto
  useEffect(() => {
    const intervalo = window.setInterval(() => setRestante(tiempoRestante(finDeSemana.finaliza)), 60_000)
    return () => window.clearInterval(intervalo)
  }, [finDeSemana])

  if (!ofertas.length) return null
  const fechas = `${formatearFechaLarga(finDeSemana.entrada)} - ${formatearFechaLarga(finDeSemana.salida)}`
  return (
    <section id="ofertas" aria-labelledby="titulo-ofertas" className="scroll-mt-16 bg-white pt-[clamp(96px,12vw,160px)]">
      <Contenedor>
        <EncabezadoSeccion
          id="titulo-ofertas"
          titulo="Ahorra más con las ofertas por tiempo limitado"
          subtitulo={`Disponibles para estas fechas: ${fechas}. Terminan en ${restante.dias} d ${restante.horas} h.`}
          className="mb-2"
        />
        {/* Los descuentos son datos de ejemplo: el backend todavía no tiene ofertas */}
        <p className="mb-[clamp(24px,3vw,36px)] text-sm text-muted-foreground">
          Descuentos de ejemplo mientras no haya ofertas reales.
        </p>
        <Carrusel etiqueta="Ofertas por tiempo limitado" flechasTop={110}>
          {ofertas.map((oferta) => (
            <TarjetaOferta
              key={oferta.alojamiento.id}
              oferta={oferta}
              favorito={favoritos.has(oferta.alojamiento.id)}
              onFavorito={() => onFavorito(oferta.alojamiento.id)}
              onElegir={onElegir}
            />
          ))}
        </Carrusel>
      </Contenedor>
    </section>
  )
}

// ── Cierre (diseño L261–267) ───────────────────────────────────────────────────

export function Cierre({ precioMinimo }: { precioMinimo: { precio: number; moneda: string } | null }) {
  return (
    <section aria-labelledby="titulo-cierre" className="bg-white py-[clamp(96px,12vw,160px)]">
      <Contenedor>
        <Revelar className="flex flex-col items-start gap-7 rounded-xl bg-primary px-[clamp(24px,6vw,96px)] py-[clamp(48px,8vw,112px)] text-on-dark">
          <h2
            id="titulo-cierre"
            className="text-[clamp(40px,6vw,80px)] leading-[1.02] font-normal tracking-[-0.02em] text-balance text-on-dark"
          >
            {precioMinimo
              ? `Desde ${formatearPrecio(precioMinimo.precio, precioMinimo.moneda)} por noche`
              : 'Encuentra dónde quedarte'}
          </h2>
          <a
            href="#destacados"
            className="rounded-md border border-on-dark px-[26px] py-4 font-medium text-on-dark transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-on-dark"
          >
            Ver alojamientos
          </a>
          <p className="text-[15px] text-on-dark">Revisa la política de cancelación de cada habitación antes de pagar.</p>
        </Revelar>
      </Contenedor>
    </section>
  )
}
