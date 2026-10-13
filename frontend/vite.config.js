import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Configuración de Vite para MedGuard AI (frontend).
// El backend se consume a través de VITE_API_BASE_URL (ver .env.example).
// Se usa `loadEnv` para que las variables del archivo `.env` sean visibles
// aquí mismo (vite.config corre en Node y `process.env` no carga `.env`).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBaseUrl = env.VITE_API_BASE_URL || "http://localhost:8000";

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      proxy: {
        // Redirige /api al backend en desarrollo para evitar problemas de CORS.
        "/api": {
          target: apiBaseUrl,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: "dist",
      sourcemap: true,
    },
  };
});