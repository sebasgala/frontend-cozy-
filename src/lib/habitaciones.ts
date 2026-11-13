// Etiquetas de los valores que el backend guarda como texto libre en las habitaciones (mealPlan, cancellationType).
// Son los valores que usan el seed y el resto del frontend; uno desconocido se muestra tal cual.

export const PLANES_COMIDA: Record<string, string> = {
  room_only: 'Solo alojamiento',
  breakfast_included: 'Desayuno incluido',
  half_board: 'Media pensión',
  full_board: 'Pensión completa',
  all_inclusive: 'Todo incluido',
}

export const TIPOS_CANCELACION: Record<string, string> = {
  free_cancellation: 'Cancelación gratuita',
  partially_refundable: 'No reembolsable',
  non_refundable: 'No reembolsable',
}

export const TIPOS_HABITACION = ['individual', 'doble', 'suite', 'familiar']

export const etiquetaPlan = (valor: string | null) => (valor ? (PLANES_COMIDA[valor] ?? valor) : 'Sin plan de comidas')
export const etiquetaCancelacion = (valor: string | null) => (valor ? (TIPOS_CANCELACION[valor] ?? valor) : 'Sin política de cancelación')
