/**
 * 🐾 Apperritos — Punto de entrada de la app
 *
 * Aquí se montan todos los providers globales en el orden correcto:
 *
 *   SafeAreaProvider       → Maneja áreas seguras (notch, barra de estado)
 *     QueryClientProvider  → React Query: cache y estado del servidor
 *       AuthProvider       → Estado de autenticación global
 *         NavigationContainer → Contenedor raíz de React Navigation
 *           RootNavigator  → Decide qué muestra según si hay sesión
 *
 * 📌 El orden importa: AuthProvider debe estar ANTES de NavigationContainer
 * porque RootNavigator (dentro de NavigationContainer) usa useAuth().
 */

import React, { useEffect } from "react";
import { SystemBars } from "react-native-edge-to-edge";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";

import { AuthProvider } from "./src/context/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";
import {
  requestNotificationPermissions,
  setupNotificationChannel,
} from "./src/services/notificationService";

// Cómo mostrar notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowList: true,
  }),
});

// ─────────────────────────────────────────────
// Configurar React Query
// staleTime: 5 minutos → los datos se consideran frescos ese tiempo
// retry: 2 → reintenta 2 veces antes de mostrar error
// ─────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

export default function App() {
  useEffect(() => {
    setupNotificationChannel();
    requestNotificationPermissions();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NavigationContainer>
            <RootNavigator />
            <SystemBars style="dark" />
          </NavigationContainer>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
