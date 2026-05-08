import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Modal, Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Walk } from "../types";
import {
  computeAchievements,
  countUnlocked,
  TOTAL_ACHIEVEMENTS,
  Achievement,
} from "../utils/achievements";
import { Colors } from "../theme/colors";
import { Spacing, FontSize, Radius } from "../theme/spacing";

interface Props {
  walks: Walk[];
}

export default function AchievementsRow({ walks }: Props) {
  const achievements = computeAchievements(walks);
  const unlocked = countUnlocked(walks);
  const [selected, setSelected] = useState<Achievement | null>(null);

  return (
    <View style={styles.section}>
      {/* ── Cabecera ──────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏅 Conquistas</Text>
        <Text style={styles.headerCount}>
          {unlocked}/{TOTAL_ACHIEVEMENTS}
        </Text>
      </View>

      {/* ── Barra de progreso ────────────────────────────── */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${(unlocked / TOTAL_ACHIEVEMENTS) * 100}%` },
          ]}
        />
      </View>

      {/* ── Badges horizontales ─────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {achievements.map((a) => (
          <TouchableOpacity
            key={a.id}
            style={[
              styles.badge,
              a.unlocked ? { backgroundColor: a.color } : styles.badgeLocked,
            ]}
            onPress={() => setSelected(a)}
            activeOpacity={0.8}
          >
            <Text style={styles.badgeEmoji}>{a.emoji}</Text>
            {!a.unlocked && (
              <View style={styles.lockOverlay}>
                <Ionicons name="lock-closed" size={10} color="rgba(255,255,255,0.7)" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Modal detalle ───────────────────────────────── */}
      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelected(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View
              style={[
                styles.modalBadge,
                selected?.unlocked
                  ? { backgroundColor: selected.color }
                  : styles.badgeLocked,
              ]}
            >
              <Text style={styles.modalEmoji}>{selected?.emoji}</Text>
            </View>
            <Text style={styles.modalTitle}>{selected?.title}</Text>
            <Text style={styles.modalDesc}>{selected?.description}</Text>
            <View
              style={[
                styles.modalStatus,
                selected?.unlocked ? styles.statusUnlocked : styles.statusLocked,
              ]}
            >
              <Ionicons
                name={selected?.unlocked ? "checkmark-circle" : "lock-closed"}
                size={14}
                color={selected?.unlocked ? Colors.secondary : Colors.text.disabled}
              />
              <Text
                style={[
                  styles.statusText,
                  selected?.unlocked ? styles.statusTextUnlocked : styles.statusTextLocked,
                ]}
              >
                {selected?.unlocked ? "¡Desbloqueada!" : "Bloqueada"}
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.text.primary,
  },
  headerCount: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    fontWeight: "600",
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  scrollContent: {
    gap: Spacing.sm,
    paddingVertical: 2,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeLocked: {
    backgroundColor: "#D0D0D0",
  },
  badgeEmoji: {
    fontSize: 22,
  },
  lockOverlay: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 6,
    padding: 1,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: "center",
    width: 260,
    gap: Spacing.sm,
  },
  modalBadge: {
    width: 72,
    height: 72,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  modalEmoji: { fontSize: 36 },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.text.primary,
    textAlign: "center",
  },
  modalDesc: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    textAlign: "center",
  },
  modalStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    marginTop: Spacing.xs,
  },
  statusUnlocked: { backgroundColor: "#E8F8F7" },
  statusLocked: { backgroundColor: "#F0F0F0" },
  statusText: { fontSize: FontSize.xs, fontWeight: "600" },
  statusTextUnlocked: { color: Colors.secondary },
  statusTextLocked: { color: Colors.text.disabled },
});
