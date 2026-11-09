import { useEffect, useId, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Filter, Grid, LayoutList, MapPin, RotateCcw, Star } from 'lucide-react'
import { Buscador } from '@/components/buscador/Buscador'
import {
  HUESPEDES_MAX,
  HUESPEDES_MIN,
  type EstadoBusqueda,
} from '@/components/buscador/busqueda'
import { TarjetaResultado } from '@/components/TarjetaResultado'
import { Button } from '@/components/ui/button'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { nochesEntre } from '@/lib/fechas'
import { formatearPrecio } from '@/lib/formato'
import { nombrePais } from '@/lib/paises'
import { cn } from '@/lib/utils'
import { listarDestinos } from '@/services/alojamientos'
import { listarCatalogo } from '@/services/catalogo'
import type {
  Destino,
  FiltrosCatalogo,
  ResultadoCatalogo,
} from '@/types/alojamientos'

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/
const ITEMS_POR_PAGINA = 6

/** Lee y sanitiza la búsqueda desde la URL */
function leerParametrosBusqueda(parametros: URLSearchParams): EstadoBusqueda {
  const destinoRaw = Number(parametros.get('destino'))
  const entrada = parametros.get('entrada') ?? ''
  const salida = parametros.get('salida') ?? ''
  const huespedesRaw = Number(parametros.get('huespedes') ?? 2)

  const destinoId = Number.isInteger(destinoRaw) && destinoRaw > 0 ? destinoRaw : null
  const huespedes =
    Number.isInteger(huespedesRaw) && huespedesRaw >= HUESPEDES_MIN && huespedesRaw <= HUESPEDES_MAX
      ? huespedesRaw
      : 2

  return {
    destinoId,
    entrada: ES_FECHA.test(entrada) ? entrada : '',
    salida: ES_FECHA.test(salida) ? salida : '',
    huespedes,
  }
}

export default function ResultadosPage() {
  const [parametros, setParametros] = useSearchParams()
  const motionReducido = usePrefersReducedMotion()

  const [destinos, setDestinos] = useState<Destino[]>([])
  const busqueda = useMemo(() => leerParametrosBusqueda(parametros), [parametros])
  const [formBusqueda, setFormBusqueda] = useState<EstadoBusqueda>(busqueda)

  // Filtros activos
  const [tiposSeleccionados, setTiposSeleccionados] = useState<string[]>([])
  const [precioMin, setPrecioMin] = useState<number | undefined>(undefined)
  const [precioMax, setPrecioMax] = useState<number | undefined>(undefined)
  const [estrellasSeleccionadas, setEstrellasSeleccionadas] = useState<number[]>([])
  const [comodidadesSeleccionadas, setComodidadesSeleccionadas] = useState<string[]>([])
  const [orden, setOrden] = useState<NonNullable<FiltrosCatalogo['orden']>>('destacados')

  // UI
  const [vista, setVista] = useState<'lista' | 'cuadricula'>('lista')
  const [visibles, setVisibles] = useState(ITEMS_POR_PAGINA)
  const [filtrosMovilAbiertos, setFiltrosMovilAbiertos] = useState(false)
  const [mapaMensajeVisible, setMapaMensajeVisible] = useState(false)
  const [recargarTrigger, setRecargarTrigger] = useState(0)

  // Favoritos guardados localmente
  const [favoritos, setFavoritos] = useState<Record<number, boolean>>(() => {
    try {
      const guardados = localStorage.getItem('cozy:favoritos')
      return guardados ? (JSON.parse(guardados) as Record<number, boolean>) : {}
    } catch {
      return {}
    }
  })

  // Estado del catálogo
  const [resultado, setResultado] = useState<ResultadoCatalogo | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const ordenId = useId()

  // Cargar lista de destinos para el buscador
  useEffect(() => {
    let vigente = true
    listarDestinos().then((lista) => {
      if (vigente) setDestinos(lista)
    })
    return () => {
      vigente = false
    }
  }, [])

  // Cargar catálogo según búsqueda y filtros
  useEffect(() => {
    let vigente = true

    const filtros: FiltrosCatalogo = {
      destinoId: busqueda.destinoId ?? undefined,
      entrada: busqueda.entrada || undefined,
      salida: busqueda.salida || undefined,
      huespedes: busqueda.huespedes,
      tipos: tiposSeleccionados.length > 0 ? tiposSeleccionados : undefined,
      precioMin,
      precioMax,
      estrellas: estrellasSeleccionadas.length > 0 ? estrellasSeleccionadas : undefined,
      comodidades: comodidadesSeleccionadas.length > 0 ? comodidadesSeleccionadas : undefined,
      orden,
    }

    listarCatalogo(filtros)
      .then((res) => {
        if (!vigente) return
        setResultado(res)
        setCargando(false)
      })
      .catch(() => {
        if (!vigente) return
        setError('Ocurrió un error al cargar los resultados de búsqueda.')
        setCargando(false)
      })

    return () => {
      vigente = false
    }
  }, [
    busqueda.destinoId,
    busqueda.entrada,
    busqueda.salida,
    busqueda.huespedes,
    tiposSeleccionados,
    precioMin,
    precioMax,
    estrellasSeleccionadas,
    comodidadesSeleccionadas,
    orden,
    recargarTrigger,
  ])

  // Guardar favoritos
  const toggleFavorito = (id: number) => {
    setFavoritos((prev) => {
      const nuevo = { ...prev, [id]: !prev[id] }
      try {
        localStorage.setItem('cozy:favoritos', JSON.stringify(nuevo))
      } catch {
        // Ignorar si falla localStorage
      }
      return nuevo
    })
  }

  // Destino actual
  const destinoActual = useMemo(
    () => destinos.find((d) => d.id === busqueda.destinoId),
    [destinos, busqueda.destinoId],
  )

  // Cantidad de noches seleccionadas
  const noches = useMemo(() => {
    if (!busqueda.entrada || !busqueda.salida) return 0
    return nochesEntre(busqueda.entrada, busqueda.salida).length
  }, [busqueda.entrada, busqueda.salida])

  // Manejar submit del buscador compacto
  const manejarBuscar = (nuevaBusqueda: EstadoBusqueda) => {
    const nuevosParams = new URLSearchParams()
    if (nuevaBusqueda.destinoId) nuevosParams.set('destino', String(nuevaBusqueda.destinoId))
    if (nuevaBusqueda.entrada) nuevosParams.set('entrada', nuevaBusqueda.entrada)
    if (nuevaBusqueda.salida) nuevosParams.set('salida', nuevaBusqueda.salida)
    nuevosParams.set('huespedes', String(nuevaBusqueda.huespedes))

    setParametros(nuevosParams)
    setVisibles(ITEMS_POR_PAGINA)
    window.scrollTo({ top: 0, behavior: motionReducido ? 'auto' : 'smooth' })
  }

  // Limpiar todos los filtros
  const limpiarFiltros = () => {
    setTiposSeleccionados([])
    setPrecioMin(undefined)
    setPrecioMax(undefined)
    setEstrellasSeleccionadas([])
    setComodidadesSeleccionadas([])
    setVisibles(ITEMS_POR_PAGINA)
  }

  const hayFiltrosActivos =
    tiposSeleccionados.length > 0 ||
    precioMin !== undefined ||
    precioMax !== undefined ||
    estrellasSeleccionadas.length > 0 ||
    comodidadesSeleccionadas.length > 0

  const toggleTipo = (tipo: string) => {
    setTiposSeleccionados((prev) =>
      prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo],
    )
    setVisibles(ITEMS_POR_PAGINA)
  }

  const toggleEstrella = (estrella: number) => {
    setEstrellasSeleccionadas((prev) =>
      prev.includes(estrella) ? prev.filter((e) => e !== estrella) : [...prev, estrella],
    )
    setVisibles(ITEMS_POR_PAGINA)
  }

  const toggleComodidad = (comodidad: string) => {
    setComodidadesSeleccionadas((prev) =>
      prev.includes(comodidad) ? prev.filter((c) => c !== comodidad) : [...prev, comodidad],
    )
    setVisibles(ITEMS_POR_PAGINA)
  }

  const pMinEfectivo = precioMin ?? resultado?.precioMinimoCatalogo ?? 0
  const pMaxEfectivo = precioMax ?? resultado?.precioMaximoCatalogo ?? 250
  const pMaxAbsoluto = resultado?.precioMaximoCatalogo ?? 250

  // Alojamientos visibles por paginación
  const items = resultado?.items ?? []
  const itemsMostrados = items.slice(0, visibles)
  const hayMas = items.length > visibles

  const cargarMas = () => {
    setVisibles((prev) => prev + ITEMS_POR_PAGINA)
  }

  // Título del destino
  const tituloDestino = destinoActual ? destinoActual.nombre : 'Todos los destinos'
  const paisDestino = destinoActual ? nombrePais(destinoActual.pais) : ''

  return (
    <div className="mx-auto max-w-[1280px] px-[clamp(20px,5vw,56px)] py-6 pb-24 text-ink">
      <title>Resultados de la búsqueda · Cozy</title>

      {/* Buscador compacto superior */}
      <section aria-label="Buscador" className="mb-6">
        <Buscador
          variante="compacto"
          destinos={destinos}
          valor={formBusqueda}
          onCambiar={setFormBusqueda}
          onBuscar={manejarBuscar}
          textoBoton="Buscar"
        />
      </section>

      {/* Migas de pan */}
      <nav
        aria-label="Migas de pan"
        className="mb-6 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground whitespace-nowrap"
      >
        <Link
          to="/"
          className="hover:text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded-sm"
        >
          Inicio
        </Link>
        <span aria-hidden="true" className="text-muted-foreground/60">
          ›
        </span>
        {paisDestino && (
          <>
            <span>{paisDestino}</span>
            <span aria-hidden="true" className="text-muted-foreground/60">
              ›
            </span>
          </>
        )}
        <span>{tituloDestino}</span>
        <span aria-hidden="true" className="text-muted-foreground/60">
          ›
        </span>
        <span className="font-semibold text-ink" aria-current="page">
          Resultados de la búsqueda
        </span>
      </nav>

      {/* Layout principal: Filtros (lateral) + Listado de resultados */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Barra lateral de filtros */}
        <aside aria-label="Filtros" className="flex flex-col gap-4">
          {/* Recuadro de mapa */}
          <div className="relative flex h-36 flex-col items-center justify-center overflow-hidden rounded-[20px] border border-border bg-[radial-gradient(#E6D5AE_1px,transparent_1px)] [background-size:16px_16px] bg-surface-muted p-4 text-center">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setMapaMensajeVisible(true)}
              className="gap-2 shadow-sm"
            >
              <MapPin aria-hidden="true" className="size-4" />
              Ver en el mapa
            </Button>
            {mapaMensajeVisible && (
              <span
                role="status"
                className="absolute inset-x-2 bottom-2 rounded-md bg-white/95 px-2 py-1 text-xs text-muted-foreground shadow-sm animate-au-fade"
              >
                El mapa estará disponible pronto.
              </span>
            )}
          </div>

          {/* Toggle en pantallas móviles */}
          <div className="lg:hidden">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFiltrosMovilAbiertos(!filtrosMovilAbiertos)}
              className="w-full justify-between"
              aria-expanded={filtrosMovilAbiertos}
            >
              <span className="flex items-center gap-2">
                <Filter aria-hidden="true" className="size-4" />
                {filtrosMovilAbiertos ? 'Ocultar filtros' : 'Filtrar resultados'}
              </span>
              {hayFiltrosActivos && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-on-dark">
                  Activos
                </span>
              )}
            </Button>
          </div>

          {/* Panel de filtros (visible siempre en escritorio, condicional en móvil) */}
          <div
            className={cn(
              'flex-col overflow-hidden rounded-[20px] border border-border bg-white',
              filtrosMovilAbiertos ? 'flex' : 'hidden lg:flex',
            )}
          >
            {/* Cabecera del panel de filtros */}
            <div className="flex items-center justify-between border-b border-border p-4 font-semibold text-ink">
              <span>Filtrar por</span>
              {hayFiltrosActivos && (
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="text-xs font-medium text-primary underline underline-offset-4 hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-primary rounded-sm"
                >
                  Borrar filtros
                </button>
              )}
            </div>

            {/* Filtro: Tipo de alojamiento */}
            {resultado && resultado.tiposDisponibles.length > 0 && (
              <fieldset className="border-b border-border p-4">
                <legend className="mb-3 text-sm font-semibold text-ink">
                  Tipo de alojamiento
                </legend>
                <div className="flex flex-col gap-2">
                  {resultado.tiposDisponibles.map(({ tipo, cantidad }) => {
                    const checked = tiposSeleccionados.includes(tipo)
                    return (
                      <label
                        key={tipo}
                        className="flex cursor-pointer items-center justify-between gap-3 text-sm text-ink hover:text-primary"
                      >
                        <span className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTipo(tipo)}
                            className="size-4.5 rounded border-border accent-primary focus-visible:ring-2 focus-visible:ring-primary"
                          />
                          <span>{tipo}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">{cantidad}</span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            )}

            {/* Filtro: Presupuesto (por noche) */}
            <div className="border-b border-border p-4">
              <div className="text-sm font-semibold text-ink">Tu presupuesto (por noche)</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {formatearPrecio(pMinEfectivo)} - {formatearPrecio(pMaxEfectivo)}
                {pMaxEfectivo >= pMaxAbsoluto ? '+' : ''}
              </div>

              {/* Histograma de precios */}
              {resultado && (
                <div
                  aria-hidden="true"
                  className="mt-3 flex h-12 items-end gap-1 px-1"
                >
                  {(() => {
                    const maxConteo = Math.max(...resultado.histogramaPrecios, 1)
                    const paso = pMaxAbsoluto / resultado.histogramaPrecios.length
                    return resultado.histogramaPrecios.map((conteo, i) => {
                      const rangoInicio = i * paso
                      const rangoFin = (i + 1) * paso
                      const activo = rangoFin >= pMinEfectivo && rangoInicio <= pMaxEfectivo
                      const alturaPct = Math.max(10, Math.round((conteo / maxConteo) * 100))
                      return (
                        <div
                          key={i}
                          style={{ height: `${alturaPct}%` }}
                          className={cn(
                            'flex-1 rounded-t-sm transition-colors',
                            activo ? 'bg-primary' : 'bg-surface-muted',
                          )}
                        />
                      )
                    })
                  })()}
                </div>
              )}

              {/* Controles deslizantes */}
              <div className="mt-4 flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  <span>Mínimo</span>
                  <input
                    type="range"
                    min="0"
                    max={pMaxAbsoluto}
                    step="5"
                    value={pMinEfectivo}
                    onChange={(e) => {
                      const val = Math.min(Number(e.target.value), pMaxEfectivo)
                      setPrecioMin(val)
                      setVisibles(ITEMS_POR_PAGINA)
                    }}
                    className="h-2 w-full accent-primary"
                    aria-label="Precio mínimo por noche"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  <span>Máximo</span>
                  <input
                    type="range"
                    min="0"
                    max={pMaxAbsoluto}
                    step="5"
                    value={pMaxEfectivo}
                    onChange={(e) => {
                      const val = Math.max(Number(e.target.value), pMinEfectivo)
                      setPrecioMax(val)
                      setVisibles(ITEMS_POR_PAGINA)
                    }}
                    className="h-2 w-full accent-primary"
                    aria-label="Precio máximo por noche"
                  />
                </label>
              </div>
            </div>

            {/* Filtro: Estrellas */}
            {resultado && resultado.estrellasDisponibles.length > 0 && (
              <fieldset className="border-b border-border p-4">
                <legend className="mb-3 text-sm font-semibold text-ink">Estrellas</legend>
                <div className="flex flex-col gap-2">
                  {resultado.estrellasDisponibles.map(({ estrellas, cantidad }) => {
                    const checked = estrellasSeleccionadas.includes(estrellas)
                    return (
                      <label
                        key={estrellas}
                        className="flex cursor-pointer items-center justify-between gap-3 text-sm text-ink hover:text-primary"
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleEstrella(estrellas)}
                            className="size-4.5 rounded border-border accent-primary focus-visible:ring-2 focus-visible:ring-primary"
                          />
                          <span className="flex items-center gap-0.5 text-ecru">
                            {Array.from({ length: estrellas }, (_, i) => (
                              <Star key={i} aria-hidden="true" className="size-3.5 fill-current" />
                            ))}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({estrellas} {estrellas === 1 ? 'estrella' : 'estrellas'})
                          </span>
                        </span>
                        <span className="text-xs text-muted-foreground">{cantidad}</span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            )}

            {/* Filtro: Comodidades */}
            {resultado && resultado.comodidadesDisponibles.length > 0 && (
              <fieldset className="p-4">
                <legend className="mb-3 text-sm font-semibold text-ink">Comodidades</legend>
                <div className="flex flex-col gap-2">
                  {resultado.comodidadesDisponibles.map(({ comodidad, cantidad }) => {
                    const checked = comodidadesSeleccionadas.includes(comodidad)
                    return (
                      <label
                        key={comodidad}
                        className="flex cursor-pointer items-center justify-between gap-3 text-sm text-ink hover:text-primary"
                      >
                        <span className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleComodidad(comodidad)}
                            className="size-4.5 rounded border-border accent-primary focus-visible:ring-2 focus-visible:ring-primary"
                          />
                          <span>{comodidad}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">{cantidad}</span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            )}
          </div>
        </aside>

        {/* Sección de resultados */}
        <section aria-label="Resultados de búsqueda" className="min-w-0">
          {/* Barra superior de resultados: Título, Selector de vista y Selector de orden */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl font-medium tracking-tight text-ink sm:text-3xl">
                {tituloDestino}: {cargando ? 'Buscando…' : `${items.length} ${items.length === 1 ? 'alojamiento encontrado' : 'alojamientos encontrados'}`}
              </h1>
              {noches > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Estancia calculada para {noches} {noches === 1 ? 'noche' : 'noches'} y{' '}
                  {busqueda.huespedes} {busqueda.huespedes === 1 ? 'huésped' : 'huéspedes'}
                </p>
              )}
            </div>

            {/* Controles de Vista (Lista / Cuadrícula) y Orden */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Botones de vista */}
              <div
                role="group"
                aria-label="Selector de vista"
                className="flex items-center rounded-full border border-border bg-white p-1"
              >
                <button
                  type="button"
                  aria-pressed={vista === 'lista'}
                  onClick={() => setVista('lista')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary',
                    vista === 'lista'
                      ? 'bg-surface-muted text-ink font-semibold'
                      : 'text-muted-foreground hover:text-ink',
                  )}
                >
                  <LayoutList aria-hidden="true" className="size-3.5" />
                  Lista
                </button>
                <button
                  type="button"
                  aria-pressed={vista === 'cuadricula'}
                  onClick={() => setVista('cuadricula')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary',
                    vista === 'cuadricula'
                      ? 'bg-surface-muted text-ink font-semibold'
                      : 'text-muted-foreground hover:text-ink',
                  )}
                >
                  <Grid aria-hidden="true" className="size-3.5" />
                  Cuadrícula
                </button>
              </div>

              {/* Selector de orden */}
              <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-1.5 text-xs">
                <label htmlFor={ordenId} className="font-medium text-muted-foreground">
                  Ordenar por:
                </label>
                <select
                  id={ordenId}
                  value={orden}
                  onChange={(e) => {
                    setOrden(e.target.value as NonNullable<FiltrosCatalogo['orden']>)
                    setVisibles(ITEMS_POR_PAGINA)
                  }}
                  className="bg-transparent font-medium text-ink outline-none cursor-pointer"
                >
                  <option value="destacados">Nuestros destacados</option>
                  <option value="precio-asc">Precio: menor a mayor</option>
                  <option value="precio-desc">Precio: mayor a menor</option>
                </select>
              </div>
            </div>
          </div>

          {/* Estado: Cargando */}
          {cargando && (
            <div className="grid gap-4 py-8">
              {Array.from({ length: 3 }, (_, i) => (
                <div
                  key={i}
                  className="h-52 w-full animate-pulse rounded-[20px] border border-border bg-surface-muted/60"
                />
              ))}
            </div>
          )}

          {/* Estado: Error */}
          {!cargando && error && (
            <div
              role="alert"
              className="flex flex-col items-center justify-center gap-4 rounded-[20px] border border-error/30 bg-surface-muted p-12 text-center"
            >
              <p className="font-heading text-lg font-medium text-error">{error}</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCargando(true)
                  setRecargarTrigger((n) => n + 1)
                }}
                className="gap-2"
              >
                <RotateCcw aria-hidden="true" className="size-4" />
                Reintentar
              </Button>
            </div>
          )}

          {/* Estado: Sin resultados */}
          {!cargando && !error && items.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-[20px] border border-border bg-white p-12 text-center">
              <span className="font-heading text-xl font-medium text-ink">
                Ningún alojamiento coincide con tus filtros.
              </span>
              <p className="max-w-md text-sm text-muted-foreground">
                Prueba ampliando tus fechas de estancia, ajustando el presupuesto o borrando los
                filtros aplicados para encontrar más alternativas.
              </p>
              {hayFiltrosActivos && (
                <Button type="button" variant="default" onClick={limpiarFiltros}>
                  Borrar filtros
                </Button>
              )}
            </div>
          )}

          {/* Estado: Lista de alojamientos */}
          {!cargando && !error && items.length > 0 && (
            <>
              <div
                className={cn(
                  'grid gap-4',
                  vista === 'lista'
                    ? 'grid-cols-1'
                    : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3',
                )}
              >
                {itemsMostrados.map((alojamiento) => {
                  const hrefDetalle = `/alojamientos/${alojamiento.id}${
                    busqueda.entrada && busqueda.salida
                      ? `?entrada=${busqueda.entrada}&salida=${busqueda.salida}&huespedes=${busqueda.huespedes}`
                      : `?huespedes=${busqueda.huespedes}`
                  }`
                  return (
                    <TarjetaResultado
                      key={alojamiento.id}
                      alojamiento={alojamiento}
                      noches={noches}
                      huespedes={busqueda.huespedes}
                      vista={vista}
                      favorito={!!favoritos[alojamiento.id]}
                      onFavorito={() => toggleFavorito(alojamiento.id)}
                      href={hrefDetalle}
                    />
                  )
                })}
              </div>

              {/* Botón Cargar más */}
              {hayMas && (
                <div className="mt-8 flex flex-col items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Mostrando {itemsMostrados.length} de {items.length} alojamientos
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cargarMas}
                    className="min-h-12 px-8"
                  >
                    Cargar más resultados
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
