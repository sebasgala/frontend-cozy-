import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // VITE_API_URL se incrusta al compilar: un build de producción sin ella llamaría a la API equivocada.
  if (mode === 'production' && !loadEnv(mode, import.meta.dirname, 'VITE_').VITE_API_URL?.trim()) {
    throw new Error(
      'Falta VITE_API_URL: defínela (p. ej. https://<tu-api>/api/v1) como variable de entorno o en .env antes de compilar.',
    )
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
  }
})
