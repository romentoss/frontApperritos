/**
 * 🔓 AuthStack — Navegación del área de autenticación
 *
 * Contiene las pantallas que se muestran cuando el usuario
 * NO está autenticado: Login y Register.
 *
 * La transición entre ellas es un slide horizontal (nativo de stack).
 * El header está oculto para usar nuestros propios diseños.
 */

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AuthStackParamList } from "./types";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        // Ocultamos el header por defecto: las pantallas tienen su propio diseño
        headerShown: false,
        // Animación nativa del sistema operativo
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}
