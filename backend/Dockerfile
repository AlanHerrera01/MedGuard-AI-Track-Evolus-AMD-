# =============================================================================
# MedGuard AI — Imagen del backend (FastAPI)
# =============================================================================
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Dependencias del sistema mínimas
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Crear directorio para logs
RUN mkdir -p /app/logs

# Instalar dependencias de Python primero (mejor caché de capas)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código fuente y script de inicio
COPY src ./src
COPY start.sh .

RUN chmod +x start.sh

# Exponer puerto
EXPOSE 8000

# Usar script de inicio para manejar variables de entorno dinámicamente
CMD ["./start.sh"]
