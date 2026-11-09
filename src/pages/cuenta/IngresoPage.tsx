import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { ChipsPestanas } from '@/components/ChipsPestanas'
import { CampoTexto } from '@/components/CampoTexto'
import { Button } from '@/components/ui/button'
import { esAdministracion, iniciarSesion, registrarCliente } from '@/services/cuenta'

type Pestana = 'ingresar' | 'registrarse'

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Ingreso y registro de CLIENTE (con pestañas). El registro de administrador no
 * vive aquí: no hay ruta pública para crear una cuenta de administrador.
 */
export default function IngresoPage() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // Ruta a la que volver tras ingresar (la pone el panel al pedir sesión). Solo rutas internas de la app.
  const [parametros] = useSearchParams()
  const volverCrudo = parametros.get('volver')
  const volver = volverCrudo?.startsWith('/') && !volverCrudo.startsWith('//') ? volverCrudo : null
  const [pestana, setPestana] = useState<Pestana>(pathname === '/registro' ? 'registrarse' : 'ingresar')

  // Ingreso
  const [correoIngreso, setCorreoIngreso] = useState('')
  const [contrasenaIngreso, setContrasenaIngreso] = useState('')
  const [erroresIngreso, setErroresIngreso] = useState<Record<string, string>>({})
  const [errorGeneralIngreso, setErrorGeneralIngreso] = useState('')
  const [enviandoIngreso, setEnviandoIngreso] = useState(false)

  // Registro
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [correoRegistro, setCorreoRegistro] = useState('')
  const [contrasenaRegistro, setContrasenaRegistro] = useState('')
  const [erroresRegistro, setErroresRegistro] = useState<Record<string, string>>({})
  const [errorGeneralRegistro, setErrorGeneralRegistro] = useState('')
  const [enviandoRegistro, setEnviandoRegistro] = useState(false)

  const enviarIngreso = async (evento: FormEvent) => {
    evento.preventDefault()
    const errores: Record<string, string> = {}
    if (!CORREO_VALIDO.test(correoIngreso.trim())) errores.correo = 'Escribe un correo válido.'
    if (!contrasenaIngreso) errores.contrasena = 'Escribe tu contraseña.'
    setErroresIngreso(errores)
    setErrorGeneralIngreso('')
    if (Object.keys(errores).length) return

    setEnviandoIngreso(true)
    try {
      const sesion = await iniciarSesion({ correo: correoIngreso.trim(), contrasena: contrasenaIngreso })
      if (esAdministracion(sesion.rol)) {
        navigate(volver?.startsWith('/admin') ? volver : '/admin')
      } else {
        navigate(volver && !volver.startsWith('/admin') ? volver : '/cuenta/reservas')
      }
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'status' in error) {
        const apiErr = error as { status: number; retryAfter?: number; problem?: { detail?: string; code?: string } }
        if (apiErr.problem?.code === 'ACCOUNT_PENDING') {
          navigate('/admin/pendiente')
        } else if (apiErr.problem?.code === 'ACCOUNT_SUSPENDED') {
          setErrorGeneralIngreso('Tu cuenta está suspendida. Escríbenos si crees que es un error.')
        } else if (apiErr.status === 429) {
          const segs = apiErr.retryAfter ? ` en ${apiErr.retryAfter} segundos` : ' en unos minutos'
          setErrorGeneralIngreso(`Has superado el límite de intentos permitidos. Intenta nuevamente${segs}.`)
        } else if (apiErr.status === 401) {
          setErrorGeneralIngreso('Correo o contraseña incorrectos.')
        } else {
          setErrorGeneralIngreso(apiErr.problem?.detail ?? (error instanceof Error ? error.message : 'No pudimos iniciar tu sesión.'))
        }
      } else {
        setErrorGeneralIngreso(error instanceof Error ? error.message : 'No pudimos iniciar tu sesión.')
      }
    } finally {
      setEnviandoIngreso(false)
    }
  }

  const enviarRegistro = async (evento: FormEvent) => {
    evento.preventDefault()
    const errores: Record<string, string> = {}
    if (!nombre.trim()) errores.nombre = 'Escribe tu nombre.'
    if (!apellido.trim()) errores.apellido = 'Escribe tu apellido.'
    if (!CORREO_VALIDO.test(correoRegistro.trim())) errores.correo = 'Escribe un correo válido.'
    if (contrasenaRegistro.length < 8) errores.contrasena = 'Usa al menos 8 caracteres.'
    else if (!/\p{L}/u.test(contrasenaRegistro) || !/\d/.test(contrasenaRegistro))
      errores.contrasena = 'Incluye al menos una letra y un número.'
    setErroresRegistro(errores)
    setErrorGeneralRegistro('')
    if (Object.keys(errores).length) return

    setEnviandoRegistro(true)
    try {
      await registrarCliente({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        correo: correoRegistro.trim(),
        contrasena: contrasenaRegistro,
      })
      navigate('/cuenta/reservas')
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'status' in error) {
        const apiErr = error as { status: number; retryAfter?: number; problem?: { detail?: string } }
        if (apiErr.status === 409) {
          setErrorGeneralRegistro('Ya existe una cuenta con ese correo electrónico.')
        } else if (apiErr.status === 429) {
          const segs = apiErr.retryAfter ? ` en ${apiErr.retryAfter} segundos` : ' en unos minutos'
          setErrorGeneralRegistro(`Has superado el límite de intentos permitidos. Intenta nuevamente${segs}.`)
        } else {
          setErrorGeneralRegistro(apiErr.problem?.detail ?? (error instanceof Error ? error.message : 'No pudimos crear tu cuenta.'))
        }
      } else {
        setErrorGeneralRegistro(error instanceof Error ? error.message : 'No pudimos crear tu cuenta.')
      }
    } finally {
      setEnviandoRegistro(false)
    }
  }

  return (
    <div className="mx-auto max-w-[480px] px-[clamp(20px,5vw,56px)] py-16">
      <title>{pestana === 'ingresar' ? 'Ingresar · Cozy' : 'Crear cuenta · Cozy'}</title>

      <h1 className="font-heading text-3xl font-medium tracking-tight text-ink">Tu cuenta</h1>
      <p className="mt-2 text-muted-foreground">Ingresa o crea una cuenta para ver y gestionar tus reservas.</p>

      <div className="mt-8">
        <ChipsPestanas
          etiqueta="Ingresar o registrarse"
          valor={pestana}
          onCambiar={(valor) => {
            setPestana(valor)
            navigate(valor === 'registrarse' ? '/registro' : '/ingresar', { replace: true })
          }}
          idPanel="panel-cuenta"
          opciones={[
            { id: 'ingresar', etiqueta: 'Ingresar' },
            { id: 'registrarse', etiqueta: 'Crear cuenta' },
          ]}
        />
      </div>

      <div id="panel-cuenta" role="tabpanel" className="mt-6">
        {pestana === 'ingresar' ? (
          <form onSubmit={enviarIngreso} aria-label="Ingresar" noValidate className="flex flex-col gap-5">
            <CampoTexto
              etiqueta="Correo electrónico"
              type="email"
              required
              autoComplete="email"
              value={correoIngreso}
              onChange={(e) => setCorreoIngreso(e.target.value)}
              error={erroresIngreso.correo}
            />
            <CampoTexto
              etiqueta="Contraseña"
              type="password"
              required
              autoComplete="current-password"
              value={contrasenaIngreso}
              onChange={(e) => setContrasenaIngreso(e.target.value)}
              error={erroresIngreso.contrasena}
            />
            {errorGeneralIngreso && (
              <p role="alert" className="text-sm font-medium text-error">
                {errorGeneralIngreso}
              </p>
            )}
            <Button type="submit" size="lg" disabled={enviandoIngreso}>
              {enviandoIngreso ? 'Ingresando…' : 'Ingresar'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              ¿Tienes el localizador de una reserva sin cuenta?{' '}
              <Link
                to="/consultar-reserva"
                className="font-medium text-ink underline underline-offset-4 hover:text-primary-hover"
              >
                Consúltala aquí
              </Link>
              .
            </p>
          </form>
        ) : (
          <form onSubmit={enviarRegistro} aria-label="Crear cuenta" noValidate className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CampoTexto
                etiqueta="Nombre"
                required
                autoComplete="given-name"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                error={erroresRegistro.nombre}
              />
              <CampoTexto
                etiqueta="Apellido"
                required
                autoComplete="family-name"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                error={erroresRegistro.apellido}
              />
            </div>
            <CampoTexto
              etiqueta="Correo electrónico"
              type="email"
              required
              autoComplete="email"
              value={correoRegistro}
              onChange={(e) => setCorreoRegistro(e.target.value)}
              error={erroresRegistro.correo}
            />
            <CampoTexto
              etiqueta="Contraseña"
              type="password"
              required
              autoComplete="new-password"
              value={contrasenaRegistro}
              onChange={(e) => setContrasenaRegistro(e.target.value)}
              error={erroresRegistro.contrasena}
              ayuda="Al menos 8 caracteres, con letras y números."
            />
            {errorGeneralRegistro && (
              <p role="alert" className="text-sm font-medium text-error">
                {errorGeneralRegistro}
              </p>
            )}
            <Button type="submit" size="lg" disabled={enviandoRegistro}>
              {enviandoRegistro ? 'Creando tu cuenta…' : 'Crear cuenta'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
