import { useRef, useState, type ComponentProps, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { formatearFecha } from '@/lib/formato'
import { cn } from '@/lib/utils'
import type { Destino } from '@/types/alojamientos'
import { rutaResultados, textoHuespedes, type EstadoBusqueda } from './busqueda'
import { CalendarioRango } from './CalendarioRango'
import { ContadorHuespedes } from './ContadorHuespedes'
import { PanelFlotante } from './PanelFlotante'
import { SelectorDestino } from './SelectorDestino'

type Panel = 'destino' | 'entrada' | 'salida' | 'huespedes'

interface CampoProps extends ComponentProps<'button'> {
  etiqueta: string
  valor: string
  vacio: boolean
  compacto?: boolean
}

/** Campo del buscador: un botón que abre su panel (lo envuelve el disparador de Radix) */
function Campo({ etiqueta, valor, vacio, compacto = false, className, ...props }: CampoProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex flex-col items-start rounded-[14px] border border-border bg-white text-left text-ink transition-colors hover:border-primary focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-[state=open]:border-primary',
        compacto ? 'min-h-[52px] gap-0.5 rounded-[12px] px-3 py-1.5' : 'min-h-16 gap-1 px-3.5 py-2.5',
        className,
      )}
      {...props}
    >
      <span className={cn('font-medium text-ink', compacto ? 'text-[11px]' : 'text-[13px]')}>
        {etiqueta}
      </span>
      <span
        className={cn(
          'truncate',
          compacto ? 'text-[13px] leading-tight' : 'text-[15px] leading-7',
          vacio && 'text-muted-foreground',
        )}
      >
        {valor}
      </span>
    </button>
  )
}

export interface BuscadorProps {
  destinos: Destino[]
  valor: EstadoBusqueda
  onCambiar: (valor: EstadoBusqueda) => void
  variante?: 'hero' | 'compacto'
  onBuscar?: (valor: EstadoBusqueda) => void
  textoBoton?: string
  className?: string
}

/**
 * Buscador de Cozy (portado de Claude Design): destino, entrada, salida y
 * huéspedes en paneles propios. Soporta variante 'hero' (grande) y 'compacto'
 * (para Resultados y Detalle). Al buscar navega o dispara onBuscar.
 */
export function Buscador({
  destinos,
  valor,
  onCambiar,
  variante = 'hero',
  onBuscar,
  textoBoton,
  className,
}: BuscadorProps) {
  const navigate = useNavigate()
  const esEscritorio = useMediaQuery('(min-width: 640px)')
  const [abierto, setAbierto] = useState<Panel | null>(null)
  const [eligiendo, setEligiendo] = useState<'entrada' | 'salida'>('entrada')
  const [error, setError] = useState('')
  const encadenado = useRef<number | undefined>(undefined)
  const esCompacto = variante === 'compacto'

  const destino = destinos.find((d) => d.id === valor.destinoId)

  const abrir = (panel: Panel | null) => {
    if (panel === 'entrada') setEligiendo('entrada')
    if (panel === 'salida') setEligiendo(valor.entrada ? 'salida' : 'entrada')
    setAbierto(panel)
  }

  const controlar = (panel: Panel) => (abrir_: boolean) => abrir(abrir_ ? panel : null)

  const elegirDestino = (d: Destino) => {
    onCambiar({ ...valor, destinoId: d.id })
    setError('')
    setAbierto(null)
    // Como en el diseño: si aún no hay fechas, se abre el calendario a continuación
    if (!valor.entrada) {
      window.clearTimeout(encadenado.current)
      encadenado.current = window.setTimeout(() => abrir('entrada'), 30)
    }
  }

  const buscar = (evento: FormEvent) => {
    evento.preventDefault()
    if (!valor.destinoId || !valor.entrada || !valor.salida) {
      setError('Elige destino y fechas')
      return
    }
    if (valor.salida <= valor.entrada) {
      setError('La salida debe ser posterior a la entrada')
      return
    }
    setError('')
    if (onBuscar) {
      onBuscar(valor)
    } else {
      navigate(rutaResultados(valor))
    }
  }

  const calendario = (
    <CalendarioRango
      entrada={valor.entrada}
      salida={valor.salida}
      eligiendo={eligiendo}
      meses={esEscritorio ? 2 : 1}
      onCambiar={({ entrada, salida, eligiendo: siguiente }) => {
        onCambiar({ ...valor, entrada, salida })
        setEligiendo(siguiente)
        setError('')
      }}
      onListo={() => setAbierto(null)}
    />
  )

  return (
    <form
      noValidate
      aria-label="Buscar alojamiento"
      onSubmit={buscar}
      className={cn(
        esCompacto
          ? 'grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] sm:grid-cols-[minmax(180px,1.4fr)_repeat(2,minmax(130px,1fr))_minmax(130px,1.1fr)_auto] items-stretch gap-2.5 rounded-[20px] border border-border bg-white p-3 shadow-sm'
          : 'grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] items-stretch gap-3 rounded-[24px] bg-white p-5 text-ink shadow-float',
        className,
      )}
    >
      <PanelFlotante
        abierto={abierto === 'destino'}
        onAbiertoCambia={controlar('destino')}
        titulo="Elige un destino"
        tituloVisible
        ancho={400}
        disparador={
          <Campo
            compacto={esCompacto}
            etiqueta="Destino"
            valor={destino?.nombre ?? '¿A dónde vas?'}
            vacio={!destino}
          />
        }
      >
        <SelectorDestino destinos={destinos} seleccionadoId={valor.destinoId} onElegir={elegirDestino} />
      </PanelFlotante>

      <PanelFlotante
        abierto={abierto === 'entrada'}
        onAbiertoCambia={controlar('entrada')}
        titulo="Elige tus fechas"
        ancho={680}
        disparador={
          <Campo
            compacto={esCompacto}
            etiqueta="Entrada"
            valor={valor.entrada ? formatearFecha(valor.entrada) : 'Entrada'}
            vacio={!valor.entrada}
          />
        }
      >
        {calendario}
      </PanelFlotante>

      <PanelFlotante
        abierto={abierto === 'salida'}
        onAbiertoCambia={controlar('salida')}
        titulo="Elige tus fechas"
        ancho={680}
        disparador={
          <Campo
            compacto={esCompacto}
            etiqueta="Salida"
            valor={valor.salida ? formatearFecha(valor.salida) : 'Salida'}
            vacio={!valor.salida}
          />
        }
      >
        {calendario}
      </PanelFlotante>

      <PanelFlotante
        abierto={abierto === 'huespedes'}
        onAbiertoCambia={controlar('huespedes')}
        titulo="Huéspedes"
        tituloVisible
        ancho={300}
        disparador={
          <Campo
            compacto={esCompacto}
            etiqueta="Huéspedes"
            valor={textoHuespedes(valor.huespedes)}
            vacio={false}
          />
        }
      >
        <ContadorHuespedes
          valor={valor.huespedes}
          onCambiar={(huespedes) => onCambiar({ ...valor, huespedes })}
          onListo={() => setAbierto(null)}
        />
      </PanelFlotante>

      <Button
        type="submit"
        className={cn(
          'h-auto font-medium',
          esCompacto
            ? 'min-h-[52px] rounded-[12px] px-6 text-[14px]'
            : 'min-h-16 rounded-[14px] px-5 text-[15px]',
        )}
      >
        {textoBoton ?? (esCompacto ? 'Buscar' : 'Buscar alojamiento')}
      </Button>

      {error && (
        <p role="alert" className="col-span-full mx-1 text-[13px] font-medium text-ink">
          {error}
        </p>
      )}
    </form>
  )
}
