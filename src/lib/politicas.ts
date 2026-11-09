// Conversión entre el objeto de políticas del alojamiento y las filas editables del formulario.

export interface ParClaveValor {
  clave: string
  valor: string
}

/** Objeto de políticas -> filas editables. Los valores que no son texto se muestran como true/false, números o JSON. */
export function aPares(objeto: Record<string, unknown> | null | undefined): ParClaveValor[] {
  return Object.entries(objeto ?? {}).map(([clave, valor]) => ({
    clave,
    valor: typeof valor === 'string' ? valor : JSON.stringify(valor),
  }))
}

/**
 * Filas -> objeto. "true" y "false" vuelven a ser booleanos, un número entero o decimal escrito solo con cifras
 * vuelve a ser número y un valor con forma de objeto o lista se interpreta como JSON. Todo lo demás queda como texto
 * (por ejemplo "15:00"). Las filas sin clave se ignoran.
 */
export function aObjeto(pares: ParClaveValor[]): Record<string, unknown> {
  const objeto: Record<string, unknown> = {}
  for (const { clave, valor } of pares) {
    const k = clave.trim()
    if (!k) continue
    const v = valor.trim()
    if (v === 'true') objeto[k] = true
    else if (v === 'false') objeto[k] = false
    else if (/^-?\d+(\.\d+)?$/.test(v) && !/^0\d/.test(v)) objeto[k] = Number(v)
    else if (/^[{[]/.test(v)) {
      try {
        objeto[k] = JSON.parse(v)
      } catch {
        objeto[k] = valor
      }
    } else objeto[k] = valor
  }
  return objeto
}
