/**
 * � PetsListScreen — Lista de todas las mascotas del usuario
 *
 * - Usa usePetsList() (React Query) para fetchar de Firestore
 * - Muestra spinner mientras carga
 * - Muestra estado vacío si no hay mascotas
 * - Cada ítem es un PetCard que navega al detalle
 * - FAB (botón flotante) para agregar nueva mascota
 */

import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { usePetsList } from "../../hooks/usePets";
import { PetStackNavigationProp } from "../../navigation/types";
import PetCard from "../../components/PetCard";
import { Pet } from "../../types";
import { Colors } from "../../theme/colors";
import { Spacing, FontSize, Radius } from "../../theme/spacing";

export default function PetsListScreen() {
  const navigation = useNavigation<PetStackNavigationProp>();
  const { data: pets, isLoading, isError, refetch } = usePetsList();

  // ── Pantalla de carga ──
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // ── Error al cargar ──
  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorEmoji}>⚠️</Text>
        <Text style={styles.errorText}>No se pudieron cargar tus mascotas.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function handlePetPress(pet: Pet) {
    navigation.navigate("PetDetail", { petId: pet.id });
  }

  function handleAddPet() {
    navigation.navigate("PetForm", {});
  }

  // ── Estado vacío ──
  function renderEmptyState() {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyEmoji}>🐾</Text>
        <Text style={styles.emptyTitle}>Aún no tienes mascotas</Text>
        <Text style={styles.emptySubtitle}>
          Toca el botón "+" para registrar tu primera mascota.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {(!pets || pets.length === 0) ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🐾</Text>
          <Text style={styles.emptyTitle}>Aún no tienes mascotas</Text>
          <Text style={styles.emptySubtitle}>
            Toca el botón "+" para registrar tu primera mascota.
          </Text>
        </View>
      ) : (
        <FlatList
          data={pets}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PetCard pet={item} onPress={handlePetPress} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Botón flotante para agregar ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddPet}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={Colors.text.inverse} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: Spacing.md,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: FontSize.md,
    color: Colors.text.secondary,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  retryText: {
    color: Colors.text.inverse,
    fontWeight: "600",
    fontSize: FontSize.md,
  },
  emptyEmoji: {
    fontSize: 72,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: "700",
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: Colors.text.secondary,
    textAlign: "center",
    lineHeight: 24,
  },
  fab: {
    position: "absolute",
    bottom: Spacing.xl,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
});
