import { useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import {
  BedDouble,
  CalendarDays,
  ConciergeBell,
  House,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  ReceiptText,
  ShieldCheck,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Logo } from '@/components/Logo'
import { useSesion } from '@/hooks/useSesion'
import { cerrarSesion, esAdministracion, obtenerPerfil } from '@/services/cuenta'
import type { RolUsuario } from '@/types/cuenta'
import { cn } from '@/lib/utils'

interface EnlaceAdmin {
  etiqueta: string
  ruta: string
  icono: LucideIcon
  /** Roles que ven el enlace. Sin roles: administrador y superadmin. */
  roles?: RolUsuario[]
}

const PRINCIPAL: EnlaceAdmin[] = [
  { etiqueta: 'Panel', ruta: '/admin', icono: LayoutDashboard, roles: ['administrador', 'superadmin'] },
  { etiqueta: 'Recepción', ruta: '/admin/recepcion', icono: ConciergeBell, roles: ['recepcion', 'administrador', 'superadmin'] },
  { etiqueta: 'Alojamientos', ruta: '/admin/alojamientos', icono: House, roles: ['administrador', 'superadmin'] },
  { etiqueta: 'Habitaciones', ruta: '/admin/habitaciones', icono: BedDouble, roles: ['administrador', 'superadmin'] },
  { etiqueta: 'Disponibilidad', ruta: '/admin/disponibilidad', icono: CalendarDays, roles: ['recepcion', 'administrador', 'superadmin'] },
  { etiqueta: 'Reservas', ruta: '/admin/reservas', icono: ReceiptText, roles: ['administrador', 'superadmin'] },
  { etiqueta: 'Ciudades', ruta: '/admin/ciudades', icono: MapPin, roles: ['administrador', 'superadmin'] },
  { etiqueta: 'Mi cuenta', ruta: '/admin/cuenta', icono: UserRound },
]

const SISTEMA: EnlaceAdmin[] = [{ etiqueta: 'Usuarios', ruta: '/admin/usuarios', icono: Users, roles: ['superadmin'] }]

const ETIQUETA_ROL: Record<RolUsuario, string> = {
  cliente: 'Cliente',
  administrador: 'Administrador',
  superadmin: 'Superadministrador',
  recepcion: 'Recepción',
}

/**
 * Plantilla del panel de administración: barra lateral oscura con el menú según el rol y el contenido a la derecha.
 * Protege todas las rutas /admin: sin sesión lleva al ingreso; un cliente vuelve al inicio. Al entrar confirma la
 * sesión con /auth/me, así un cambio de rol o una suspensión se nota aunque el token siga guardado.
 */
export default function AdminLayout() {
  const sesion = useSesion()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [verificada, setVerificada] = useState(false)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [avisoVisible, setAvisoVisible] = useState(true)

  useEffect(() => {
    let vigente = true
    obtenerPerfil().finally(() => vigente && setVerificada(true))
    return () => {
      vigente = false
    }
  }, [])

  if (!sesion?.token) return <Navigate to={`/ingresar?volver=${encodeURIComponent(pathname)}`} replace />
  // Sesiones guardadas antes de que existiera el rol: se espera a /auth/me
  if (!sesion.rol && !verificada) return <PantallaVerificando />
  if (!esAdministracion(sesion.rol)) return <Navigate to="/" replace />

  const rol = sesion.rol as RolUsuario
  const visible = (e: EnlaceAdmin) => !e.roles || e.roles.includes(rol)
  const salir = async () => {
    await cerrarSesion()
    navigate('/ingresar')
  }

  return (
    <div className="flex min-h-svh bg-surface-muted">
      <title>Administración · Cozy</title>

      {/* Barra superior del teléfono */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between bg-primary px-4 text-on-dark lg:hidden">
        <Logo />
        <button
          type="button"
          onClick={() => setMenuAbierto((v) => !v)}
          aria-expanded={menuAbierto}
          aria-controls="menu-admin"
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
          className="flex size-10 items-center justify-center rounded-xl outline-none hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-on-dark"
        >
          {menuAbierto ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
        </button>
      </div>

      <aside
        id="menu-admin"
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex w-[264px] flex-col bg-primary px-4 pt-20 pb-4 text-on-dark transition-transform lg:sticky lg:top-0 lg:h-svh lg:translate-x-0 lg:pt-6',
          menuAbierto ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="hidden px-2 lg:block">
          <Logo />
        </div>
        <span className="mt-6 self-start rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold">{ETIQUETA_ROL[rol]}</span>

        <nav aria-label="Administración" className="mt-4 flex flex-1 flex-col gap-1 overflow-y-auto">
          {PRINCIPAL.filter(visible).map((e) => (
            <EnlaceMenu key={e.ruta} enlace={e} alNavegar={() => setMenuAbierto(false)} />
          ))}
          {SISTEMA.some(visible) && (
            <>
              <p className="mt-6 mb-1 border-t border-white/15 px-3 pt-4 text-[11px] font-semibold tracking-[0.12em] text-white/60 uppercase">
                Sistema
              </p>
              {SISTEMA.filter(visible).map((e) => (
                <EnlaceMenu key={e.ruta} enlace={e} alNavegar={() => setMenuAbierto(false)} />
              ))}
            </>
          )}
        </nav>

        <div className="mt-4 flex items-center gap-3 border-t border-white/15 px-2 pt-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--dutch-white)] text-sm font-semibold text-ink">
            {sesion.iniciales}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {sesion.nombre} {sesion.apellido}
            </p>
            <p className="truncate text-xs text-white/70">{ETIQUETA_ROL[rol]}</p>
          </div>
          <button
            type="button"
            onClick={salir}
            aria-label="Cerrar sesión"
            className="flex size-9 items-center justify-center rounded-xl outline-none hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-on-dark"
          >
            <LogOut aria-hidden="true" className="size-4" />
          </button>
        </div>
      </aside>

      {/* Fondo del menú abierto en el teléfono */}
      {menuAbierto && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMenuAbierto(false)}
          className="fixed inset-0 z-20 bg-ink/40 lg:hidden"
        />
      )}

      <main className="min-w-0 flex-1 px-4 pt-20 pb-12 sm:px-8 lg:pt-8">
        {rol === 'superadmin' && avisoVisible && (
          <div role="status" className="mb-6 flex items-center gap-3 rounded-2xl bg-[var(--dutch-white)] px-4 py-3 text-sm text-ink">
            <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
            <p className="flex-1">Modo superadministrador: tienes acceso a todo el sistema.</p>
            <button
              type="button"
              onClick={() => setAvisoVisible(false)}
              aria-label="Ocultar aviso"
              className="flex size-8 items-center justify-center rounded-lg outline-none hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-primary"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  )
}

// alNavegar cierra el menú del teléfono al elegir una pantalla
function EnlaceMenu({ enlace, alNavegar }: { enlace: EnlaceAdmin; alNavegar: () => void }) {
  const Icono = enlace.icono
  return (
    <NavLink
      to={enlace.ruta}
      end={enlace.ruta === '/admin'}
      onClick={alNavegar}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium outline-none transition-colors focus-visible:outline-2 focus-visible:outline-on-dark',
          isActive ? 'bg-white/12 text-on-dark' : 'text-white/80 hover:bg-white/8 hover:text-on-dark',
        )
      }
    >
      <Icono aria-hidden="true" className="size-[18px]" />
      {enlace.etiqueta}
    </NavLink>
  )
}

function PantallaVerificando() {
  return (
    <div role="status" className="flex min-h-svh items-center justify-center text-muted-foreground">
      Verificando tu sesión…
    </div>
  )
}

/** Envuelve una pantalla que solo pueden ver ciertos roles. Los demás vuelven al panel o a recepción. */
export function RequiereRol({ roles, children }: { roles: RolUsuario[]; children: React.ReactNode }) {
  const sesion = useSesion()
  if (!sesion?.rol || !roles.includes(sesion.rol)) {
    const destino = sesion?.rol === 'recepcion' ? '/admin/recepcion' : '/admin'
    return <Navigate to={destino} replace />
  }
  return <>{children}</>
}
