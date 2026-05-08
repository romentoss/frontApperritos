/**
 * 🐾 PetCard — Tarjeta de mascota para la lista
 *
 * Muestra la foto, nombre, especie y raza de una mascota.
 * Al tocarla navega al detalle de esa mascota.
 *
 * Diseño: foto cuadrada a la izquierda, info a la derecha,
 * con sombra sutil para dar profundidad.
 */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Pet } from "../types";
import { Colors } from "../theme/colors";
import { Spacing, FontSize, Radius } from "../theme/spacing";

// ── Mapeo de especie a emoji ──
const SPECIES_EMOJI: Record<Pet["species"], string> = {
  dog: "🐕",
  cat: "🐈",
  bird: "🐦",
  rabbit: "🐇",
  other: "🐾",
};

const SPECIES_LABEL: Record<Pet["species"], string> = {
  dog: "Perro",
  cat: "Gato",
  bird: "Pájaro",
  rabbit: "Conejo",
  other: "Mascota",
};

interface PetCardProps {
  pet: Pet;
  onPress: (pet: Pet) => void;
}

export default function PetCard({ pet, onPress }: PetCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(pet)}
      activeOpacity={0.75}
    >
      {/* ── Foto o avatar placeholder ── */}
      <View style={styles.photoContainer}>
        {pet.photoURL ? (
          <Image source={{ uri: pet.photoURL }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoEmoji}>{SPECIES_EMOJI[pet.species]}</Text>
          </View>
        )}
      </View>

      {/* ── Información ── */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {pet.name}
        </Text>

        <Text style={styles.species}>
          {SPECIES_EMOJI[pet.species]} {SPECIES_LABEL[pet.species]}
          {pet.breed ? ` · ${pet.breed}` : ""}
        </Text>

        {pet.weight && (
          <Text style={styles.detail}>{pet.weight} kg</Text>
        )}
      </View>

      {/* ── Chevron ── */}
      <Ionicons
        name="chevron-forward"
        size={20}
        color={Colors.text.disabled}
        style={styles.chevron}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    // Sombra iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    // Sombra Android
    elevation: 2,
  },
  photoContainer: {
    marginRight: Spacing.md,
  },
  photo: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
    backgroundColor: Colors.border,
  },
  photoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  photoEmoji: {
    fontSize: 32,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.text.primary,
    marginBottom: 2,
  },
  species: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  detail: {
    fontSize: FontSize.sm,
    color: Colors.text.disabled,
  },
  chevron: {
    marginLeft: Spacing.sm,
  },
});
