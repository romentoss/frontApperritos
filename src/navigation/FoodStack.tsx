import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { FoodStackParamList } from "./types";
import FoodListScreen from "../screens/food/FoodListScreen";
import FoodRecordFormScreen from "../screens/food/FoodRecordFormScreen";
import FoodRecordDetailScreen from "../screens/food/FoodRecordDetailScreen";
import PeriodicFormScreen from "../screens/food/PeriodicFormScreen";
import { Colors } from "../theme/colors";

const Stack = createNativeStackNavigator<FoodStackParamList>();

export default function FoodStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.primary,
        headerTitleStyle: { fontWeight: "700", color: Colors.text.primary },
      }}
    >
      <Stack.Screen
        name="FoodList"
        component={FoodListScreen}
        options={{ title: "Comida" }}
      />
      <Stack.Screen
        name="FoodRecordForm"
        component={FoodRecordFormScreen}
        options={({ route }) =>
          ({ title: route.params?.recordId ? "Editar compra" : "Registrar compra" })
        }
      />
      <Stack.Screen
        name="FoodRecordDetail"
        component={FoodRecordDetailScreen}
        options={{ title: "Detalle de compra" }}
      />
      <Stack.Screen
        name="PeriodicForm"
        component={PeriodicFormScreen}
        options={({ route }) =>
          ({ title: route.params?.periodicId ? "Editar periódica" : "Compra periódica" })
        }
      />
    </Stack.Navigator>
  );
}
