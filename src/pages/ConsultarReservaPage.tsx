import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Search } from 'lucide-react'
import { CampoTexto } from '@/components/CampoTexto'
import { TarjetaReserva } from '@/components/TarjetaReserva'
import { Button } from '@/components/ui/button'
import { buscarReservaPorLocalizadorYCorreo } from '@/services/reservas'
import type { ReservaCompleta } from '@/types/reservas'

type Estado = 'inicial' | 'buscando' | 'encontrada' | 'no-encontrada'

/** Consulta sin cuenta: localizador + correo (el correo evita que cualquiera con el localizador vea la reserva) */
export default function ConsultarReservaPage() {
  const [localizador, setLocalizador] = useState('')
  const [correo, setCorreo] = useState('')
  const [estado, setEstado] = useState<Estado>('inicial')
  const [reserva, setReserva] = useState<ReservaCompleta | null>(null)
  const [errorLimite, setErrorLimite] = useState('')

  const buscar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (!localizador.trim() || !correo.trim()) return
    setEstado('buscando')
    setErrorLimite('')
    try {
      const encontrada = await buscarReservaPorLocalizadorYCorreo(localizador, correo)
      if (encontrada) {
        setReserva(encontrada)
        setEstado('encontrada')
      } else {
        setReserva(null)
        setEstado('no-encontrada')
      }
    } catch (error) {
      setReserva(null)
      if (typeof error === 'object' && error !== null && 'status' in error) {
        const apiErr = error as { status: number; retryAfter?: number; problem?: { detail?: string } }
        if (apiErr.status === 429) {
          const segs = apiErr.retryAfter ? ` en ${apiErr.retryAfter} segundos` : ' en unos momentos'
          setErrorLimite(`Has alcanzado el límite de consultas. Intenta nuevamente${segs}.`)
          setEstado('inicial')
          return
        }
      }
      setEstado('no-encontrada')
    }
  }

  return (
    <div className="mx-auto max-w-[560px] px-[clamp(20px,5vw,56px)] py-16">
      <title>Consultar una reserva · Cozy</title>
      <h1 className="font-heading text-3xl font-medium tracking-tight text-ink">Consultar una reserva</h1>
      <p className="mt-2 text-muted-foreground">
        Escribe el localizador de 8 caracteres y el correo con el que reservaste.
      </p>

      <form onSubmit={buscar} aria-label="Consultar reserva" noValidate className="mt-8 flex flex-col gap-5">
        <CampoTexto
          etiqueta="Localizador"
          name="localizador"
          required
          autoCapitalize="characters"
          placeholder="K7M2Q9XR"
          value={localizador}
          onChange={(e) => setLocalizador(e.target.value.toUpperCase())}
          className="font-mono tracking-[0.1em] uppercase"
        />
        <CampoTexto
          etiqueta="Correo electrónico"
          type="email"
          required
          autoComplete="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
        />
        <Button type="submit" size="lg" disabled={estado === 'buscando'}>
          <Search aria-hidden="true" />
          {estado === 'buscando' ? 'Buscando…' : 'Buscar reserva'}
        </Button>
      </form>

      {errorLimite && (
        <div role="alert" className="mt-8 rounded-[20px] border border-error/30 bg-error/5 p-6 text-center text-error">
          <p className="font-medium">{errorLimite}</p>
        </div>
      )}

      {estado === 'no-encontrada' && !errorLimite && (
        <div role="alert" className="mt-8 rounded-[20px] border border-border bg-white p-6 text-center">
          <p className="font-medium text-ink">No encontramos ninguna reserva con esos datos.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Revisa que el localizador y el correo sean exactamente los que usaste al reservar.
          </p>
        </div>
      )}

      {estado === 'encontrada' && reserva && (
        <div className="mt-8 flex flex-col gap-4">
          <p className="text-sm font-medium text-ink">Encontramos tu reserva:</p>
          <TarjetaReserva reserva={reserva} />
        </div>
      )}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        ¿Prefieres ver todas tus reservas juntas?{' '}
        <Link to="/ingresar" className="font-medium text-ink underline underline-offset-4 hover:text-primary-hover">
          Crea una cuenta o ingresa
        </Link>
        .
      </p>
    </div>
  )
}
