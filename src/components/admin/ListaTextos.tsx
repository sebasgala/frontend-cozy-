import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ListaTextosProps {
  etiqueta: string
  /** Texto de cada elemento, para los lectores de pantalla: "Foto" -> "Foto 1" */
  elemento: string
  valores: string[]
  onCambia: (valores: string[]) => void
  placeholder?: string
  ayuda?: string
  error?: string
  etiquetaAgregar: string
}

/** Lista editable de textos (URLs de fotos, facilidades): agregar, editar y quitar filas */
export function ListaTextos({ etiqueta, elemento, valores, onCambia, placeholder, ayuda, error, etiquetaAgregar }: ListaTextosProps) {
  const cambiar = (i: number, texto: string) => onCambia(valores.map((v, j) => (j === i ? texto : v)))
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-[13px] font-medium text-ink">{etiqueta}</legend>
      {valores.map((valor, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={valor}
            onChange={(e) => cambiar(i, e.target.value)}
            placeholder={placeholder}
            aria-label={`${elemento} ${i + 1}`}
            aria-invalid={!!error}
            className="h-12 min-w-0 flex-1 rounded-[14px] border border-border bg-white px-3.5 text-[15px] text-ink outline-none placeholder:text-muted-foreground focus:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
          />
          <Button type="button" variant="ghost" size="icon-lg" aria-label={`Quitar ${elemento.toLowerCase()} ${i + 1}`} onClick={() => onCambia(valores.filter((_, j) => j !== i))}>
            <X aria-hidden="true" />
          </Button>
        </div>
      ))}
      <div>
        <Button type="button" variant="outline" size="sm" onClick={() => onCambia([...valores, ''])}>
          <Plus aria-hidden="true" />
          {etiquetaAgregar}
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
