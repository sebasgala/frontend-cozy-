import { createBrowserRouter } from 'react-router'
import AdminLayout, { RequiereRol } from '@/layouts/AdminLayout'
import MainLayout from '@/layouts/MainLayout'
import AlojamientoFormPage from '@/pages/admin/AlojamientoFormPage'
import AlojamientosPage from '@/pages/admin/AlojamientosPage'
import CiudadesPage from '@/pages/admin/CiudadesPage'
import CuentaAdminPage from '@/pages/admin/CuentaAdminPage'
import DisponibilidadPage from '@/pages/admin/DisponibilidadPage'
import HabitacionFormPage from '@/pages/admin/HabitacionFormPage'
import HabitacionesPage from '@/pages/admin/HabitacionesPage'
import PanelAdminPage from '@/pages/admin/PanelAdminPage'
import RecepcionPage from '@/pages/admin/RecepcionPage'
import ReservasAdminPage from '@/pages/admin/ReservasAdminPage'
import UsuariosPage from '@/pages/admin/UsuariosPage'
import RaizLayout from '@/layouts/RaizLayout'
import ConsultarReservaPage from '@/pages/ConsultarReservaPage'
import DetalleAlojamientoPage from '@/pages/DetalleAlojamientoPage'
import DetalleReservaPage from '@/pages/cuenta/DetalleReservaPage'
import FavoritosPage from '@/pages/cuenta/FavoritosPage'
import IngresoPage from '@/pages/cuenta/IngresoPage'
import MisReservasPage from '@/pages/cuenta/MisReservasPage'
import InicioPage from '@/pages/InicioPage'
import NotFoundPage from '@/pages/NotFoundPage'
import PendingPage from '@/pages/PendingPage'
import ConfirmacionReservaPage from '@/pages/reserva/ConfirmacionReservaPage'
import ErrorReservaPage from '@/pages/reserva/ErrorReservaPage'
import PagoReservaPage from '@/pages/reserva/PagoReservaPage'
import ResumenReservaPage from '@/pages/reserva/ResumenReservaPage'
import ResultadosPage from '@/pages/ResultadosPage'

export const router = createBrowserRouter([
  {
    element: <RaizLayout />,
    children: [
      // El Inicio lleva su propio hero, barra y pie
      { index: true, element: <InicioPage /> },
      {
        element: <MainLayout />,
        children: [
          { path: 'resultados', element: <ResultadosPage /> },
          { path: 'alojamientos/:id', element: <DetalleAlojamientoPage /> },

          // Flujo de reserva
          { path: 'reserva/resumen', element: <ResumenReservaPage /> },
          { path: 'reserva/pago', element: <PagoReservaPage /> },
          { path: 'reserva/confirmacion', element: <ConfirmacionReservaPage /> },
          { path: 'reserva/error', element: <ErrorReservaPage /> },

          // Cuenta del cliente
          { path: 'ingresar', element: <IngresoPage /> },
          { path: 'registro', element: <IngresoPage /> },
          { path: 'cuenta/reservas', element: <MisReservasPage /> },
          { path: 'cuenta/reservas/:localizador', element: <DetalleReservaPage /> },
          { path: 'cuenta/favoritos', element: <FavoritosPage /> },
          { path: 'consultar-reserva', element: <ConsultarReservaPage /> },

          // Administrador registrado que el superadmin aún no aprueba (el login responde 403 ACCOUNT_PENDING)
          {
            path: 'admin/pendiente',
            element: (
              <PendingPage
                titulo="Cuenta de administrador pendiente"
                descripcion="Tu cuenta está esperando la aprobación de un superadministrador. Podrás ingresar al panel en cuanto la aprueben."
              />
            ),
          },

          { path: '*', element: <NotFoundPage /> },
        ],
      },

      // Panel de administración: su propia plantilla y protección por rol (AdminLayout)
      {
        path: 'admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <PanelAdminPage /> },
          { path: 'recepcion', element: <RecepcionPage /> },
          {
            path: 'alojamientos',
            element: (
              <RequiereRol roles={['administrador', 'superadmin']}>
                <AlojamientosPage />
              </RequiereRol>
            ),
          },
          {
            path: 'alojamientos/nuevo',
            element: (
              <RequiereRol roles={['administrador', 'superadmin']}>
                <AlojamientoFormPage />
              </RequiereRol>
            ),
          },
          {
            path: 'alojamientos/:id/editar',
            element: (
              <RequiereRol roles={['administrador', 'superadmin']}>
                <AlojamientoFormPage />
              </RequiereRol>
            ),
          },
          {
            path: 'ciudades',
            element: (
              <RequiereRol roles={['administrador', 'superadmin']}>
                <CiudadesPage />
              </RequiereRol>
            ),
          },
          {
            path: 'habitaciones',
            element: (
              <RequiereRol roles={['administrador', 'superadmin']}>
                <HabitacionesPage />
              </RequiereRol>
            ),
          },
          {
            path: 'habitaciones/nueva',
            element: (
              <RequiereRol roles={['administrador', 'superadmin']}>
                <HabitacionFormPage />
              </RequiereRol>
            ),
          },
          {
            path: 'habitaciones/:id/editar',
            element: (
              <RequiereRol roles={['administrador', 'superadmin']}>
                <HabitacionFormPage />
              </RequiereRol>
            ),
          },
          {
            path: 'disponibilidad',
            element: (
              <RequiereRol roles={['administrador', 'superadmin']}>
                <DisponibilidadPage />
              </RequiereRol>
            ),
          },
          {
            path: 'reservas',
            element: (
              <RequiereRol roles={['administrador', 'superadmin']}>
                <ReservasAdminPage />
              </RequiereRol>
            ),
          },
          { path: 'cuenta', element: <CuentaAdminPage /> },
          {
            path: 'usuarios',
            element: (
              <RequiereRol roles={['superadmin']}>
                <UsuariosPage />
              </RequiereRol>
            ),
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
