# Cozy · Plan del frontend con FRAME (borrador)

> Borrador armado sin el texto del skill FRAME (no está en los archivos del proyecto ni en tus skills de claude.ai). Las cinco fases salen de lo que contaste: **F**undación, **R**ender, **A**nimación, **M**ontaje y **E**ntrega. Cuando pegues el skill, ajusto nombres, entregables y orden para que coincidan con él.

## Lo que ya está decidido (del hilo "Proyecto web de hospedaje")

- **Alcance de esta ronda:** las pantallas del cliente (Inicio, Resultados, Detalle y flujo de reserva). El admin va después.
- **Herramientas:** Claude Design para el diseño y Claude Code para el código. Sin Lovable (no hay créditos). Impeccable para pulir jerarquía y layout; una skill de animación solo al final.
- **Stack:** React + TypeScript + Tailwind.
- **Datos:** todas las pantallas leen de **un solo archivo de servicios** con datos de ejemplo que tienen la misma forma que el contrato `.yaml`. Conectar la API real es cambiar ese archivo, no las pantallas (hay que activar CORS en el backend).
- **Método:** una pantalla por prompt, revisar y seguir. Nada de prompts gigantes.

---

## Fase 1 · Fundación (identidad visual)

Objetivo: que cualquier herramienta (Claude Design, Claude Code, Impeccable) reciba la misma identidad y no tenga que adivinar.

| Pieza | Estado | Valor |
|---|---|---|
| Nombre | ⚠ por confirmar | Cozy (el plan original decía NidoStay) |
| Concepto | ✓ | Resort moderno y sereno: sereno, elegante, acogedor, minimalista, fotográfico, espacioso, premium discreto |
| Intención | ✓ | Que el viajero sienta calma y confianza, y reserve rápido sin sentirse abrumado |
| Colores | ✓ | Gunmetal `#1C393F` (botones y títulos, hover `#2A525A`), Dutch White `#F7E5C1` (fondo), blanco `#FFFFFF` (tarjetas), Ecru `#B7A85C` (solo acento), texto secundario `#4B6166`, bordes `#E6D5AE` |
| Tipografía | ✓ | Títulos: Fraunces (serif suave). Texto: Inter |
| Forma | ✓ | Radio 16 a 24 px en tarjetas, 12 px en botones; base de espaciado 8 px; iconos lineales de trazo 1.5 |
| Reglas | ✓ | Contraste mínimo 4.5:1; nunca texto claro sobre Ecru, gradientes llamativos, sombras fuertes ni emojis |
| Logo | ○ pendiente | |
| Voz y tono de los textos | ○ pendiente | |
| Fotografía | ○ pendiente | Fuente de las fotos y su estilo |
| Modo oscuro | ○ pendiente | |

**Entregable:** `frontend/identidad.md` con todo lo de arriba, más los tokens listos para Tailwind (`tailwind.config` y variables CSS).

## Fase 2 · Render (pantallas en alta fidelidad)

- Diseñar en Claude Design, en este orden: Inicio → Resultados → Detalle → Reserva (datos, pago simulado y confirmación).
- Cada pantalla en celular 390 px y escritorio 1440 px.
- Guardar captura de cada pantalla y la lista de componentes que aparecen (buscador, tarjeta de alojamiento, filtro, galería, selector de fechas, resumen de precio, etc.).
- **Entregable:** carpeta `frontend/pantallas/` con capturas y `componentes.md`.

## Fase 3 · Animación (comportamiento)

- Definir los movimientos una sola vez, para que sean iguales en todas las pantallas: entrada de secciones (aparecer y subir, 300 a 400 ms), hover de tarjetas (sube 4 px y zoom suave de la foto), cambio de botón, apertura de modales y selectores.
- Siempre respetar `prefers-reduced-motion`.
- **Entregable:** `frontend/animaciones.md` con duraciones, curvas y dónde se usa cada una.

## Fase 4 · Montaje (código con Claude Code)

Una pantalla por prompt, revisando antes de seguir:

| Paso | Qué se construye |
|---|---|
| M0 | Proyecto base (React + TS + Tailwind), tokens de la Fase 1, rutas y el archivo único de servicios con datos de ejemplo |
| M1 | Inicio |
| M2 | Resultados (lee la búsqueda) |
| M3 | Detalle del alojamiento y sus habitaciones |
| M4 | Flujo de reserva: datos del huésped, pago simulado, confirmación y cancelación |
| M5 | Pulido con Impeccable y animaciones de la Fase 3 |

## Fase 5 · Entrega

- Cambiar el archivo de servicios de datos de ejemplo a la API real y probar el flujo completo (buscar → ver → reservar → pagar → cancelar).
- `npm run build` sin errores y despliegue en Render como Static Site, con la regla `/*` → `/index.html`.
- Revisar en celular y escritorio.
- Después: pantallas del admin con la misma identidad.
