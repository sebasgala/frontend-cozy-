import { useEffect, useId, useState, type ComponentProps } from 'react'
import { CampoSelect } from '@/components/admin/CampoSelect'
import { CampoTexto } from '@/components/CampoTexto'
import { DialogoConfirmacion } from '@/components/DialogoConfirmacion'
import { erroresPorCampo, mensajeDeError } from '@/services/admin'
import {
  aprobarCheckin,
  autorizarEarlyCheckin,
  cambiarHuespedes,
  cambiarObservaciones,
  listarAuditoriaRecepcion,
  listarHabitacionesReasignables,
  marcarLimpiezaLista,
  realizarCheckout,
  reasignarHabitacion,
} from '@/services/recepcion'
import type { DatosCheckout, HabitacionReasignable, MetodoPagoConsumos, RegistroAuditoriaRecepcion, ReservaRecepcion } from '@/types/recepcion'
import { formatearFecha, formatearNoches } from '@/lib/formato'
import { datetimeLocalAGuayaquil, horaGuayaquil, ventanaCheckin } from '@/lib/recepcion'
import { cn } from '@/lib/utils'

interface PropsModal {
  reserva: ReservaRecepcion
  onCerrar: () => void
  /** La reserva como quedó y un aviso para la lista */
  onHecho: (reserva: ReservaRecepcion, aviso: string) => void
}

const CLAVE_CODIGO = 'cozy:recepcion:codigo'
const DOCUMENTO = /^[A-Za-z0-9]{6,13}$/
const CODIGO_RECEPCIONISTA = /^[A-Za-z0-9._-]{2,30}$/

function leerCodigoGuardado(): string {
  try {
    return localStorage.getItem(CLAVE_CODIGO) ?? ''
  } catch {
    return ''
  }
}

function guardarCodigo(codigo: string): void {
  try {
    localStorage.setItem(CLAVE_CODIGO, codigo)
  } catch {
    // no-op
  }
}

/** Área de texto con el mismo aspecto que CampoTexto */
function CampoArea({ etiqueta, ayuda, className, ...props }: Omit<ComponentProps<'textarea'>, 'id'> & { etiqueta: string; ayuda?: string }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-ink">
        {etiqueta}
      </label>
      <textarea
        id={id}
        rows={3}
        aria-describedby={ayuda ? `${id}-ayuda` : undefined}
        className={cn(
          'rounded-[14px] border border-border bg-white px-3.5 py-2.5 text-[15px] text-ink outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary',
          className,
        )}
        {...props}
      />
      {ayuda && (
        <span id={`${id}-ayuda`} className="text-xs text-muted-foreground">
          {ayuda}
        </span>
      )}
    </div>
  )
}

function ResumenReserva({ reserva }: { reserva: ReservaRecepcion }) {
  const filas: [string, string][] = [
    ['Titular', reserva.titular.nombre || 'Sin nombre'],
    ['Correo', reserva.titular.email],
    ['Alojamiento', reserva.alojamientoNombre],
    ['Habitación', reserva.habitacionAsignada ? `${reserva.habitacionAsignada} (${reserva.habitacionNombre})` : reserva.habitacionNombre],
    ['Estancia', `${formatearFecha(reserva.llegada)} → ${formatearFecha(reserva.salida)} · ${formatearNoches(reserva.noches)}`],
    ['Reserva', reserva.codigoReserva],
  ]
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-2xl bg-surface-muted p-4 text-sm">
      {filas.map(([etiqueta, valor]) => (
        <div key={etiqueta} className="contents">
          <dt className="text-muted-foreground">{etiqueta}</dt>
          <dd className="min-w-0 truncate font-medium text-ink">{valor}</dd>
        </div>
      ))}
    </dl>
  )
}

function ErrorAccion({ texto }: { texto: string }) {
  if (!texto) return null
  return (
    <p role="alert" className="mt-4 text-sm font-medium text-error">
      {texto}
    </p>
  )
}

// ───────────────────────── R7: check-in en mostrador ─────────────────────────

export function ModalCheckin({ reserva, onCerrar, onHecho }: PropsModal) {
  const [documento, setDocumento] = useState('')
  const [presentes, setPresentes] = useState(String(reserva.huespedes.adultos + reserva.huespedes.ninos.length))
  const [codigo, setCodigo] = useState(leerCodigoGuardado)
  const [observaciones, setObservaciones] = useState('')
  const [verificado, setVerificado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [errores, setErrores] = useState<Record<string, string>>({})

  const ventana = ventanaCheckin(reserva)
  const nPresentes = Number(presentes)
  const valido =
    DOCUMENTO.test(documento.trim()) && Number.isInteger(nPresentes) && nPresentes >= 1 && nPresentes <= 40 && CODIGO_RECEPCIONISTA.test(codigo.trim()) && verificado

  const confirmar = async () => {
    if (!valido || !ventana.habilitado) return
    setEnviando(true)
    setError('')
    setErrores({})
    try {
      const r = await aprobarCheckin(reserva.orderId, {
        documentoPresentado: documento.trim(),
        huespedesPresentes: nPresentes,
        codigoRecepcionista: codigo.trim(),
        ...(observaciones.trim() && { observaciones: observaciones.trim() }),
        documentoVerificadoFisicamente: true,
      })
      guardarCodigo(codigo.trim())
      onHecho(r, `Check-in aprobado para ${reserva.codigoReserva}. Habitación: ${r.habitacionAsignada ?? r.habitacionNombre}.`)
    } catch (e) {
      setErrores(erroresPorCampo(e))
      setError(mensajeDeError(e, 'No se pudo aprobar el check-in.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <DialogoConfirmacion
      abierto
      amplio
      onAbiertoCambia={(abierto) => !abierto && !enviando && onCerrar()}
      titulo="Check-in en recepción"
      etiquetaConfirmar="Aprobar check-in"
      etiquetaCancelar="Volver"
      confirmando={enviando}
      confirmarDeshabilitado={!valido || !ventana.habilitado}
      onConfirmar={confirmar}
    >
      <ResumenReserva reserva={reserva} />
      {!ventana.habilitado && (
        <p role="status" className="mt-4 rounded-2xl bg-[var(--dutch-white)] px-4 py-3 text-sm text-ink">
          {ventana.motivo}
        </p>
      )}
      <form
        className="mt-4 flex flex-col gap-4"
        onSubmit={(ev) => {
          ev.preventDefault()
          void confirmar()
        }}
      >
        <CampoTexto
          etiqueta="Documento del titular"
          required
          autoComplete="off"
          value={documento}
          onChange={(e) => setDocumento(e.target.value)}
          error={errores.documentoPresentado}
          ayuda={
            reserva.titular.documentoRegistrado
              ? 'Escribe el documento que presenta el titular: debe coincidir con el registrado en la reserva.'
              : 'Esta reserva no tiene documento registrado: se guarda el que presenta el titular.'
          }
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CampoTexto
            etiqueta="Huéspedes presentes"
            type="number"
            inputMode="numeric"
            min={1}
            max={40}
            required
            value={presentes}
            onChange={(e) => setPresentes(e.target.value)}
            error={errores.huespedesPresentes}
          />
          <CampoTexto
            etiqueta="Código del recepcionista"
            required
            autoComplete="off"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            error={errores.codigoRecepcionista}
            ayuda="Tu código o identificador en este turno."
          />
        </div>
        <CampoArea etiqueta="Observaciones de recepción" maxLength={500} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
        <label className="flex items-start gap-3 rounded-2xl border border-border p-3 text-sm text-ink">
          <input type="checkbox" required checked={verificado} onChange={(e) => setVerificado(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-primary)]" />
          <span>
            Se verificó físicamente el documento de identidad <span className="text-error">*</span>
          </span>
        </label>
      </form>
      <ErrorAccion texto={error} />
    </DialogoConfirmacion>
  )
}

// ───────────────────────── R8: reasignar habitación ─────────────────────────

export function ModalReasignar({ reserva, onCerrar, onHecho }: PropsModal) {
  const [opciones, setOpciones] = useState<HabitacionReasignable[] | null>(null)
  const [habitacionId, setHabitacionId] = useState('')
  const [etiqueta, setEtiqueta] = useState('')
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let vigente = true
    listarHabitacionesReasignables(reserva.orderId)
      .then((lista) => vigente && setOpciones(lista))
      .catch((e: unknown) => {
        if (!vigente) return
        setOpciones([])
        setError(mensajeDeError(e, 'No se pudieron cargar las habitaciones disponibles.'))
      })
    return () => {
      vigente = false
    }
  }, [reserva.orderId])

  const confirmar = async () => {
    if (!habitacionId) return
    setEnviando(true)
    setError('')
    try {
      const r = await reasignarHabitacion(reserva.orderId, {
        habitacionId,
        ...(etiqueta.trim() && { etiqueta: etiqueta.trim() }),
        ...(motivo.trim() && { motivo: motivo.trim() }),
      })
      onHecho(r, `Habitación de ${reserva.codigoReserva} reasignada a ${r.habitacionAsignada ?? r.habitacionNombre}.`)
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo reasignar la habitación.'))
    } finally {
      setEnviando(false)
    }
  }

  const otras = opciones?.filter((o) => !o.actual).length ?? 0

  return (
    <DialogoConfirmacion
      abierto
      amplio
      onAbiertoCambia={(abierto) => !abierto && !enviando && onCerrar()}
      titulo="Reasignar habitación"
      etiquetaConfirmar="Reasignar"
      etiquetaCancelar="Volver"
      confirmando={enviando}
      confirmarDeshabilitado={!habitacionId}
      onConfirmar={confirmar}
    >
      <ResumenReserva reserva={reserva} />
      <div className="mt-4 flex flex-col gap-4" aria-busy={opciones === null}>
        {opciones === null ? (
          <p className="text-sm text-muted-foreground">Buscando habitaciones con disponibilidad en estas fechas…</p>
        ) : (
          <>
            <CampoSelect etiqueta="Nueva habitación" required value={habitacionId} onChange={(e) => setHabitacionId(e.target.value)}>
              <option value="">Elige una habitación</option>
              {opciones.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre} · {o.tipo}
                  {o.actual ? ' (tipo reservado)' : ''}
                </option>
              ))}
            </CampoSelect>
            {otras === 0 && <p className="text-sm text-muted-foreground">No hay otras habitaciones con disponibilidad en estas fechas.</p>}
            <CampoTexto etiqueta="Número de habitación" maxLength={20} value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} ayuda="Opcional: el número físico, por ejemplo 204." />
            <CampoTexto etiqueta="Motivo" maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            <p className="text-xs text-muted-foreground">Cambia solo la habitación asignada en el hotel; la reserva y su tarifa no cambian.</p>
          </>
        )}
      </div>
      <ErrorAccion texto={error} />
    </DialogoConfirmacion>
  )
}

// ───────────────────────── R8: edición rápida (huéspedes y observaciones) ─────────────────────────

const aEdades = (texto: string): number[] | null => {
  const partes = texto
    .split(/[,\s]+/)
    .map((p) => p.trim())
    .filter(Boolean)
  const edades = partes.map(Number)
  return edades.every((n) => Number.isInteger(n) && n >= 0 && n <= 17) && edades.length <= 10 ? edades : null
}

export function ModalEdicion({ reserva, onCerrar, onHecho }: PropsModal) {
  const [adultos, setAdultos] = useState(String(reserva.huespedes.adultos))
  const [ninos, setNinos] = useState(reserva.huespedes.ninos.join(', '))
  const [observaciones, setObservaciones] = useState(reserva.observaciones ?? '')
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const nAdultos = Number(adultos)
  const edades = aEdades(ninos)
  const adultosValidos = Number.isInteger(nAdultos) && nAdultos >= 1 && nAdultos <= 20
  const cambianHuespedes = adultosValidos && edades !== null && (nAdultos !== reserva.huespedes.adultos || edades.join(',') !== reserva.huespedes.ninos.join(','))
  const cambianObservaciones = observaciones.trim() !== (reserva.observaciones ?? '').trim()

  const confirmar = async () => {
    if (!adultosValidos || edades === null) return
    setEnviando(true)
    setError('')
    try {
      let r = reserva
      if (cambianHuespedes) r = await cambiarHuespedes(reserva.orderId, { adultos: nAdultos, ninos: edades, ...(motivo.trim() && { motivo: motivo.trim() }) })
      if (cambianObservaciones) r = await cambiarObservaciones(reserva.orderId, { observaciones: observaciones.trim(), ...(motivo.trim() && { motivo: motivo.trim() }) })
      onHecho(r, cambianHuespedes || cambianObservaciones ? `Datos de ${reserva.codigoReserva} actualizados.` : 'No había cambios que guardar.')
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudieron guardar los cambios.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <DialogoConfirmacion
      abierto
      amplio
      onAbiertoCambia={(abierto) => !abierto && !enviando && onCerrar()}
      titulo="Editar huéspedes y observaciones"
      etiquetaConfirmar="Guardar cambios"
      etiquetaCancelar="Volver"
      confirmando={enviando}
      confirmarDeshabilitado={!adultosValidos || edades === null}
      onConfirmar={confirmar}
    >
      <ResumenReserva reserva={reserva} />
      <div className="mt-4 flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CampoTexto
            etiqueta="Adultos"
            type="number"
            inputMode="numeric"
            min={1}
            max={20}
            required
            value={adultos}
            onChange={(e) => setAdultos(e.target.value)}
            error={adultosValidos ? undefined : 'Entre 1 y 20 adultos'}
          />
          <CampoTexto
            etiqueta="Edades de los niños"
            value={ninos}
            onChange={(e) => setNinos(e.target.value)}
            placeholder="Ej. 4, 9"
            error={edades === null ? 'Edades de 0 a 17 separadas por coma (máximo 10)' : undefined}
          />
        </div>
        <CampoArea etiqueta="Observaciones del huésped" maxLength={500} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
        <CampoTexto etiqueta="Motivo" maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      </div>
      <ErrorAccion texto={error} />
    </DialogoConfirmacion>
  )
}

// ───────────────────────── Early check-in (solo administrador del alojamiento o superadmin) ─────────────────────────

const ahoraLocalGuayaquil = (): string => new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 16)

export function ModalEarlyCheckin({ reserva, onCerrar, onHecho }: PropsModal) {
  const [desde, setDesde] = useState(ahoraLocalGuayaquil)
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const confirmar = async () => {
    setEnviando(true)
    setError('')
    try {
      const r = await autorizarEarlyCheckin(reserva.orderId, { desde: datetimeLocalAGuayaquil(desde), ...(motivo.trim() && { motivo: motivo.trim() }) })
      onHecho(r, `Early check-in autorizado para ${reserva.codigoReserva} desde el ${horaGuayaquil(r.checkinHabilitadoDesde)}.`)
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo autorizar el early check-in.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <DialogoConfirmacion
      abierto
      onAbiertoCambia={(abierto) => !abierto && !enviando && onCerrar()}
      titulo="Autorizar early check-in"
      etiquetaConfirmar="Autorizar"
      etiquetaCancelar="Volver"
      confirmando={enviando}
      confirmarDeshabilitado={!desde}
      onConfirmar={confirmar}
    >
      <p className="text-muted-foreground">
        {reserva.codigoReserva} · llegada {formatearFecha(reserva.llegada)}. La recepción podrá aprobar el check-in desde la hora que indiques (hora de
        Guayaquil).
      </p>
      <div className="mt-4 flex flex-col gap-4">
        <CampoTexto etiqueta="Habilitar desde" type="datetime-local" required value={desde} onChange={(e) => setDesde(e.target.value)} />
        <CampoTexto etiqueta="Motivo" maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      </div>
      <ErrorAccion texto={error} />
    </DialogoConfirmacion>
  )
}

// ───────────────────────── Check-out (CHECKED_IN → CHECKED_OUT, habitación física SUCIA) ─────────────────────────

interface FilaConsumo {
  item: string
  cantidad: string
  precio: string
}

const PRECIO = /^\d{1,9}([.,]\d{1,2})?$/
const MAXIMO_PRECIO = 999_999_999.99
const aMoney = (texto: string): string | null => {
  const t = texto.trim()
  if (!PRECIO.test(t)) return null
  const n = Number(t.replace(',', '.'))
  return n > 0 && n <= MAXIMO_PRECIO ? n.toFixed(2) : null
}
const METODOS_PAGO: { id: MetodoPagoConsumos; etiqueta: string }[] = [
  { id: 'CARGO_A_RESERVA', etiqueta: 'Cargo a la reserva' },
  { id: 'EFECTIVO', etiqueta: 'Efectivo' },
  { id: 'TARJETA_REGISTRADA', etiqueta: 'Tarjeta registrada' },
]

export function ModalCheckout({ reserva, onCerrar, onHecho }: { reserva: ReservaRecepcion; onCerrar: () => void; onHecho: (aviso: string) => void }) {
  const [consumos, setConsumos] = useState<FilaConsumo[]>([])
  const [metodo, setMetodo] = useState<MetodoPagoConsumos>('CARGO_A_RESERVA')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  // Una fila totalmente vacía se ignora; una a medio llenar bloquea la confirmación
  const llenas = consumos.filter((c) => c.item.trim() || c.precio.trim())
  const cantidadValida = (c: FilaConsumo) => c.cantidad.trim() === '' || (Number.isInteger(Number(c.cantidad)) && Number(c.cantidad) >= 1 && Number(c.cantidad) <= 100)
  const filaValida = (c: FilaConsumo) => c.item.trim().length >= 1 && c.item.trim().length <= 80 && aMoney(c.precio) !== null && cantidadValida(c)
  const valido = llenas.every(filaValida)

  const cambiar = (i: number, campo: keyof FilaConsumo, valor: string) => setConsumos((fs) => fs.map((f, j) => (j === i ? { ...f, [campo]: valor } : f)))

  const confirmar = async () => {
    if (!valido) return
    setEnviando(true)
    setError('')
    try {
      const datos: DatosCheckout = {
        ...(llenas.length > 0 && {
          consumosMinibar: llenas.map((c) => ({
            item: c.item.trim(),
            ...(c.cantidad.trim() && { cantidad: Number(c.cantidad) }),
            precio: aMoney(c.precio) as string,
          })),
          metodoPagoConsumos: metodo,
        }),
      }
      const r = await realizarCheckout(reserva.orderId, datos)
      const total = Number(r.consumosAdicionales) > 0 ? ` Consumos cargados: $${r.consumosAdicionales}.` : ''
      onHecho(
        `Check-out realizado: ${reserva.codigoReserva} pasó a estado "Por Limpiar". La habitación permanecerá bloqueada en el inventario hasta que sea marcada como Limpia y Lista.${total}`,
      )
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo realizar el check-out.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <DialogoConfirmacion
      abierto
      amplio
      onAbiertoCambia={(abierto) => !abierto && !enviando && onCerrar()}
      titulo="Check-out"
      etiquetaConfirmar="Confirmar check-out"
      etiquetaCancelar="Volver"
      confirmando={enviando}
      confirmarDeshabilitado={!valido}
      onConfirmar={confirmar}
    >
      <ResumenReserva reserva={reserva} />
      <ul className="mt-4 list-disc space-y-1 rounded-2xl bg-surface-muted py-3 pl-8 pr-4 text-sm text-ink">
        <li>Recibe las llaves de la habitación {reserva.habitacionAsignada ?? reserva.habitacionNombre}.</li>
        <li>El PIN digital de la reserva se revoca automáticamente al confirmar.</li>
        <li>La reserva y habitación pasan automáticamente a estado <strong>Por Limpiar</strong> y permanecerán bloqueadas en inventario hasta marcarla como Limpia y Lista.</li>
      </ul>

      <fieldset className="mt-4 flex flex-col gap-3">
        <legend className="text-[13px] font-medium text-ink">Consumos adicionales de minibar (opcional)</legend>
        {consumos.map((c, i) => (
          <div key={i} className="grid grid-cols-[1fr_5rem_7rem_auto] items-start gap-2">
            <CampoTexto etiqueta={i === 0 ? 'Producto' : 'Producto ' + (i + 1)} maxLength={80} value={c.item} onChange={(e) => cambiar(i, 'item', e.target.value)} />
            <CampoTexto etiqueta="Cant." type="number" inputMode="numeric" min={1} max={100} value={c.cantidad} onChange={(e) => cambiar(i, 'cantidad', e.target.value)} />
            <CampoTexto
              etiqueta="Precio unit."
              inputMode="decimal"
              placeholder="3.50"
              value={c.precio}
              onChange={(e) => cambiar(i, 'precio', e.target.value)}
              error={c.precio.trim() && aMoney(c.precio) === null ? 'Ej. 3.50' : undefined}
            />
            <button
              type="button"
              onClick={() => setConsumos((fs) => fs.filter((_, j) => j !== i))}
              className="mt-7 text-xs font-semibold text-error underline"
              aria-label={`Quitar consumo ${i + 1}`}
            >
              Quitar
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setConsumos((fs) => [...fs, { item: '', cantidad: '', precio: '' }])}
          disabled={consumos.length >= 50}
          className="self-start text-sm font-semibold text-primary underline disabled:opacity-50"
        >
          + Agregar consumo
        </button>
        {llenas.length > 0 && (
          <CampoSelect etiqueta="Cómo se paga" value={metodo} onChange={(e) => setMetodo(e.target.value as MetodoPagoConsumos)}>
            {METODOS_PAGO.map((m) => (
              <option key={m.id} value={m.id}>
                {m.etiqueta}
              </option>
            ))}
          </CampoSelect>
        )}
      </fieldset>
      <ErrorAccion texto={error} />
    </DialogoConfirmacion>
  )
}

// ───────────────────────── Auditoría de recepción ─────────────────────────

export function ModalAuditoria({ reserva, onCerrar }: { reserva: ReservaRecepcion; onCerrar: () => void }) {
  const [registros, setRegistros] = useState<RegistroAuditoriaRecepcion[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let vigente = true
    listarAuditoriaRecepcion(reserva.orderId)
      .then((lista) => vigente && setRegistros(lista))
      .catch((e: unknown) => {
        if (!vigente) return
        setRegistros([])
        setError(mensajeDeError(e, 'No se pudo cargar el historial de auditoría.'))
      })
    return () => {
      vigente = false
    }
  }, [reserva.orderId])

  return (
    <DialogoConfirmacion
      abierto
      amplio
      onAbiertoCambia={(abierto) => !abierto && onCerrar()}
      titulo="Auditoría de recepción"
      etiquetaConfirmar="Cerrar"
      etiquetaCancelar=""
      onConfirmar={onCerrar}
    >
      <ResumenReserva reserva={reserva} />
      <div className="mt-4 flex flex-col gap-3" aria-busy={registros === null}>
        {registros === null ? (
          <p className="text-sm text-muted-foreground">Cargando registros de auditoría…</p>
        ) : registros.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay acciones registradas en recepción para esta reserva.</p>
        ) : (
          <ul className="flex flex-col gap-3 divide-y divide-border">
            {registros.map((reg) => (
              <li key={reg.id} className="pt-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink">{reg.accion}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(reg.creadoEn).toLocaleString('es-EC')} · Rol: {reg.rol}
                  </span>
                </div>
                {reg.motivo && (
                  <p className="mt-1 text-xs text-ink/80">
                    <span className="font-medium">Motivo:</span> {reg.motivo}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <ErrorAccion texto={error} />
    </DialogoConfirmacion>
  )
}

// ───────────────────────── Marcar limpia y lista ─────────────────────────

export function ModalMarcarLimpia({ reserva, onCerrar, onHecho }: PropsModal) {
  const [notas, setNotas] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const confirmar = async () => {
    setEnviando(true)
    setError('')
    try {
      const r = await marcarLimpiezaLista(reserva.orderId, notas)
      onHecho(
        r,
        `Habitación de la reserva ${reserva.codigoReserva} marcada como Limpia y Lista. La habitación queda disponible y se libera de recepción.`,
      )
    } catch (e: unknown) {
      setError(mensajeDeError(e, 'No se pudo marcar la habitación como limpia y lista.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <DialogoConfirmacion
      abierto
      onAbiertoCambia={(abierto) => !abierto && !enviando && onCerrar()}
      titulo="Marcar Limpia y Lista"
      etiquetaConfirmar="Confirmar Limpia y Lista"
      etiquetaCancelar="Volver"
      confirmando={enviando}
      onConfirmar={confirmar}
    >
      <p className="mb-4 text-sm text-muted-foreground">
        Confirma que la habitación ha sido limpiada e inspeccionada. La habitación quedará inmediatamente disponible para futuras reservas y se liberará del mostrador de recepción.
      </p>
      <ResumenReserva reserva={reserva} />
      <div className="mt-4 flex flex-col gap-4">
        <CampoArea
          etiqueta="Notas de limpieza (opcional)"
          maxLength={300}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Ej: Ropa de cama cambiada, baño desinfectado y amenities repuestos."
        />
      </div>
      <ErrorAccion texto={error} />
    </DialogoConfirmacion>
  )
}
