import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { CampoTexto } from '@/components/CampoTexto'
import { ContadorRegresivo } from '@/components/ContadorRegresivo'
import { FotoPendiente } from '@/components/FotoPendiente'
import { Button } from '@/components/ui/button'
import { formatearFechaLarga, formatearNoches, formatearPrecio } from '@/lib/formato'
import { crearVistaPreviaReserva, guardarCarritoEnCurso, leerCarritoEnCurso } from '@/services/reservas'
import type { DatosHuesped, SolicitudReserva, VistaPreviaReserva } from '@/types/reservas'

const CLAVE_DATOS_HUESPED = 'cozy:datos-huesped-en-curso'

function leerDatosHuespedGuardados(): Partial<DatosHuesped> {
  try {
    const guardado = sessionStorage.getItem(CLAVE_DATOS_HUESPED)
    return guardado ? (JSON.parse(guardado) as Partial<DatosHuesped>) : {}
  } catch {
    return {}
  }
}

/** Convierte "uuid1_est:2,uuid2_flex:1" (como lo arma Detalle) en líneas de la solicitud */
function parsearHabitaciones(parametro: string): SolicitudReserva['lineas'] {
  return parametro
    .split(',')
    .map((parte) => parte.trim())
    .filter(Boolean)
    .map((parte) => {
      const [clave, cantidadTexto] = parte.split(':')
      const esFlexible = clave.endsWith('_flex')
      const habitacionId = clave.replace(/_est$|_flex$/, '')
      return {
        habitacionId,
        tarifa: esFlexible ? ('flexible' as const) : ('estandar' as const),
        cantidad: Number(cantidadTexto) || 0,
      }
    })
    .filter((l) => l.cantidad > 0)
}

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ResumenReservaPage() {
  const [parametros] = useSearchParams()
  const navigate = useNavigate()

  const [vistaPrevia, setVistaPrevia] = useState<VistaPreviaReserva | null>(null)
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [vencida, setVencida] = useState(false)

  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [correo, setCorreo] = useState('')
  const [telefono, setTelefono] = useState('')
  const [errores, setErrores] = useState<Partial<Record<keyof DatosHuesped, string>>>({})

  // Carga el carrito ya en curso (sessionStorage) o lo crea a partir de la URL que arma Detalle
  useEffect(() => {
    let vigente = true
    const existente = leerCarritoEnCurso()
    if (existente) {
      if (vigente) {
        setVistaPrevia(existente)
        setCargando(false)
      }
      return
    }

    const alojamientoId = Number(parametros.get('alojamientoId'))
    const entrada = parametros.get('entrada') ?? ''
    const salida = parametros.get('salida') ?? ''
    const huespedes = Number(parametros.get('huespedes') ?? 1)
    const lineas = parsearHabitaciones(parametros.get('habitaciones') ?? '')

    if (!alojamientoId || !entrada || !salida || !lineas.length) {
      setErrorCarga('No encontramos los datos de tu reserva. Elige una habitación desde el alojamiento.')
      setCargando(false)
      return
    }

    crearVistaPreviaReserva({ alojamientoId, entrada, salida, huespedes, lineas })
      .then((vp) => {
        if (!vigente) return
        guardarCarritoEnCurso(vp)
        setVistaPrevia(vp)
        setCargando(false)
      })
      .catch((error: unknown) => {
        if (!vigente) return
        setErrorCarga(error instanceof Error ? error.message : 'No pudimos armar la vista previa de tu reserva.')
        setCargando(false)
      })

    return () => {
      vigente = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar: el carrito no cambia con la URL después
  }, [])

  useEffect(() => {
    const guardados = leerDatosHuespedGuardados()
    if (guardados.nombre) setNombre(guardados.nombre)
    if (guardados.apellido) setApellido(guardados.apellido)
    if (guardados.correo) setCorreo(guardados.correo)
    if (guardados.telefono) setTelefono(guardados.telefono)
  }, [])

  const validar = (): boolean => {
    const nuevosErrores: Partial<Record<keyof DatosHuesped, string>> = {}
    if (!nombre.trim()) nuevosErrores.nombre = 'Escribe tu nombre.'
    if (!apellido.trim()) nuevosErrores.apellido = 'Escribe tu apellido.'
    if (!correo.trim()) nuevosErrores.correo = 'Escribe tu correo.'
    else if (!CORREO_VALIDO.test(correo.trim())) nuevosErrores.correo = 'Ese correo no parece válido.'
    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  const continuar = (evento: FormEvent) => {
    evento.preventDefault()
    if (vencida || !validar()) return
    const datos: DatosHuesped = {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      correo: correo.trim(),
      telefono: telefono.trim() || undefined,
    }
    try {
      sessionStorage.setItem(CLAVE_DATOS_HUESPED, JSON.stringify(datos))
    } catch {
      // Si falla, la pantalla de pago simplemente pedirá los datos de nuevo
    }
    navigate('/reserva/pago')
  }

  if (cargando) {
    return (
      <div className="mx-auto max-w-[900px] px-[clamp(20px,5vw,56px)] py-16">
        <div className="h-8 w-64 animate-pulse rounded-md bg-surface-muted" />
        <div className="mt-6 h-64 w-full animate-pulse rounded-[20px] bg-surface-muted" />
      </div>
    )
  }

  if (errorCarga || !vistaPrevia) {
    return (
      <div className="mx-auto max-w-[640px] px-[clamp(20px,5vw,56px)] py-16 text-center">
        <title>No pudimos armar tu reserva · Cozy</title>
        <AlertTriangle aria-hidden="true" className="mx-auto size-10 text-error" />
        <h1 className="mt-4 font-heading text-2xl font-medium text-ink">No pudimos armar tu reserva</h1>
        <p className="mt-2 text-muted-foreground">{errorCarga}</p>
        <Button asChild className="mt-6">
          <Link to="/resultados">Buscar alojamientos</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[900px] px-[clamp(20px,5vw,56px)] py-10">
      <title>Resumen de tu reserva · Cozy</title>

      <Link
        to={`/alojamientos/${vistaPrevia.alojamientoId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink underline underline-offset-4 outline-none hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Volver al alojamiento
      </Link>

      <h1 className="font-heading text-3xl font-medium tracking-tight text-ink">Resumen de tu estadía</h1>

      <div className="mt-6">
        <ContadorRegresivo hasta={vistaPrevia.expiraEn} onVencer={() => setVencida(true)} />
      </div>

      {vencida ? (
        <div role="alert" className="mt-6 flex flex-col items-start gap-4 rounded-[20px] border border-border bg-white p-8">
          <AlertTriangle aria-hidden="true" className="size-8 text-error" />
          <div>
            <h2 className="text-lg font-semibold text-ink">Tu vista previa venció</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pasaron más de 15 minutos desde que armaste esta reserva y el precio podría haber cambiado. Vuelve a
              elegir tu habitación para generar una vista previa nueva.
            </p>
          </div>
          <Button asChild>
            <Link to={`/alojamientos/${vistaPrevia.alojamientoId}`}>Volver a elegir habitación</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <form onSubmit={continuar} aria-label="Datos del huésped" noValidate className="flex flex-col gap-5">
            <h2 className="text-lg font-semibold text-ink">Datos del huésped</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CampoTexto
                etiqueta="Nombre"
                required
                autoComplete="given-name"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                error={errores.nombre}
              />
              <CampoTexto
                etiqueta="Apellido"
                required
                autoComplete="family-name"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                error={errores.apellido}
              />
            </div>
            <CampoTexto
              etiqueta="Correo electrónico"
              type="email"
              required
              autoComplete="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              error={errores.correo}
              ayuda="Aquí te enviaríamos la confirmación. Úsalo también para buscar esta reserva más tarde."
            />
            <CampoTexto
              etiqueta="Teléfono (opcional)"
              type="tel"
              autoComplete="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
            />
            <Button type="submit" size="lg" className="mt-2 self-start">
              Continuar al pago
            </Button>
          </form>

          <aside aria-label="Resumen de la estadía" className="flex flex-col gap-4 rounded-[20px] border border-border bg-white p-6 h-fit">
            <div className="flex gap-3">
              <div className="size-16 shrink-0 overflow-hidden rounded-xl">
                {vistaPrevia.alojamientoFoto ? (
                  <img src={vistaPrevia.alojamientoFoto} alt="" className="size-full object-cover" />
                ) : (
                  <FotoPendiente etiqueta={vistaPrevia.alojamientoNombre} />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{vistaPrevia.alojamientoNombre}</p>
                <p className="text-xs text-muted-foreground">{vistaPrevia.destino}</p>
              </div>
            </div>

            <dl className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Entrada</dt>
                <dd className="font-medium text-ink">{formatearFechaLarga(vistaPrevia.entrada)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Salida</dt>
                <dd className="font-medium text-ink">{formatearFechaLarga(vistaPrevia.salida)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Estancia</dt>
                <dd className="font-medium text-ink">{formatearNoches(vistaPrevia.noches)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Huéspedes</dt>
                <dd className="font-medium text-ink">
                  {vistaPrevia.huespedes} {vistaPrevia.huespedes === 1 ? 'huésped' : 'huéspedes'}
                </dd>
              </div>
            </dl>

            <div className="flex flex-col gap-2 border-t border-border pt-4">
              {vistaPrevia.lineas.map((linea) => (
                <div key={`${linea.habitacionId}-${linea.tarifa}`} className="flex justify-between gap-3 text-sm">
                  <span className="text-ink">
                    {linea.cantidad} × {linea.habitacionNombre}
                    <span className="text-muted-foreground"> ({linea.tarifa === 'flexible' ? 'flexible' : 'estándar'})</span>
                  </span>
                  <span className="shrink-0 font-medium text-ink">{formatearPrecio(linea.subtotal, vistaPrevia.moneda)}</span>
                </div>
              ))}
            </div>

            <div className="flex items-baseline justify-between border-t border-border pt-4">
              <span className="font-semibold text-ink">Total</span>
              <span className="font-heading text-2xl font-semibold text-ink">
                {formatearPrecio(vistaPrevia.precioTotal, vistaPrevia.moneda)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Precio final. No se te cobrará en este paso.</p>
          </aside>
        </div>
      )}
    </div>
  )
}
