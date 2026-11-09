# Pruebas de navegador del panel de administración

Recorren cada fase del panel (sesión y roles, usuarios, ciudades y alojamientos, habitaciones y disponibilidad,
reservas, estados de error y teléfono), el recorrido del cliente (`cliente.mjs`: registro, reserva y pago, mis reservas,
consulta sin cuenta, cancelación) y la lectura del contrato v2 (`admin-catalogo-v2.mjs`: lo que guarda el panel llega
igual a `/api/v2/alojamientos`) y la renovación del token de la cuenta (`sesion-renovacion.mjs`: el token dura 10 minutos y la
página lo renueva sola; se adelanta el reloj de la página con `page.clock`) en un navegador real, contra la API y el frontend de
desarrollo.

`admin-fase1`, `admin-fase2` y `sesion-renovacion` necesitan la API con `V2_CABECERAS_PRUEBA=true`: la cabecera `X-Prueba-Token-Ahora`
mueve el instante con que el servidor mide el vencimiento del token y así provocan 401 reales sin esperar 10 minutos.

## Cómo correrlas

1. Base de datos y API levantadas (`docker compose up -d`, o `npm run start:dev` en `backend/`), con el seed cargado.
2. El frontend único en el puerto 5173. Sirve igual la imagen de Docker (`docker compose up --build -d frontend`, es lo que se publicaría) o el servidor de desarrollo (`npm run dev` en `frontend/`, con `cozy_web` detenido para liberar el puerto).
3. Desde `frontend/`:

```powershell
$env:SA_EMAIL = "<correo del superadmin>"
$env:SA_PASSWORD = "<contraseña del superadmin>"
npm run e2e
```

Una corrida completa tarda varios minutos: entre pruebas espera 65 segundos para no chocar con el límite de
intentos de inicio de sesión. Para correr una sola prueba: `node e2e/admin-fase4.mjs` (con las mismas variables).

## Qué deja en la base

Cada corrida crea usuarios, alojamientos, habitaciones, disponibilidad y reservas de prueba con `@prueba.test` o
nombres con un sufijo aleatorio. No borra nada: para empezar de cero, usa una base de pruebas separada.

## Capturas

Las capturas de pantalla van a `e2e/capturas/`, que no se sube a git.

## CORS

Las pruebas corren con CORS real: el navegador de prueba no lo desactiva, así que también comprueban que la API
acepta el origen del frontend (`CORS_ORIGIN` del backend). Si cambias el puerto del frontend, agrégalo a
`CORS_ORIGIN`, por ejemplo `CORS_ORIGIN=http://localhost:5173,http://localhost:4173`, y recrea la API
(`docker compose up -d backend`). En producción, `CORS_ORIGIN` debe llevar la URL pública del frontend (ver
`backend/docs/despliegue.md`).
