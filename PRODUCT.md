# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Viajeros que buscan y reservan alojamiento para una estancia (vacaciones, escapadas, viajes cortos). Hablan español y pagan en dólares (USD). Llegan desde el celular o la computadora con una tarea concreta: encontrar un lugar para unas fechas y un número de personas, entender qué incluye y cuánto cuesta, y reservar sin sentirse abrumados. Una persona con una reserva hecha vuelve para consultarla o cancelarla.

## Product Purpose

Cozy es una plataforma de reservas de alojamientos. Permite buscar por destino, fechas y huéspedes, ver el detalle de un alojamiento y sus habitaciones, reservar con pago simulado, consultar la reserva y cancelarla. Éxito: que el viajero sienta calma y confianza y complete el camino de buscar a confirmar rápido y sin dudas.

Alcance de esta etapa: las pantallas del cliente (Inicio, Resultados, Detalle y flujo de reserva). El panel de administración viene después, con la misma identidad.

## Positioning

Reservar con calma, sin abrumar: pocas decisiones por pantalla, precio y condiciones claros antes de pagar y un camino corto de la búsqueda a la confirmación. (Confirmado por el equipo; es la intención de marca del plan-frame.)

## Operating Context

- El frontend es independiente del backend (NestJS, API REST en `http://localhost:3000/api/v1`, Swagger en `/api/docs`).
- Por ahora todas las pantallas leen datos simulados de un solo archivo de servicios (`src/mocks`) con la misma forma que el contrato OpenAPI del backend. Conectar la API real consistirá en cambiar los servicios, no las pantallas.
- Se diseña una pantalla por vez, en celular (390 px) y escritorio (1440 px).
- Las pantallas de referencia de Claude Design están exportadas en el monolito, en `frontend/docs/diseno/claude-design/` (solo lectura, no se modifica), y su análisis y plan de portado en `frontend/docs/diseno/plan-implementacion.md`. Las decisiones visuales del 2026-10-12 están en `frontend/docs/diseno/sistema-visual.md`. Este repo no incluye esa carpeta `docs/`.

## Capabilities and Constraints

- Flujo del cliente: buscar, ver alojamiento y habitaciones, reservar (datos del huésped), pagar (simulado: se guarda una referencia, no se cobra), confirmar y cancelar.
- La reserva tiene un localizador de 8 caracteres y estados `PENDING`, `CONFIRMED` y `CANCELLED`. Cancelar solo está disponible si la reserva no está cancelada.
- La vista previa de una orden vale 15 minutos; después hay que repetirla.
- Cada oferta lleva una política de cancelación (por ejemplo cancelación gratuita o no reembolsable) y un plan de comidas opcional; ambos deben ser visibles antes de reservar.
- Las ofertas por tiempo limitado y sus descuentos son datos de ejemplo: el backend no tiene ofertas. Si la API no las devuelve, la sección se oculta.
- Interfaz solo en español, precios en USD. Idioma adicional: no confirmado.
- Inicio de sesión de usuarios: no definido todavía.

## Brand Commitments

- Nombre: **Cozy** (confirmado como definitivo).
- Concepto: resort moderno y sereno; sereno, elegante, acogedor, minimalista, fotográfico, espacioso, premium discreto. Tono cálido, limpio y confiable.
- La identidad visual (paleta, tipografía, forma) está fijada por el equipo y vive en `plan-frame.md` y, en el monolito, en `frontend/docs/diseno/sistema-visual.md`.
- Regla obligatoria: todo texto o ícono sobre fondo oscuro es blanco `#FFFFFF`; nunca crema, Dutch White ni Ecru. El crema solo existe en líneas y separadores.
- Sin emojis, sin gradientes llamativos, sin sombras fuertes.
- Estrella del norte elegida por el equipo: **"El Patio Tranquilo"**, un espacio abierto y resguardado con aire, luz tibia y materiales honestos, donde cada pantalla respira y nada grita.
- Filosofía de componentes elegida por el equipo: **planos, con borde fino**. Tarjetas blancas con borde crema `#E6D5AE` y sin sombra, sobre fondo blanco o gris claro; la profundidad viene del color, no de sombras.
- Superficies y texto (2026-10-12): fondo y tarjetas blancos, secciones alternas en gris claro `#F4F4F4` y texto en negro neutro `#111111`. El detalle está en `frontend/docs/diseno/sistema-visual.md` (en el monolito), y el sistema construido en `DESIGN.md`.

## Evidence on Hand

- Contrato OpenAPI de alojamientos y backend funcional en `E:\dev\Cozy` (endpoints, DTOs, estados de orden).
- Datos simulados en `src/mocks/data.ts`: 12 destinos (seis de Ecuador y seis de Latinoamérica tomados del diseño), 12 alojamientos con sus habitaciones y descuentos de ejemplo para las ofertas. Todo es de ejemplo.
- Recursos del hero en `public/media/`: video (con todos los cuadros como keyframe), su primer cuadro como imagen fija y el símbolo de Cozy en PNG. La palabra "Cozy" del hero está pintada dentro del video y la imagen.
- No existen todavía: fotografía real de alojamientos y destinos (se muestra un marcador "Foto pendiente"), logo en SVG, reseñas reales, testimonios, ofertas reales ni cifras de uso. No se deben inventar.

## Product Principles

1. **Calma antes que densidad.** Cada pantalla muestra lo necesario para la decisión del momento y nada más.
2. **El precio y las condiciones primero.** Total, noches, plan de comidas y política de cancelación se ven antes de pedir datos o pago.
3. **Un camino corto y reversible.** De buscar a confirmar en pocos pasos, y la reserva se puede consultar y cancelar sin fricción.
4. **Confianza por claridad, no por adorno.** Se afirma solo lo que está confirmado; los errores dicen qué pasó y cómo seguir.
5. **Nada inventado.** Lo simulado se trata como simulado hasta que exista el dato real.

## Accessibility & Inclusion

Contraste mínimo de texto 4.5:1 (3:1 en texto grande). Respetar `prefers-reduced-motion`. Navegación completa con teclado y foco visible. Objetivos táctiles cómodos en celular.
