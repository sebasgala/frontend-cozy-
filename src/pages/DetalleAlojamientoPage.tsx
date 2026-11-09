import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import {
  Bath,
  Bed,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Copy,
  DoorClosed,
  Flame,
  Key,
  Leaf,
  Maximize2,
  ShieldCheck,
  Sparkles,
  Star,
  Tv,
  Users,
  Utensils,
  Wifi,
  X,
} from 'lucide-react'
import { BotonFavorito } from '@/components/BotonFavorito'
import { ChipsPestanas } from '@/components/ChipsPestanas'
import { FotoPendiente } from '@/components/FotoPendiente'
import { Button } from '@/components/ui/button'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { fechasValidas, hoyIso, nochesEntre } from '@/lib/fechas'
import {
  formatearDistancia,
  formatearFechaLarga,
  formatearPrecio,
} from '@/lib/formato'
import { nombrePais } from '@/lib/paises'
import { cn } from '@/lib/utils'
import NotFoundPage from '@/pages/NotFoundPage'
import { consultarDisponibilidad, obtenerDetalleAlojamiento } from '@/services/alojamientos'
import type {
  DetalleAlojamientoCompleto,
  ProductoDisponible,
  TipoViajeResena,
} from '@/types/alojamientos'

const SECCIONES = [
  { id: 'resumen', etiqueta: 'Resumen' },
  { id: 'comodidades', etiqueta: 'Comodidades' },
  { id: 'habitaciones', etiqueta: 'Habitaciones y tarifas' },
  { id: 'resenas', etiqueta: 'Reseñas' },
] as const

type SeccionId = (typeof SECCIONES)[number]['id']

/** Identificador de habitación dentro de product_id (`<uuid>:<checkin>:<checkout>`) */
function idHabitacion(producto: ProductoDisponible): string {
  return producto.product_id.split(':')[0]
}

/** Clave de selección de un producto; el sufijo conserva el formato que lee la pantalla de resumen */
function claveProducto(producto: ProductoDisponible): string {
  return `${idHabitacion(producto)}${producto.cancellation_type === 'free_cancellation' ? '_flex' : '_est'}`
}

function etiquetaTarifa(cancelacion: string | null): { titulo: string; detalle: string | null } {
  if (cancelacion === 'free_cancellation') return { titulo: 'Tarifa flexible', detalle: 'Cancelación gratuita' }
  if (cancelacion === 'non_refundable') return { titulo: 'Tarifa no reembolsable', detalle: 'No admite reembolso' }
  return { titulo: 'Tarifa estándar', detalle: null }
}

const PLANES_COMIDA: Record<string, string> = {
  breakfast_included: 'Desayuno incluido',
  room_only: 'Solo alojamiento',
  half_board: 'Media pensión',
  full_board: 'Pensión completa',
  all_inclusive: 'Todo incluido',
}

/** Resultado de la última consulta de /availability, identificado por la consulta que lo originó */
type ResultadoDisponibilidad = { clave: string } & (
  | { productos: ProductoDisponible[]; error?: undefined }
  | { error: string; productos?: undefined }
)

function etiquetaPuntuacion(punt: number): string {
  if (punt >= 9.5) return 'Excepcional'
  if (punt >= 9.0) return 'Excelente'
  if (punt >= 8.5) return 'Fantástico'
  if (punt >= 8.0) return 'Muy bueno'
  return 'Bueno'
}

export default function DetalleAlojamientoPage() {
  const { id } = useParams<{ id: string }>()
  const [parametros, setParametros] = useSearchParams()
  const navigate = useNavigate()
  const motionReducido = usePrefersReducedMotion()

  const alojamientoId = Number(id)
  const idValido = Number.isInteger(alojamientoId) && alojamientoId > 0

  const [alojamiento, setAlojamiento] = useState<DetalleAlojamientoCompleto | null>(null)
  const [cargando, setCargando] = useState(idValido)
  const [noEncontrado, setNoEncontrado] = useState(!idValido)

  // Búsqueda de fechas/ocupación. Las fechas de la URL se descartan si son pasadas o no tienen sentido.
  const hoy = hoyIso()
  const fechasUrl = fechasValidas(parametros.get('entrada'), parametros.get('salida'))
  const [entrada, setEntrada] = useState(fechasUrl.entrada)
  const [salida, setSalida] = useState(fechasUrl.salida)
  const [huespedes, setHuespedes] = useState(Number(parametros.get('huespedes') ?? 2))

  // Pestañas y scroll
  const [seccionActiva, setSeccionActiva] = useState<SeccionId>('resumen')
  const [mostrarPestanasFijas, setMostrarPestanasFijas] = useState(false)
  const galeriaRef = useRef<HTMLDivElement>(null)

  // Lightbox / Visor de fotos
  const [visorAbierto, setVisorAbierto] = useState(false)
  const [indiceFotoVisor, setIndiceFotoVisor] = useState(0)
  const disparadorVisorRef = useRef<HTMLElement | null>(null)

  // Descripción y servicios expandibles
  const [descExpandida, setDescExpandida] = useState(false)
  const [serviciosExpandidos, setServiciosExpandidos] = useState(false)

  // Reseñas: filtros y orden
  const [filtroTipoViaje, setFiltroTipoViaje] = useState<'todas' | TipoViajeResena>('todas')
  const [ordenResenas, setOrdenResenas] = useState<'recientes' | 'mejor' | 'peor'>('recientes')
  const [resenasVisibles, setResenasVisibles] = useState(5)
  const [resenasExpandidas, setResenasExpandidas] = useState<Record<string, boolean>>({})
  const [votosUtiles, setVotosUtiles] = useState<Record<string, boolean>>({})

  // Selección de habitaciones
  const [cantidadesHabitaciones, setCantidadesHabitaciones] = useState<Record<string, number>>({})
  const [avisoReserva, setAvisoReserva] = useState('')

  // Toast
  const [toastMensaje, setToastMensaje] = useState('')

  // Favorito
  const [esFavorito, setEsFavorito] = useState(false)

  const ordenResenasId = useId()

  const mostrarToast = (mensaje: string) => {
    setToastMensaje(mensaje)
    setTimeout(() => {
      setToastMensaje('')
    }, 2400)
  }

  // Cargar datos del alojamiento
  useEffect(() => {
    if (!idValido) return

    let vigente = true
    obtenerDetalleAlojamiento(alojamientoId)
      .then((data) => {
        if (!vigente) return
        if (!data) {
          setNoEncontrado(true)
        } else {
          setAlojamiento(data)
          // Inicializar favorito desde localStorage
          try {
            const guardados = localStorage.getItem('cozy:favoritos')
            if (guardados) {
              const mapa = JSON.parse(guardados) as Record<number, boolean>
              setEsFavorito(!!mapa[data.id])
            }
          } catch {
            // Ignorar errores de storage
          }
        }
        setCargando(false)
      })
      .catch(() => {
        if (!vigente) return
        setNoEncontrado(true)
        setCargando(false)
      })

    return () => {
      vigente = false
    }
  }, [alojamientoId, idValido])

  // Detección de sección activa y visibilidad de pestañas fijas con scroll
  useEffect(() => {
    const alHacerScroll = () => {
      if (!galeriaRef.current) return
      const rectGaleria = galeriaRef.current.getBoundingClientRect()
      // Aparece cuando la galería sale de pantalla por arriba
      setMostrarPestanasFijas(rectGaleria.bottom < 64)

      // Determinar qué sección está activa
      const desplazamiento = 120
      for (const { id: secId } of SECCIONES) {
        const el = document.getElementById(secId)
        if (el) {
          const rect = el.getBoundingClientRect()
          if (rect.top <= desplazamiento && rect.bottom > desplazamiento) {
            setSeccionActiva(secId)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', alHacerScroll, { passive: true })
    return () => window.removeEventListener('scroll', alHacerScroll)
  }, [])

  // Desplazamiento a sección
  const desplazarseA = (secId: SeccionId) => {
    const el = document.getElementById(secId)
    if (!el) return
    const offset = 72
    const targetY = el.getBoundingClientRect().top + window.scrollY - offset
    window.scrollTo({
      top: targetY,
      behavior: motionReducido ? 'auto' : 'smooth',
    })
    setSeccionActiva(secId)
  }

  // Fotos para galería y visor
  const fotos = useMemo(() => alojamiento?.fotos ?? [], [alojamiento])

  const abrirVisor = (indice: number, disparador?: HTMLElement) => {
    disparadorVisorRef.current = disparador ?? null
    setIndiceFotoVisor(indice)
    setVisorAbierto(true)
    document.body.style.overflow = 'hidden'
  }

  const cerrarVisor = () => {
    setVisorAbierto(false)
    document.body.style.overflow = ''
    if (disparadorVisorRef.current) {
      disparadorVisorRef.current.focus()
    }
  }

  const fotoAnterior = () => {
    if (!fotos.length) return
    setIndiceFotoVisor((prev) => (prev - 1 + fotos.length) % fotos.length)
  }

  const fotoSiguiente = () => {
    if (!fotos.length) return
    setIndiceFotoVisor((prev) => (prev + 1) % fotos.length)
  }

  // Teclado en visor
  useEffect(() => {
    if (!visorAbierto) return
    const manejarTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cerrarVisor()
      } else if (e.key === 'ArrowLeft') {
        setIndiceFotoVisor((prev) => (prev - 1 + fotos.length) % fotos.length)
      } else if (e.key === 'ArrowRight') {
        setIndiceFotoVisor((prev) => (prev + 1) % fotos.length)
      }
    }
    window.addEventListener('keydown', manejarTecla)
    return () => window.removeEventListener('keydown', manejarTecla)
  }, [visorAbierto, fotos.length])

  // Toggle de favorito
  const toggleFav = () => {
    if (!alojamiento) return
    const nuevo = !esFavorito
    setEsFavorito(nuevo)
    try {
      const guardados = localStorage.getItem('cozy:favoritos')
      const mapa = guardados ? (JSON.parse(guardados) as Record<number, boolean>) : {}
      mapa[alojamiento.id] = nuevo
      localStorage.setItem('cozy:favoritos', JSON.stringify(mapa))
    } catch {
      // Ignorar
    }
  }

  // Compartir enlace
  const compartirEnlace = () => {
    try {
      navigator.clipboard.writeText(window.location.href)
      mostrarToast('Enlace copiado al portapapeles')
    } catch {
      mostrarToast('Enlace listo para copiar')
    }
  }

  // Modificar fechas del buscador
  const actualizarFechas = (e: React.FormEvent) => {
    e.preventDefault()
    if (entrada && entrada < hoy) {
      mostrarToast('La fecha de entrada no puede ser anterior a hoy')
      return
    }
    if (entrada && salida && salida <= entrada) {
      mostrarToast('La salida debe ser posterior a la entrada')
      return
    }
    const p = new URLSearchParams(parametros)
    if (entrada) p.set('entrada', entrada)
    if (salida) p.set('salida', salida)
    p.set('huespedes', String(huespedes))
    setParametros(p)
    setCantidadesHabitaciones({})
    mostrarToast('Búsqueda actualizada')
  }

  // Productos reales de /availability para las fechas y huéspedes aplicados en la URL
  const { entrada: entradaAplicada, salida: salidaAplicada } = fechasUrl
  const huespedesAplicados = Number(parametros.get('huespedes') ?? 2) || 2
  const [resultadoDisp, setResultadoDisp] = useState<ResultadoDisponibilidad | null>(null)
  const [reintentos, setReintentos] = useState(0)

  const fechasAplicadasValidas =
    idValido && !!entradaAplicada && !!salidaAplicada && nochesEntre(entradaAplicada, salidaAplicada).length > 0
  const claveConsulta = `${alojamientoId}|${entradaAplicada}|${salidaAplicada}|${huespedesAplicados}|${reintentos}`

  useEffect(() => {
    if (!fechasAplicadasValidas) return
    let vigente = true
    consultarDisponibilidad(alojamientoId, entradaAplicada, salidaAplicada, {
      number_of_adults: huespedesAplicados,
      number_of_rooms: 1,
    })
      .then((disp) => {
        if (vigente) setResultadoDisp({ clave: claveConsulta, productos: disp.products })
      })
      .catch(() => {
        if (vigente) setResultadoDisp({ clave: claveConsulta, error: 'No pudimos consultar la disponibilidad.' })
      })
    return () => {
      vigente = false
    }
  }, [alojamientoId, entradaAplicada, salidaAplicada, huespedesAplicados, fechasAplicadasValidas, claveConsulta])

  // Estado derivado: sin fechas válidas, consultando (el resultado guardado es de otra consulta), error u ok
  const estadoDisp: 'sin-fechas' | 'cargando' | 'error' | 'ok' = !fechasAplicadasValidas
    ? 'sin-fechas'
    : resultadoDisp?.clave !== claveConsulta
      ? 'cargando'
      : resultadoDisp.error !== undefined
        ? 'error'
        : 'ok'
  const productos = useMemo(
    () => (estadoDisp === 'ok' ? (resultadoDisp?.productos ?? []) : []),
    [estadoDisp, resultadoDisp],
  )

  // Cálculo de noches
  const noches = useMemo(() => {
    if (!entrada || !salida) return 0
    return nochesEntre(entrada, salida).length
  }, [entrada, salida])

  // Cálculo del total de habitaciones seleccionadas
  const { totalHabitaciones, totalPrecio } = useMemo(() => {
    let cantTotal = 0
    let precioTotal = 0

    productos.forEach((producto) => {
      const cantidad = cantidadesHabitaciones[claveProducto(producto)] ?? 0
      if (cantidad > 0) {
        cantTotal += cantidad
        precioTotal += producto.price.total * cantidad
      }
    })

    return {
      totalHabitaciones: cantTotal,
      totalPrecio: precioTotal,
    }
  }, [cantidadesHabitaciones, productos])

  // Iniciar reserva
  const irAReserva = () => {
    if (totalHabitaciones === 0) {
      setAvisoReserva('Elige al menos una habitación para continuar.')
      desplazarseA('habitaciones')
      return
    }

    // Solo líneas de los productos que se muestran ahora (la selección vieja de otra consulta no cuenta)
    const clavesVigentes = new Set(productos.map(claveProducto))
    const selCadena = Object.entries(cantidadesHabitaciones)
      .filter(([clave, cant]) => cant > 0 && clavesVigentes.has(clave))
      .map(([k, cant]) => `${k}:${cant}`)
      .join(',')

    const paramsReserva = new URLSearchParams({
      alojamientoId: String(alojamientoId),
      entrada,
      salida,
      huespedes: String(huespedes),
      habitaciones: selCadena,
    })

    navigate(`/reserva/resumen?${paramsReserva.toString()}`)
  }

  // Reseñas filtradas y ordenadas
  const resenasFiltradas = useMemo(() => {
    if (!alojamiento) return []
    let lista = alojamiento.resenas.filter(
      (r) => filtroTipoViaje === 'todas' || r.tipoViaje === filtroTipoViaje,
    )

    if (ordenResenas === 'mejor') {
      lista = [...lista].sort((a, b) => b.puntuacion - a.puntuacion)
    } else if (ordenResenas === 'peor') {
      lista = [...lista].sort((a, b) => a.puntuacion - b.puntuacion)
    } else {
      lista = [...lista].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    }

    return lista
  }, [alojamiento, filtroTipoViaje, ordenResenas])

  const resenasParaMostrar = resenasFiltradas.slice(0, resenasVisibles)
  const hayMasResenas = resenasFiltradas.length > resenasVisibles

  const toggleResenaExpandida = (resId: string) => {
    setResenasExpandidas((prev) => ({ ...prev, [resId]: !prev[resId] }))
  }

  const votarUtil = (resId: string) => {
    setVotosUtiles((prev) => ({ ...prev, [resId]: !prev[resId] }))
  }

  if (cargando) {
    return (
      <div className="mx-auto max-w-[1280px] px-[clamp(20px,5vw,56px)] py-12">
        <div className="h-8 w-64 animate-pulse rounded-md bg-surface-muted" />
        <div className="mt-6 h-[400px] w-full animate-pulse rounded-[20px] bg-surface-muted" />
      </div>
    )
  }

  if (noEncontrado || !alojamiento) {
    return <NotFoundPage />
  }

  // Sin reseñas en el backend no hay puntuación: solo se muestra si existe el dato
  const punt = alojamiento.puntuacion
  const puntTexto = punt !== undefined ? punt.toFixed(1).replace('.', ',') : ''
  const etiquetaPunt = punt !== undefined ? etiquetaPuntuacion(punt) : ''
  const comentarios = alojamiento.comentariosConteo ?? 0
  const pais = alojamiento.ciudad ? nombrePais(alojamiento.ciudad.pais) : ''

  return (
    <div className="relative min-h-screen text-ink pb-24">
      <title>{`${alojamiento.nombre} · Cozy`}</title>

      {/* Pestañas fijas al hacer scroll */}
      <div
        className={cn(
          'fixed inset-x-0 top-0 z-40 border-b border-border bg-white/95 backdrop-blur-md transition-transform duration-[320ms] ease-expo',
          mostrarPestanasFijas ? 'translate-y-0' : '-translate-y-full',
        )}
      >
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-[clamp(20px,5vw,56px)]">
          <div
            role="tablist"
            aria-label="Secciones del alojamiento"
            className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {SECCIONES.map(({ id: secId, etiqueta }) => {
              const activo = seccionActiva === secId
              return (
                <button
                  key={secId}
                  type="button"
                  role="tab"
                  aria-selected={activo}
                  onClick={() => desplazarseA(secId)}
                  className={cn(
                    'relative px-4 py-4 text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-primary',
                    activo
                      ? 'border-b-2 border-primary font-semibold text-primary'
                      : 'text-muted-foreground hover:text-ink',
                  )}
                >
                  {etiqueta}
                </button>
              )
            })}
          </div>

          <div className="hidden items-center gap-4 sm:flex">
            <span className="text-sm font-semibold">
              {formatearPrecio(alojamiento.precioPorNoche, alojamiento.moneda)}
              <span className="text-xs font-normal text-muted-foreground"> / noche</span>
            </span>
            <Button size="sm" onClick={() => desplazarseA('habitaciones')}>
              Ver disponibilidad
            </Button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1280px] px-[clamp(20px,5vw,56px)] py-6">
        {/* Migas de pan */}
        <nav
          aria-label="Migas de pan"
          className="mb-4 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground whitespace-nowrap"
        >
          <Link
            to="/"
            className="hover:text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary rounded-sm"
          >
            Inicio
          </Link>
          <span aria-hidden="true" className="text-muted-foreground/60">
            ›
          </span>
          {pais && (
            <>
              <span>{pais}</span>
              <span aria-hidden="true" className="text-muted-foreground/60">
                ›
              </span>
            </>
          )}
          <Link
            to={`/resultados?destino=${alojamiento.ciudadId}`}
            className="hover:text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary rounded-sm"
          >
            {alojamiento.destino}
          </Link>
          <span aria-hidden="true" className="text-muted-foreground/60">
            ›
          </span>
          <span className="font-semibold text-ink" aria-current="page">
            {alojamiento.nombre}
          </span>
        </nav>

        {/* Encabezado: Título, ubicación, acciones */}
        <section
          id="resumen"
          aria-label="Resumen del alojamiento"
          className="mb-6 flex flex-wrap items-start justify-between gap-6"
        >
          <div className="flex flex-1 flex-col gap-2 min-w-[280px]">
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
                    <Star key={i} aria-hidden="true" className="size-4 fill-current" />
                  ))}
                  <span className="ml-1 text-xs text-muted-foreground">
                    {alojamiento.estrellas} estrellas
                  </span>
                </div>
              )}
            </div>

            <h1 className="font-heading text-3xl font-medium tracking-tight text-ink sm:text-4xl lg:text-5xl">
              {alojamiento.nombre}
            </h1>

            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-ink">
                {alojamiento.zona ? `${alojamiento.zona}, ` : ''}
                {alojamiento.destino}
              </span>
              {alojamiento.distanciaMetros !== undefined && (
                <> · a {formatearDistancia(alojamiento.distanciaMetros)} del centro</>
              )}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Puntuación (solo con datos reales de reseñas) */}
            {punt !== undefined && (
              <div className="flex items-center gap-2.5 text-right">
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold text-ink">{etiquetaPunt}</span>
                  <span className="text-xs text-muted-foreground">{comentarios} comentarios</span>
                </div>
                <span
                  className="flex size-11 items-center justify-center rounded-[10px_10px_10px_2px] bg-primary text-lg font-bold text-on-dark"
                  aria-label={`Puntuación ${puntTexto}`}
                >
                  {puntTexto}
                </span>
              </div>
            )}

            {/* Favorito */}
            <BotonFavorito
              forma="redonda"
              activo={esFavorito}
              onCambiar={toggleFav}
              className="border border-border shadow-sm"
            />

            {/* Compartir */}
            <button
              type="button"
              aria-label="Compartir alojamiento"
              onClick={compartirEnlace}
              className="flex size-11 items-center justify-center rounded-full border border-border bg-white text-primary transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary shadow-sm"
            >
              <Copy aria-hidden="true" className="size-4.5" />
            </button>
          </div>
        </section>

        {/* Galería de fotos y panel lateral de precio */}
        <section
          ref={galeriaRef}
          aria-label="Galería y precio base"
          className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
        >
          {/* Mosaico de fotos (Escritorio) / Carrusel (Móvil) */}
          <div className="min-w-0">
            {fotos.length > 0 ? (
              <>
                {/* Mosaico en pantallas grandes */}
                <div className="hidden grid-cols-6 gap-3 sm:grid">
                  {/* Foto 1 (principal, grande) */}
                  <div className="group relative col-span-4 h-[340px] overflow-hidden rounded-[20px] bg-surface-muted">
                    <button
                      type="button"
                      aria-label="Ver foto principal ampliada"
                      onClick={(e) => abrirVisor(0, e.currentTarget)}
                      className="size-full cursor-zoom-in"
                    >
                      <img
                        src={fotos[0]}
                        alt={`${alojamiento.nombre} - Foto 1`}
                        className="size-full object-cover transition-transform duration-700 ease-expo group-hover:scale-[1.04]"
                      />
                    </button>
                  </div>

                  {/* Foto 2 */}
                  <div className="group relative col-span-2 h-[340px] overflow-hidden rounded-[20px] bg-surface-muted">
                    <button
                      type="button"
                      aria-label="Ver foto 2 ampliada"
                      onClick={(e) => abrirVisor(1 % fotos.length, e.currentTarget)}
                      className="size-full cursor-zoom-in"
                    >
                      <img
                        src={fotos[1 % fotos.length]}
                        alt={`${alojamiento.nombre} - Foto 2`}
                        className="size-full object-cover transition-transform duration-700 ease-expo group-hover:scale-[1.04]"
                      />
                    </button>
                  </div>

                  {/* Fotos 3, 4, 5 (fila inferior) */}
                  {Array.from({ length: 3 }).map((_, i) => {
                    const idx = i + 2
                    const fotoSrc = fotos[idx % fotos.length]
                    const esUltima = i === 2
                    return (
                      <div
                        key={idx}
                        className="group relative col-span-2 h-[180px] overflow-hidden rounded-[20px] bg-surface-muted"
                      >
                        <button
                          type="button"
                          aria-label={`Ver foto ${idx + 1} ampliada`}
                          onClick={(e) => abrirVisor(idx % fotos.length, e.currentTarget)}
                          className="size-full cursor-zoom-in"
                        >
                          <img
                            src={fotoSrc}
                            alt={`${alojamiento.nombre} - Foto ${idx + 1}`}
                            className="size-full object-cover transition-transform duration-700 ease-expo group-hover:scale-[1.04]"
                          />
                        </button>
                        {esUltima && (
                          <button
                            type="button"
                            onClick={(e) => abrirVisor(idx % fotos.length, e.currentTarget)}
                            className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-xl bg-white/95 px-3 py-2 text-xs font-semibold text-ink shadow-md backdrop-blur-sm hover:bg-white focus-visible:outline-2 focus-visible:outline-primary"
                          >
                            <Maximize2 aria-hidden="true" className="size-3.5" />
                            Ver todas las fotos ({fotos.length})
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Carrusel en móvil */}
                <div className="sm:hidden">
                  <div className="relative overflow-hidden rounded-[20px] bg-surface-muted aspect-[4/3]">
                    <button
                      type="button"
                      onClick={(e) => abrirVisor(0, e.currentTarget)}
                      className="size-full"
                    >
                      <img
                        src={fotos[0]}
                        alt={alojamiento.nombre}
                        className="size-full object-cover"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => abrirVisor(0, e.currentTarget)}
                      className="absolute right-3 bottom-3 rounded-full bg-primary/80 px-3 py-1 text-xs font-semibold text-on-dark backdrop-blur-sm"
                    >
                      1 / {fotos.length} fotos
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-[360px] w-full overflow-hidden rounded-[20px] border border-border">
                <FotoPendiente etiqueta={alojamiento.nombre} className="bg-surface-muted" />
              </div>
            )}
          </div>

          {/* Panel lateral de precio base */}
          <aside
            aria-label="Precio y condiciones clave"
            className="flex flex-col gap-3 rounded-[20px] border border-border bg-white p-6 shadow-sm lg:sticky lg:top-20"
          >
            <span className="text-xs text-muted-foreground">Precio base desde</span>
            <div className="flex items-baseline gap-2">
              <span className="font-heading text-4xl font-bold tracking-tight text-ink">
                {formatearPrecio(alojamiento.precioPorNoche, alojamiento.moneda)}
              </span>
              <span className="text-sm text-muted-foreground">/ noche</span>
            </div>
            <span className="text-xs text-muted-foreground">
              El precio final depende de las fechas: lo ves en Disponibilidad
            </span>

            {/* Características clave con íconos */}
            <ul className="mt-3 flex flex-col gap-2.5 border-t border-border pt-4 text-xs text-ink">
              <li className="flex items-center gap-2.5">
                <Users aria-hidden="true" className="size-4 shrink-0 text-primary" />
                <span>Hasta {alojamiento.capacidadAdultos + alojamiento.capacidadNinos} personas</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Bed aria-hidden="true" className="size-4 shrink-0 text-primary" />
                <span>{alojamiento.habitaciones} habitaciones disponibles</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Clock aria-hidden="true" className="size-4 shrink-0 text-primary" />
                <span>
                  {alojamiento.politicas?.checkin ?? 'Entrada desde las 15:00'} ·{' '}
                  {alojamiento.politicas?.checkout ?? 'salida hasta las 11:00'}
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <ShieldCheck aria-hidden="true" className="size-4 shrink-0 text-primary" />
                <span>Cancelación flexible según tarifa</span>
              </li>
            </ul>

            <Button
              type="button"
              onClick={() => desplazarseA('habitaciones')}
              className="mt-3 w-full min-h-12"
            >
              Ver disponibilidad
            </Button>
            <span className="text-center text-xs text-muted-foreground">
              Todavía no se te cobrará nada
            </span>
          </aside>
        </section>

        {/* Sección: Incluye */}
        <section
          id="comodidades"
          aria-label="Incluye y comodidades"
          className="mt-16 border-t border-border pt-12"
        >
          <h2 className="font-heading text-2xl font-medium tracking-tight text-ink sm:text-3xl">
            Incluye
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-2 rounded-xl bg-surface-muted p-5">
              <Coffee aria-hidden="true" className="size-6 text-primary" />
              <span className="font-semibold text-sm text-ink">Desayuno incluido</span>
              <span className="text-xs text-muted-foreground leading-relaxed">
                Desayuno fresco y local todas las mañanas según tarifa seleccionada.
              </span>
            </div>

            <div className="flex flex-col gap-2 rounded-xl bg-surface-muted p-5">
              <ShieldCheck aria-hidden="true" className="size-6 text-primary" />
              <span className="font-semibold text-sm text-ink">Cancelación flexible</span>
              <span className="text-xs text-muted-foreground leading-relaxed">
                Posibilidad de cambio o cancelación gratuita hasta pocos días antes.
              </span>
            </div>

            <div className="flex flex-col gap-2 rounded-xl bg-surface-muted p-5">
              <Wifi aria-hidden="true" className="size-6 text-primary" />
              <span className="font-semibold text-sm text-ink">Wi-Fi de alta velocidad</span>
              <span className="text-xs text-muted-foreground leading-relaxed">
                Conexión estable y gratuita en todas las habitaciones y áreas comunes.
              </span>
            </div>

            <div className="flex flex-col gap-2 rounded-xl bg-surface-muted p-5">
              <Bath aria-hidden="true" className="size-6 text-primary" />
              <span className="font-semibold text-sm text-ink">Baño privado equipado</span>
              <span className="text-xs text-muted-foreground leading-relaxed">
                Artículos de aseo de cortesía, toallas y ducha con agua caliente.
              </span>
            </div>
          </div>
        </section>

        {/* Sección: Descripción */}
        <section aria-label="Descripción del alojamiento" className="mt-12 max-w-3xl">
          <h2 className="font-heading text-2xl font-medium tracking-tight text-ink sm:text-3xl">
            Descripción
          </h2>
          <div
            className={cn(
              'mt-4 overflow-hidden text-base leading-relaxed text-ink/90 transition-[max-height] duration-300 ease-expo',
              descExpandida ? 'max-h-[1000px]' : 'max-h-28',
            )}
          >
            {/* Solo la descripción real del alojamiento; no se completa con texto genérico */}
            <p>{alojamiento.descripcion?.trim() || 'Este alojamiento todavía no tiene descripción.'}</p>
          </div>
          <button
            type="button"
            onClick={() => setDescExpandida(!descExpandida)}
            className="mt-3 text-sm font-semibold text-primary underline underline-offset-4 hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-primary rounded-sm"
          >
            {descExpandida ? 'Leer menos' : 'Leer más'}
          </button>
        </section>

        {/* Sección: Servicios con íconos */}
        <section aria-label="Servicios del establecimiento" className="mt-12 border-t border-border pt-12">
          <h2 className="font-heading text-2xl font-medium tracking-tight text-ink sm:text-3xl">
            Servicios
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Populares */}
            <div className="flex flex-col gap-3">
              <span className="font-semibold text-sm text-ink">Lo más destacado</span>
              <ul className="flex flex-col gap-2.5 text-sm text-ink">
                <li className="flex items-center gap-3">
                  <Wifi aria-hidden="true" className="size-4 text-primary" />
                  <span>Wi-Fi gratuito</span>
                </li>
                <li className="flex items-center gap-3">
                  <Coffee aria-hidden="true" className="size-4 text-primary" />
                  <span>Desayuno diario</span>
                </li>
                <li className="flex items-center gap-3">
                  <DoorClosed aria-hidden="true" className="size-4 text-primary" />
                  <span>Recepción 24 horas</span>
                </li>
                <li className="flex items-center gap-3">
                  <Utensils aria-hidden="true" className="size-4 text-primary" />
                  <span>Restaurante / Cafetería</span>
                </li>
              </ul>
            </div>

            {/* Baño e interiores */}
            <div className="flex flex-col gap-3">
              <span className="font-semibold text-sm text-ink">Baño e interiores</span>
              <ul className="flex flex-col gap-2.5 text-sm text-ink">
                <li className="flex items-center gap-3">
                  <Bath aria-hidden="true" className="size-4 text-primary" />
                  <span>Artículos de aseo gratuitos</span>
                </li>
                <li className="flex items-center gap-3">
                  <Sparkles aria-hidden="true" className="size-4 text-primary" />
                  <span>Secador de pelo y toallas</span>
                </li>
                <li className="flex items-center gap-3">
                  <Tv aria-hidden="true" className="size-4 text-primary" />
                  <span>TV de pantalla plana</span>
                </li>
              </ul>
            </div>

            {/* Exterior y seguridad */}
            <div className="flex flex-col gap-3">
              <span className="font-semibold text-sm text-ink">Exterior y seguridad</span>
              <ul className="flex flex-col gap-2.5 text-sm text-ink">
                <li className="flex items-center gap-3">
                  <Leaf aria-hidden="true" className="size-4 text-primary" />
                  <span>Jardín o terraza exterior</span>
                </li>
                <li className="flex items-center gap-3">
                  <Key aria-hidden="true" className="size-4 text-primary" />
                  <span>Caja fuerte en habitación</span>
                </li>
                <li className="flex items-center gap-3">
                  <Flame aria-hidden="true" className="size-4 text-primary" />
                  <span>Alarma y detectores de humo</span>
                </li>
              </ul>
            </div>
          </div>

          {serviciosExpandidos && (
            <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 border-t border-border pt-6 animate-au-fade">
              <div className="flex flex-col gap-3">
                <span className="font-semibold text-sm text-ink">Climatización</span>
                <p className="text-sm text-muted-foreground">
                  Aire acondicionado o calefacción según la temporada y la altitud del destino.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <span className="font-semibold text-sm text-ink">Accesibilidad</span>
                <p className="text-sm text-muted-foreground">
                  Acceso a pisos superiores mediante ascensor o escaleras amplias y luminosas.
                </p>
              </div>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => setServiciosExpandidos(!serviciosExpandidos)}
            className="mt-6"
          >
            {serviciosExpandidos ? 'Mostrar menos servicios' : 'Mostrar todos los servicios'}
          </Button>
        </section>

        {/* Sección: Disponibilidad, habitaciones y tarifas */}
        <section
          id="habitaciones"
          aria-label="Disponibilidad y reservas"
          className="mt-16 border-t border-border pt-12"
        >
          <h2 className="font-heading text-2xl font-medium tracking-tight text-ink sm:text-3xl">
            Disponibilidad
          </h2>

          {/* Formulario compacto para modificar fechas */}
          <form
            onSubmit={actualizarFechas}
            aria-label="Modificar fechas de estancia"
            className="mt-6 grid grid-cols-1 sm:grid-cols-[repeat(2,minmax(140px,1fr))_minmax(140px,1fr)_auto] items-end gap-3 rounded-[20px] border border-border bg-white p-4 shadow-sm"
          >
            <label className="flex flex-col gap-1 text-xs font-medium text-ink">
              <span>Entrada</span>
              <input
                type="date"
                value={entrada}
                min={hoy}
                onChange={(e) => setEntrada(e.target.value)}
                className="h-11 rounded-xl border border-border bg-white px-3 text-sm text-ink outline-none focus:border-primary"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium text-ink">
              <span>Salida</span>
              <input
                type="date"
                value={salida}
                min={entrada || hoy}
                onChange={(e) => setSalida(e.target.value)}
                className="h-11 rounded-xl border border-border bg-white px-3 text-sm text-ink outline-none focus:border-primary"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium text-ink">
              <span>Huéspedes</span>
              <select
                value={huespedes}
                onChange={(e) => setHuespedes(Number(e.target.value))}
                className="h-11 rounded-xl border border-border bg-white px-3 text-sm text-ink outline-none focus:border-primary"
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'huésped' : 'huéspedes'}
                  </option>
                ))}
              </select>
            </label>

            <Button type="submit" className="h-11">
              Actualizar
            </Button>
          </form>

          {!noches && (
            <p className="mt-3 text-xs text-muted-foreground">
              Elige tus fechas de entrada y salida para ver el precio total exacto.
            </p>
          )}

          {/* Tabla de habitaciones y resumen de reserva */}
          <div className="mt-8 grid grid-cols-1 items-start gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
            {/* Lista de habitaciones y tarifas */}
            <div className="overflow-hidden rounded-[20px] border border-border bg-white">
              {/* Encabezado en escritorio */}
              <div className="hidden grid-cols-[1.4fr_0.6fr_0.8fr_1.6fr_0.6fr] bg-primary p-4 text-xs font-semibold text-on-dark lg:grid">
                <span>Tipo de habitación</span>
                <span>Personas</span>
                <span>{noches > 0 ? `Precio (${noches} ${noches === 1 ? 'noche' : 'noches'})` : 'Precio por noche'}</span>
                <span>Elige la tarifa</span>
                <span className="text-right">Habitaciones</span>
              </div>

              {estadoDisp === 'sin-fechas' && (
                <p className="p-6 text-sm text-muted-foreground">
                  Elige las fechas de entrada y salida y pulsa Actualizar para ver las habitaciones disponibles.
                </p>
              )}

              {estadoDisp === 'cargando' && (
                <p role="status" className="p-6 text-sm text-muted-foreground">
                  Consultando disponibilidad…
                </p>
              )}

              {estadoDisp === 'error' && (
                <div role="alert" className="flex flex-col items-start gap-3 p-6">
                  <p className="text-sm font-medium text-error">{resultadoDisp?.error}</p>
                  <Button type="button" size="sm" variant="outline" onClick={() => setReintentos((n) => n + 1)}>
                    Reintentar
                  </Button>
                </div>
              )}

              {estadoDisp === 'ok' && productos.length === 0 && (
                <p role="status" className="p-6 text-sm text-ink">
                  No hay habitaciones disponibles para esas fechas y huéspedes. Prueba con otras fechas.
                </p>
              )}

              {/* Filas de habitaciones: un producto real de /availability por fila */}
              {productos.map((producto, index) => {
                const clave = claveProducto(producto)
                const cantidad = cantidadesHabitaciones[clave] ?? 0
                const tarifa = etiquetaTarifa(producto.cancellation_type)
                const comida = producto.meal_plan ? (PLANES_COMIDA[producto.meal_plan] ?? producto.meal_plan) : null

                return (
                  <div
                    key={producto.product_id}
                    className={cn(
                      'grid grid-cols-1 border-t border-border lg:grid-cols-[1.4fr_3.6fr]',
                      index === 0 && 'lg:border-t-0',
                    )}
                  >
                    {/* Columna izquierda: info de la habitación */}
                    <div className="flex flex-col gap-2 p-5 border-b border-border lg:border-b-0 lg:border-r">
                      <span className="font-heading text-lg font-medium text-ink">{producto.name}</span>
                      <span className="text-xs text-muted-foreground">
                        Capacidad para {producto.max_adults} adultos
                        {producto.max_children > 0 ? ` y ${producto.max_children} niños` : ''}
                      </span>
                      {producto.rooms_left <= 3 && (
                        <span className="self-start rounded-md bg-surface-muted px-2 py-0.5 text-xs font-semibold text-primary">
                          {producto.rooms_left === 1 ? 'Nos queda 1 habitación' : `Nos quedan ${producto.rooms_left}`}
                        </span>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1 text-xs text-muted-foreground">
                        <span className="rounded border border-border px-2 py-0.5 capitalize">{producto.type}</span>
                      </div>
                    </div>

                    {/* Columna derecha: tarifa */}
                    <div className="grid grid-cols-1 items-center gap-4 p-5 hover:bg-surface-muted/40 transition-colors sm:grid-cols-[0.6fr_0.8fr_1.6fr_0.6fr]">
                      <div className="flex items-center gap-1 text-xs text-ink">
                        <Users aria-hidden="true" className="size-4 text-primary" />
                        <span>{producto.max_adults} pers.</span>
                      </div>

                      <div className="flex flex-col">
                        <span className="font-heading text-xl font-bold text-ink">
                          {formatearPrecio(producto.price.total, producto.price.currency)}
                        </span>
                        <span className="text-xs text-muted-foreground">Impuestos incluidos</span>
                      </div>

                      <ul className="flex flex-col gap-1 text-xs text-ink">
                        <li className="flex items-start gap-1.5 font-medium">
                          <Check aria-hidden="true" className="size-3.5 text-primary shrink-0 mt-0.5" />
                          <span>{tarifa.titulo}</span>
                        </li>
                        {tarifa.detalle && (
                          <li className="flex items-start gap-1.5 text-muted-foreground">
                            <Check aria-hidden="true" className="size-3.5 text-primary shrink-0 mt-0.5" />
                            <span>{tarifa.detalle}</span>
                          </li>
                        )}
                        {comida && (
                          <li className="flex items-start gap-1.5 text-muted-foreground">
                            <Check aria-hidden="true" className="size-3.5 text-primary shrink-0 mt-0.5" />
                            <span>{comida}</span>
                          </li>
                        )}
                        <li className="flex items-start gap-1.5 text-muted-foreground">
                          <Check aria-hidden="true" className="size-3.5 text-primary shrink-0 mt-0.5" />
                          {/* Corrección requerida por PRODUCT.md */}
                          <span>Pago simulado: confirmación inmediata sin cobro real</span>
                        </li>
                      </ul>

                      <div className="flex justify-end">
                        <select
                          value={cantidad}
                          onChange={(e) => {
                            const val = Number(e.target.value)
                            setCantidadesHabitaciones((prev) => ({ ...prev, [clave]: val }))
                            setAvisoReserva('')
                          }}
                          aria-label={`Seleccionar cantidad de ${producto.name}, ${tarifa.titulo.toLowerCase()}`}
                          className="h-10 w-20 rounded-xl border border-border bg-white px-2.5 text-sm font-medium text-ink outline-none focus:border-primary cursor-pointer"
                        >
                          {Array.from({ length: producto.rooms_left + 1 }, (_, i) => (
                            <option key={i} value={i}>
                              {i}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Resumen de reserva */}
            <aside
              aria-label="Resumen de tu selección"
              className="flex flex-col gap-3 rounded-[20px] border border-border bg-white p-6 shadow-sm xl:sticky xl:top-20"
            >
              <span className="font-semibold text-sm text-ink">Tu selección</span>
              <div className="flex flex-col gap-1">
                <span className="font-heading text-3xl font-bold tracking-tight text-ink">
                  {formatearPrecio(totalPrecio, alojamiento.moneda)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {totalHabitaciones > 0
                    ? `${totalHabitaciones} ${totalHabitaciones === 1 ? 'habitación' : 'habitaciones'} · ${noches > 0 ? `${noches} ${noches === 1 ? 'noche' : 'noches'}` : 'por noche'}`
                    : 'Selecciona tus habitaciones'}
                </span>
                {totalHabitaciones > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Impuestos y cargos incluidos
                  </span>
                )}
              </div>

              {avisoReserva && (
                <div role="alert" className="rounded-md bg-surface-muted p-2 text-xs font-medium text-error">
                  {avisoReserva}
                </div>
              )}

              <Button
                type="button"
                onClick={irAReserva}
                className="mt-3 w-full min-h-12"
              >
                Reservar
              </Button>
              <span className="text-center text-xs text-muted-foreground">
                Todavía no se te cobrará nada
              </span>
            </aside>
          </div>
        </section>

        {/* Sección: Reseñas */}
        <section
          id="resenas"
          aria-label="Reseñas de huéspedes"
          className="mt-16 border-t border-border pt-12"
        >
          <h2 className="font-heading text-2xl font-medium tracking-tight text-ink sm:text-3xl">
            Reseñas
          </h2>

          {/* El backend todavía no guarda reseñas: no se muestran puntuaciones ni comentarios inventados */}
          {alojamiento.resenas.length === 0 || punt === undefined ? (
            <p className="mt-6 text-muted-foreground">Este alojamiento todavía no tiene reseñas de huéspedes.</p>
          ) : (
          <>
          {/* Puntuación general y barras por categoría */}
          <div className="mt-6 grid grid-cols-1 items-center gap-8 border-b border-border pb-8 md:grid-cols-[auto_1fr]">
            <div className="flex items-center gap-4">
              <span className="flex size-16 items-center justify-center rounded-[14px_14px_14px_3px] bg-primary text-2xl font-bold text-on-dark">
                {puntTexto}
              </span>
              <div className="flex flex-col leading-tight">
                <span className="font-heading text-xl font-medium text-ink">{etiquetaPunt}</span>
                <span className="text-xs text-muted-foreground">{comentarios} comentarios reales</span>
              </div>
            </div>

            {/* Subpuntuaciones */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {alojamiento.subpuntuaciones.map((sub) => (
                <div key={sub.nombre} className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{sub.nombre}</span>
                    <span className="font-semibold text-ink">
                      {sub.puntuacion.toFixed(1).replace('.', ',')}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                    <div
                      style={{ width: `${(sub.puntuacion / 10) * 100}%` }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Filtros de reseñas por tipo de viaje y orden */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <ChipsPestanas
              etiqueta="Filtrar reseñas por tipo de viaje"
              valor={filtroTipoViaje}
              onCambiar={setFiltroTipoViaje}
              opciones={[
                { id: 'todas', etiqueta: 'Todas' },
                { id: 'pareja', etiqueta: 'Parejas' },
                { id: 'familia', etiqueta: 'Familias' },
                { id: 'solo', etiqueta: 'Viajeros solos' },
                { id: 'trabajo', etiqueta: 'Trabajo' },
              ]}
            />

            <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-1.5 text-xs">
              <label htmlFor={ordenResenasId} className="font-medium text-muted-foreground">
                Ordenar por:
              </label>
              <select
                id={ordenResenasId}
                value={ordenResenas}
                onChange={(e) => setOrdenResenas(e.target.value as typeof ordenResenas)}
                className="bg-transparent font-medium text-ink outline-none cursor-pointer"
              >
                <option value="recientes">Más recientes</option>
                <option value="mejor">Mejor puntuación</option>
                <option value="peor">Peor puntuación</option>
              </select>
            </div>
          </div>

          {/* Lista de reseñas */}
          <div className="mt-6 divide-y divide-border">
            {resenasParaMostrar.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No hay reseñas disponibles para este filtro.
              </p>
            ) : (
              resenasParaMostrar.map((resena) => {
                const expandida = !!resenasExpandidas[resena.id]
                const util = !!votosUtiles[resena.id]
                const utilConteo = resena.utiles + (util ? 1 : 0)

                return (
                  <article
                    key={resena.id}
                    className="grid grid-cols-1 gap-6 py-6 sm:grid-cols-[200px_minmax(0,1fr)] animate-au-rise"
                  >
                    {/* Autor */}
                    <div className="flex items-center gap-3 self-start">
                      <span
                        aria-hidden="true"
                        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-sm font-semibold text-ink"
                      >
                        {resena.nombre.charAt(0)}
                      </span>
                      <div className="flex flex-col leading-tight">
                        <span className="font-medium text-sm text-ink">{resena.nombre}</span>
                        <span className="text-xs text-muted-foreground">{resena.pais}</span>
                      </div>
                    </div>

                    {/* Contenido de la reseña */}
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded bg-surface-muted px-2 py-0.5 font-bold text-ink">
                          {resena.puntuacion.toFixed(1).replace('.', ',')}
                        </span>
                        <span className="text-muted-foreground">{formatearFechaLarga(resena.fecha)}</span>
                        <span aria-hidden="true" className="text-muted-foreground/60">
                          ·
                        </span>
                        <span className="capitalize text-muted-foreground">{resena.tipoViaje}</span>
                      </div>

                      <h3 className="font-heading text-base font-semibold text-ink">
                        {resena.titulo}
                      </h3>

                      <p
                        className={cn(
                          'text-sm leading-relaxed text-ink/90',
                          !expandida && 'line-clamp-3',
                        )}
                      >
                        {resena.comentario}
                      </p>

                      {resena.comentario.length > 120 && (
                        <button
                          type="button"
                          onClick={() => toggleResenaExpandida(resena.id)}
                          className="self-start text-xs font-semibold text-primary underline underline-offset-4 hover:text-primary-hover"
                        >
                          {expandida ? 'Leer menos' : 'Leer más'}
                        </button>
                      )}

                      {/* Aspectos positivos / negativos */}
                      {resena.aFavor && (
                        <p className="mt-1 text-xs text-ink">
                          <span className="font-semibold">A favor:</span> {resena.aFavor}
                        </p>
                      )}
                      {resena.enContra && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-semibold text-ink">En contra:</span> {resena.enContra}
                        </p>
                      )}

                      {/* Botón Útil */}
                      <button
                        type="button"
                        aria-pressed={util}
                        onClick={() => votarUtil(resena.id)}
                        className={cn(
                          'mt-2 self-start rounded-md border border-border px-3 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-primary',
                          util ? 'bg-surface-muted font-semibold text-primary' : 'text-muted-foreground hover:bg-surface-muted',
                        )}
                      >
                        Útil ({utilConteo})
                      </button>
                    </div>
                  </article>
                )
              })
            )}
          </div>

          {/* Botón Ver más reseñas */}
          {hayMasResenas && (
            <div className="mt-8 flex justify-center border-t border-border pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setResenasVisibles((prev) => prev + 5)}
              >
                Ver más reseñas
              </Button>
            </div>
          )}
          </>
          )}
        </section>
      </main>

      {/* Barra inferior fija en pantallas móviles */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between border-t border-border bg-white p-4 shadow-lg sm:hidden">
        <div className="flex flex-col leading-tight">
          <span className="text-xs text-muted-foreground">Precio base desde</span>
          <span className="font-heading text-lg font-bold text-ink">
            {formatearPrecio(alojamiento.precioPorNoche, alojamiento.moneda)}{' '}
            <span className="text-xs font-normal text-muted-foreground">/ noche</span>
          </span>
        </div>
        <Button size="sm" onClick={() => desplazarseA('habitaciones')}>
          Ver disponibilidad
        </Button>
      </div>

      {/* Toast sereno flotante */}
      {toastMensaje && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-on-dark shadow-xl animate-au-fade"
        >
          {toastMensaje}
        </div>
      )}

      {/* Visor Modal / Lightbox de fotos */}
      {visorAbierto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Galería de fotos ampliada"
          className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-primary/95 p-4 text-on-dark backdrop-blur-md animate-au-fade"
        >
          {/* Barra superior del visor: botón cerrar */}
          <div className="flex w-full max-w-5xl items-center justify-between py-2">
            <span className="text-sm font-medium text-on-dark" aria-live="polite">
              Foto {indiceFotoVisor + 1} de {fotos.length}
            </span>
            <button
              type="button"
              aria-label="Cerrar visor de fotos"
              onClick={cerrarVisor}
              className="flex size-11 items-center justify-center rounded-full bg-white text-primary transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>

          {/* Imagen central con controles anterior/siguiente */}
          <div className="relative flex flex-1 w-full max-w-5xl items-center justify-center overflow-hidden py-4">
            {fotos.length > 0 ? (
              <img
                src={fotos[indiceFotoVisor]}
                alt={`${alojamiento.nombre} - Foto ${indiceFotoVisor + 1}`}
                className="max-h-[75vh] w-auto max-w-full rounded-[16px] object-contain shadow-2xl"
              />
            ) : (
              <div className="size-80 rounded-[16px] bg-white p-6 text-ink">
                <FotoPendiente etiqueta={alojamiento.nombre} />
              </div>
            )}

            {/* Flecha anterior */}
            <button
              type="button"
              aria-label="Foto anterior"
              onClick={fotoAnterior}
              className="absolute left-2 top-1/2 -translate-y-1/2 flex size-12 items-center justify-center rounded-full bg-white text-primary shadow-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <ChevronLeft aria-hidden="true" className="size-6" />
            </button>

            {/* Flecha siguiente */}
            <button
              type="button"
              aria-label="Foto siguiente"
              onClick={fotoSiguiente}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex size-12 items-center justify-center rounded-full bg-white text-primary shadow-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <ChevronRight aria-hidden="true" className="size-6" />
            </button>
          </div>

          {/* Tira de miniaturas abajo */}
          {fotos.length > 1 && (
            <div className="flex max-w-3xl gap-2 overflow-x-auto py-2">
              {fotos.map((f, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Ir a foto ${i + 1}`}
                  onClick={() => setIndiceFotoVisor(i)}
                  className={cn(
                    'relative size-14 shrink-0 overflow-hidden rounded-lg transition-opacity focus-visible:outline-2 focus-visible:outline-white',
                    i === indiceFotoVisor ? 'ring-2 ring-white opacity-100' : 'opacity-50 hover:opacity-80',
                  )}
                >
                  <img src={f} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
