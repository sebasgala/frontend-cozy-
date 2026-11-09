# Cozy Web

Frontend de Cozy, plataforma de reservas de alojamientos. Va en un repositorio aparte del backend (NestJS) y aún está en construcción. Por ahora trabaja solo con datos simulados.

## Requisitos

- Node.js 20.19 o superior (probado con Node 25)
- npm

## Cómo instalar

```bash
npm install
```

Opcional: copia `.env.example` a `.env` si quieres cambiar la URL de la API (por defecto `http://localhost:3000/api/v1`).

## Cómo ejecutar

```bash
npm run dev
```

Abre http://localhost:5173 en el navegador.

## Cómo construir

```bash
npm run build     # genera la carpeta dist/
npm run preview   # sirve dist/ localmente para revisarlo
npm run lint      # revisa el código con oxlint
```

## Stack

Vite + React + TypeScript, React Router, Tailwind CSS v4, shadcn/ui y lucide-react.

## Estructura

```
src/
  components/      componentes reutilizables
  components/ui/   componentes de shadcn/ui
  layouts/         plantillas de página (barra superior, footer)
  hooks/           hooks propios (movimiento reducido, scroll, aparición)
  pages/           pantallas
  services/        acceso a datos: api.ts (cliente fetch) y servicios por módulo
  mocks/           datos simulados (un solo archivo: data.ts)
  types/           tipos que siguen los DTOs del backend
  lib/             utilidades
```

Las pantallas solo hablan con `src/services`. Hoy esos servicios devuelven datos de `src/mocks/data.ts`; para conectar el backend se cambia cada servicio por una llamada a `apiFetch`, sin tocar las pantallas.
