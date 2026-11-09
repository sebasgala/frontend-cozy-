import { Revelar } from '@/components/Revelar'

interface EncabezadoSeccionProps {
  titulo: string
  subtitulo?: string
  /** Nivel semántico del título (el aspecto no cambia) */
  nivel?: 'h1' | 'h2'
  id?: string
  className?: string
}

/** Título de sección en Fraunces con subtítulo opcional; aparece al entrar en pantalla */
export function EncabezadoSeccion({ titulo, subtitulo, nivel = 'h2', id, className }: EncabezadoSeccionProps) {
  const Titulo = nivel
  return (
    <Revelar className={className}>
      <Titulo
        id={id}
        className="text-[clamp(32px,4vw,48px)] leading-[1.1] font-medium tracking-[-0.02em] text-balance text-ink"
      >
        {titulo}
      </Titulo>
      {subtitulo && (
        <p className="mt-3 text-[clamp(15px,1.3vw,18px)] leading-normal text-muted-foreground">{subtitulo}</p>
      )}
    </Revelar>
  )
}
