/**
 * 🔒 AuthContext — Estado global de autenticación
 *
 * Provee a toda la app:
 * - El usuario actual (o null si no está autenticado)
 * - isLoading: true mientras Firebase verifica la sesión al arrancar
 * - Funciones: login, register, logout
 *
 * 📌 Patrón: escuchamos onAuthStateChanged para reaccionar
 * automáticamente cuando Firebase cambia el estado de sesión
 * (login, logout, token expirado, etc.)
 *
 * Uso:
 *   const { user, login, logout } = useAuth();
 */

import React, { createContext, useEffect, useState } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "../config/firebase";
import authService from "../services/authService";

// ─────────────────────────────────────────────
// 🚧 MODO DESARROLLO
// Pon DEV_MODE = true para saltarte Firebase Auth
// y usar un usuario de prueba local.
// Cambia a false cuando tengas credenciales reales.
// ─────────────────────────────────────────────
const DEV_MODE = false;

const DEV_USER = {
  uid: "dev-user-001",
  email: "prueba@apperritos.dev",
  displayName: "Usuario Prueba",
  emailVerified: true,
} as unknown as FirebaseUser;

// ─────────────────────────────────────────────
// Tipo del contexto
// ─────────────────────────────────────────────
interface AuthContextData {
  /** Usuario autenticado de Firebase, o null si no hay sesión */
  user: FirebaseUser | null;

  /** True mientras Firebase verifica el estado inicial de sesión */
  isLoading: boolean;

  /** Inicia sesión con email y contraseña */
  login: (email: string, password: string) => Promise<void>;

  /** Registra un nuevo usuario */
  register: (email: string, password: string, displayName: string) => Promise<void>;

  /** Cierra la sesión */
  logout: () => Promise<void>;
}

// ─────────────────────────────────────────────
// Crear el contexto con valor inicial vacío
// (el valor real se provee en AuthProvider)
// ─────────────────────────────────────────────
export const AuthContext = createContext<AuthContextData>({} as AuthContextData);

// ─────────────────────────────────────────────
// Provider: envuelve la app y provee el contexto
// ─────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // En DEV_MODE arrancamos ya con el usuario de prueba
  const [user, setUser] = useState<FirebaseUser | null>(DEV_MODE ? DEV_USER : null);
  const [isLoading, setIsLoading] = useState(!DEV_MODE);

  useEffect(() => {
    if (DEV_MODE) return; // Saltamos Firebase en modo dev

    // Escuchar cambios de sesión en tiempo real
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  async function login(email: string, password: string) {
    if (DEV_MODE) { setUser(DEV_USER); return; }
    await authService.login(email, password);
  }

  async function register(email: string, password: string, displayName: string) {
    if (DEV_MODE) { setUser(DEV_USER); return; }
    await authService.register(email, password, displayName);
  }

  async function logout() {
    if (DEV_MODE) { setUser(null); return; }
    await authService.logout();
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
