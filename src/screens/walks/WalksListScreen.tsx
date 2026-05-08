import React, { useMemo } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { WalkStackParamList, WalkStackNavigationProp } from "../../navigation/types";
import { useAllWalks, useDeleteWalk } from "../../hooks/useWalks";
import { usePetsList } from "../../hooks/usePets";
import { Walk, Pet } from "../../types";
import { Colors } from "../../theme/colors";
import { Spacing, FontSize, Radius } from "../../theme/spacing";
import AchievementsRow from "../../components/AchievementsRow";

type WalksListRouteProp = RouteProp<WalkStackParamList, "WalksList">;

const SPECIES_EMOJI: Record<Pet["species"], string> = {
  dog: "🐕", cat: "🐈", bird: "🐦", rabbit: "🐇", other: "🐾",
};

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })
    + " · " + d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

export default function WalksListScreen() {
  const navigation = useNavigation<WalkStackNavigationProp>();
  const route = useRoute<WalksListRouteProp>();
  const filterPetId = route.params?.petId;

  const { data: walks, isLoading } = useAllWalks();
  const { data: pets } = usePetsList();
  const deleteMutation = useDeleteWalk();

  const petMap = useMemo(
    () => new Map(pets?.map((p) => [p.id, p]) ?? []),
    [pets]
  );

  const displayList = useMemo(() => {
    if (!walks) return [];
    return filterPetId ? walks.filter((w) => w.petId === filterPetId) : walks;
  }, [walks, filterPetId]);

  // Totales acumulados
  const totalKm = useMemo(
    () => displayList.reduce((acc, w) => acc + w.distanceMeters, 0) / 1000,
    [displayList]
  );
  const totalMinutes = useMemo(
    () => Math.round(displayList.reduce((acc, w) => acc + w.durationSeconds, 0) / 60),
    [displayList]
  );

  function handleDelete(walk: Walk) {
    Alert.alert("Eliminar recorrido", "¿Eliminar este recorrido?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar", style: "destructive",
        onPress: () => deleteMutation.mutate(walk.id),
      },
    ]);
  }

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      {/* ── Tarjeta de totales ─────────────────────────────── */}
      {displayList.length > 0 && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{displayList.length}</Text>
            <Text style={styles.summaryLabel}>Paseos</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalKm.toFixed(1)} km</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalMinutes} min</Text>
            <Text style={styles.summaryLabel}>Tiempo</Text>
          </View>
        </View>
      )}

      {/* ── Conquistas ──────────────────────────────────────── */}
      <AchievementsRow walks={displayList} />

      {/* ── Mapa de territorios ─────────────────────────────── */}
      <TouchableOpacity
        style={styles.territoriesBtn}
        onPress={() => navigation.navigate("TerritoriesMap")}
        activeOpacity={0.8}
      >
        <Ionicons name="map-outline" size={18} color="#fff" />
        <Text style={styles.territoriesBtnText}>🏴 Mapa de territorios</Text>
      </TouchableOpacity>

      {displayList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🗺️</Text>
          <Text style={styles.emptyTitle}>Sin recorridos</Text>
          <Text style={styles.emptySubtitle}>Toca + para iniciar el primer paseo</Text>
        </View>
      ) : (
        <FlatList
          data={displayList}
          keyExtractor={(w) => w.id}
          contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const pet = petMap.get(item.petId);
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("WalkDetail", { walkId: item.id })}
              activeOpacity={0.8}
            >
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>🐾</Text>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.dateText}>{formatDate(item.startTime)}</Text>
                {pet && (
                  <Text style={styles.petBadge}>
                    {SPECIES_EMOJI[pet.species]} {pet.name}
                  </Text>
                )}
                <View style={styles.metricsRow}>
                  <View style={styles.metric}>
                    <Ionicons name="navigate-outline" size={13} color={Colors.primary} />
                    <Text style={styles.metricText}>{formatDistance(item.distanceMeters)}</Text>
                  </View>
                  <View style={styles.metric}>
                    <Ionicons name="time-outline" size={13} color={Colors.text.secondary} />
                    <Text style={styles.metricText}>{formatDuration(item.durationSeconds)}</Text>
                  </View>
                  <View style={styles.metric}>
                    <Ionicons name="location-outline" size={13} color={Colors.text.secondary} />
                    <Text style={styles.metricText}>{item.coordinates.length} pts</Text>
                  </View>
                </View>
                {item.notes && (
                  <Text style={styles.notes} numberOfLines={1}>💬 {item.notes}</Text>
                )}
              </View>

              <TouchableOpacity
                onPress={() => handleDelete(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
          />
        )}

      {/* ── FAB ─────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("WalkMap", { petId: filterPetId })}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingTop: Spacing.md },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },

  summaryCard: {
    flexDirection: "row",
    backgroundColor: Colors.primary,
    margin: Spacing.md,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: { fontSize: FontSize.lg, fontWeight: "700", color: "#fff" },
  summaryLabel: { fontSize: FontSize.xs, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.3)", marginVertical: 4 },

  territoriesBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.secondary,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    gap: Spacing.sm,
  },
  territoriesBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: FontSize.sm,
  },

  listContent: { paddingHorizontal: Spacing.md, paddingBottom: 100 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: "700", color: Colors.text.primary },
  emptySubtitle: { fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: Spacing.xs },

  card: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.sm,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
  },
  cardIcon: {
    width: 44, height: 44, borderRadius: Radius.md,
    backgroundColor: "#FFF3EE",
    alignItems: "center", justifyContent: "center",
    marginRight: Spacing.md,
  },
  cardIconText: { fontSize: 22 },
  cardBody: { flex: 1 },
  dateText: { fontSize: FontSize.sm, fontWeight: "600", color: Colors.text.primary },
  petBadge: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: "600", marginTop: 2 },
  metricsRow: { flexDirection: "row", gap: Spacing.md, marginTop: 4 },
  metric: { flexDirection: "row", alignItems: "center", gap: 3 },
  metricText: { fontSize: FontSize.xs, color: Colors.text.secondary },
  notes: { fontSize: FontSize.xs, color: Colors.text.disabled, marginTop: 3 },

  fab: {
    position: "absolute", bottom: Spacing.xl, right: Spacing.lg,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
});
