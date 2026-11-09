import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { CampoSelect } from '@/components/admin/CampoSelect'
import { CampoTexto } from '@/components/CampoTexto'
import { Button, buttonVariants } from '@/components/ui/button'
import { useAlojamientosAdmin } from '@/hooks/useAlojamientosAdmin'
import { ApiError } from '@/services/api'
import { erroresPorCampo, esErrorDeSesion, mensajeDeError } from '@/services/admin'
import { cerrarSesion } from '@/services/cuenta'
import { actualizarHabitacion, crearHabitacion, obtenerHabitacion } from '@/services/habitacionesAdmin'
import type { DatosHabitacion, ErroresCampo, HabitacionAdmin } from '@/types/admin'
import { PLANES_COMIDA, TIPOS_CANCELACION, TIPOS_HABITACION } from '@/lib/habitaciones'
import { cn } from '@/lib/utils'
import { EncabezadoAdmin } from './EncabezadoAdmin'

interface Valores {
  nombre: string
  tipo: string
  capacidadAdultos: string
  capacidadNinos: string
  precioBase: string
  mealPlan: string
  cancellationType: string
}

const VACIO: Valores = { nombre: '', tipo: '', capacidadAdultos: '2', capacidadNinos: '0', precioBase: '', mealPlan: '', cancellationType: '' }

const desdeHabitacion = (h: HabitacionAdmin): Valores => ({
  nombre: h.nombre,
  tipo: h.tipo,
  capacidadAdultos: String(h.capacidadAdultos),
  capacidadNinos: String(h.capacidadNinos),
  precioBase: String(h.precioBase),
  mealPlan: h.mealPlan ?? '',
  cancellationType: h.cancellationType ?? '',
})

const entero = (texto: string) => (/^-?\d+$/.test(texto.trim()) ? Number(texto.trim()) : NaN)

/** Reglas de CrearHabitacionDto, con mensajes en español */
function validar(v: Valores): ErroresCampo {
  const e: ErroresCampo = {}
  if (v.nombre.trim().length < 2) e.nombre = 'Escribe un nombre de al menos 2 caracteres.'
  if (v.tipo.trim().length < 2) e.tipo = 'Escribe el tipo (al menos 2 caracteres), por ejemplo doble.'
  const adultos = entero(v.capacidadAdultos)
  if (Number.isNaN(adultos) || adultos < 1 || adultos > 100) e.capacidadAdultos = 'Escribe un número entero entre 1 y 100.'
  const ninos = entero(v.capacidadNinos)
  if (Number.isNaN(ninos) || ninos < 0 || ninos > 100) e.capacidadNinos = 'Escribe un número entero entre 0 y 100.'
  const precio = Number(v.precioBase.replace(',', '.'))
  if (!v.precioBase.trim() || Number.isNaN(precio) || precio < 0) e.precioBase = 'Escribe un precio de 0 o más.'
  else if (!/^\d+([.,]\d{1,2})?$/.test(v.precioBase.trim())) e.precioBase = 'Usa como máximo 2 decimales.'
  return e
}

const aDatos = (v: Valores): DatosHabitacion => ({
  nombre: v.nombre.trim(),
  tipo: v.tipo.trim(),
  capacidadAdultos: entero(v.capacidadAdultos),
  capacidadNinos: entero(v.capacidadNinos),
  precioBase: Number(v.precioBase.replace(',', '.')),
  mealPlan: v.mealPlan || null,
  cancellationType: v.cancellationType || null,
})

/** /admin/habitaciones/nueva?alojamiento=ID y /admin/habitaciones/:id/editar */
export default function HabitacionFormRuta() {
  const { id } = useParams()
  return <HabitacionForm key={id ?? 'nueva'} id={id} />
}

type Carga = 'cargando' | 'listo' | 'noEncontrado' | 'error'

function HabitacionForm({ id }: { id?: string }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { alojamientos } = useAlojamientosAdmin()
  const editando = id !== undefined
  const [carga, setCarga] = useState<Carga>(editando ? 'cargando' : 'listo')
  const [errorCarga, setErrorCarga] = useState('')
  const [alojamientoId, setAlojamientoId] = useState<number | undefined>(Number(params.get('alojamiento')) || undefined)
  const [valores, setValores] = useState<Valores>(VACIO)
  const [errores, setErrores] = useState<ErroresCampo>({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (id === undefined) return
    let vigente = true
    obtenerHabitacion(id)
      .then((h) => {
        if (!vigente) return
        setValores(desdeHabitacion(h))
        setAlojamientoId(h.alojamientoId)
        setCarga('listo')
      })
      .catch((e: unknown) => {
        if (!vigente) return
        if (esErrorDeSesion(e)) {
          void cerrarSesion()
          return
        }
        if (e instanceof ApiError && (e.status === 404 || e.status === 400)) setCarga('noEncontrado')
        else {
          setErrorCarga(mensajeDeError(e, 'No se pudo cargar la habitación.'))
          setCarga('error')
        }
      })
    return () => {
      vigente = false
    }
  }, [id])

  const poner = <K extends keyof Valores>(campo: K, valor: Valores[K]) => setValores((v) => ({ ...v, [campo]: valor }))
  const alojamiento = alojamientos?.find((a) => a.id === alojamientoId)
  const volver = alojamientoId ? `/admin/habitaciones?alojamiento=${alojamientoId}` : '/admin/habitaciones'

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    const nuevos = validar(valores)
    setErrores(nuevos)
    setErrorGeneral('')
    if (Object.keys(nuevos).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    if (!editando && !alojamientoId) {
      setErrorGeneral('Elige el alojamiento.')
      return
    }
    setEnviando(true)
    try {
      const guardada = editando ? await actualizarHabitacion(id, aDatos(valores)) : await crearHabitacion(alojamientoId as number, aDatos(valores))
      const aviso = editando ? `Guardaste los cambios de ${guardada.nombre}.` : `Creaste ${guardada.nombre}. Ahora carga sus cupos y precios en Disponibilidad.`
      navigate(`/admin/habitaciones?alojamiento=${guardada.alojamientoId}`, { state: { aviso } })
    } catch (e) {
      if (esErrorDeSesion(e)) {
        await cerrarSesion()
        return
      }
      if (e instanceof ApiError && e.status === 404) {
        setCarga('noEncontrado')
        return
      }
      const porCampo = erroresPorCampo(e)
      if (Object.keys(porCampo).length) {
        setErrores(porCampo)
        setErrorGeneral('Revisa los campos marcados.')
      } else setErrorGeneral(mensajeDeError(e, 'No se pudo guardar la habitación.'))
    } finally {
      setEnviando(false)
    }
  }

  if (carga === 'noEncontrado') {
    return (
      <>
        <EncabezadoAdmin titulo="Habitación no encontrada" />
        <div className="rounded-[20px] border border-border bg-white p-6">
          <p className="text-muted-foreground">No encontramos esta habitación. Puede que no exista o que sea de un alojamiento que no administras.</p>
          <Link to="/admin/habitaciones" className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}>
            Volver a habitaciones
          </Link>
        </div>
      </>
    )
  }
  if (carga === 'error') {
    return (
      <>
        <EncabezadoAdmin titulo="Editar habitación" />
        <p role="alert" className="rounded-2xl bg-white p-5 text-sm font-medium text-error">
          {errorCarga}
        </p>
      </>
    )
  }
  if (carga === 'cargando') {
    return (
      <>
        <EncabezadoAdmin titulo="Editar habitación" />
        <div role="status" aria-busy="true" className="h-[320px] animate-pulse rounded-[20px] bg-white">
          <span className="sr-only">Cargando…</span>
        </div>
      </>
    )
  }

  // Valores guardados que no están entre los conocidos se conservan como opción
  const planes = { ...PLANES_COMIDA, ...(valores.mealPlan && !PLANES_COMIDA[valores.mealPlan] ? { [valores.mealPlan]: valores.mealPlan } : {}) }
  const cancelaciones = {
    ...TIPOS_CANCELACION,
    ...(valores.cancellationType && !TIPOS_CANCELACION[valores.cancellationType] ? { [valores.cancellationType]: valores.cancellationType } : {}),
  }

  return (
    <>
      <EncabezadoAdmin
        titulo={editando ? 'Editar habitación' : 'Nueva habitación'}
        descripcion={alojamiento ? alojamiento.nombre : undefined}
      />
      <form onSubmit={enviar} noValidate aria-label={editando ? 'Editar habitación' : 'Nueva habitación'} className="flex max-w-3xl flex-col gap-6">
        <section className="flex flex-col gap-4 rounded-[20px] border border-border bg-white p-5 sm:p-6">
          {!editando && (
            <CampoSelect
              etiqueta="Alojamiento"
              required
              value={alojamientoId ?? ''}
              onChange={(e) => setAlojamientoId(Number(e.target.value) || undefined)}
              disabled={!alojamientos}
            >
              <option value="">Elige un alojamiento</option>
              {alojamientos?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </CampoSelect>
          )}
          <CampoTexto etiqueta="Nombre" required value={valores.nombre} onChange={(e) => poner('nombre', e.target.value)} error={errores.nombre} maxLength={255} ayuda="Como lo verán los huéspedes, por ejemplo Suite Familiar." />
          <CampoTexto etiqueta="Tipo" required value={valores.tipo} onChange={(e) => poner('tipo', e.target.value)} error={errores.tipo} maxLength={100} list="tipos-habitacion" />
          <datalist id="tipos-habitacion">
            {TIPOS_HABITACION.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <CampoTexto etiqueta="Adultos" required inputMode="numeric" value={valores.capacidadAdultos} onChange={(e) => poner('capacidadAdultos', e.target.value)} error={errores.capacidadAdultos} />
            <CampoTexto etiqueta="Niños" required inputMode="numeric" value={valores.capacidadNinos} onChange={(e) => poner('capacidadNinos', e.target.value)} error={errores.capacidadNinos} />
            <CampoTexto etiqueta="Precio base" required inputMode="decimal" value={valores.precioBase} onChange={(e) => poner('precioBase', e.target.value)} error={errores.precioBase} />
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">El precio base es de catálogo; el precio de cada noche se define en Disponibilidad.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CampoSelect etiqueta="Plan de comidas" value={valores.mealPlan} onChange={(e) => poner('mealPlan', e.target.value)} error={errores.mealPlan}>
              <option value="">Sin especificar</option>
              {Object.entries(planes).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </CampoSelect>
            <CampoSelect etiqueta="Cancelación" value={valores.cancellationType} onChange={(e) => poner('cancellationType', e.target.value)} error={errores.cancellationType}>
              <option value="">Sin especificar</option>
              {Object.entries(cancelaciones).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </CampoSelect>
          </div>
        </section>

        {errorGeneral && (
          <p role="alert" className="text-sm font-medium text-error">
            {errorGeneral}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link to={volver} className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            Cancelar
          </Link>
          <Button type="submit" size="lg" disabled={enviando}>
            {enviando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear habitación'}
          </Button>
        </div>
      </form>
    </>
  )
}
