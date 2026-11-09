# Imagen del frontend de Cozy: compila con Vite y sirve el resultado con nginx.
#   docker build --build-arg VITE_API_URL=http://localhost:3000/api/v1 -t cozy-web .

# ── Etapa 1: compilación ─────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS compilacion
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Vite incrusta VITE_API_URL en el bundle al compilar; cambiarla exige reconstruir la imagen.
# Sin valor por defecto: si no se pasa, el build falla (ver vite.config.ts).
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ── Etapa 2: nginx con fallback a index.html (SPA) ───────────────────────────────────────────────
FROM nginx:1.27-alpine AS produccion
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=compilacion /app/dist /usr/share/nginx/html
EXPOSE 80
