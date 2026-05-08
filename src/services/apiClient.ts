/**
 * 🌐 Cliente HTTP (Axios) para comunicarse con el backend FastAPI
 *
 * Este módulo configura una instancia de Axios con:
 * - Base URL del backend
 * - Interceptor para inyectar el token de Firebase Auth automáticamente
 * - Timeout razonable para peticiones
 *
 * 📌 URL del backend desplegado en Render.
 * Si vuelves a trabajar en local, cambia temporalmente esta URL.
 */

import axios from "axios";
import { auth } from "../config/firebase";

// ─────────────────────────────────────────────
// URL base del backend
// Cambiar en producción al dominio real
// ─────────────────────────────────────────────
const API_BASE_URL = "https://backapperrito.onrender.com";

// ─────────────────────────────────────────────
// Crear instancia de Axios configurada
// ─────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15 segundos máximo por request
  headers: {
    "Content-Type": "application/json",
  },
});

// ─────────────────────────────────────────────
// Interceptor: Agrega token de autenticación
// automáticamente a cada request
// ─────────────────────────────────────────────
apiClient.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
