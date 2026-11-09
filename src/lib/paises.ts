const NOMBRES: Record<string, string> = {
  ec: 'Ecuador',
  co: 'Colombia',
  pe: 'Perú',
  ar: 'Argentina',
  mx: 'México',
  uy: 'Uruguay',
  cl: 'Chile',
}

/** Código ISO 3166-1 alpha-2 en minúsculas -> nombre en español */
export function nombrePais(codigo: string): string {
  return NOMBRES[codigo] ?? codigo.toUpperCase()
}
