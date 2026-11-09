import { useNavigate } from 'react-router'
import { DropdownMenu } from 'radix-ui'
import { Heart, LayoutDashboard, LogOut, Ticket } from 'lucide-react'
import { cerrarSesion, esAdministracion } from '@/services/cuenta'
import type { SesionCliente } from '@/types/cuenta'
import { cn } from '@/lib/utils'

interface MenuUsuarioProps {
  sesion: SesionCliente
  /** `hero`: avatar blanco sobre fondo oscuro; `solida`: avatar oscuro sobre fondo claro */
  sobreOscuro?: boolean
}

/** Menú de usuario de la barra superior: iniciales, Mis reservas, Favoritos, Cerrar sesión */
export function MenuUsuario({ sesion, sobreOscuro = false }: MenuUsuarioProps) {
  const navigate = useNavigate()

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Cuenta de ${sesion.nombre} ${sesion.apellido}`}
          className={cn(
            'flex size-11 items-center justify-center rounded-full text-sm font-semibold transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2',
            sobreOscuro
              ? 'bg-white text-ink hover:bg-surface-muted focus-visible:outline-on-dark'
              : 'bg-primary text-on-dark hover:bg-primary-hover focus-visible:outline-primary',
          )}
        >
          {sesion.iniciales}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-[91] w-64 overflow-hidden rounded-[20px] border border-border bg-white p-2 text-ink shadow-float outline-none animate-au-pop"
        >
          <div className="px-3 py-2">
            <p className="text-sm font-semibold text-ink">
              {sesion.nombre} {sesion.apellido}
            </p>
            <p className="truncate text-xs text-muted-foreground">{sesion.correo}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          {esAdministracion(sesion.rol) && (
            <DropdownMenu.Item
              onSelect={() => navigate('/admin')}
              className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink outline-none data-[highlighted]:bg-surface-muted"
            >
              <LayoutDashboard aria-hidden="true" className="size-4 text-primary" />
              Panel de administración
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item
            onSelect={() => navigate('/cuenta/reservas')}
            className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink outline-none data-[highlighted]:bg-surface-muted"
          >
            <Ticket aria-hidden="true" className="size-4 text-primary" />
            Mis reservas
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => navigate('/cuenta/favoritos')}
            className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink outline-none data-[highlighted]:bg-surface-muted"
          >
            <Heart aria-hidden="true" className="size-4 text-primary" />
            Favoritos
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            onSelect={() => {
              cerrarSesion()
              navigate('/')
            }}
            className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink outline-none data-[highlighted]:bg-surface-muted"
          >
            <LogOut aria-hidden="true" className="size-4 text-primary" />
            Cerrar sesión
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
