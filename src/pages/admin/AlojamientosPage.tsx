import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Plus } from 'lucide-react'
import { CampoSelect } from '@/components/admin/CampoSelect'
import { ChipsPestanas } from '@/components/ChipsPestanas'
import { DialogoConfirmacion } from '@/components/DialogoConfirmacion'
import { Button, buttonVariants } from '@/components/ui/button'
import { useSesion } from '@/hooks/useSesion'
import { esErrorDeSesion, mensajeDeError } from '@/services/admin'
import { darDeBajaAlojamiento, listarAlojamientos, listarCiudadesAdmin, reactivarAlojamiento } from '@/services/alojamientosAdmin'
import { cerrarSesion } from '@/services/cuenta'
import type { AlojamientoAdmin, CiudadAdmin, Pagina } from '@/types/admin'
import { formatearPrecio } from '@/lib/formato'
import { cn } from '@/lib/utils'
import { EncabezadoAdmin } from './EncabezadoAdmin'

const POR_PAGINA = 10

type FiltroEstado = 'todos' | 'activos' | 'baja'
interface Accion {
  tipo: 'baja' | 'reactivar'
  alojamiento: AlojamientoAdmin
}
type Resultado = { clave: string; datos: Pagina<AlojamientoAdmin> } | { clave: string; error: string }

/**
 * Alojamientos que el usuario administra: el administrador ve solo los suyos (el backend filtra por propietario) y el
 * superadmin ve todos. Dar de baja es un borrado lógico: el alojamiento deja de aparecer en las búsquedas pero conserva
 * sus datos y sus reservas, y se puede reactivar.
 */
export default function AlojamientosPage() {
  const sesion = useSesion()
  const { state } = useLocation() as { state: { aviso?: string } | null }
  const [estado, setEstado] = useState<FiltroEstado>('todos')
  const [ciudadId, setCiudadId] = useState('')
  const [pagina, setPagina] = useState(1)
  const [version, setVersion] = useState(0)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [ciudades, setCiudades] = useState<CiudadAdmin[]>([])

  const [accion, setAccion] = useState<Accion | null>(null)
  const [errorAccion, setErrorAccion] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [aviso, setAviso] = useState(state?.aviso ?? '')

  const clave = `${estado}|${ciudadId}|${pagina}|${version}`
  const cargando = resultado?.clave !== clave

  useEffect(() => {
    let vigente = true
    listarCiudadesAdmin()
      .then((lista) => vigente && setCiudades(lista))
      .catch(() => {}) // sin ciudades solo se pierde el filtro
    return () => {
      vigente = false
    }
  }, [])

  useEffect(() => {
    let vigente = true
    listarAlojamientos({
      activo: estado === 'todos' ? undefined : estado === 'activos',
      ciudadId: ciudadId ? Number(ciudadId) : undefined,
      page: pagina,
      limit: POR_PAGINA,
    })
      .then((datos) => {
        if (!vigente) return
        if (datos.data.length === 0 && pagina > 1) setPagina(Math.max(1, datos.meta.totalPages))
        else setResultado({ clave, datos })
      })
      .catch((e: unknown) => {
        if (!vigente) return
        if (esErrorDeSesion(e)) void cerrarSesion()
        setResultado({ clave, error: mensajeDeError(e, 'No se pudieron cargar los alojamientos.') })
      })
    return () => {
      vigente = false
    }
  }, [clave, estado, ciudadId, pagina])

  const abrir = (tipo: Accion['tipo'], alojamiento: AlojamientoAdmin) => {
    setAccion({ tipo, alojamiento })
    setErrorAccion('')
    setAviso('')
  }

  const confirmar = async () => {
    if (!accion) return
    const { tipo, alojamiento } = accion
    setConfirmando(true)
    setErrorAccion('')
    try {
      if (tipo === 'baja') await darDeBajaAlojamiento(alojamiento.id)
      else await reactivarAlojamiento(alojamiento.id)
      setAviso(tipo === 'baja' ? `Diste de baja ${alojamiento.nombre}.` : `Reactivaste ${alojamiento.nombre}.`)
      setAccion(null)
      setVersion((v) => v + 1)
    } catch (e) {
      if (esErrorDeSesion(e)) {
        await cerrarSesion()
        return
      }
      setErrorAccion(mensajeDeError(e))
      setVersion((v) => v + 1)
    } finally {
      setConfirmando(false)
    }
  }

  const datos = resultado && 'datos' in resultado ? resultado.datos : null
  const errorLista = resultado && 'error' in resultado ? resultado.error : ''
  const esSuperadmin = sesion?.rol === 'superadmin'
  const hayFiltros = estado !== 'todos' || ciudadId !== ''

  return (
    <>
      <EncabezadoAdmin
        titulo="Alojamientos"
        descripcion={esSuperadmin ? 'Todos los alojamientos del sistema.' : 'Los alojamientos que administras.'}
        acciones={
          <Link to="/admin/alojamientos/nuevo" className={buttonVariants({ size: 'lg' })}>
            <Plus aria-hidden="true" />
            Nuevo alojamiento
          </Link>
        }
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <ChipsPestanas<FiltroEstado>
          etiqueta="Estado del alojamiento"
          idPanel="lista-alojamientos"
          valor={estado}
          onCambiar={(v) => {
            setEstado(v)
            setPagina(1)
          }}
          opciones={[
            { id: 'todos', etiqueta: 'Todos' },
            { id: 'activos', etiqueta: 'Activos' },
            { id: 'baja', etiqueta: 'Dados de baja' },
          ]}
        />
        {ciudades.length > 0 && (
          <CampoSelect
            etiqueta="Ciudad"
            value={ciudadId}
            onChange={(e) => {
              setCiudadId(e.target.value)
              setPagina(1)
            }}
            className="h-11 min-w-[200px]"
          >
            <option value="">Todas las ciudades</option>
            {ciudades.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </CampoSelect>
        )}
      </div>

      {aviso && (
        <p role="status" className="mt-4 rounded-2xl bg-[var(--dutch-white)] px-4 py-3 text-sm text-ink">
          {aviso}
        </p>
      )}

      <div id="lista-alojamientos" role="tabpanel" className="mt-4" aria-busy={cargando}>
        {errorLista ? (
          <p role="alert" className="rounded-2xl bg-white p-5 text-sm font-medium text-error">
            {errorLista}
          </p>
        ) : cargando && !datos ? (
          <div className="flex flex-col gap-3" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[96px] animate-pulse rounded-[20px] bg-white" />
            ))}
          </div>
        ) : datos && datos.data.length === 0 ? (
          <div className="rounded-[20px] border border-border bg-white p-6">
            <p className="text-muted-foreground">
              {hayFiltros ? 'No hay alojamientos con estos filtros.' : esSuperadmin ? 'Todavía no hay alojamientos.' : 'Todavía no tienes alojamientos.'}
            </p>
            {!hayFiltros && (
              <Link to="/admin/alojamientos/nuevo" className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}>
                Crear el primero
              </Link>
            )}
          </div>
        ) : (
          <ul className={cn('flex flex-col gap-3 transition-opacity', cargando && 'opacity-60')}>
            {datos?.data.map((a) => (
              <li key={a.id} className="flex flex-col gap-4 rounded-[20px] border border-border bg-white p-5 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{a.nombre}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {a.ciudad ? a.ciudad.nombre : a.destino} · {formatearPrecio(a.precioPorNoche, a.moneda)} por noche
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className={cn('rounded-full px-2.5 py-1 font-medium', a.activo ? 'bg-success/12 text-success' : 'bg-error/10 text-error')}>
                      {a.activo ? 'Activo' : 'Dado de baja'}
                    </span>
                    <span className="rounded-full bg-surface-muted px-2.5 py-1 font-medium text-ink">
                      {a.habitaciones} {a.habitaciones === 1 ? 'habitación' : 'habitaciones'}
                    </span>
                    <span className="text-muted-foreground">
                      Hasta {a.capacidadAdultos} {a.capacidadAdultos === 1 ? 'adulto' : 'adultos'}
                      {a.capacidadNinos > 0 && ` y ${a.capacidadNinos} ${a.capacidadNinos === 1 ? 'niño' : 'niños'}`}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/admin/alojamientos/${a.id}/editar`} className={buttonVariants({ size: 'sm' })}>
                    Editar
                  </Link>
                  <Link to={`/admin/habitaciones?alojamiento=${a.id}`} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                    Habitaciones
                  </Link>
                  {a.activo ? (
                    <Button size="sm" variant="outline" onClick={() => abrir('baja', a)}>
                      Dar de baja
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => abrir('reactivar', a)}>
                      Reactivar
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {datos && datos.meta.totalPages > 1 && (
          <nav aria-label="Páginas" className="mt-6 flex items-center justify-between gap-3">
            <Button variant="outline" size="sm" disabled={pagina <= 1 || cargando} onClick={() => setPagina((p) => p - 1)}>
              Anterior
            </Button>
            <p className="text-sm text-muted-foreground">
              Página {datos.meta.currentPage} de {datos.meta.totalPages} · {datos.meta.totalItems} alojamientos
            </p>
            <Button variant="outline" size="sm" disabled={pagina >= datos.meta.totalPages || cargando} onClick={() => setPagina((p) => p + 1)}>
              Siguiente
            </Button>
          </nav>
        )}
      </div>

      {accion && (
        <DialogoConfirmacion
          abierto
          onAbiertoCambia={(abierto) => !abierto && !confirmando && setAccion(null)}
          titulo={accion.tipo === 'baja' ? 'Dar de baja el alojamiento' : 'Reactivar el alojamiento'}
          etiquetaConfirmar={accion.tipo === 'baja' ? 'Dar de baja' : 'Reactivar'}
          destructivo={accion.tipo === 'baja'}
          confirmando={confirmando}
          onConfirmar={confirmar}
        >
          <p>
            <strong>{accion.alojamiento.nombre}</strong>
          </p>
          <p className="mt-2 text-muted-foreground">
            {accion.tipo === 'baja'
              ? 'Dejará de aparecer en las búsquedas y no se podrá reservar. Sus datos y las reservas que ya tiene se conservan, y puedes reactivarlo cuando quieras.'
              : 'Volverá a aparecer en las búsquedas y se podrá reservar.'}
          </p>
          {errorAccion && (
            <p role="alert" className="mt-4 text-sm font-medium text-error">
              {errorAccion}
            </p>
          )}
        </DialogoConfirmacion>
      )}
    </>
  )
}
