import { useEffect, useState, type FormEvent } from 'react'
import { CampoTexto } from '@/components/CampoTexto'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/services/api'
import { erroresPorCampo, esErrorDeSesion, mensajeDeError } from '@/services/admin'
import { crearCiudad, listarCiudadesAdmin } from '@/services/alojamientosAdmin'
import { cerrarSesion } from '@/services/cuenta'
import type { CiudadAdmin, ErroresCampo } from '@/types/admin'
import { nombrePais } from '@/lib/paises'
import { EncabezadoAdmin } from './EncabezadoAdmin'

/**
 * Catálogo común de ciudades: lo ven y lo amplían tanto administradores como el superadmin (no tiene propietario).
 * Sirve para elegir la ciudad al crear un alojamiento. Una ciudad repetida (mismo nombre y país, sin distinguir
 * mayúsculas) responde 409 y se muestra bajo el campo del nombre.
 */
export default function CiudadesPage() {
  const [ciudades, setCiudades] = useState<CiudadAdmin[] | null>(null)
  const [errorLista, setErrorLista] = useState('')
  const [version, setVersion] = useState(0)

  const [nombre, setNombre] = useState('')
  const [pais, setPais] = useState('')
  const [errores, setErrores] = useState<ErroresCampo>({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    let vigente = true
    listarCiudadesAdmin()
      .then((lista) => vigente && setCiudades(lista))
      .catch((e: unknown) => {
        if (!vigente) return
        if (esErrorDeSesion(e)) void cerrarSesion()
        setErrorLista(mensajeDeError(e, 'No se pudieron cargar las ciudades.'))
      })
    return () => {
      vigente = false
    }
  }, [version])

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    const nuevos: ErroresCampo = {}
    if (nombre.trim().length < 2) nuevos.nombre = 'Escribe el nombre de la ciudad (al menos 2 caracteres).'
    if (!/^[a-zA-Z]{2}$/.test(pais.trim())) nuevos.pais = 'Escribe el código de país de 2 letras (por ejemplo ec).'
    setErrores(nuevos)
    setErrorGeneral('')
    setAviso('')
    if (Object.keys(nuevos).length) return

    setEnviando(true)
    try {
      const creada = await crearCiudad({ nombre: nombre.trim(), pais: pais.trim().toLowerCase() })
      setAviso(`Agregaste ${creada.nombre} (${nombrePais(creada.pais)}).`)
      setNombre('')
      setPais('')
      setVersion((v) => v + 1)
    } catch (e) {
      if (esErrorDeSesion(e)) {
        await cerrarSesion()
        return
      }
      if (e instanceof ApiError && e.status === 409) setErrores({ nombre: mensajeDeError(e) })
      else {
        const porCampo = erroresPorCampo(e)
        if (Object.keys(porCampo).length) setErrores(porCampo)
        else setErrorGeneral(mensajeDeError(e, 'No se pudo crear la ciudad.'))
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <EncabezadoAdmin titulo="Ciudades" descripcion="Catálogo común: elige una de estas ciudades al crear un alojamiento." />

      <form onSubmit={enviar} noValidate aria-label="Agregar ciudad" className="rounded-[20px] border border-border bg-white p-5">
        <h2 className="font-heading text-lg font-medium text-ink">Agregar una ciudad</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_200px_auto] sm:items-start">
          <CampoTexto etiqueta="Nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} error={errores.nombre} maxLength={120} />
          <CampoTexto
            etiqueta="País (código)"
            required
            value={pais}
            onChange={(e) => setPais(e.target.value)}
            error={errores.pais}
            ayuda="Dos letras, por ejemplo ec."
            maxLength={2}
            autoCapitalize="none"
          />
          <Button type="submit" size="lg" disabled={enviando} className="sm:mt-[21px]">
            {enviando ? 'Agregando…' : 'Agregar'}
          </Button>
        </div>
        {errorGeneral && (
          <p role="alert" className="mt-3 text-sm font-medium text-error">
            {errorGeneral}
          </p>
        )}
      </form>

      {aviso && (
        <p role="status" className="mt-4 rounded-2xl bg-[var(--dutch-white)] px-4 py-3 text-sm text-ink">
          {aviso}
        </p>
      )}

      <section aria-label="Ciudades existentes" className="mt-6" aria-busy={!ciudades && !errorLista}>
        {errorLista ? (
          <p role="alert" className="rounded-2xl bg-white p-5 text-sm font-medium text-error">
            {errorLista}
          </p>
        ) : !ciudades ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[72px] animate-pulse rounded-[20px] bg-white" />
            ))}
          </div>
        ) : ciudades.length === 0 ? (
          <p className="rounded-[20px] border border-border bg-white p-6 text-muted-foreground">Todavía no hay ciudades. Agrega la primera arriba.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {ciudades.map((c) => (
              <li key={c.id} className="rounded-[20px] border border-border bg-white px-5 py-4">
                <p className="font-medium text-ink">{c.nombre}</p>
                <p className="text-sm text-muted-foreground">{nombrePais(c.pais)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
