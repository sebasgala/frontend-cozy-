import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Heart } from 'lucide-react'
import { TarjetaAlojamiento } from '@/components/TarjetaAlojamiento'
import { Button } from '@/components/ui/button'
import { listarFavoritos, quitarFavorito } from '@/services/cuenta'
import type { Alojamiento } from '@/types/alojamientos'

export default function FavoritosPage() {
  const [favoritos, setFavoritos] = useState<Alojamiento[] | null>(null)

  useEffect(() => {
    let vigente = true
    listarFavoritos().then((lista) => {
      if (vigente) setFavoritos(lista)
    })
    return () => {
      vigente = false
    }
  }, [])

  const quitar = async (id: number) => {
    setFavoritos((prev) => prev?.filter((a) => a.id !== id) ?? prev)
    await quitarFavorito(id)
  }

  return (
    <div className="mx-auto max-w-[1100px] px-[clamp(20px,5vw,56px)] py-10">
      <title>Favoritos · Cozy</title>
      <h1 className="font-heading text-3xl font-medium tracking-tight text-ink">Favoritos</h1>
      <p className="mt-2 text-muted-foreground">Los alojamientos que guardaste en este navegador.</p>

      <div className="mt-8">
        {favoritos === null ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-[20px] bg-surface-muted" />
            ))}
          </div>
        ) : favoritos.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-[20px] border border-border bg-white p-12 text-center">
            <Heart aria-hidden="true" className="size-8 text-muted-foreground" />
            <p className="font-medium text-ink">Todavía no guardaste ningún alojamiento.</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Toca el corazón en cualquier alojamiento para guardarlo aquí.
            </p>
            <Button asChild>
              <Link to="/resultados">Explorar alojamientos</Link>
            </Button>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {favoritos.map((alojamiento) => (
              <li key={alojamiento.id}>
                <TarjetaAlojamiento
                  alojamiento={alojamiento}
                  href={`/alojamientos/${alojamiento.id}`}
                  favorito
                  onFavorito={() => quitar(alojamiento.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
