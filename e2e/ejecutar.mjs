// Ejecuta las pruebas de navegador del panel de administración, una tras otra.
//
// Requisitos: la API corriendo (por defecto http://localhost:3000/api/v1), el frontend de desarrollo (npm run dev,
// por defecto http://localhost:5173) y las credenciales de un superadmin en el entorno:
//   SA_EMAIL=... SA_PASSWORD=... npm run e2e
// Opcional: COZY_WEB y COZY_API para otras direcciones; PAUSA_SEG para cambiar la pausa entre pruebas.
//
// Las pruebas hacen varios inicios de sesión; el backend limita a 5 intentos por minuto y por correo, así que se espera
// una pausa entre pruebas. Las capturas se guardan en e2e/capturas/ (ignorada por git).

import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = dirname(fileURLToPath(import.meta.url))
const TODAS = ['admin-fase1', 'admin-fase2', 'admin-fase3', 'admin-fase4', 'admin-fase5', 'admin-fase5-paginacion', 'admin-fase6', 'admin-catalogo-v2', 'sesion-renovacion', 'cliente']
// npm run e2e -- admin-fase1 cliente   corre solo esas pruebas (por defecto, todas)
const filtro = process.argv.slice(2)
const PRUEBAS = filtro.length ? TODAS.filter((nombre) => filtro.includes(nombre)) : TODAS
const PAUSA_SEG = Number(process.env.PAUSA_SEG ?? 65)

if (!process.env.SA_EMAIL || !process.env.SA_PASSWORD) {
  console.error('Faltan SA_EMAIL y SA_PASSWORD (credenciales del superadmin).')
  process.exit(2)
}
mkdirSync(join(aqui, 'capturas'), { recursive: true })

const fallidas = []
PRUEBAS.forEach((nombre, i) => {
  if (i > 0) spawnSync(process.platform === 'win32' ? 'powershell' : 'sleep', process.platform === 'win32' ? ['-Command', `Start-Sleep -Seconds ${PAUSA_SEG}`] : [String(PAUSA_SEG)], { stdio: 'ignore' })
  console.log(`\n═══ ${nombre} ═══`)
  const r = spawnSync(process.execPath, [join(aqui, `${nombre}.mjs`)], { stdio: 'inherit', env: process.env })
  if (r.status !== 0) fallidas.push(nombre)
})

console.log(fallidas.length ? `\nFallaron: ${fallidas.join(', ')}` : '\nTodas las pruebas del panel pasaron.')
process.exit(fallidas.length ? 1 : 0)
