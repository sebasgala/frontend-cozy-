// Marcador de las pantallas que se diseñan en fases siguientes.
export default function PendingPage({ titulo, descripcion }: { titulo: string; descripcion?: string }) {
  return (
    <section className="mx-auto max-w-[1280px] px-[clamp(20px,5vw,56px)] py-16">
      <title>{`${titulo} · Cozy`}</title>
      <h1 className="text-[clamp(28px,3.6vw,44px)] leading-[1.1] font-medium tracking-[-0.02em]">{titulo}</h1>
      <p className="mt-4 max-w-prose text-muted-foreground">
        {descripcion ?? 'Esta pantalla se diseña en una fase siguiente.'}
      </p>
    </section>
  )
}
