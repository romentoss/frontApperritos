/**
 * 🧭 RootNavigator — El corazón de la navegación
 *
 * Este componente decide QUÉ ve el usuario según su estado de sesión:
 *   - isLoading → pantalla de carga (mientras Firebase verifica la sesión)
 *   - user !== null → AppTabs (la app completa)
 *   - user === null → AuthStack (login / registro)
 *
 * 📌 Este es el ÚNICO lugar donde se hace esta decisión.
 * Las pantallas individuales no necesitan saber si el usuario está autenticado.
 */

import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";

import { useAuth } from "../hooks/useAuth";
import { Colors } from "../theme/colors";
import AuthStack from "./AuthStack";
import AppTabs from "./AppTabs";

export default function RootNavigator() {
  const { user, isLoading } = useAuth();

  // ── Pantalla de carga inicial ──
  // Firebase necesita un momento para restaurar la sesión al arrancar
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // ── Decisión de navegación ──
  return user ? <AppTabs /> : <AuthStack />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
});
