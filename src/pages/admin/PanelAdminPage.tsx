import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router'
import { useSesion } from '@/hooks/useSesion'
import { contar, mensajeDeError } from '@/services/admin'
import { EncabezadoAdmin } from './EncabezadoAdmin'

interface Indicador {
  etiqueta: string
  valor: number | null
  enlace: string
}

/**
 * Panel de inicio de la administración. Muestra conteos reales de la API; el administrador ve solo lo de sus
 * alojamientos (el backend filtra por propietario) y el superadmin ve todo, más las cuentas por aprobar.
 */
export default function PanelAdminPage() {
  const sesion = useSesion()
  const esSuperadmin = sesion?.rol === 'superadmin'
  const [indicadores, setIndicadores] = useState<Indicador[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (sesion?.rol === 'recepcion') return
    let vigente = true
    const pedidos: Promise<Indicador>[] = [
      contar('/admin/alojamientos', { activo: true }).then((valor) => ({ etiqueta: 'Alojamientos activos', valor, enlace: '/admin/alojamientos' })),
      contar('/admin/reservas', { estado: 'CONFIRMED' }).then((valor) => ({ etiqueta: 'Reservas confirmadas', valor, enlace: '/admin/reservas' })),
    ]
    if (esSuperadmin) {
      pedidos.push(
        contar('/admin/usuarios', { estado: 'pendiente' }).then((valor) => ({ etiqueta: 'Cuentas por aprobar', valor, enlace: '/admin/usuarios' })),
      )
    }
    Promise.all(pedidos)
      .then((lista) => vigente && setIndicadores(lista))
      .catch((e: unknown) => vigente && setError(mensajeDeError(e, 'No se pudo cargar el resumen.')))
    return () => {
      vigente = false
    }
  }, [esSuperadmin, sesion?.rol])

  if (sesion?.rol === 'recepcion') return <Navigate to="/admin/recepcion" replace />

  return (
    <>
      <EncabezadoAdmin
        titulo="Panel"
        descripcion={esSuperadmin ? 'Resumen de todo el sistema' : 'Resumen de tus alojamientos'}
      />
      {error ? (
        <p role="alert" className="rounded-2xl bg-white p-5 text-sm font-medium text-error">
          {error}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy={indicadores.length === 0}>
          {(indicadores.length ? indicadores : [null, null, null]).map((indicador, i) => (
            <li key={indicador?.etiqueta ?? i}>
              {indicador ? (
                <Link
                  to={indicador.enlace}
                  className="block rounded-[20px] border border-border bg-white p-5 outline-none transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <p className="text-sm text-muted-foreground">{indicador.etiqueta}</p>
                  <p className="mt-1 font-heading text-3xl font-medium text-ink">{indicador.valor}</p>
                </Link>
              ) : (
                <div className="h-[106px] animate-pulse rounded-[20px] bg-white" />
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
