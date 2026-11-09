import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContadorRegresivoProps {
  /** ISO de cuándo vence */
  hasta: string
  /** Se llama una vez, cuando el contador llega a 0 */
  onVencer?: () => void
  className?: string
}

function formatearRestante(ms: number): string {
  const totalSegundos = Math.max(0, Math.floor(ms / 1000))
  const minutos = Math.floor(totalSegundos / 60)
  const segundos = totalSegundos % 60
  return `${minutos}:${String(segundos).padStart(2, '0')}`
}

/** Cuenta regresiva de la vista previa de reserva (15 minutos). Avisa una vez al vencer. */
export function ContadorRegresivo({ hasta, onVencer, className }: ContadorRegresivoProps) {
  const objetivo = new Date(hasta).getTime()
  const [restanteMs, setRestanteMs] = useState(() => objetivo - Date.now())
  const vencidoAvisado = restanteMs <= 0

  useEffect(() => {
    if (objetivo - Date.now() <= 0) {
      onVencer?.()
      return
    }
    const intervalo = window.setInterval(() => {
      const quedan = objetivo - Date.now()
      setRestanteMs(quedan)
      if (quedan <= 0) {
        window.clearInterval(intervalo)
        onVencer?.()
      }
    }, 1000)
    return () => window.clearInterval(intervalo)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- objetivo es estable por `hasta`
  }, [objetivo])

  const pocoTiempo = restanteMs > 0 && restanteMs < 2 * 60 * 1000

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center gap-2 rounded-xl bg-surface-muted px-4 py-3 text-sm',
        pocoTiempo ? 'text-error' : 'text-ink',
        className,
      )}
    >
      <Clock aria-hidden="true" className="size-4 shrink-0" />
      <span>
        {vencidoAvisado ? (
          'Esta reserva temporal venció.'
        ) : (
          <>
            Reserva temporal: te quedan{' '}
            <span className="font-semibold tabular-nums">{formatearRestante(restanteMs)}</span> minutos para
            completarla.
          </>
        )}
      </span>
    </div>
  )
}
