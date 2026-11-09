import type { ReactNode } from 'react'

/** Título de cada pantalla del panel, con descripción y acciones opcionales a la derecha */
export function EncabezadoAdmin({ titulo, descripcion, acciones }: { titulo: string; descripcion?: string; acciones?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <title>{`${titulo} · Administración · Cozy`}</title>
      <div>
        <h1 className="font-heading text-[clamp(28px,3.4vw,40px)] leading-[1.1] font-medium tracking-[-0.02em] text-ink">{titulo}</h1>
        {descripcion && <p className="mt-1.5 text-muted-foreground">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </header>
  )
}
