import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppTabParamList } from "./types";
import { Colors } from "../theme/colors";

import PetStack from "./PetStack";
import VaccineStack from "./VaccineStack";
import AppointmentStack from "./AppointmentStack";
import FoodStack from "./FoodStack";
import WalkStack from "./WalkStack";
import ProfileStack from "./ProfileStack";

const Tab = createBottomTabNavigator<AppTabParamList>();

const TAB_ICONS: Record<string, { focused: string; outline: string }> = {
  PetsTab: { focused: "paw", outline: "paw-outline" },
  VaccinesTab: { focused: "medical", outline: "medical-outline" },
  AppointmentsTab: { focused: "calendar", outline: "calendar-outline" },
  FoodTab: { focused: "nutrition", outline: "nutrition-outline" },
  WalksTab: { focused: "map", outline: "map-outline" },
  ProfileTab: { focused: "person", outline: "person-outline" },
};

export default function AppTabs() {
  // bottom contiene la altura de la barra de gestos/botones del sistema
  const { bottom } = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons.focused : icons.outline;
          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.text.disabled,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          // Altura base + espacio dinámico para los botones del sistema
          height: 60 + bottom,
          paddingBottom: bottom > 0 ? bottom : 6,
          paddingTop: 6,
        },
        // El header lo maneja cada stack interno
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="PetsTab"
        component={PetStack}
        options={{ title: "Mascotas" }}
      />
      <Tab.Screen
        name="VaccinesTab"
        component={VaccineStack}
        options={{ title: "Vacunas" }}
      />
      <Tab.Screen
        name="AppointmentsTab"
        component={AppointmentStack}
        options={{ title: "Citas" }}
      />
      <Tab.Screen
        name="FoodTab"
        component={FoodStack}
        options={{ title: "Comida" }}
      />
      <Tab.Screen
        name="WalksTab"
        component={WalkStack}
        options={{ title: "Paseos" }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{ title: "Perfil" }}
      />
    </Tab.Navigator>
  );
}
