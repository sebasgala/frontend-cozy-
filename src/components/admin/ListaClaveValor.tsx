import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ParClaveValor } from '@/lib/politicas'

interface ListaClaveValorProps {
  etiqueta: string
  pares: ParClaveValor[]
  onCambia: (pares: ParClaveValor[]) => void
  ayuda?: string
  error?: string
}

/** Pares clave-valor editables (políticas del alojamiento) */
export function ListaClaveValor({ etiqueta, pares, onCambia, ayuda, error }: ListaClaveValorProps) {
  const cambiar = (i: number, parcial: Partial<ParClaveValor>) => onCambia(pares.map((p, j) => (j === i ? { ...p, ...parcial } : p)))
  const clases =
    'h-12 min-w-0 flex-1 rounded-[14px] border border-border bg-white px-3.5 text-[15px] text-ink outline-none placeholder:text-muted-foreground focus:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary'
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-[13px] font-medium text-ink">{etiqueta}</legend>
      {pares.map((par, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          <input value={par.clave} onChange={(e) => cambiar(i, { clave: e.target.value })} placeholder="Política (ej. checkin)" aria-label={`Política ${i + 1}: nombre`} className={clases} />
          <input value={par.valor} onChange={(e) => cambiar(i, { valor: e.target.value })} placeholder="Valor (ej. 15:00)" aria-label={`Política ${i + 1}: valor`} className={clases} />
          <Button type="button" variant="ghost" size="icon-lg" aria-label={`Quitar política ${i + 1}`} onClick={() => onCambia(pares.filter((_, j) => j !== i))}>
            <X aria-hidden="true" />
          </Button>
        </div>
      ))}
      <div>
        <Button type="button" variant="outline" size="sm" onClick={() => onCambia([...pares, { clave: '', valor: '' }])}>
          <Plus aria-hidden="true" />
          Agregar política
        </Button>
      </div>
      {ayuda && !error && <span className="text-xs text-muted-foreground">{ayuda}</span>}
      {error && (
        <span role="alert" className="text-xs font-medium text-error">
          {error}
        </span>
      )}
    </fieldset>
  )
}
