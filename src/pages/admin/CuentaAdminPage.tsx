import { useSesion } from '@/hooks/useSesion'
import { EncabezadoAdmin } from './EncabezadoAdmin'

const ETIQUETA_ROL = { cliente: 'Cliente', administrador: 'Administrador', superadmin: 'Superadministrador' } as const
const ETIQUETA_ESTADO = { pendiente: 'Pendiente', activo: 'Activa', suspendido: 'Suspendida' } as const

/** Datos de la cuenta con la que se entró al panel (de /auth/me, que AdminLayout consulta al entrar) */
export default function CuentaAdminPage() {
  const sesion = useSesion()
  if (!sesion) return null

  const filas: [string, string][] = [
    ['Nombre', `${sesion.nombre} ${sesion.apellido}`],
    ['Correo', sesion.correo],
    ['Rol', sesion.rol ? ETIQUETA_ROL[sesion.rol] : '—'],
    ['Estado', sesion.estado ? ETIQUETA_ESTADO[sesion.estado] : '—'],
  ]

  return (
    <>
      <EncabezadoAdmin titulo="Mi cuenta" />
      <dl className="max-w-xl divide-y divide-border rounded-[20px] border border-border bg-white">
        {filas.map(([etiqueta, valor]) => (
          <div key={etiqueta} className="flex flex-wrap justify-between gap-2 px-5 py-4">
            <dt className="text-sm text-muted-foreground">{etiqueta}</dt>
            <dd className="text-sm font-medium text-ink">{valor}</dd>
          </div>
        ))}
      </dl>
    </>
  )
}
