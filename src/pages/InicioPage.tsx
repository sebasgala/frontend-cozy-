import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { BUSQUEDA_INICIAL, type EstadoBusqueda } from '@/components/buscador/busqueda'
import type { EnlaceNav } from '@/components/EnlaceNavegacion'
import { HeroInicio } from '@/components/inicio/HeroInicio'
import { Cierre, Destacados, DestinosDeModa, Ofertas, Planificador } from '@/components/inicio/Secciones'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteHeader } from '@/components/SiteHeader'
import { desplazarAlFinal } from '@/lib/animacion'
import {
  listarDestacados,
  listarDestinos,
  listarEstilosViaje,
  listarOfertas,
  precioMinimoPorNoche,
} from '@/services/alojamientos'
import type { Alojamiento, Destino, EstiloViajeInfo, Oferta } from '@/types/alojamientos'

const ENLACES: EnlaceNav[] = [
  { etiqueta: 'Explorar', href: '#destacados' },
  { etiqueta: 'Destinos', href: '#moda' },
]

// "Ingresar" se muestra pero aún no tiene función (no hay inicio de sesión)
const INGRESAR = '/ingresar'

interface DatosInicio {
  destinos: Destino[]
  estilos: EstiloViajeInfo[]
  destacados: Alojamiento[]
  ofertas: Oferta[]
  precioMinimo: { precio: number; moneda: string } | null
}

const SIN_DATOS: DatosInicio = { destinos: [], estilos: [], destacados: [], ofertas: [], precioMinimo: null }

/** Pantalla Inicio (Cozy Landing de Claude Design) */
export default function InicioPage() {
  const hero = useRef<HTMLElement>(null)
  const [datos, setDatos] = useState<DatosInicio>(SIN_DATOS)
  const [busqueda, setBusqueda] = useState<EstadoBusqueda>(BUSQUEDA_INICIAL)
  const [barraVisible, setBarraVisible] = useState(false)
  const [favoritos, setFavoritos] = useState<Set<number>>(() => new Set())
  const { hash } = useLocation()

  useEffect(() => {
    let vigente = true
    Promise.all([listarDestinos(), listarEstilosViaje(), listarDestacados(), listarOfertas(), precioMinimoPorNoche()]).then(
      ([destinos, estilos, destacados, ofertas, precioMinimo]) => {
        if (vigente) setDatos({ destinos, estilos, destacados, ofertas, precioMinimo })
      },
    )
    return () => {
      vigente = false
    }
  }, [])

  // Enlaces desde otras pantallas (/#destacados…): las secciones existen cuando llegan los datos
  const cargado = datos.destinos.length > 0
  useEffect(() => {
    if (cargado && hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView()
  }, [cargado, hash])

  // Elegir una tarjeta de destino completa el buscador y baja hasta él (como el diseño)
  const elegirDestino = useCallback((destinoId: number | null) => {
    if (destinoId === null) return
    setBusqueda((b) => ({ ...b, destinoId }))
    desplazarAlFinal(hero.current)
  }, [])

  const alternarFavorito = useCallback((id: number) => {
    setFavoritos((actuales) => {
      const siguientes = new Set(actuales)
      if (siguientes.has(id)) siguientes.delete(id)
      else siguientes.add(id)
      return siguientes
    })
  }, [])

  return (
    <>
      <title>Cozy: quédate donde se siente bien</title>
      <SiteHeader variante="solida" fija visible={barraVisible} enlaces={ENLACES} ingresarHref={INGRESAR} />
      <main>
        <HeroInicio
          seccionRef={hero}
          destinos={datos.destinos}
          busqueda={busqueda}
          onCambiarBusqueda={setBusqueda}
          enlaces={ENLACES}
          ingresarHref={INGRESAR}
          onPasarHero={setBarraVisible}
        />
        <DestinosDeModa destinos={datos.destinos} onElegir={(d) => elegirDestino(d.id)} />
        <Planificador destinos={datos.destinos} estilos={datos.estilos} onElegir={(d) => elegirDestino(d.id)} />
        <Destacados alojamientos={datos.destacados} favoritos={favoritos} onFavorito={alternarFavorito} />
        <Ofertas
          ofertas={datos.ofertas}
          favoritos={favoritos}
          onFavorito={alternarFavorito}
          onElegir={(oferta) => elegirDestino(oferta.alojamiento.ciudadId)}
        />
        <Cierre precioMinimo={datos.precioMinimo} />
      </main>
      <SiteFooter enlaces={ENLACES} />
    </>
  )
}
