import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { VaccineStackParamList } from "./types";
import VaccinesListScreen from "../screens/vaccines/VaccinesListScreen";
import VaccineFormScreen from "../screens/vaccines/VaccineFormScreen";
import { Colors } from "../theme/colors";

const Stack = createNativeStackNavigator<VaccineStackParamList>();

export default function VaccineStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.primary,
        headerTitleStyle: { fontWeight: "700", color: Colors.text.primary },
      }}
    >
      <Stack.Screen
        name="VaccinesList"
        component={VaccinesListScreen}
        options={{ title: "Vacunas" }}
      />
      <Stack.Screen
        name="VaccineForm"
        component={VaccineFormScreen}
        options={({ route }) =>
          ({ title: route.params?.vaccineId ? "Editar vacuna" : "Nueva vacuna" })
        }
      />
    </Stack.Navigator>
  );
}
