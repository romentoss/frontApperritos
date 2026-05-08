/**
 * 🐕 PetDetailScreen — Vista detalle de una mascota
 *
 * Muestra toda la información de la mascota.
 * Tiene opciones en el header para editar y eliminar.
 *
 * El header derecho con botones de acción se configura
 * desde useLayoutEffect para que se integre con React Navigation.
 */

import React, { useLayoutEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp, CompositeNavigationProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { PetStackParamList, AppTabParamList } from "../../navigation/types";

type PetDetailNavProp = CompositeNavigationProp<
  NativeStackNavigationProp<PetStackParamList>,
  BottomTabNavigationProp<AppTabParamList>
>;
import { usePet, useDeletePet } from "../../hooks/usePets";
import { Colors } from "../../theme/colors";
import { Spacing, FontSize, Radius } from "../../theme/spacing";
import { Pet } from "../../types";

type PetDetailRouteProp = RouteProp<PetStackParamList, "PetDetail">;

// ── Helpers de presentación ──
const SPECIES_LABEL: Record<Pet["species"], string> = {
  dog: "Perro",
  cat: "Gato",
  bird: "Pájaro",
  rabbit: "Conejo",
  other: "Mascota",
};

const SPECIES_EMOJI: Record<Pet["species"], string> = {
  dog: "🐕",
  cat: "🐈",
  bird: "🐦",
  rabbit: "🐇",
  other: "🐾",
};

/** Formatea una fecha ISO 8601 a formato legible */
function formatDate(isoDate?: string): string {
  if (!isoDate) return "—";
  const date = new Date(isoDate);
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function PetDetailScreen() {
  const navigation = useNavigation<PetDetailNavProp>();
  const route = useRoute<PetDetailRouteProp>();
  const { petId } = route.params;

  const { data: pet, isLoading, isError } = usePet(petId);
  const deletePet = useDeletePet();

  // ── Configurar header con botones de editar y eliminar ──
  useLayoutEffect(() => {
    if (!pet) return;

    navigation.setOptions({
      title: pet.name,
      headerRight: () => (
        <View style={styles.headerButtons}>
          {/* Botón editar */}
          <TouchableOpacity
            onPress={() => navigation.navigate("PetForm", { petId: pet.id })}
            style={styles.headerButton}
          >
            <Ionicons name="pencil-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>

          {/* Botón eliminar */}
          <TouchableOpacity
            onPress={handleDeletePress}
            style={styles.headerButton}
          >
            <Ionicons name="trash-outline" size={22} color={Colors.error} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [pet]);

  function handleDeletePress() {
    Alert.alert(
      `Eliminar a ${pet?.name}`,
      "Esta acción no se puede deshacer. ¿Estás seguro?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePet.mutateAsync(petId);
              // Volver a la lista tras eliminar
              navigation.goBack();
            } catch {
              Alert.alert("Error", "No se pudo eliminar la mascota.");
            }
          },
        },
      ]
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (isError || !pet) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>No se pudo cargar la mascota.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* ── Foto y nombre ── */}
      <View style={styles.hero}>
        {pet.photoURL ? (
          <Image source={{ uri: pet.photoURL }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoEmoji}>{SPECIES_EMOJI[pet.species]}</Text>
          </View>
        )}
        <Text style={styles.petName}>{pet.name}</Text>
        <Text style={styles.petSpecies}>
          {SPECIES_EMOJI[pet.species]} {SPECIES_LABEL[pet.species]}
          {pet.breed ? ` · ${pet.breed}` : ""}
        </Text>
      </View>

      {/* ── Tarjeta de datos ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Información general</Text>

        <InfoRow
          icon="calendar-outline"
          label="Fecha de nacimiento"
          value={formatDate(pet.birthDate)}
        />
        <InfoRow
          icon="scale-outline"
          label="Peso"
          value={pet.weight ? `${pet.weight} kg` : "—"}
        />
        <InfoRow
          icon="calendar-clear-outline"
          label="Registrada el"
          value={formatDate(pet.createdAt)}
        />
      </View>

      {/* ── Notas ── */}
      {pet.notes && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notas</Text>
          <Text style={styles.notes}>{pet.notes}</Text>
        </View>
      )}

      {/* ── Acciones rápidas (próximas fases) ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Registros</Text>

        <ActionRow
          icon="medical-outline"
          label="Ver vacunas"
          color={Colors.secondary}
          onPress={() => navigation.navigate("VaccinesTab", { screen: "VaccinesList", params: { petId } })}
        />
        <ActionRow
          icon="calendar-outline"
          label="Ver citas"
          color={Colors.primary}
          onPress={() => navigation.navigate("AppointmentsTab", { screen: "AppointmentsList", params: { petId } })}
        />
        <ActionRow
          icon="nutrition-outline"
          label="Registro de comida"
          color={Colors.warning}
          onPress={() => navigation.navigate("FoodTab", { screen: "FoodList", params: { petId } })}
        />
        <ActionRow
          icon="map-outline"
          label="Ver recorridos"
          color="#9B59B6"
          onPress={() => navigation.navigate("WalksTab", { screen: "WalksList", params: { petId } })}
          isLast
        />
      </View>
    </ScrollView>
  );
}

// ── Sub-componentes ──
function InfoRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={18} color={Colors.text.secondary} />
      <View style={styles.infoRowContent}>
        <Text style={styles.infoRowLabel}>{label}</Text>
        <Text style={styles.infoRowValue}>{value}</Text>
      </View>
    </View>
  );
}

function ActionRow({
  icon,
  label,
  color,
  onPress,
  isLast = false,
}: {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionRow, !isLast && styles.actionRowBorder]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.actionIcon, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={Colors.text.disabled} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  errorText: {
    fontSize: FontSize.md,
    color: Colors.text.secondary,
  },
  headerButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  headerButton: {
    padding: Spacing.xs,
  },
  hero: {
    alignItems: "center",
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
    marginBottom: Spacing.md,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: Radius.full,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  photoEmoji: {
    fontSize: 52,
  },
  petName: {
    fontSize: FontSize.xxl,
    fontWeight: "700",
    color: Colors.text.primary,
  },
  petSpecies: {
    fontSize: FontSize.md,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    margin: Spacing.md,
    marginBottom: Spacing.sm,
    // Sombra
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoRowContent: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  infoRowLabel: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
  },
  infoRowValue: {
    fontSize: FontSize.md,
    color: Colors.text.primary,
    fontWeight: "500",
    marginTop: 1,
  },
  notes: {
    fontSize: FontSize.md,
    color: Colors.text.primary,
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  actionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  actionLabel: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text.primary,
  },
});
