import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowLeft, CreditCard, Loader2, ShieldCheck } from 'lucide-react'
import { CampoTexto } from '@/components/CampoTexto'
import { ContadorRegresivo } from '@/components/ContadorRegresivo'
import { FotoPendiente } from '@/components/FotoPendiente'
import { Button } from '@/components/ui/button'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { formatearPrecio } from '@/lib/formato'
import { confirmarReserva, crearVistaPreviaReserva, guardarCarritoEnCurso, leerCarritoEnCurso, limpiarCarritoEnCurso } from '@/services/reservas'
import type { DatosHuesped, VistaPreviaReserva } from '@/types/reservas'

const CLAVE_DATOS_HUESPED = 'cozy:datos-huesped-en-curso'

function soloDigitos(valor: string): string {
  return valor.replace(/\D/g, '')
}

function formatearNumeroTarjeta(valor: string): string {
  return soloDigitos(valor)
    .slice(0, 16)
    .replace(/(.{4})/g, '$1 ')
    .trim()
}

function formatearVencimiento(valor: string): string {
  const digitos = soloDigitos(valor).slice(0, 4)
  if (digitos.length <= 2) return digitos
  return `${digitos.slice(0, 2)}/${digitos.slice(2)}`
}

interface ErroresTarjeta {
  numero?: string
  titular?: string
  vencimiento?: string
  cvv?: string
}

export default function PagoReservaPage() {
  const navigate = useNavigate()
  const motionReducido = usePrefersReducedMotion()

  // Lectura perezosa (una sola vez, en el primer render): leer sessionStorage es una
  // lectura pura de algo que ya está ahí, no un efecto secundario que haya que sincronizar.
  const [vistaPrevia] = useState<VistaPreviaReserva | null>(() => leerCarritoEnCurso())
  const [datosHuesped] = useState<DatosHuesped | null>(() => {
    try {
      const guardado = sessionStorage.getItem(CLAVE_DATOS_HUESPED)
      return guardado ? (JSON.parse(guardado) as DatosHuesped) : null
    } catch {
      return null
    }
  })
  const [vencida, setVencida] = useState(() => !!vistaPrevia && new Date() > new Date(vistaPrevia.expiraEn))

  const [numero, setNumero] = useState('')
  const [titular, setTitular] = useState('')
  const [vencimiento, setVencimiento] = useState('')
  const [cvv, setCvv] = useState('')
  const [errores, setErrores] = useState<ErroresTarjeta>({})
  const [procesando, setProcesando] = useState(false)

  // Si falta el carrito o los datos del huésped, se vuelve al paso correspondiente
  // (navegar es un efecto secundario real, por eso sigue en un efecto)
  useEffect(() => {
    if (!vistaPrevia) {
      navigate('/resultados', { replace: true })
    } else if (!datosHuesped) {
      navigate('/reserva/resumen', { replace: true })
    }
  }, [vistaPrevia, datosHuesped, navigate])

  const validarTarjeta = (): boolean => {
    const nuevosErrores: ErroresTarjeta = {}
    if (soloDigitos(numero).length !== 16) nuevosErrores.numero = 'Escribe los 16 dígitos de la tarjeta de ejemplo.'
    if (!titular.trim()) nuevosErrores.titular = 'Escribe el nombre que figura en la tarjeta.'
    const [mes, anio] = vencimiento.split('/')
    const mesNum = Number(mes)
    if (!mes || !anio || anio.length !== 2 || mesNum < 1 || mesNum > 12) {
      nuevosErrores.vencimiento = 'Usa el formato MM/AA.'
    }
    if (soloDigitos(cvv).length < 3) nuevosErrores.cvv = 'El código de seguridad tiene 3 o 4 dígitos.'
    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  const pagar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (!vistaPrevia || !datosHuesped || vencida || procesando) return
    if (!validarTarjeta()) return

    setProcesando(true)
    // Estable para el mismo carrito y la misma tarjeta: un reintento manda el mismo cuerpo y, con la misma
    // Idempotency-Key, el backend devuelve la orden ya creada en lugar de 422.
    const referenciaPago = `PAY-SIM-${soloDigitos(numero).slice(-4)}-${vistaPrevia.previewId.slice(0, 8).toUpperCase()}`
    try {
      const resultado = await confirmarReserva(vistaPrevia, datosHuesped, referenciaPago)
      if (resultado.ok) {
        limpiarCarritoEnCurso()
        try {
          sessionStorage.removeItem(CLAVE_DATOS_HUESPED)
        } catch {
          // no-op
        }
        navigate(`/reserva/confirmacion?localizador=${resultado.reserva.localizador}`, { replace: true })
      } else {
        const p = new URLSearchParams({ tipo: resultado.error.tipo, mensaje: resultado.error.mensaje })
        if (resultado.error.habitacionNombre) p.set('habitacion', resultado.error.habitacionNombre)
        if (resultado.error.ordenesExitosas?.length) p.set('exitosas', resultado.error.ordenesExitosas.join(','))
        if (resultado.error.tipo === 'no-disponible' || resultado.error.tipo === 'vista-previa-vencida') limpiarCarritoEnCurso()
        if (resultado.error.precioAntes !== undefined) p.set('antes', String(resultado.error.precioAntes))
        if (resultado.error.precioDespues !== undefined) p.set('despues', String(resultado.error.precioDespues))
        if (resultado.error.tipo === 'precio-cambiado') {
          p.set('moneda', vistaPrevia.moneda)
          // Regenera el carrito con el precio y el plazo de 15 minutos vigentes, para que
          // "Ver el precio actualizado" lleve al Resumen ya con los datos correctos.
          const nuevaSolicitud = {
            alojamientoId: vistaPrevia.alojamientoId,
            entrada: vistaPrevia.entrada,
            salida: vistaPrevia.salida,
            huespedes: vistaPrevia.huespedes,
            lineas: vistaPrevia.lineas.map((l) => ({
              habitacionId: l.habitacionId,
              tarifa: l.tarifa,
              cantidad: l.cantidad,
            })),
          }
          const vistaActualizada = await crearVistaPreviaReserva(nuevaSolicitud)
          guardarCarritoEnCurso(vistaActualizada)
        }
        navigate(`/reserva/error?${p.toString()}`)
      }
    } catch {
      navigate('/reserva/error?tipo=generico&mensaje=' + encodeURIComponent('Ocurrió un problema al confirmar tu pago.'))
    } finally {
      setProcesando(false)
    }
  }

  if (!vistaPrevia || !datosHuesped) {
    return (
      <div className="mx-auto max-w-[900px] px-[clamp(20px,5vw,56px)] py-16">
        <div className="h-8 w-64 animate-pulse rounded-md bg-surface-muted" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[900px] px-[clamp(20px,5vw,56px)] py-10">
      <title>Pago de tu reserva · Cozy</title>

      <Link
        to="/reserva/resumen"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink underline underline-offset-4 outline-none hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Volver al resumen
      </Link>

      <h1 className="font-heading text-3xl font-medium tracking-tight text-ink">Pago</h1>

      <div className="mt-6">
        <ContadorRegresivo hasta={vistaPrevia.expiraEn} onVencer={() => setVencida(true)} />
      </div>

      {vencida ? (
        <div role="alert" className="mt-6 rounded-[20px] border border-border bg-white p-8">
          <h2 className="text-lg font-semibold text-ink">Tu vista previa venció</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pasaron más de 15 minutos. Vuelve a elegir tu habitación para generar una reserva nueva.
          </p>
          <Button asChild className="mt-4">
            <Link to={`/alojamientos/${vistaPrevia.alojamientoId}`}>Volver a elegir habitación</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-5">
            {/* Aviso obligatorio: pago simulado, sin cobro real */}
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl bg-surface-muted p-4 text-sm text-ink"
            >
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
              <span>
                <strong className="font-semibold">Pago simulado: no se realiza ningún cobro.</strong> Estos datos
                son de ejemplo y no se envían a ninguna pasarela real.
              </span>
            </div>

            <form onSubmit={pagar} aria-label="Datos de pago" noValidate className="flex flex-col gap-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
                <CreditCard aria-hidden="true" className="size-5 text-primary" />
                Tarjeta de ejemplo
              </h2>
              <CampoTexto
                etiqueta="Número de tarjeta"
                required
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="4111 1111 1111 1111"
                value={numero}
                onChange={(e) => setNumero(formatearNumeroTarjeta(e.target.value))}
                error={errores.numero}
              />
              <CampoTexto
                etiqueta="Nombre del titular"
                required
                autoComplete="cc-name"
                value={titular}
                onChange={(e) => setTitular(e.target.value)}
                error={errores.titular}
              />
              <div className="grid grid-cols-2 gap-4">
                <CampoTexto
                  etiqueta="Vencimiento"
                  required
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  placeholder="MM/AA"
                  value={vencimiento}
                  onChange={(e) => setVencimiento(formatearVencimiento(e.target.value))}
                  error={errores.vencimiento}
                />
                <CampoTexto
                  etiqueta="CVV"
                  required
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  placeholder="123"
                  value={cvv}
                  onChange={(e) => setCvv(soloDigitos(e.target.value).slice(0, 4))}
                  error={errores.cvv}
                />
              </div>

              <Button type="submit" size="lg" disabled={procesando} className="mt-2 self-start min-w-48">
                {procesando ? (
                  <>
                    <Loader2 aria-hidden="true" className={motionReducido ? 'size-4' : 'size-4 animate-spin'} />
                    Procesando…
                  </>
                ) : (
                  `Pagar ${formatearPrecio(vistaPrevia.precioTotal, vistaPrevia.moneda)}`
                )}
              </Button>
            </form>
          </div>

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
                <p className="text-xs text-muted-foreground">
                  {vistaPrevia.noches === 1 ? '1 noche' : `${vistaPrevia.noches} noches`} ·{' '}
                  {vistaPrevia.totalHabitaciones === 1 ? '1 habitación' : `${vistaPrevia.totalHabitaciones} habitaciones`}
                </p>
              </div>
            </div>
            <div className="flex items-baseline justify-between border-t border-border pt-4">
              <span className="font-semibold text-ink">Total</span>
              <span className="font-heading text-2xl font-semibold text-ink">
                {formatearPrecio(vistaPrevia.precioTotal, vistaPrevia.moneda)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              A nombre de {datosHuesped.nombre} {datosHuesped.apellido}
            </p>
          </aside>
        </div>
      )}
    </div>
  )
}
