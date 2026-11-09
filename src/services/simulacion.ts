// Utilidades para que los servicios simulados se comporten como la API real.

/** Devuelve una copia del dato tras una pequeña latencia, como haría fetch */
export function respuestaSimulada<T>(dato: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(dato)), ms))
}
