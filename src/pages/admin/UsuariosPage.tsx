import { useEffect, useState } from 'react'
import { ChipsPestanas } from '@/components/ChipsPestanas'
import { CampoTexto } from '@/components/CampoTexto'
import { DialogoConfirmacion } from '@/components/DialogoConfirmacion'
import { Button } from '@/components/ui/button'
import { useAlojamientosAdmin } from '@/hooks/useAlojamientosAdmin'
import { useSesion } from '@/hooks/useSesion'
import { contar, esErrorDeSesion, mensajeDeError } from '@/services/admin'
import { cerrarSesion } from '@/services/cuenta'
import {
  aprobarUsuario,
  cambiarRolUsuario,
  crearUsuarioAdmin,
  listarUsuarios,
  reactivarUsuario,
  suspenderUsuario,
} from '@/services/usuariosAdmin'
import type { AlojamientoAdmin, Pagina, UsuarioAdmin } from '@/types/admin'
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

const ROLES: Record<RolUsuario, string> = { cliente: 'Cliente', administrador: 'Administrador', superadmin: 'Superadministrador', recepcion: 'Recepción' }
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
  const { alojamientos } = useAlojamientosAdmin()
  const [estado, setEstado] = useState<FiltroEstado>('pendiente')
  const [rol, setRol] = useState<RolUsuario | ''>('')
  const [pagina, setPagina] = useState(1)
  const [version, setVersion] = useState(0)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [conteos, setConteos] = useState<Record<EstadoUsuario, number> | null>(null)

  const [accion, setAccion] = useState<Accion | null>(null)
  const [rolNuevo, setRolNuevo] = useState<RolUsuario>('cliente')
  const [alojamientoRolId, setAlojamientoRolId] = useState<string>('')
  const [errorAccion, setErrorAccion] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [aviso, setAviso] = useState('')

  const [creandoAbierto, setCreandoAbierto] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoApellido, setNuevoApellido] = useState('')
  const [nuevoEmail, setNuevoEmail] = useState('')
  const [nuevoPassword, setNuevoPassword] = useState('')
  const [nuevoRol, setNuevoRol] = useState<RolUsuario>('administrador')
  const [nuevoAlojamientoId, setNuevoAlojamientoId] = useState<string>('')
  const [errorCrear, setErrorCrear] = useState('')
  const [creando, setCreando] = useState(false)

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
    setAlojamientoRolId(usuario.alojamientoId ? String(usuario.alojamientoId) : '')
    setErrorAccion('')
    setAviso('')
  }

  const cerrar = (abierto: boolean) => {
    if (!abierto && !confirmando) setAccion(null)
  }

  const requiereAlojamiento = (r: RolUsuario) => r === 'administrador' || r === 'recepcion'

  const abrirCrear = () => {
    setCreandoAbierto(true)
    setNuevoNombre('')
    setNuevoApellido('')
    setNuevoEmail('')
    setNuevoPassword('')
    setNuevoRol('administrador')
    setNuevoAlojamientoId(alojamientos?.[0]?.id ? String(alojamientos[0].id) : '')
    setErrorCrear('')
    setAviso('')
  }

  const confirmarCrear = async () => {
    if (!nuevoNombre.trim() || !nuevoApellido.trim() || !nuevoEmail.trim()) {
      setErrorCrear('Nombre, apellido y correo son obligatorios.')
      return
    }
    const alojamientoNum = requiereAlojamiento(nuevoRol) ? Number(nuevoAlojamientoId) : null
    if (requiereAlojamiento(nuevoRol) && (!alojamientoNum || !Number.isInteger(alojamientoNum))) {
      setErrorCrear('Debes seleccionar un alojamiento para este rol.')
      return
    }
    setCreando(true)
    setErrorCrear('')
    try {
      const creada = await crearUsuarioAdmin({
        nombre: nuevoNombre.trim(),
        apellido: nuevoApellido.trim(),
        email: nuevoEmail.trim(),
        ...(nuevoPassword.trim() ? { password: nuevoPassword.trim() } : {}),
        rol: nuevoRol,
        alojamientoId: alojamientoNum,
      })
      setCreandoAbierto(false)
      setEstado('activo')
      setPagina(1)
      setVersion((v) => v + 1)
      setAviso(
        creada.claveTemporal
          ? `Usuario ${creada.nombre} ${creada.apellido} creado (${ROLES[creada.rol]}). Clave temporal: ${creada.claveTemporal}`
          : `Usuario ${creada.nombre} ${creada.apellido} creado (${ROLES[creada.rol]}).`,
      )
    } catch (e) {
      if (esErrorDeSesion(e)) {
        await cerrarSesion()
        return
      }
      setErrorCrear(mensajeDeError(e, 'No se pudo crear el usuario.'))
    } finally {
      setCreando(false)
    }
  }

  const confirmar = async () => {
    if (!accion) return
    const { tipo, usuario } = accion
    const alojamientoNum = requiereAlojamiento(rolNuevo) ? Number(alojamientoRolId) || null : null
    if (tipo === 'rol') {
      if (requiereAlojamiento(rolNuevo) && !alojamientoNum) {
        setErrorAccion('Debes seleccionar un alojamiento para este rol.')
        return
      }
      if (rolNuevo === usuario.rol && (usuario.alojamientoId ?? null) === alojamientoNum) {
        setErrorAccion(`${nombreCompleto(usuario)} ya tiene ese rol y alojamiento.`)
        return
      }
    }
    setConfirmando(true)
    setErrorAccion('')
    try {
      if (tipo === 'aprobar') await aprobarUsuario(usuario.id)
      else if (tipo === 'suspender') await suspenderUsuario(usuario.id)
      else if (tipo === 'reactivar') await reactivarUsuario(usuario.id)
      else await cambiarRolUsuario(usuario.id, rolNuevo, alojamientoNum)
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
      <EncabezadoAdmin
        titulo="Usuarios"
        descripcion="Crea usuarios, asigna alojamientos, aprueba administradores, suspende cuentas y cambia roles."
        acciones={
          <Button onClick={abrirCrear} size="sm">
            Crear usuario
          </Button>
        }
      />

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
              <FilaUsuario key={u.id} usuario={u} esPropia={u.id === sesion?.id} alojamientos={alojamientos} onAccion={abrir} />
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
            <div className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink">
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
              {requiereAlojamiento(rolNuevo) && (
                <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink">
                  Alojamiento asignado *
                  <select
                    value={alojamientoRolId}
                    onChange={(e) => setAlojamientoRolId(e.target.value)}
                    className="h-11 rounded-xl border border-border bg-white px-3 text-sm text-ink outline-none focus:border-primary"
                  >
                    <option value="">Elige un alojamiento</option>
                    {alojamientos?.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}
          {errorAccion && (
            <p role="alert" className="mt-4 text-sm font-medium text-error">
              {errorAccion}
            </p>
          )}
        </DialogoConfirmacion>
      )}

      {creandoAbierto && (
        <DialogoConfirmacion
          abierto
          onAbiertoCambia={(abierto) => {
            if (!abierto && !creando) setCreandoAbierto(false)
          }}
          titulo="Crear usuario"
          etiquetaConfirmar="Crear usuario"
          confirmando={creando}
          onConfirmar={confirmarCrear}
        >
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <CampoTexto etiqueta="Nombre" required value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} maxLength={120} />
              <CampoTexto etiqueta="Apellido" required value={nuevoApellido} onChange={(e) => setNuevoApellido(e.target.value)} maxLength={120} />
            </div>
            <CampoTexto etiqueta="Correo" type="email" required value={nuevoEmail} onChange={(e) => setNuevoEmail(e.target.value)} maxLength={255} />
            <CampoTexto
              etiqueta="Contraseña (opcional)"
              type="password"
              value={nuevoPassword}
              onChange={(e) => setNuevoPassword(e.target.value)}
              maxLength={72}
              ayuda="Si la dejas vacía se genera una clave temporal de un solo uso."
            />
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink">
              Rol *
              <select
                value={nuevoRol}
                onChange={(e) => setNuevoRol(e.target.value as RolUsuario)}
                className="h-11 rounded-xl border border-border bg-white px-3 text-sm text-ink outline-none focus:border-primary"
              >
                {Object.entries(ROLES).map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ))}
              </select>
            </label>
            {requiereAlojamiento(nuevoRol) && (
              <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink">
                Alojamiento asignado *
                <select
                  value={nuevoAlojamientoId}
                  onChange={(e) => setNuevoAlojamientoId(e.target.value)}
                  className="h-11 rounded-xl border border-border bg-white px-3 text-sm text-ink outline-none focus:border-primary"
                >
                  <option value="">Elige un alojamiento</option>
                  {alojamientos?.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {errorCrear && (
              <p role="alert" className="text-sm font-medium text-error">
                {errorCrear}
              </p>
            )}
          </div>
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
  alojamientos,
  onAccion,
}: {
  usuario: UsuarioAdmin
  esPropia: boolean
  alojamientos?: AlojamientoAdmin[] | null
  onAccion: (tipo: TipoAccion, usuario: UsuarioAdmin) => void
}) {
  const est = ESTADOS[usuario.estado]
  const nombreAlojamiento =
    usuario.alojamientoId != null
      ? alojamientos?.find((a) => a.id === usuario.alojamientoId)?.nombre ?? `Alojamiento #${usuario.alojamientoId}`
      : null
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
          {nombreAlojamiento && <span className="rounded-full bg-surface-muted px-2.5 py-1 font-medium text-ink">{nombreAlojamiento}</span>}
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
