# =============================================================================
# MedGuard AI — Imagen del frontend (build multi-stage)
# =============================================================================

# --- Etapa 1: build de la SPA con Vite ---
FROM node:20-alpine AS build

WORKDIR /app

# Variables de entorno para Vite (deben tener VITE_ prefix)
ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json package-lock.json* ./
RUN npm ci --frozen-lockfile

COPY . .

# Build con variables de entorno
RUN npm run build

# --- Etapa 2: servidor estático ---
FROM nginx:1.27-alpine AS runtime

# Configuración de Nginx para SPA
COPY --from=build /app/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
