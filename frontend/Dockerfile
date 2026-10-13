# =============================================================================
# MedGuard AI — Imagen del frontend (build multi-stage)
# =============================================================================

# --- Etapa 1: build de la SPA con Vite ---
FROM node:20-alpine AS build

WORKDIR /app

# Variable pública que se "hornea" en el bundle en tiempo de build.
ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

# --- Etapa 2: servidor estático ---
FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
