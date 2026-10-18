#!/bin/sh

# Usar variables de entorno con valores por defecto
HOST="${BACKEND_HOST:-0.0.0.0}"
PORT="${BACKEND_PORT:-8000}"

echo "Starting backend server on $HOST:$PORT"

exec uvicorn src.main:app --host "$HOST" --port "$PORT"