/**
 * 🚧 PlaceholderScreen — Pantalla temporal para tabs no implementadas
 *
 * Se usa en AppTabs para las tabs que se implementarán en fases posteriores.
 * Muestra un mensaje amigable indicando que la feature está en construcción.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRoute } from "@react-navigation/native";

import { Colors } from "../theme/colors";
import { Spacing, FontSize } from "../theme/spacing";

// Mapeo de nombre de tab a emoji y descripción
const TAB_INFO: Record<string, { emoji: string; label: string }> = {
  Vaccines: { emoji: "💉", label: "Vacunas" },
  Appointments: { emoji: "📅", label: "Citas" },
  Food: { emoji: "🍖", label: "Comida" },
};

export default function PlaceholderScreen() {
  const route = useRoute();
  const info = TAB_INFO[route.name] ?? { emoji: "🚧", label: route.name };

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{info.emoji}</Text>
      <Text style={styles.title}>{info.label}</Text>
      <Text style={styles.message}>
        Esta sección se implementará en la próxima fase. ¡Pronto estará lista!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
  },
  emoji: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: "700",
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: FontSize.md,
    color: Colors.text.secondary,
    textAlign: "center",
    lineHeight: 24,
  },
});
