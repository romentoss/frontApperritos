import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { NavigatorScreenParams } from "@react-navigation/native";

// ─────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

// ─────────────────────────────────────────────
// Mascotas
// ─────────────────────────────────────────────
export type PetStackParamList = {
  PetsList: undefined;
  PetDetail: { petId: string };
  PetForm: { petId?: string };
};

// ─────────────────────────────────────────────
// Vacunas
// ─────────────────────────────────────────────
export type VaccineStackParamList = {
  VaccinesList: { petId?: string } | undefined;
  VaccineForm: { vaccineId?: string; petId?: string };
};

// ─────────────────────────────────────────────
// Citas
// ─────────────────────────────────────────────
export type AppointmentStackParamList = {
  AppointmentsList: { petId?: string } | undefined;
  AppointmentForm: { appointmentId?: string; petId?: string };
};

// ─────────────────────────────────────────────
// Comida
// ─────────────────────────────────────────────
export type FoodStackParamList = {
  FoodList: { petId?: string } | undefined;
  FoodRecordForm: { recordId?: string; petId?: string };
  FoodRecordDetail: { recordId: string };
  PeriodicForm: { periodicId?: string; petId?: string };
};

// ─────────────────────────────────────────────
// Recorridos
// ─────────────────────────────────────────────
export type WalkStackParamList = {
  WalksList: { petId?: string } | undefined;
  WalkMap: { petId?: string };
  WalkDetail: { walkId: string };
  TerritoriesMap: undefined;
};

// ─────────────────────────────────────────────
// Perfil
// ─────────────────────────────────────────────
export type ProfileStackParamList = {
  Profile: undefined;
};

// ─────────────────────────────────────────────
// Tabs principales
// ─────────────────────────────────────────────
export type AppTabParamList = {
  PetsTab: NavigatorScreenParams<PetStackParamList>;
  VaccinesTab: NavigatorScreenParams<VaccineStackParamList>;
  AppointmentsTab: NavigatorScreenParams<AppointmentStackParamList>;
  FoodTab: NavigatorScreenParams<FoodStackParamList>;
  WalksTab: NavigatorScreenParams<WalkStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

// ─────────────────────────────────────────────
// Navigation props listos para usar en screens
// ─────────────────────────────────────────────
export type AuthNavigationProp = NativeStackNavigationProp<AuthStackParamList>;
export type AppTabNavigationProp = BottomTabNavigationProp<AppTabParamList>;
export type PetStackNavigationProp = NativeStackNavigationProp<PetStackParamList>;
export type VaccineStackNavigationProp = NativeStackNavigationProp<VaccineStackParamList>;
export type AppointmentStackNavigationProp = NativeStackNavigationProp<AppointmentStackParamList>;
export type FoodStackNavigationProp = NativeStackNavigationProp<FoodStackParamList>;
export type WalkStackNavigationProp = NativeStackNavigationProp<WalkStackParamList>;
export type ProfileStackNavigationProp = NativeStackNavigationProp<ProfileStackParamList>;

