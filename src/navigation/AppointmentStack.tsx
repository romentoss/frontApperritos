import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AppointmentStackParamList } from "./types";
import AppointmentsListScreen from "../screens/appointments/AppointmentsListScreen";
import AppointmentFormScreen from "../screens/appointments/AppointmentFormScreen";
import { Colors } from "../theme/colors";

const Stack = createNativeStackNavigator<AppointmentStackParamList>();

export default function AppointmentStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.primary,
        headerTitleStyle: { fontWeight: "700", color: Colors.text.primary },
      }}
    >
      <Stack.Screen
        name="AppointmentsList"
        component={AppointmentsListScreen}
        options={{ title: "Citas" }}
      />
      <Stack.Screen
        name="AppointmentForm"
        component={AppointmentFormScreen}
        options={({ route }) =>
          ({ title: route.params?.appointmentId ? "Editar cita" : "Nueva cita" })
        }
      />
    </Stack.Navigator>
  );
}
