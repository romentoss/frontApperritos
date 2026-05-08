import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { WalkStackParamList } from "./types";
import WalksListScreen from "../screens/walks/WalksListScreen";
import WalkMapScreen from "../screens/walks/WalkMapScreen";
import WalkDetailScreen from "../screens/walks/WalkDetailScreen";
import TerritoriesMapScreen from "../screens/walks/TerritoriesMapScreen";
import { Colors } from "../theme/colors";

const Stack = createNativeStackNavigator<WalkStackParamList>();

export default function WalkStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.primary,
        headerTitleStyle: { fontWeight: "700", color: Colors.text.primary },
      }}
    >
      <Stack.Screen
        name="WalksList"
        component={WalksListScreen}
        options={{ title: "Recorridos" }}
      />
      <Stack.Screen
        name="WalkMap"
        component={WalkMapScreen}
        options={{ title: "Nuevo paseo" }}
      />
      <Stack.Screen
        name="WalkDetail"
        component={WalkDetailScreen}
        options={{ title: "Detalle del recorrido" }}
      />
      <Stack.Screen
        name="TerritoriesMap"
        component={TerritoriesMapScreen}
        options={{ title: "Mapa de territorios" }}
      />
    </Stack.Navigator>
  );
}
