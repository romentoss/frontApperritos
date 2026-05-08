/**
 * 🐕 PetStack — Navegación interna del tab de Mascotas
 *
 * Stack con 3 pantallas:
 *   PetsList → PetDetail → PetForm
 *
 * El header se personaliza en cada pantalla según el contexto
 * (nombre de la mascota en detalle, "Nueva mascota" vs "Editar" en el form).
 */

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { PetStackParamList } from "./types";
import PetsListScreen from "../screens/pets/PetsListScreen";
import PetDetailScreen from "../screens/pets/PetDetailScreen";
import PetFormScreen from "../screens/pets/PetFormScreen";
import { Colors } from "../theme/colors";

const Stack = createNativeStackNavigator<PetStackParamList>();

export default function PetStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.text.primary,
        headerTitleStyle: { fontWeight: "700" },
        headerBackTitle: "Atrás",
      }}
    >
      <Stack.Screen
        name="PetsList"
        component={PetsListScreen}
        options={{ title: "Mis mascotas" }}
      />
      <Stack.Screen
        name="PetDetail"
        component={PetDetailScreen}
        // El título se setea dinámicamente en PetDetailScreen con useLayoutEffect
        options={{ title: "" }}
      />
      <Stack.Screen
        name="PetForm"
        component={PetFormScreen}
        // El título varía según si es crear o editar — se setea en el componente
        options={({ route }) => ({
          title: route.params?.petId ? "Editar mascota" : "Nueva mascota",
        })}
      />
    </Stack.Navigator>
  );
}
