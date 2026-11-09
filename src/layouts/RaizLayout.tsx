import { Outlet, ScrollRestoration } from 'react-router'

/** Raíz de todas las rutas: restaura el scroll al navegar (cada pantalla empieza arriba) */
export default function RaizLayout() {
  return (
    <>
      <Outlet />
      <ScrollRestoration />
    </>
  )
}
