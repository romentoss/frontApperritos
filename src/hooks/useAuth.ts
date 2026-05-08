/**
 * 🪝 useAuth — Hook de autenticación
 *
 * Acceso directo al AuthContext desde cualquier componente.
 * Lanza un error claro si se usa fuera del AuthProvider.
 *
 * Uso:
 *   const { user, login, logout, isLoading } = useAuth();
 */

import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context || Object.keys(context).length === 0) {
    throw new Error(
      "useAuth() debe usarse dentro de un <AuthProvider>. " +
      "Asegúrate de que AuthProvider envuelva tu árbol de componentes."
    );
  }

  return context;
}
