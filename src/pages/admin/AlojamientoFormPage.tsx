import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { CampoSelect } from '@/components/admin/CampoSelect'
import { ListaClaveValor } from '@/components/admin/ListaClaveValor'
import { ListaTextos } from '@/components/admin/ListaTextos'
import { CampoTexto } from '@/components/CampoTexto'
import { Button, buttonVariants } from '@/components/ui/button'
import { ApiError } from '@/services/api'
import { erroresPorCampo, esErrorDeSesion, mensajeDeError } from '@/services/admin'
import { actualizarAlojamiento, crearAlojamiento, listarCiudadesAdmin, obtenerAlojamientoAdmin } from '@/services/alojamientosAdmin'
import { cerrarSesion } from '@/services/cuenta'
import type { AlojamientoAdmin, CiudadAdmin, DatosAlojamiento, ErroresCampo, TipoPropiedad } from '@/types/admin'
import { aObjeto, aPares, type ParClaveValor } from '@/lib/politicas'
import { cn } from '@/lib/utils'
import { EncabezadoAdmin } from './EncabezadoAdmin'

/** Valores del formulario: todo en texto, como lo escribe la persona, y se convierte al enviar */
interface Valores {
  nombre: string
  ciudadId: string
  descripcion: string
  moneda: string
  precioPorNoche: string
  capacidadAdultos: string
  capacidadNinos: string
  tienePiscina: boolean
  fotos: string[]
  facilidades: string[]
  politicas: ParClaveValor[]
  activo: boolean
  estrellas: string
  tipoPropiedad: TipoPropiedad
  direccion: string
}

const TIPOS_PROPIEDAD: [TipoPropiedad, string][] = [
  ['HOTEL', 'Hotel'],
  ['RESORT', 'Resort'],
  ['APARTAMENTO', 'Apartamento'],
  ['HOSTAL', 'Hostal'],
  ['HOSTERIA', 'Hostería'],
]

const VACIO: Valores = {
  nombre: '',
  ciudadId: '',
  descripcion: '',
  moneda: 'USD',
  precioPorNoche: '',
  capacidadAdultos: '2',
  capacidadNinos: '0',
  tienePiscina: false,
  fotos: [''],
  facilidades: [''],
  politicas: [],
  activo: true,
  estrellas: '3',
  tipoPropiedad: 'HOTEL',
  direccion: '',
}

const desdeAlojamiento = (a: AlojamientoAdmin): Valores => ({
  nombre: a.nombre,
  ciudadId: a.ciudadId ? String(a.ciudadId) : '',
  descripcion: a.descripcion ?? '',
  moneda: a.moneda,
  precioPorNoche: String(a.precioPorNoche),
  capacidadAdultos: String(a.capacidadAdultos),
  capacidadNinos: String(a.capacidadNinos),
  tienePiscina: a.tienePiscina,
  fotos: a.fotos?.length ? a.fotos : [''],
  facilidades: a.facilidades?.length ? a.facilidades : [''],
  politicas: aPares(a.politicas),
  activo: a.activo,
  estrellas: String(a.estrellas),
  tipoPropiedad: a.tipoPropiedad,
  direccion: a.direccion ?? '',
})

const entero = (texto: string) => (/^-?\d+$/.test(texto.trim()) ? Number(texto.trim()) : NaN)

/** Reglas del backend (CreateAlojamientoDto) comprobadas antes de enviar, con mensajes en español */
function validar(v: Valores): ErroresCampo {
  const e: ErroresCampo = {}
  if (v.nombre.trim().length < 3) e.nombre = 'Escribe un nombre de al menos 3 caracteres.'
  else if (v.nombre.trim().length > 255) e.nombre = 'El nombre no puede superar 255 caracteres.'
  if (!v.ciudadId) e.ciudadId = 'Elige la ciudad.'
  if (!/^[A-Za-z]{3}$/.test(v.moneda.trim())) e.moneda = 'Usa un código de 3 letras, por ejemplo USD.'
  const precio = Number(v.precioPorNoche.replace(',', '.'))
  if (!v.precioPorNoche.trim() || Number.isNaN(precio) || precio <= 0) e.precioPorNoche = 'Escribe un precio mayor que 0.'
  else if (!/^\d+([.,]\d{1,2})?$/.test(v.precioPorNoche.trim())) e.precioPorNoche = 'Usa como máximo 2 decimales.'
  else if (precio > 99999999.99) e.precioPorNoche = 'El precio es demasiado alto.'
  const adultos = entero(v.capacidadAdultos)
  if (Number.isNaN(adultos) || adultos < 1 || adultos > 100) e.capacidadAdultos = 'Escribe un número entero entre 1 y 100.'
  const ninos = entero(v.capacidadNinos)
  if (Number.isNaN(ninos) || ninos < 0 || ninos > 100) e.capacidadNinos = 'Escribe un número entero entre 0 y 100.'
  if (v.direccion.trim().length > 255) e.direccion = 'La dirección no puede superar 255 caracteres.'
  if (v.fotos.some((f) => f.trim() && !/^https?:\/\/\S+$/i.test(f.trim()))) e.fotos = 'Cada foto debe ser una dirección que empiece con http:// o https://.'
  const claves = v.politicas.map((p) => p.clave.trim()).filter(Boolean)
  if (new Set(claves).size !== claves.length) e.politicas = 'Hay políticas con el mismo nombre.'
  else if (v.politicas.some((p) => p.valor.trim() && !p.clave.trim())) e.politicas = 'Cada valor necesita el nombre de su política.'
  return e
}

function aDatos(v: Valores): DatosAlojamiento {
  return {
    nombre: v.nombre.trim(),
    ciudadId: Number(v.ciudadId),
    descripcion: v.descripcion.trim() || null,
    moneda: v.moneda.trim().toUpperCase(),
    precioPorNoche: Number(v.precioPorNoche.replace(',', '.')),
    capacidadAdultos: entero(v.capacidadAdultos),
    capacidadNinos: entero(v.capacidadNinos),
    tienePiscina: v.tienePiscina,
    fotos: v.fotos.map((f) => f.trim()).filter(Boolean),
    facilidades: v.facilidades.map((f) => f.trim()).filter(Boolean),
    politicas: aObjeto(v.politicas),
    activo: v.activo,
    estrellas: Number(v.estrellas),
    tipoPropiedad: v.tipoPropiedad,
    direccion: v.direccion.trim() || null,
  }
}

/** Ruta /admin/alojamientos/nuevo y /admin/alojamientos/:id/editar. Se vuelve a montar al cambiar de alojamiento. */
export default function AlojamientoFormRuta() {
  const { id } = useParams()
  return <AlojamientoForm key={id ?? 'nuevo'} id={id} />
}

type Carga = 'cargando' | 'listo' | 'noEncontrado' | 'error'

function AlojamientoForm({ id }: { id?: string }) {
  const navigate = useNavigate()
  const editando = id !== undefined
  const [carga, setCarga] = useState<Carga>(editando ? 'cargando' : 'listo')
  const [errorCarga, setErrorCarga] = useState('')
  const [ciudades, setCiudades] = useState<CiudadAdmin[] | null>(null)
  const [valores, setValores] = useState<Valores>(VACIO)
  const [codigo, setCodigo] = useState('')
  const [errores, setErrores] = useState<ErroresCampo>({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let vigente = true
    listarCiudadesAdmin()
      .then((lista) => vigente && setCiudades(lista))
      .catch((e: unknown) => {
        if (!vigente) return
        if (esErrorDeSesion(e)) void cerrarSesion()
        setCiudades([])
      })
    return () => {
      vigente = false
    }
  }, [])

  useEffect(() => {
    if (id === undefined) return
    let vigente = true
    // Un id que no es un número (400) o un alojamiento ajeno o inexistente (404) son lo mismo para quien navega: no existe
    obtenerAlojamientoAdmin(id)
      .then((a) => {
        if (!vigente) return
        setValores(desdeAlojamiento(a))
        setCodigo(a.codigo)
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
          setErrorCarga(mensajeDeError(e, 'No se pudo cargar el alojamiento.'))
          setCarga('error')
        }
      })
    return () => {
      vigente = false
    }
  }, [id])

  const poner = <K extends keyof Valores>(campo: K, valor: Valores[K]) => setValores((v) => ({ ...v, [campo]: valor }))

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    const nuevos = validar(valores)
    setErrores(nuevos)
    setErrorGeneral('')
    if (Object.keys(nuevos).length) {
      // Lleva el foco al primer campo con error para que se vea qué corregir
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }

    setEnviando(true)
    try {
      const datos = aDatos(valores)
      const guardado = editando ? await actualizarAlojamiento(Number(id), datos) : await crearAlojamiento(datos)
      navigate('/admin/alojamientos', { state: { aviso: editando ? `Guardaste los cambios de ${guardado.nombre}.` : `Creaste ${guardado.nombre}.` } })
    } catch (e) {
      if (esErrorDeSesion(e)) {
        await cerrarSesion()
        return
      }
      if (e instanceof ApiError && e.status === 404 && editando) {
        setCarga('noEncontrado')
        return
      }
      const porCampo = erroresPorCampo(e)
      if (Object.keys(porCampo).length) {
        setErrores(porCampo)
        setErrorGeneral('Revisa los campos marcados.')
      } else setErrorGeneral(mensajeDeError(e, 'No se pudo guardar el alojamiento.'))
    } finally {
      setEnviando(false)
    }
  }

  if (carga === 'noEncontrado') {
    return (
      <>
        <EncabezadoAdmin titulo="Alojamiento no encontrado" />
        <div className="rounded-[20px] border border-border bg-white p-6">
          <p className="text-muted-foreground">
            No encontramos este alojamiento. Puede que ya no exista o que no sea uno de los que administras.
          </p>
          <Link to="/admin/alojamientos" className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}>
            Volver a alojamientos
          </Link>
        </div>
      </>
    )
  }

  if (carga === 'error') {
    return (
      <>
        <EncabezadoAdmin titulo="Editar alojamiento" />
        <p role="alert" className="rounded-2xl bg-white p-5 text-sm font-medium text-error">
          {errorCarga}
        </p>
      </>
    )
  }

  if (carga === 'cargando' || !ciudades) {
    return (
      <>
        <EncabezadoAdmin titulo={editando ? 'Editar alojamiento' : 'Nuevo alojamiento'} />
        <div role="status" aria-busy="true" className="h-[320px] animate-pulse rounded-[20px] bg-white">
          <span className="sr-only">Cargando…</span>
        </div>
      </>
    )
  }

  return (
    <>
      <EncabezadoAdmin
        titulo={editando ? 'Editar alojamiento' : 'Nuevo alojamiento'}
        descripcion={editando ? `${valores.nombre} · Código ${codigo}` : 'Quedarás como su propietario. Las habitaciones y los precios por fecha se cargan después.'}
      />

      <form onSubmit={enviar} noValidate aria-label={editando ? 'Editar alojamiento' : 'Nuevo alojamiento'} className="flex max-w-3xl flex-col gap-6">
        <Seccion titulo="Datos principales">
          <CampoTexto etiqueta="Nombre" required value={valores.nombre} onChange={(e) => poner('nombre', e.target.value)} error={errores.nombre} maxLength={255} />
          <CampoSelect etiqueta="Ciudad" required value={valores.ciudadId} onChange={(e) => poner('ciudadId', e.target.value)} error={errores.ciudadId}>
            <option value="">Elige una ciudad</option>
            {ciudades.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </CampoSelect>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CampoSelect etiqueta="Estrellas" required value={valores.estrellas} onChange={(e) => poner('estrellas', e.target.value)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'estrella' : 'estrellas'}
                </option>
              ))}
            </CampoSelect>
            <CampoSelect etiqueta="Tipo de propiedad" required value={valores.tipoPropiedad} onChange={(e) => poner('tipoPropiedad', e.target.value as TipoPropiedad)}>
              {TIPOS_PROPIEDAD.map(([valor, nombre]) => (
                <option key={valor} value={valor}>
                  {nombre}
                </option>
              ))}
            </CampoSelect>
          </div>
          <CampoTexto etiqueta="Dirección" value={valores.direccion} onChange={(e) => poner('direccion', e.target.value)} error={errores.direccion} maxLength={255} />
          {ciudades.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Todavía no hay ciudades. <Link to="/admin/ciudades" className="font-medium text-ink underline underline-offset-4">Agrega una primero</Link>.
            </p>
          )}
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink">
            Descripción
            <textarea
              value={valores.descripcion}
              onChange={(e) => poner('descripcion', e.target.value)}
              rows={4}
              aria-invalid={!!errores.descripcion}
              className="rounded-[14px] border border-border bg-white px-3.5 py-3 text-[15px] font-normal text-ink outline-none focus:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
            />
            {errores.descripcion && <span role="alert" className="text-xs font-medium text-error">{errores.descripcion}</span>}
          </label>
        </Seccion>

        <Seccion titulo="Precio y capacidad">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_140px]">
            <CampoTexto
              etiqueta="Precio por noche"
              required
              inputMode="decimal"
              value={valores.precioPorNoche}
              onChange={(e) => poner('precioPorNoche', e.target.value)}
              error={errores.precioPorNoche}
              ayuda="Precio de catálogo. El precio real de cada noche se define en la disponibilidad."
            />
            <CampoTexto etiqueta="Moneda" required value={valores.moneda} onChange={(e) => poner('moneda', e.target.value.toUpperCase())} error={errores.moneda} maxLength={3} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CampoTexto etiqueta="Adultos" required inputMode="numeric" value={valores.capacidadAdultos} onChange={(e) => poner('capacidadAdultos', e.target.value)} error={errores.capacidadAdultos} />
            <CampoTexto etiqueta="Niños" required inputMode="numeric" value={valores.capacidadNinos} onChange={(e) => poner('capacidadNinos', e.target.value)} error={errores.capacidadNinos} />
          </div>
          <label className="flex items-center gap-3 text-[15px] text-ink">
            <input type="checkbox" checked={valores.tienePiscina} onChange={(e) => poner('tienePiscina', e.target.checked)} className="size-5 accent-[var(--primary)]" />
            Tiene piscina
          </label>
        </Seccion>

        <Seccion titulo="Fotos y servicios">
          <ListaTextos
            etiqueta="Fotos (direcciones URL)"
            elemento="Foto"
            valores={valores.fotos}
            onCambia={(f) => poner('fotos', f)}
            placeholder="https://…"
            etiquetaAgregar="Agregar foto"
            error={errores.fotos}
            ayuda="La primera es la foto principal."
          />
          <ListaTextos
            etiqueta="Facilidades"
            elemento="Facilidad"
            valores={valores.facilidades}
            onCambia={(f) => poner('facilidades', f)}
            placeholder="wifi, desayuno, piscina…"
            etiquetaAgregar="Agregar facilidad"
            error={errores.facilidades}
          />
          <ListaClaveValor
            etiqueta="Políticas"
            pares={valores.politicas}
            onCambia={(p) => poner('politicas', p)}
            error={errores.politicas}
            ayuda='Pares nombre y valor, por ejemplo checkin = 15:00. Escribe "true" o "false" para sí o no.'
          />
        </Seccion>

        <Seccion titulo="Visibilidad">
          <label className="flex items-start gap-3 text-[15px] text-ink">
            <input type="checkbox" checked={valores.activo} onChange={(e) => poner('activo', e.target.checked)} className="mt-0.5 size-5 accent-[var(--primary)]" />
            <span>
              Activo
              <span className="block text-sm text-muted-foreground">Un alojamiento inactivo no aparece en las búsquedas ni se puede reservar.</span>
            </span>
          </label>
        </Seccion>

        {errorGeneral && (
          <p role="alert" className="text-sm font-medium text-error">
            {errorGeneral}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link to="/admin/alojamientos" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            Cancelar
          </Link>
          <Button type="submit" size="lg" disabled={enviando}>
            {enviando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear alojamiento'}
          </Button>
        </div>
      </form>
    </>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-[20px] border border-border bg-white p-5 sm:p-6">
      <h2 className="font-heading text-lg font-medium text-ink">{titulo}</h2>
      {children}
    </section>
  )
}
