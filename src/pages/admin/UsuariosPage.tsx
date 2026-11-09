import { useEffect, useState } from 'react'
import { ChipsPestanas } from '@/components/ChipsPestanas'
import { DialogoConfirmacion } from '@/components/DialogoConfirmacion'
import { Button } from '@/components/ui/button'
import { useSesion } from '@/hooks/useSesion'
import { contar, esErrorDeSesion, mensajeDeError } from '@/services/admin'
import { cerrarSesion } from '@/services/cuenta'
import {
  aprobarUsuario,
  cambiarRolUsuario,
  listarUsuarios,
  reactivarUsuario,
  suspenderUsuario,
} from '@/services/usuariosAdmin'
import type { Pagina, UsuarioAdmin } from '@/types/admin'
import type { EstadoUsuario, RolUsuario } from '@/types/cuenta'
import { cn } from '@/lib/utils'
import { EncabezadoAdmin } from './EncabezadoAdmin'

const POR_PAGINA = 10

type FiltroEstado = EstadoUsuario | 'todos'
type TipoAccion = 'aprobar' | 'suspender' | 'reactivar' | 'rol'
interface Accion {
  tipo: TipoAccion
  usuario: UsuarioAdmin
}
type Resultado = { clave: string; datos: Pagina<UsuarioAdmin> } | { clave: string; error: string }

const ROLES: Record<RolUsuario, string> = { cliente: 'Cliente', administrador: 'Administrador', superadmin: 'Superadministrador' }
const ESTADOS: Record<EstadoUsuario, { etiqueta: string; clase: string }> = {
  pendiente: { etiqueta: 'Pendiente', clase: 'bg-[var(--dutch-white)] text-ink' },
  activo: { etiqueta: 'Activa', clase: 'bg-success/12 text-success' },
  suspendido: { etiqueta: 'Suspendida', clase: 'bg-error/10 text-error' },
}

const fechaCorta = (iso: string) => new Date(iso).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' })

/**
 * Gestión de cuentas (solo superadmin). El backend ordena por registro más reciente y no ofrece otro orden, así que
 * "los pendientes primero" se resuelve abriendo en el filtro Pendientes, con el conteo de cada estado en su chip.
 * Cada acción pide confirmación y, si el backend responde 409, muestra su motivo sin cerrar el diálogo.
 */
export default function UsuariosPage() {
  const sesion = useSesion()
  const [estado, setEstado] = useState<FiltroEstado>('pendiente')
  const [rol, setRol] = useState<RolUsuario | ''>('')
  const [pagina, setPagina] = useState(1)
  const [version, setVersion] = useState(0)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [conteos, setConteos] = useState<Record<EstadoUsuario, number> | null>(null)

  const [accion, setAccion] = useState<Accion | null>(null)
  const [rolNuevo, setRolNuevo] = useState<RolUsuario>('cliente')
  const [errorAccion, setErrorAccion] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [aviso, setAviso] = useState('')

  // "cargando" se deduce: el resultado guardado es de otra consulta distinta a la pedida
  const clave = `${estado}|${rol}|${pagina}|${version}`
  const cargando = resultado?.clave !== clave

  useEffect(() => {
    let vigente = true
    listarUsuarios({ estado: estado === 'todos' ? undefined : estado, rol: rol || undefined, page: pagina, limit: POR_PAGINA })
      .then((datos) => {
        if (!vigente) return
        // Si la acción vació la última página, se vuelve a la anterior
        if (datos.data.length === 0 && pagina > 1) setPagina(Math.max(1, datos.meta.totalPages))
        else setResultado({ clave, datos })
      })
      .catch((e: unknown) => {
        if (!vigente) return
        if (esErrorDeSesion(e)) void cerrarSesion()
        setResultado({ clave, error: mensajeDeError(e, 'No se pudo cargar la lista de usuarios.') })
      })
    return () => {
      vigente = false
    }
  }, [clave, estado, rol, pagina])

  useEffect(() => {
    let vigente = true
    const filtroRol = rol || undefined
    Promise.all(
      (['pendiente', 'activo', 'suspendido'] as const).map((e) => contar('/admin/usuarios', { estado: e, rol: filtroRol })),
    )
      .then(([pendiente, activo, suspendido]) => vigente && setConteos({ pendiente, activo, suspendido }))
      .catch(() => vigente && setConteos(null))
    return () => {
      vigente = false
    }
  }, [rol, version])

  const abrir = (tipo: TipoAccion, usuario: UsuarioAdmin) => {
    setAccion({ tipo, usuario })
    setRolNuevo(usuario.rol)
    setErrorAccion('')
    setAviso('')
  }

  const cerrar = (abierto: boolean) => {
    if (!abierto && !confirmando) setAccion(null)
  }

  const confirmar = async () => {
    if (!accion) return
    const { tipo, usuario } = accion
    if (tipo === 'rol' && rolNuevo === usuario.rol) {
      setErrorAccion(`${nombreCompleto(usuario)} ya tiene el rol ${ROLES[rolNuevo].toLowerCase()}.`)
      return
    }
    setConfirmando(true)
    setErrorAccion('')
    try {
      if (tipo === 'aprobar') await aprobarUsuario(usuario.id)
      else if (tipo === 'suspender') await suspenderUsuario(usuario.id)
      else if (tipo === 'reactivar') await reactivarUsuario(usuario.id)
      else await cambiarRolUsuario(usuario.id, rolNuevo)
      setAviso(RESULTADO[tipo](usuario, rolNuevo))
      setAccion(null)
      setVersion((v) => v + 1)
    } catch (e) {
      if (esErrorDeSesion(e)) {
        await cerrarSesion()
        return
      }
      setErrorAccion(mensajeDeError(e))
      // Si el usuario ya no existe o cambió de estado desde otro lado, se refresca la lista de fondo
      setVersion((v) => v + 1)
    } finally {
      setConfirmando(false)
    }
  }

  const datos = resultado && 'datos' in resultado ? resultado.datos : null
  const errorLista = resultado && 'error' in resultado ? resultado.error : ''
  const etiquetaConteo = (e: EstadoUsuario) => (conteos ? ` (${conteos[e]})` : '')
  const total = conteos ? conteos.pendiente + conteos.activo + conteos.suspendido : null

  return (
    <>
      <EncabezadoAdmin titulo="Usuarios" descripcion="Aprueba administradores, suspende cuentas y cambia roles." />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ChipsPestanas<FiltroEstado>
          etiqueta="Estado de la cuenta"
          idPanel="lista-usuarios"
          valor={estado}
          onCambiar={(v) => {
            setEstado(v)
            setPagina(1)
          }}
          opciones={[
            { id: 'pendiente', etiqueta: `Pendientes${etiquetaConteo('pendiente')}` },
            { id: 'activo', etiqueta: `Activas${etiquetaConteo('activo')}` },
            { id: 'suspendido', etiqueta: `Suspendidas${etiquetaConteo('suspendido')}` },
            { id: 'todos', etiqueta: `Todas${total === null ? '' : ` (${total})`}` },
          ]}
        />
        <label className="flex items-center gap-2 text-[13px] font-medium text-ink">
          Rol
          <select
            value={rol}
            onChange={(e) => {
              setRol(e.target.value as RolUsuario | '')
              setPagina(1)
            }}
            className="h-11 rounded-xl border border-border bg-white px-3 text-sm text-ink outline-none focus:border-primary"
          >
            <option value="">Todos</option>
            {Object.entries(ROLES).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>
        </label>
      </div>

      {aviso && (
        <p role="status" className="mt-4 rounded-2xl bg-[var(--dutch-white)] px-4 py-3 text-sm text-ink">
          {aviso}
        </p>
      )}

      <div id="lista-usuarios" role="tabpanel" className="mt-4" aria-busy={cargando}>
        {errorLista ? (
          <p role="alert" className="rounded-2xl bg-white p-5 text-sm font-medium text-error">
            {errorLista}
          </p>
        ) : cargando && !datos ? (
          <div className="flex flex-col gap-3" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[88px] animate-pulse rounded-[20px] bg-white" />
            ))}
          </div>
        ) : datos && datos.data.length === 0 ? (
          <p className="rounded-[20px] border border-border bg-white p-6 text-muted-foreground">
            {estado === 'pendiente' ? 'No hay cuentas pendientes de aprobación.' : 'No hay usuarios con estos filtros.'}
          </p>
        ) : (
          <ul className={cn('flex flex-col gap-3 transition-opacity', cargando && 'opacity-60')}>
            {datos?.data.map((u) => (
              <FilaUsuario key={u.id} usuario={u} esPropia={u.id === sesion?.id} onAccion={abrir} />
            ))}
          </ul>
        )}

        {datos && datos.meta.totalPages > 1 && (
          <nav aria-label="Páginas" className="mt-6 flex items-center justify-between gap-3">
            <Button variant="outline" size="sm" disabled={pagina <= 1 || cargando} onClick={() => setPagina((p) => p - 1)}>
              Anterior
            </Button>
            <p className="text-sm text-muted-foreground">
              Página {datos.meta.currentPage} de {datos.meta.totalPages} · {datos.meta.totalItems} cuentas
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={pagina >= datos.meta.totalPages || cargando}
              onClick={() => setPagina((p) => p + 1)}
            >
              Siguiente
            </Button>
          </nav>
        )}
      </div>

      {accion && (
        <DialogoConfirmacion
          abierto
          onAbiertoCambia={cerrar}
          titulo={TITULO[accion.tipo]}
          etiquetaConfirmar={BOTON[accion.tipo]}
          destructivo={accion.tipo === 'suspender'}
          confirmando={confirmando}
          onConfirmar={confirmar}
        >
          <p>
            <strong>{nombreCompleto(accion.usuario)}</strong> · {accion.usuario.email}
          </p>
          <p className="mt-2 text-muted-foreground">{DETALLE[accion.tipo]}</p>
          {accion.tipo === 'rol' && (
            <label className="mt-4 flex flex-col gap-1.5 text-[13px] font-medium text-ink">
              Nuevo rol
              <select
                value={rolNuevo}
                onChange={(e) => setRolNuevo(e.target.value as RolUsuario)}
                className="h-11 rounded-xl border border-border bg-white px-3 text-sm text-ink outline-none focus:border-primary"
              >
                {Object.entries(ROLES).map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ))}
              </select>
            </label>
          )}
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

const nombreCompleto = (u: UsuarioAdmin) => `${u.nombre} ${u.apellido}`

const TITULO: Record<TipoAccion, string> = {
  aprobar: 'Aprobar cuenta',
  suspender: 'Suspender cuenta',
  reactivar: 'Reactivar cuenta',
  rol: 'Cambiar rol',
}
const BOTON: Record<TipoAccion, string> = { aprobar: 'Aprobar', suspender: 'Suspender', reactivar: 'Reactivar', rol: 'Cambiar rol' }
const DETALLE: Record<TipoAccion, string> = {
  aprobar: 'Podrá iniciar sesión como administrador y gestionar sus alojamientos.',
  suspender: 'No podrá iniciar sesión y su sesión actual dejará de funcionar en 10 minutos como máximo.',
  reactivar: 'Podrá volver a iniciar sesión.',
  rol: 'Cambiar el rol no cambia el estado de la cuenta.',
}
const RESULTADO: Record<TipoAccion, (u: UsuarioAdmin, rolNuevo: RolUsuario) => string> = {
  aprobar: (u) => `Aprobaste la cuenta de ${nombreCompleto(u)}.`,
  suspender: (u) => `Suspendiste la cuenta de ${nombreCompleto(u)}.`,
  reactivar: (u) => `Reactivaste la cuenta de ${nombreCompleto(u)}.`,
  rol: (u, r) => `${nombreCompleto(u)} ahora es ${ROLES[r].toLowerCase()}.`,
}

function FilaUsuario({
  usuario,
  esPropia,
  onAccion,
}: {
  usuario: UsuarioAdmin
  esPropia: boolean
  onAccion: (tipo: TipoAccion, usuario: UsuarioAdmin) => void
}) {
  const est = ESTADOS[usuario.estado]
  return (
    <li className="flex flex-col gap-4 rounded-[20px] border border-border bg-white p-5 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">
          {nombreCompleto(usuario)}
          {esPropia && <span className="ml-2 text-sm font-normal text-muted-foreground">(tú)</span>}
        </p>
        <p className="truncate text-sm text-muted-foreground">{usuario.email}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-surface-muted px-2.5 py-1 font-medium text-ink">{ROLES[usuario.rol]}</span>
          <span className={cn('rounded-full px-2.5 py-1 font-medium', est.clase)}>{est.etiqueta}</span>
          <span className="text-muted-foreground">Registro: {fechaCorta(usuario.createdAt)}</span>
        </div>
      </div>
      {!esPropia && (
        <div className="flex flex-wrap gap-2">
          {usuario.estado === 'pendiente' && (
            <Button size="sm" onClick={() => onAccion('aprobar', usuario)}>
              Aprobar
            </Button>
          )}
          {usuario.estado === 'activo' && (
            <Button size="sm" variant="outline" onClick={() => onAccion('suspender', usuario)}>
              Suspender
            </Button>
          )}
          {usuario.estado === 'suspendido' && (
            <Button size="sm" onClick={() => onAccion('reactivar', usuario)}>
              Reactivar
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => onAccion('rol', usuario)}>
            Cambiar rol
          </Button>
        </div>
      )}
    </li>
  )
}
