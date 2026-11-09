import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { aIso, nochesEntre } from '@/lib/fechas'
import { formatearNoches } from '@/lib/formato'
import { cn } from '@/lib/utils'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

const desdeIso = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

interface CalendarioRangoProps {
  entrada: string
  salida: string
  /** Qué fecha se elige con el próximo clic */
  eligiendo: 'entrada' | 'salida'
  onCambiar: (rango: { entrada: string; salida: string; eligiendo: 'entrada' | 'salida' }) => void
  /** Meses visibles a la vez: 2 en escritorio, 1 en móvil */
  meses: 1 | 2
  onListo: () => void
}

/**
 * Calendario de rango propio (sin librerías), portado del Inicio de Claude Design.
 * Teclado: flechas mueven un día o una semana, Re Pág / Av Pág cambian de mes,
 * Enter o Espacio eligen. La salida siempre queda después de la entrada.
 */
export function CalendarioRango({ entrada, salida, eligiendo, onCambiar, meses, onListo }: CalendarioRangoProps) {
  const [hoy] = useState(() => aIso(new Date()))
  const [base, setBase] = useState(() => {
    const inicial = desdeIso(entrada || hoy)
    return { y: inicial.getFullYear(), m: inicial.getMonth() }
  })
  const [enfocado, setEnfocado] = useState(eligiendo === 'salida' && salida ? salida : entrada || hoy)
  const [sobre, setSobre] = useState<string | null>(null)
  const contenedor = useRef<HTMLDivElement>(null)
  const debeEnfocar = useRef(false)

  useEffect(() => {
    if (!debeEnfocar.current) return
    debeEnfocar.current = false
    contenedor.current?.querySelector<HTMLButtonElement>(`[data-iso="${enfocado}"]`)?.focus()
  }, [enfocado, base])

  const mesDeHoy = desdeIso(hoy)
  const enMesActual = base.y * 12 + base.m <= mesDeHoy.getFullYear() * 12 + mesDeHoy.getMonth()

  const desplazarMes = (k: number) =>
    setBase((b) => {
      const t = b.y * 12 + b.m + k
      return { y: Math.floor(t / 12), m: t % 12 }
    })

  const elegir = (iso: string) => {
    if (eligiendo === 'entrada' || !entrada || iso <= entrada) {
      const conservaSalida = eligiendo === 'entrada' && salida && salida > iso ? salida : ''
      onCambiar({ entrada: iso, salida: conservaSalida, eligiendo: 'salida' })
    } else {
      onCambiar({ entrada, salida: iso, eligiendo: 'entrada' })
    }
    setEnfocado(iso)
  }

  const mover = (iso: string, dias: number, mesesAdelante = 0) => {
    const fecha = desdeIso(iso)
    if (mesesAdelante) fecha.setMonth(fecha.getMonth() + mesesAdelante)
    else fecha.setDate(fecha.getDate() + dias)
    const nuevo = aIso(fecha)
    if (nuevo < hoy) return
    const indice = fecha.getFullYear() * 12 + fecha.getMonth()
    const indiceBase = base.y * 12 + base.m
    let nuevaBase = indiceBase
    if (indice < indiceBase) nuevaBase = indice
    else if (indice > indiceBase + meses - 1) nuevaBase = indice - (meses - 1)
    debeEnfocar.current = true
    setBase({ y: Math.floor(nuevaBase / 12), m: nuevaBase % 12 })
    setEnfocado(nuevo)
  }

  const alPresionarTecla = (evento: KeyboardEvent<HTMLDivElement>) => {
    const iso = (evento.target as HTMLElement).dataset.iso
    if (!iso) return
    const acciones: Record<string, () => void> = {
      ArrowLeft: () => mover(iso, -1),
      ArrowRight: () => mover(iso, 1),
      ArrowUp: () => mover(iso, -7),
      ArrowDown: () => mover(iso, 7),
      PageUp: () => mover(iso, 0, -1),
      PageDown: () => mover(iso, 0, 1),
    }
    const accion = acciones[evento.key]
    if (accion) {
      evento.preventDefault()
      accion()
    }
  }

  // Fin provisional del rango mientras se elige la salida con el puntero
  const finVista = salida || (eligiendo === 'salida' && entrada && sobre && sobre > entrada ? sobre : '')
  const noches = entrada && salida ? nochesEntre(entrada, salida).length : 0

  const mesesVisibles = Array.from({ length: meses }, (_, i) => {
    const indice = base.y * 12 + base.m + i
    const y = Math.floor(indice / 12)
    const m = indice % 12
    const desfase = (new Date(y, m, 1).getDay() + 6) % 7
    const diasMes = new Date(y, m + 1, 0).getDate()
    const celdas = Array.from({ length: Math.ceil((desfase + diasMes) / 7) * 7 }, (_, k) => {
      const dia = k - desfase + 1
      return dia < 1 || dia > diasMes ? null : { dia, iso: aIso(new Date(y, m, dia)) }
    })
    const semanas = Array.from({ length: celdas.length / 7 }, (_, s) => celdas.slice(s * 7, s * 7 + 7))
    return { clave: `${y}-${m}`, etiqueta: `${MESES[m]} ${y}`, nombreMes: MESES[m].toLowerCase(), y, semanas }
  })

  return (
    <div className="relative px-5 pt-3 pb-4">
      <button
        type="button"
        aria-label="Mes anterior"
        onClick={() => desplazarMes(-1)}
        disabled={enMesActual}
        className="absolute top-3 left-3 z-10 flex size-11 items-center justify-center rounded-md text-ink transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-30"
      >
        <ChevronLeft aria-hidden="true" className="size-[18px]" />
      </button>
      <button
        type="button"
        aria-label="Mes siguiente"
        onClick={() => desplazarMes(1)}
        className="absolute top-3 right-3 z-10 flex size-11 items-center justify-center rounded-md text-ink transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-primary"
      >
        <ChevronRight aria-hidden="true" className="size-[18px]" />
      </button>

      <div
        ref={contenedor}
        onKeyDown={alPresionarTecla}
        onMouseLeave={() => setSobre(null)}
        className={cn('grid gap-8', meses === 2 ? 'grid-cols-2' : 'grid-cols-1')}
      >
        {mesesVisibles.map((mes) => (
          <div key={mes.clave} role="group" aria-label={mes.etiqueta}>
            <p className="flex h-11 items-center justify-center text-[15px] font-medium">{mes.etiqueta}</p>
            <div
              aria-hidden="true"
              className="grid grid-cols-7 pb-2 text-center text-[11px] font-medium tracking-[0.1em] text-muted-foreground"
            >
              {DIAS_SEMANA.map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            {mes.semanas.map((semana, s) => (
              <div key={s} className="grid grid-cols-7 border-t border-border">
                {semana.map((celda, i) => {
                  if (!celda) return <div key={i} className="h-12" />
                  const { iso, dia } = celda
                  const pasado = iso < hoy
                  const esInicio = iso === entrada
                  const esFin = iso === salida
                  const finProvisional = !salida && iso === finVista
                  const enRango = Boolean(entrada && finVista && iso > entrada && iso < finVista)
                  const elegido = esInicio || esFin
                  const banda = enRango
                    ? 'bg-surface-muted'
                    : esInicio && finVista
                      ? 'bg-[linear-gradient(to_right,transparent_50%,var(--surface-muted)_50%)]'
                      : (esFin || finProvisional) && entrada
                        ? 'bg-[linear-gradient(to_right,var(--surface-muted)_50%,transparent_50%)]'
                        : ''
                  return (
                    <div key={iso} className={cn('flex h-12 items-center justify-center', banda)}>
                      <button
                        type="button"
                        data-iso={iso}
                        tabIndex={iso === enfocado ? 0 : -1}
                        disabled={pasado}
                        aria-pressed={elegido}
                        aria-label={`${dia} de ${mes.nombreMes} de ${mes.y}${iso === hoy ? ', hoy' : ''}`}
                        {...(iso === enfocado ? { 'data-autofocus': '' } : {})}
                        onClick={() => elegir(iso)}
                        onMouseEnter={() => setSobre(iso)}
                        onFocus={() => setEnfocado(iso)}
                        className={cn(
                          'relative size-10 rounded-full text-[15px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                          elegido && 'bg-primary font-medium text-on-dark',
                          !elegido && !pasado && 'text-ink hover:bg-surface-muted',
                          !elegido && finProvisional && 'bg-surface-muted',
                          pasado && 'cursor-not-allowed text-muted-foreground/50',
                        )}
                      >
                        {dia}
                        {iso === hoy && (
                          <span
                            aria-hidden="true"
                            className={cn(
                              'absolute bottom-[5px] left-1/2 size-1 -translate-x-1/2 rounded-full',
                              elegido ? 'bg-on-dark' : 'bg-ecru',
                            )}
                          />
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <span aria-live="polite" className="text-sm font-medium">
          {noches ? formatearNoches(noches) : eligiendo === 'salida' && entrada ? 'Elige la salida' : 'Elige tus fechas'}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            className="underline underline-offset-[3px]"
            onClick={() => {
              onCambiar({ entrada: '', salida: '', eligiendo: 'entrada' })
              setSobre(null)
            }}
          >
            Borrar
          </Button>
          <Button type="button" onClick={onListo}>
            Listo
          </Button>
        </div>
      </div>
    </div>
  )
}
