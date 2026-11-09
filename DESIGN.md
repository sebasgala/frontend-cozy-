---
name: Cozy
description: Reserva alojamientos con calma y confianza.
colors:
  gunmetal: "#1C393F"
  gunmetal-hover: "#2A525A"
  white: "#FFFFFF"
  surface-muted: "#F4F4F4"
  ink: "#111111"
  text-secondary: "#4B6166"
  ecru: "#B7A85C"
  line-cream: "#E6D5AE"
  dutch-white: "#F7E5C1"
  success: "#3E8E5A"
  error: "#B3382C"
typography:
  display:
    fontFamily: "Fraunces Variable, Georgia, Times New Roman, serif"
    fontSize: "clamp(40px, 6vw, 80px)"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Fraunces Variable, Georgia, Times New Roman, serif"
    fontSize: "clamp(32px, 4vw, 48px)"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Fraunces Variable, Georgia, Times New Roman, serif"
    fontSize: "18px"
    fontWeight: 500
    lineHeight: 1.375
  body:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  lead:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(15px, 1.3vw, 18px)"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.3
rounded:
  sm: "8px"
  md: "12px"
  field: "14px"
  lg: "16px"
  card: "20px"
  xl: "24px"
spacing:
  base: "8px"
  gutter: "clamp(20px, 5vw, 56px)"
  section: "clamp(64px, 9vw, 112px)"
  section-wide: "clamp(96px, 12vw, 160px)"
  container: "1280px"
components:
  button-primary:
    backgroundColor: "{colors.gunmetal}"
    textColor: "{colors.white}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.gunmetal-hover}"
  button-light:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 16px"
  button-light-hover:
    backgroundColor: "{colors.surface-muted}"
  button-outline:
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 16px"
  search-field:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    height: "64px"
    padding: "10px 14px"
  search-panel:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.xl}"
    padding: "20px"
  chip:
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 18px"
  chip-selected:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.ink}"
  badge-dark:
    backgroundColor: "{colors.gunmetal}"
    textColor: "{colors.white}"
    rounded: "{rounded.sm}"
  badge-accent:
    backgroundColor: "{colors.ecru}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  card:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
  closing-block:
    backgroundColor: "{colors.gunmetal}"
    textColor: "{colors.white}"
    rounded: "{rounded.xl}"
---

# Design System: Cozy

## Overview

**Creative North Star: "El Patio Tranquilo"**

Un espacio abierto y resguardado: aire, luz tibia y materiales honestos, donde cada pantalla respira y nada grita. La fotografía cálida del hero (una casa al amanecer, con la palabra "Cozy" pintada en el cielo) es el único momento intenso; todo lo demás es superficie blanca, texto negro neutro y un verde Gunmetal profundo que aparece solo donde hay que actuar o donde la imagen necesita apoyo. La densidad es baja y el ritmo vertical generoso: secciones amplias alternadas en blanco y gris claro, tarjetas planas con un borde crema fino.

El movimiento es de una sola voz: entradas con curvas exponenciales suaves (enfoque del hero, caída escalonada de la barra, una línea que se dibuja), un video que avanza con el scroll en lugar de reproducirse solo y apariciones discretas al entrar en pantalla. Con `prefers-reduced-motion` todo queda quieto y visible desde el inicio, con el primer cuadro del video como imagen fija.

Las referencias son las pantallas de Claude Design (`docs/diseno/claude-design/`), traducidas a esta paleta. El diseño original usaba texto crema sobre fondos oscuros, grises fuera de paleta y degradados como marcador de foto; nada de eso forma parte del sistema.

**Key Characteristics:**
- Superficies blancas y gris claro; el crema solo dibuja líneas.
- Texto negro neutro sobre claro; blanco puro sobre todo lo oscuro.
- Títulos en Fraunces y todo lo demás en Inter.
- Tarjetas planas sin sombra; solo flota el buscador.
- Movimiento orquestado una vez, sin efectos sueltos, y siempre opcional.

## Colors

Una paleta contenida: neutros cálidos y fríos, un verde Gunmetal de marca y un Ecru como único acento.

### Primary
- **Gunmetal** (#1C393F): botones primarios, la barra y el bloque de cierre, etiquetas oscuras (descuento), el día elegido del calendario y el velo de la foto del hero. Es el color de la acción.
- **Gunmetal hover** (#2A525A): hover y estado activo de todo lo Gunmetal; también el anillo de foco.

### Secondary
- **Ecru** (#B7A85C): acento escaso. Etiquetas de país y de "Oferta por tiempo limitado", y el punto que marca "hoy" en el calendario. Siempre con texto negro neutro encima.

### Neutral
- **Blanco** (#FFFFFF): fondo de página, tarjetas, paneles y campos.
- **Gris claro** (#F4F4F4): secciones alternas, hover de botones claros, chip elegido, rango del calendario, marcador "Foto pendiente".
- **Negro neutro** (#111111): todo el texto sobre superficies claras.
- **Texto secundario** (#4B6166): subtítulos, metadatos, precios "por noche", días pasados del calendario.
- **Crema de línea** (#E6D5AE): bordes de tarjetas y campos, separadores, líneas del calendario.
- **Dutch White** (#F7E5C1): solo la línea fina translúcida bajo la barra sobre el hero.
- **Éxito** (#3E8E5A) y **Error** (#B3382C): estados. El verde no llega a 4.5:1 y solo colorea íconos.

### Named Rules
**La regla del Blanco sobre Oscuro.** Todo texto o ícono sobre Gunmetal, Gunmetal hover, el hero con foto o el rojo de error es blanco puro (#FFFFFF): nunca crema, Ecru, gris ni blanco con opacidad, tampoco en hover.

**La regla de la Línea Crema.** El crema existe solo como línea o separador. Nunca rellena tarjetas, botones, etiquetas, estados ni texto.

**La regla del Velo.** El texto blanco sobre fotografía se apoya en un velo Gunmetal (abajo hasta 0.62 de opacidad y arriba 0.5 bajo la barra), nunca en sombras de texto.

## Typography

**Display Font:** Fraunces Variable (con Georgia)
**Body Font:** Inter Variable (con ui-sans-serif y system-ui)

**Character:** una serif suave de tamaño óptico para los títulos, que da calidez, sobre una sans neutra y precisa para todo lo que se usa. Ambas se sirven desde el propio proyecto.

### Hierarchy
- **Display** (400, clamp(40px, 6vw, 80px), 1.02): una sola vez por página, en el bloque de cierre ("Desde $45 por noche").
- **Headline** (500, clamp(32px, 4vw, 48px), 1.1): títulos de sección; `text-wrap: balance`.
- **Title** (500 a 600, 17 a 18px, 1.375): nombres de alojamientos en tarjetas.
- **Lead** (400, clamp(15px, 1.3vw, 18px), 1.5): subtítulos de sección y del hero.
- **Body** (400, 16px, 1.5): texto corrido; medida máxima unos 65ch.
- **Label** (500, 13px): etiquetas de los campos del buscador, notas y metadatos.

### Named Rules
**La regla de las Dos Voces.** Fraunces solo en títulos (h1 a h4 y nombres de destino en el mosaico); Inter en todo lo demás, incluidos precios y botones.

## Layout

Contenedor de 1280px con márgenes laterales `clamp(20px, 5vw, 56px)`; la barra sobre el hero ocupa todo el ancho. Base de espaciado de 8px. Las secciones alternan blanco y gris claro con un ritmo vertical de `clamp(64px, 9vw, 112px)`, y `clamp(96px, 12vw, 160px)` arriba de destacados, ofertas y cierre. Más espacio arriba de cada título que debajo.

El hero es una sección de 200vh con un bloque fijo de 100vh: el video avanza con el scroll y el buscador sube hasta quedar montado entre el hero y la página. Con movimiento reducido mide 100vh. El mosaico de destinos usa 6 columnas (2 tarjetas de 3 y 3 de 2) desde 760px y una sola columna debajo. Destacados usa `repeat(auto-fit, minmax(min(100%, 300px), 1fr))`. Planificador y ofertas son carruseles horizontales con encaje. El buscador usa `repeat(auto-fit, minmax(160px, 1fr))`: 5 columnas en escritorio, el botón en una segunda fila en tablet y una columna en celular.

Puntos de quiebre de composición: 640px (popover o hoja inferior; 2 o 1 meses de calendario) y 760px (enlaces de la barra y mosaico).

## Elevation & Depth

Plano por defecto. La profundidad viene del color (gris claro contra blanco, Gunmetal contra todo) y de bordes crema de 1px. La única sombra del sistema es la de lo que flota sobre el contenido: el buscador, sus paneles y las flechas de los carruseles.

### Shadow Vocabulary
- **Float** (`box-shadow: 0 18px 48px rgba(28, 57, 63, 0.16)`): buscador, popovers y flechas de carrusel.

### Named Rules
**La regla de lo que Flota.** Solo lo que flota sobre el contenido lleva sombra; las tarjetas nunca.

## Shapes

Esquinas suaves y consistentes: 8px en etiquetas, 12px en botones y chips, 14px en los campos del buscador, 16px en las fotos del planificador, 20px en tarjetas y fotos de tarjeta, y 24px en el panel del buscador, el bloque de cierre y la hoja inferior. Nada pasa de 24px. Los botones de flecha y el favorito de las ofertas son círculos; el día elegido del calendario también.

## Components

### Buttons
- **Shape:** esquinas suaves (12px); 44px de alto, 48px el grande y 64px el del buscador.
- **Primary:** Gunmetal con texto blanco.
- **Hover / Focus:** pasa a Gunmetal hover; anillo de foco Gunmetal de 2px con separación.
- **Light:** blanco con texto negro neutro y hover gris claro; es el "Ingresar" sobre el hero.
- **Outline:** borde Gunmetal y fondo transparente; hover gris claro.
- **Sobre oscuro (cierre):** borde y texto blancos; hover Gunmetal hover.

### Chips
- **Style:** borde crema y texto negro neutro, 44px de alto.
- **State:** el elegido lleva borde Gunmetal, fondo gris claro y peso 500. Siguen el patrón de pestañas: ← y → cambian de chip.

### Cards / Containers
- **Corner Style:** 20px.
- **Background:** blanco; sin foto, el marcador "Foto pendiente" gris claro (blanco sobre secciones grises).
- **Shadow Strategy:** ninguna (ver Elevation & Depth).
- **Border:** crema de 1px alrededor de la foto o de la tarjeta.
- **Behavior:** en hover suben 4px (320ms) y la foto se acerca a 1.04 (600 a 700ms), siempre con la curva exponencial.

### Inputs / Fields
- **Style:** campos del buscador blancos con borde crema y esquinas de 14px; etiqueta de 13px y valor de 15px; el texto de ayuda va en texto secundario.
- **Focus:** borde y anillo Gunmetal; el campo con su panel abierto también queda con borde Gunmetal.
- **Error:** mensaje en negro neutro debajo del buscador ("Elige destino y fechas", "La salida debe ser posterior a la entrada").

### Navigation
- **Sobre el hero:** transparente, logo y enlaces blancos en negrita de 14px, línea Dutch White translúcida que se dibuja al cargar; entrada escalonada.
- **Barra fija:** blanca al 95% con desenfoque, borde inferior crema, texto negro neutro; baja (420ms) cuando el hero sale de pantalla.
- **Celular:** los enlaces de sección se ocultan por debajo de 760px; quedan el logo, "ES" y "Ingresar".

### Buscador
Un solo panel blanco y flotante con cuatro campos que abren paneles propios: popover en escritorio (aparece en 200ms) y hoja inferior en celular (sube en 280ms). Incluye calendario de rango de 2 meses (1 en celular) con flechas, Re Pág y Av Pág, lista de destinos agrupada por país con flechas, y contador de huéspedes. El foco queda atrapado en el panel y Escape lo devuelve al campo.

## Do's and Don'ts

### Do:
- **Do** usar blanco puro (#FFFFFF) para todo texto e ícono sobre Gunmetal, el hero o el rojo de error.
- **Do** poner el Ecru solo con texto negro neutro (#111111) encima (7.89:1).
- **Do** alternar secciones en blanco y gris claro (#F4F4F4) y separarlas con espacio, no con cajas.
- **Do** apoyar el texto blanco sobre fotografía en un velo Gunmetal.
- **Do** mostrar el marcador "Foto pendiente" mientras no haya fotografía real.
- **Do** respetar `prefers-reduced-motion`: sin video controlado por scroll, primer cuadro fijo y todo visible desde el inicio.

### Don't:
- **Don't** usar crema (#E6D5AE ni #F7E5C1) como relleno de tarjetas, botones, etiquetas, estados ni como color de texto.
- **Don't** poner texto crema, Ecru o blanco translúcido sobre fondos oscuros.
- **Don't** usar degradados como marcador de foto ni como decoración.
- **Don't** dar sombra a las tarjetas; solo flota el buscador.
- **Don't** usar el verde de éxito (#3E8E5A) para texto: no llega a 4.5:1.
- **Don't** atenuar el botón primario con opacidad para indicar que falta información: el texto blanco dejaría de cumplir el contraste.
