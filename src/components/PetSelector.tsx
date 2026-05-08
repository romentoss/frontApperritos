/**
 * 🐾 PetSelector — Selector horizontal de mascota
 *
 * Componente reutilizado en VaccineForm, AppointmentForm y FoodForm
 * para elegir a qué mascota pertenece el registro.
 */

import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { usePetsList } from "../hooks/usePets";
import { Pet } from "../types";
import { Colors } from "../theme/colors";
import { Spacing, FontSize, Radius } from "../theme/spacing";

const SPECIES_EMOJI: Record<Pet["species"], string> = {
  dog: "🐕", cat: "🐈", bird: "🐦", rabbit: "🐇", other: "🐾",
};

interface PetSelectorProps {
  selectedPetId: string | null;
  onSelect: (petId: string) => void;
}

export default function PetSelector({ selectedPetId, onSelect }: PetSelectorProps) {
  const { data: pets, isLoading } = usePetsList();

  if (isLoading) {
    return <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.md }} />;
  }

  if (!pets?.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Primero agrega una mascota en el tab 🐾</Text>
      </View>
    );
  }

  return (
    <FlatList
      horizontal
      data={pets}
      keyExtractor={(p) => p.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const selected = item.id === selectedPetId;
        return (
          <TouchableOpacity
            style={[styles.chip, selected && styles.chipSelected]}
            onPress={() => onSelect(item.id)}
            activeOpacity={0.75}
          >
            <Text style={styles.chipEmoji}>{SPECIES_EMOJI[item.species]}</Text>
            <Text style={[styles.chipName, selected && styles.chipNameSelected]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipSelected: {
    borderColor: Colors.primary,
    backgroundColor: "#FFF3EE",
  },
  chipEmoji: {
    fontSize: 16,
  },
  chipName: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    fontWeight: "500",
  },
  chipNameSelected: {
    color: Colors.primary,
    fontWeight: "700",
  },
  empty: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    textAlign: "center",
  },
});
