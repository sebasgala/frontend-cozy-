import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <section className="mx-auto max-w-[1280px] px-[clamp(20px,5vw,56px)] py-16">
      <title>Página no encontrada · Cozy</title>
      <h1 className="text-[clamp(28px,3.6vw,44px)] leading-[1.1] font-medium tracking-[-0.02em]">
        No encontramos esta página
      </h1>
      <p className="mt-4 max-w-prose text-muted-foreground">
        Puede que el enlace esté roto o que la página ya no exista.
      </p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-md text-ink underline underline-offset-4 hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Volver al inicio
      </Link>
    </section>
  )
}
