import { useEffect, useState, type FormEvent, type MouseEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CampoSelect } from '@/components/admin/CampoSelect'
import { CampoTexto } from '@/components/CampoTexto'
import { Button, buttonVariants } from '@/components/ui/button'
import { useAlojamientosAdmin } from '@/hooks/useAlojamientosAdmin'
import { ApiError } from '@/services/api'
import { erroresPorCampo, esErrorDeSesion, mensajeDeError } from '@/services/admin'
import { cerrarSesion } from '@/services/cuenta'
import { editarDisponibilidad, listarDisponibilidad, listarHabitaciones } from '@/services/habitacionesAdmin'
import type { DatosEdicionDisponibilidad, DiaDisponibilidad, DisponibilidadAdmin, EdicionDisponibilidad, ErroresCampo, HabitacionAdmin } from '@/types/admin'
import { hoyIso } from '@/lib/fechas'
import { formatearFecha, formatearPrecio } from '@/lib/formato'
import { diaSemana, diasIncluidos, esFechaReal, fechasDelRango, nombreMes, sumarDias } from '@/lib/rangoFechas'
import { cn } from '@/lib/utils'
import { EncabezadoAdmin } from './EncabezadoAdmin'

const MAXIMO_DIAS = 366
/** Días de la semana en el orden de la cuadrícula (lunes primero) con su número del backend (0 = domingo) */
const SEMANA: { etiqueta: string; corta: string; numero: number }[] = [
  { etiqueta: 'Lunes', corta: 'Lun', numero: 1 },
  { etiqueta: 'Martes', corta: 'Mar', numero: 2 },
  { etiqueta: 'Miércoles', corta: 'Mié', numero: 3 },
  { etiqueta: 'Jueves', corta: 'Jue', numero: 4 },
  { etiqueta: 'Viernes', corta: 'Vie', numero: 5 },
  { etiqueta: 'Sábado', corta: 'Sáb', numero: 6 },
  { etiqueta: 'Domingo', corta: 'Dom', numero: 0 },
]
const TODOS_LOS_DIAS = SEMANA.map((d) => d.numero)
const RANGOS_RAPIDOS = [
  { etiqueta: '4 semanas', dias: 28 },
  { etiqueta: '3 meses', dias: 91 },
  { etiqueta: '6 meses', dias: 182 },
  { etiqueta: '1 año', dias: 365 },
]

type ResultadoHabitaciones = { clave: string; lista: HabitacionAdmin[] } | { clave: string; error: string; noEncontrado: boolean }
type ResultadoDias = { clave: string; datos: DisponibilidadAdmin } | { clave: string; error: string; noEncontrado: boolean }

/** Lunes de la semana de una fecha (la cuadrícula empieza en lunes) */
const lunesDe = (iso: string) => sumarDias(iso, -((diaSemana(iso) + 6) % 7))
const domingoDe = (iso: string) => sumarDias(iso, (7 - diaSemana(iso)) % 7)

/** "2026-11-06: hay 2 habitaciones vendidas; cuposTotales no puede ser menor que 2" -> texto para la persona */
function motivoConflicto(fecha: string, razon: string): string {
  const vendidas = razon.match(/hay (\d+) habitaci/)
  return vendidas
    ? `${formatearFecha(fecha)}: ya hay ${vendidas[1]} ${vendidas[1] === '1' ? 'habitación vendida' : 'habitaciones vendidas'}; los cupos totales no pueden ser menos de ${vendidas[1]}.`
    : `${formatearFecha(fecha)}: ${razon}`
}

/**
 * Cupos y precios por noche de una habitación. La cuadrícula muestra el rango elegido (máx. 366 días); el editor
 * cambia cuposTotales y/o precio en un rango, primero en vista previa (dryRun) y luego guardando. Todo o nada: si en
 * alguna fecha los cupos quedarían por debajo de lo vendido, el backend responde 409 y se marcan esas fechas.
 */
export default function DisponibilidadPage() {
  const hoy = hoyIso()
  const { alojamientos, error: errorAlojamientos } = useAlojamientosAdmin()
  const [params, setParams] = useSearchParams()

  const alojamientoId = Number(params.get('alojamiento')) || alojamientos?.[0]?.id
  const alojamiento = alojamientos?.find((a) => a.id === alojamientoId)
  const moneda = alojamiento?.moneda ?? 'USD'

  const desdeUrl = params.get('desde') ?? ''
  const hastaUrl = params.get('hasta') ?? ''
  const desde = esFechaReal(desdeUrl) ? desdeUrl : hoy
  const hasta = esFechaReal(hastaUrl) ? hastaUrl : sumarDias(desde, 27)
  const errorRango =
    hasta < desde ? 'La fecha final debe ser igual o posterior a la inicial.' : diasIncluidos(desde, hasta) > MAXIMO_DIAS ? `El rango no puede pasar de ${MAXIMO_DIAS} días.` : ''

  const cambiarParams = (cambios: Record<string, string | undefined>) => {
    const nuevos = new URLSearchParams(params)
    for (const [k, v] of Object.entries(cambios)) {
      if (v) nuevos.set(k, v)
      else nuevos.delete(k)
    }
    setParams(nuevos, { replace: true })
  }

  // ── Habitaciones del alojamiento ──
  const [resHab, setResHab] = useState<ResultadoHabitaciones | null>(null)
  const claveHab = String(alojamientoId)
  useEffect(() => {
    if (alojamientoId === undefined) return
    let vigente = true
    listarHabitaciones(alojamientoId, true)
      .then((lista) => vigente && setResHab({ clave: claveHab, lista }))
      .catch((e: unknown) => {
        if (!vigente) return
        if (esErrorDeSesion(e)) void cerrarSesion()
        setResHab({ clave: claveHab, error: mensajeDeError(e), noEncontrado: e instanceof ApiError && (e.status === 404 || e.status === 400) })
      })
    return () => {
      vigente = false
    }
  }, [claveHab, alojamientoId])
  const habitaciones = resHab?.clave === claveHab && 'lista' in resHab ? resHab.lista : null
  const errorHab = resHab?.clave === claveHab && 'error' in resHab ? resHab : null
  const habitacionId = params.get('habitacion') ?? habitaciones?.[0]?.id
  const habitacion = habitaciones?.find((h) => h.id === habitacionId)

  // ── Días del rango ──
  const [version, setVersion] = useState(0)
  const [resDias, setResDias] = useState<ResultadoDias | null>(null)
  const claveDias = `${habitacionId}|${desde}|${hasta}|${version}`
  useEffect(() => {
    if (!habitacionId || errorRango) return
    let vigente = true
    listarDisponibilidad(habitacionId, desde, hasta)
      .then((datos) => vigente && setResDias({ clave: claveDias, datos }))
      .catch((e: unknown) => {
        if (!vigente) return
        if (esErrorDeSesion(e)) void cerrarSesion()
        setResDias({ clave: claveDias, error: mensajeDeError(e), noEncontrado: e instanceof ApiError && (e.status === 404 || e.status === 400) })
      })
    return () => {
      vigente = false
    }
  }, [claveDias, habitacionId, desde, hasta, errorRango])
  const datosDias = resDias && 'datos' in resDias && resDias.datos.habitacionId === habitacionId ? resDias.datos : null
  const errorDias = resDias?.clave === claveDias && 'error' in resDias ? resDias : null
  const cargandoDias = !!habitacionId && !errorRango && resDias?.clave !== claveDias
  const porFecha = new Map<string, DiaDisponibilidad>((datosDias?.dias ?? []).map((d) => [d.fecha, d]))

  // ── Editor ── (empieza sin rango: se elige tocando días del calendario o escribiendo las fechas)
  const [edDesde, setEdDesde] = useState('')
  const [edHasta, setEdHasta] = useState('')
  const [cupos, setCupos] = useState('')
  const [precio, setPrecio] = useState('')
  const [dias, setDias] = useState<number[]>(TODOS_LOS_DIAS)
  const [errores, setErrores] = useState<ErroresCampo>({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [enviando, setEnviando] = useState<'' | 'vista' | 'guardar'>('')
  const [aviso, setAviso] = useState('')
  const [vista, setVista] = useState<{ clave: string; resultado: EdicionDisponibilidad } | null>(null)
  const [conflicto, setConflicto] = useState<{ clave: string; detalle: string; fechas: Map<string, string> } | null>(null)

  // La vista previa y los conflictos valen solo para los mismos datos: cualquier cambio en el formulario los invalida
  const claveEdicion = JSON.stringify([habitacionId, edDesde, edHasta, cupos.trim(), precio.trim(), [...dias].sort()])
  const vistaVigente = vista?.clave === claveEdicion ? vista.resultado : null
  const conflictoVigente = conflicto?.clave === claveEdicion ? conflicto : null
  const cambiosVista = new Map((vistaVigente?.cambios ?? []).filter((c) => c.accion !== 'sin_cambios').map((c) => [c.fecha, c]))

  const validar = (): { errores: ErroresCampo; datos?: DatosEdicionDisponibilidad } => {
    const e: ErroresCampo = {}
    if (!esFechaReal(edDesde)) e.desde = 'Elige la fecha inicial.'
    else if (edDesde < hoy) e.desde = 'No se pueden editar días pasados: empieza hoy o después.'
    if (!esFechaReal(edHasta)) e.hasta = 'Elige la fecha final.'
    else if (esFechaReal(edDesde) && edHasta < edDesde) e.hasta = 'Debe ser igual o posterior a la fecha inicial.'
    else if (esFechaReal(edDesde) && diasIncluidos(edDesde, edHasta) > MAXIMO_DIAS) e.hasta = `El rango no puede pasar de ${MAXIMO_DIAS} días.`
    const textoCupos = cupos.trim()
    const textoPrecio = precio.trim().replace(',', '.')
    if (textoCupos && (!/^\d+$/.test(textoCupos) || Number(textoCupos) > 10000)) e.cuposTotales = 'Escribe un número entero entre 0 y 10000.'
    if (textoPrecio && (!/^\d+(\.\d{1,2})?$/.test(textoPrecio) || Number(textoPrecio) > 99999999.99)) e.precio = 'Escribe un precio de 0 o más, con máximo 2 decimales.'
    if (!textoCupos && !textoPrecio) e.cuposTotales = 'Escribe los cupos totales, el precio o ambos.'
    if (dias.length === 0) e.diasSemana = 'Elige al menos un día de la semana.'
    else if (!e.desde && !e.hasta && !fechasDelRango(edDesde, edHasta).some((f) => dias.includes(diaSemana(f))))
      e.diasSemana = 'Ningún día del rango cae en los días de la semana elegidos.'
    if (Object.keys(e).length) return { errores: e }
    return {
      errores: {},
      datos: {
        desde: edDesde,
        hasta: edHasta,
        ...(textoCupos && { cuposTotales: Number(textoCupos) }),
        ...(textoPrecio && { precio: Number(textoPrecio) }),
        ...(dias.length < 7 && { diasSemana: [...dias].sort() }),
      },
    }
  }

  const enviar = async (dryRun: boolean) => {
    if (!habitacionId) return
    const { errores: nuevos, datos } = validar()
    setErrores(nuevos)
    setErrorGeneral('')
    setAviso('')
    if (!datos) return
    setEnviando(dryRun ? 'vista' : 'guardar')
    try {
      const resultado = await editarDisponibilidad(habitacionId, { ...datos, dryRun })
      setConflicto(null)
      if (dryRun) setVista({ clave: claveEdicion, resultado })
      else {
        const { creados, actualizados } = resultado.resumen
        setAviso(`Guardaste los cambios: ${creados} ${creados === 1 ? 'día nuevo' : 'días nuevos'} y ${actualizados} ${actualizados === 1 ? 'día actualizado' : 'días actualizados'}.`)
        setVista(null)
        setVersion((v) => v + 1)
      }
    } catch (e) {
      if (esErrorDeSesion(e)) {
        await cerrarSesion()
        return
      }
      setVista(null)
      if (e instanceof ApiError && e.status === 409) {
        const fechas = new Map<string, string>()
        for (const p of e.problem?.invalidParams ?? []) {
          const fecha = p.name.match(/^cuposTotales\[(\d{4}-\d{2}-\d{2})\]$/)?.[1]
          if (fecha) fechas.set(fecha, motivoConflicto(fecha, p.reason))
        }
        setConflicto({ clave: claveEdicion, detalle: mensajeDeError(e), fechas })
        setVersion((v) => v + 1) // lo vendido pudo cambiar: se refresca la cuadrícula
      } else {
        const porCampo = erroresPorCampo(e)
        setErrores(porCampo)
        setErrorGeneral(Object.keys(porCampo).length ? 'Revisa los campos marcados.' : mensajeDeError(e, 'No se pudo editar la disponibilidad.'))
      }
    } finally {
      setEnviando('')
    }
  }

  const elegirDia = (fecha: string, evento: MouseEvent) => {
    if (evento.shiftKey && edDesde && fecha >= edDesde) setEdHasta(fecha)
    else {
      setEdDesde(fecha)
      setEdHasta(fecha)
    }
  }

  const alternarDia = (numero: number) => setDias((d) => (d.includes(numero) ? d.filter((x) => x !== numero) : [...d, numero]))

  // ── Cuadrícula ──
  const celdas = errorRango ? [] : fechasDelRango(lunesDe(desde), domingoDe(hasta))
  const enEdicion = (f: string) => !!edDesde && !!edHasta && f >= edDesde && f <= edHasta && dias.includes(diaSemana(f))

  return (
    <>
      <EncabezadoAdmin titulo="Disponibilidad" descripcion="Cupos y precios por noche de cada habitación." />

      {errorAlojamientos ? (
        <p role="alert" className="rounded-2xl bg-white p-5 text-sm font-medium text-error">
          {errorAlojamientos}
        </p>
      ) : alojamientos && alojamientos.length === 0 && !params.get('alojamiento') ? (
        // Sin alojamientos propios. Si la URL pide uno concreto (enlace ajeno), se intenta y el 404 dice "no encontrado".
        <div className="rounded-[20px] border border-border bg-white p-6">
          <p className="text-muted-foreground">Primero crea un alojamiento y sus habitaciones.</p>
          <Link to="/admin/alojamientos/nuevo" className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}>
            Crear alojamiento
          </Link>
        </div>
      ) : (
        <>
          {/* Qué se muestra */}
          <div className="grid grid-cols-1 gap-4 rounded-[20px] border border-border bg-white p-5 md:grid-cols-2 xl:grid-cols-4">
            <CampoSelect
              etiqueta="Alojamiento"
              value={alojamientoId ?? ''}
              onChange={(e) => cambiarParams({ alojamiento: e.target.value, habitacion: undefined })}
              disabled={!alojamientos}
            >
              {!alojamientos && <option value="">Cargando…</option>}
              {alojamientos?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                  {a.activo ? '' : ' (dado de baja)'}
                </option>
              ))}
            </CampoSelect>
            <CampoSelect
              etiqueta="Habitación"
              value={habitacionId ?? ''}
              onChange={(e) => cambiarParams({ alojamiento: String(alojamientoId), habitacion: e.target.value })}
              disabled={!habitaciones || habitaciones.length === 0}
            >
              {!habitaciones && <option value="">Cargando…</option>}
              {habitaciones?.length === 0 && <option value="">Sin habitaciones</option>}
              {habitaciones?.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.nombre}
                  {h.activo ? '' : ' (desactivada)'}
                </option>
              ))}
            </CampoSelect>
            <CampoTexto etiqueta="Ver desde" type="date" value={desde} onChange={(e) => e.target.value && cambiarParams({ desde: e.target.value })} />
            <CampoTexto
              etiqueta="Ver hasta"
              type="date"
              value={hasta}
              min={desde}
              onChange={(e) => e.target.value && cambiarParams({ hasta: e.target.value })}
              error={errorRango}
            />
            <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-4">
              {RANGOS_RAPIDOS.map((r) => (
                <Button key={r.dias} type="button" size="sm" variant="outline" onClick={() => cambiarParams({ hasta: sumarDias(desde, r.dias - 1) })}>
                  {r.etiqueta}
                </Button>
              ))}
              {desde !== hoy && (
                <Button type="button" size="sm" variant="ghost" onClick={() => cambiarParams({ desde: hoy, hasta: sumarDias(hoy, Math.min(diasIncluidos(desde, hasta), MAXIMO_DIAS) - 1) })}>
                  Desde hoy
                </Button>
              )}
            </div>
          </div>

          {errorHab?.noEncontrado || errorDias?.noEncontrado ? (
            <p className="mt-6 rounded-[20px] border border-border bg-white p-6 text-muted-foreground">
              No encontramos este alojamiento o esta habitación entre los que administras.
            </p>
          ) : habitaciones && habitaciones.length === 0 ? (
            <div className="mt-6 rounded-[20px] border border-border bg-white p-6">
              <p className="text-muted-foreground">Este alojamiento todavía no tiene habitaciones.</p>
              <Link to={`/admin/habitaciones/nueva?alojamiento=${alojamientoId}`} className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}>
                Agregar una habitación
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              {/* Cuadrícula */}
              <section aria-label="Calendario de disponibilidad" aria-busy={cargandoDias} className="min-w-0 rounded-[20px] border border-border bg-white p-3 sm:p-5">
                {habitacion && !habitacion.activo && (
                  <p className="mb-3 rounded-xl bg-surface-muted px-3 py-2 text-sm text-muted-foreground">
                    Esta habitación está desactivada: puedes preparar su disponibilidad, pero no se vende hasta reactivarla.
                  </p>
                )}
                {errorHab || errorDias ? (
                  <p role="alert" className="text-sm font-medium text-error">
                    {(errorHab ?? errorDias)?.error}
                  </p>
                ) : errorRango ? (
                  <p className="text-sm text-muted-foreground">Corrige el rango para ver el calendario.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground sm:text-xs" aria-hidden="true">
                      {SEMANA.map((d) => (
                        <span key={d.numero}>{d.corta}</span>
                      ))}
                    </div>
                    <div className={cn('mt-1 grid grid-cols-7 gap-1 transition-opacity', cargandoDias && 'opacity-50')}>
                      {celdas.map((fecha) => {
                        const fuera = fecha < desde || fecha > hasta
                        if (fuera) return <span key={fecha} aria-hidden="true" />
                        const dia = porFecha.get(fecha)
                        const pasado = fecha < hoy
                        const cambio = cambiosVista.get(fecha)
                        const choca = conflictoVigente?.fechas.has(fecha)
                        const mostrado = cambio?.despues ?? dia
                        const primero = fecha === desde || fecha.endsWith('-01')
                        const descripcion = [
                          formatearFecha(fecha),
                          mostrado
                            ? `${mostrado.cupos} de ${mostrado.cuposTotales} libres, ${mostrado.vendidas} ${mostrado.vendidas === 1 ? 'vendida' : 'vendidas'}, ${formatearPrecio(mostrado.precio, moneda)}`
                            : 'sin cupos cargados (no se vende)',
                          cambio ? (cambio.accion === 'crear' ? 'se creará' : 'cambiará') : '',
                          choca ? 'en conflicto' : '',
                          pasado ? 'día pasado' : '',
                        ]
                          .filter(Boolean)
                          .join(', ')
                        return (
                          <button
                            key={fecha}
                            type="button"
                            data-fecha={fecha}
                            disabled={pasado}
                            onClick={(e) => elegirDia(fecha, e)}
                            aria-label={descripcion}
                            title={descripcion}
                            className={cn(
                              'relative flex min-h-[64px] flex-col items-start rounded-lg border p-1 text-left text-[11px] leading-tight transition-colors outline-none focus-visible:outline-2 focus-visible:outline-primary sm:min-h-[76px] sm:p-1.5 sm:text-xs',
                              pasado ? 'cursor-default border-transparent bg-surface-muted/60 text-muted-foreground' : 'border-border hover:border-primary',
                              !pasado && enEdicion(fecha) && 'ring-2 ring-primary/60',
                              cambio && 'bg-[var(--dutch-white)]',
                              choca && 'border-error bg-error/10',
                            )}
                          >
                            <span className="font-semibold text-ink">
                              {Number(fecha.slice(8))}
                              {primero && <span className="ml-1 font-normal text-muted-foreground">{nombreMes(fecha).slice(0, 3)}</span>}
                            </span>
                            {mostrado ? (
                              <>
                                <span className="mt-auto truncate font-medium text-ink">{formatearPrecio(mostrado.precio, moneda)}</span>
                                <span className={cn('truncate', mostrado.cupos === 0 ? 'font-medium text-error' : 'text-muted-foreground')}>
                                  {mostrado.cupos === 0 && mostrado.cuposTotales > 0 ? 'Agotado' : `${mostrado.cupos}/${mostrado.cuposTotales}`}
                                </span>
                              </>
                            ) : (
                              <span className="mt-auto text-muted-foreground">—</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Cada día muestra el precio y los cupos libres de los totales. «—» = sin cupos cargados (no se vende). Toca un día para editarlo;
                      con Mayús, extiende el rango hasta ese día.
                    </p>
                  </>
                )}
              </section>

              {/* Editor */}
              <form
                onSubmit={(e: FormEvent) => {
                  e.preventDefault()
                  void enviar(true)
                }}
                noValidate
                aria-label="Editar disponibilidad"
                className="flex flex-col gap-4 self-start rounded-[20px] border border-border bg-white p-5"
              >
                <h2 className="font-heading text-lg font-medium text-ink">Editar un rango</h2>
                <div className="grid grid-cols-2 gap-3">
                  <CampoTexto etiqueta="Desde" type="date" required min={hoy} value={edDesde} onChange={(e) => setEdDesde(e.target.value)} error={errores.desde} />
                  <CampoTexto etiqueta="Hasta" type="date" required min={edDesde || hoy} value={edHasta} onChange={(e) => setEdHasta(e.target.value)} error={errores.hasta} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <CampoTexto etiqueta="Cupos totales" inputMode="numeric" value={cupos} onChange={(e) => setCupos(e.target.value)} error={errores.cuposTotales} placeholder="Sin cambio" />
                  <CampoTexto etiqueta="Precio por noche" inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} error={errores.precio} placeholder="Sin cambio" />
                </div>
                <p className="-mt-2 text-xs text-muted-foreground">
                  Cupos totales = habitaciones de este tipo que existen esa noche. Los libres se ajustan solos y nunca quedan por debajo de lo vendido.
                  Para crear días nuevos hacen falta los dos.
                </p>
                <fieldset>
                  <legend className="mb-1.5 text-[13px] font-medium text-ink">Días de la semana</legend>
                  <div className="grid grid-cols-7 gap-1">
                    {SEMANA.map((d) => (
                      <label
                        key={d.numero}
                        className={cn(
                          'flex min-h-10 cursor-pointer items-center justify-center rounded-md border text-[13px] transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary',
                          dias.includes(d.numero) ? 'border-primary bg-surface-muted font-medium text-ink' : 'border-border text-muted-foreground',
                        )}
                      >
                        <input type="checkbox" className="sr-only" checked={dias.includes(d.numero)} onChange={() => alternarDia(d.numero)} aria-label={d.etiqueta} />
                        {d.corta}
                      </label>
                    ))}
                  </div>
                  {errores.diasSemana && (
                    <span role="alert" className="mt-1.5 block text-xs font-medium text-error">
                      {errores.diasSemana}
                    </span>
                  )}
                </fieldset>

                {errorGeneral && (
                  <p role="alert" className="text-sm font-medium text-error">
                    {errorGeneral}
                  </p>
                )}

                {conflictoVigente && (
                  <div role="alert" className="rounded-xl border border-error bg-error/5 p-3 text-sm text-ink">
                    <p className="font-medium text-error">No se guardó nada: en estas fechas ya hay más habitaciones vendidas.</p>
                    {conflictoVigente.fechas.size > 0 ? (
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        {[...conflictoVigente.fechas.values()].slice(0, 10).map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                        {conflictoVigente.fechas.size > 10 && <li>y {conflictoVigente.fechas.size - 10} fechas más (marcadas en rojo).</li>}
                      </ul>
                    ) : (
                      <p className="mt-2">{conflictoVigente.detalle}</p>
                    )}
                  </div>
                )}

                {vistaVigente ? (
                  <div className="rounded-xl bg-[var(--dutch-white)]/60 p-3 text-sm text-ink" aria-live="polite">
                    <p className="font-medium">Vista previa (todavía no se guardó nada)</p>
                    <p className="mt-1">
                      {vistaVigente.resumen.creados} {vistaVigente.resumen.creados === 1 ? 'día nuevo' : 'días nuevos'}, {vistaVigente.resumen.actualizados}{' '}
                      {vistaVigente.resumen.actualizados === 1 ? 'actualizado' : 'actualizados'} y {vistaVigente.resumen.sinCambios} sin cambios. Los días que cambian
                      están resaltados en el calendario.
                    </p>
                    <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs">
                      {[...cambiosVista.values()].slice(0, 31).map((c) => (
                        <li key={c.fecha}>
                          <span className="font-medium">{formatearFecha(c.fecha)}</span>:{' '}
                          {c.antes
                            ? `${c.antes.cuposTotales} → ${c.despues.cuposTotales} cupos, ${formatearPrecio(c.antes.precio, moneda)} → ${formatearPrecio(c.despues.precio, moneda)}`
                            : `nuevo: ${c.despues.cuposTotales} cupos a ${formatearPrecio(c.despues.precio, moneda)}`}
                        </li>
                      ))}
                      {cambiosVista.size > 31 && <li>y {cambiosVista.size - 31} días más.</li>}
                    </ul>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" onClick={() => void enviar(false)} disabled={!!enviando || cambiosVista.size === 0}>
                        {enviando === 'guardar' ? 'Guardando…' : 'Guardar cambios'}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setVista(null)} disabled={!!enviando}>
                        Descartar
                      </Button>
                    </div>
                    {cambiosVista.size === 0 && <p className="mt-2 text-xs">No hay nada que guardar: esos días ya tienen esos valores.</p>}
                  </div>
                ) : (
                  <Button type="submit" disabled={!!enviando || !habitacionId}>
                    {enviando === 'vista' ? 'Calculando…' : 'Ver vista previa'}
                  </Button>
                )}

                {aviso && (
                  <p role="status" className="rounded-xl bg-[var(--dutch-white)] px-3 py-2 text-sm text-ink">
                    {aviso}
                  </p>
                )}
              </form>
            </div>
          )}
        </>
      )}
    </>
  )
}
