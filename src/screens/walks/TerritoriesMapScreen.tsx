/**
 * 🏴 TerritoriesMapScreen — Mapa de zonas conquistadas
 *
 *   🟠 Naranja  → Mis territorios (sin conquistar)
 *   🟡 Amarillo → Mis territorios (alguien los ha conquistado)
 *   🟢 Verde    → Territorios ajenos que yo he conquistado
 *   ⬜ Gris     → Territorios ajenos sin conquistar
 *
 * Lógica de conquista:
 *  - Solo walks circulares NO usados ya para este territorio cuentan
 *  - Para volver a conquistar hay que hacer un nuevo recorrido físico
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, Image,
} from "react-native";
import MapView, { Polygon, PROVIDER_DEFAULT } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { useAuth } from "../../hooks/useAuth";
import { useAllWalks } from "../../hooks/useWalks";
import {
  useAllTerritories, useClaimConquest, useDeleteTerritory,
} from "../../hooks/useTerritories";
import { isCircularWalk, simplifyWalk, conquestPercent } from "../../utils/territoryUtils";
import { Territory } from "../../types";
import { Colors } from "../../theme/colors";
import { Spacing, FontSize, Radius } from "../../theme/spacing";
import { WalkStackNavigationProp } from "../../navigation/types";

const MIN_CONQUEST_PERCENT = 30;

interface BestWalk { walkId: string; pct: number }

export default function TerritoriesMapScreen() {
  const navigation = useNavigation<WalkStackNavigationProp>();
  const { user } = useAuth();
  const { data: territories, isLoading } = useAllTerritories();
  const { data: allWalks } = useAllWalks();
  const claimMutation = useClaimConquest();
  const deleteMutation = useDeleteTerritory();

  const [selected, setSelected] = useState<Territory | null>(null);
  const [bestWalk, setBestWalk] = useState<BestWalk | null>(null);
  const [computingOverlap, setComputingOverlap] = useState(false);

  // Recorridos circulares del usuario con su id
  const circularWalks = useMemo(
    () =>
      (allWalks ?? [])
        .filter((w) => isCircularWalk(w.coordinates))
        .map((w) => ({ id: w.id, coords: simplifyWalk(w.coordinates) })),
    [allWalks]
  );

  // Al seleccionar un territorio ajeno: calcular el mejor walk elegible
  useEffect(() => {
    if (!selected || selected.ownerId === user?.uid) {
      setBestWalk(null);
      return;
    }
    setComputingOverlap(true);
    setTimeout(() => {
      // Walks ya usados por este usuario en este territorio
      const usedIds = new Set(
        selected.conquests
          .filter((c) => c.conqueredBy === user?.uid)
          .map((c) => c.walkId)
      );

      let best: BestWalk = { walkId: "", pct: 0 };
      for (const w of circularWalks) {
        if (usedIds.has(w.id)) continue; // este walk ya se usó aquí
        const pct = conquestPercent(w.coords, selected.coordinates);
        if (pct > best.pct) best = { walkId: w.id, pct };
      }
      setBestWalk(best.pct > 0 ? best : null);
      setComputingOverlap(false);
    }, 0);
  }, [selected, circularWalks, user?.uid]);

  const initialRegion = useMemo(() => {
    const mine = (territories ?? []).filter((t) => t.ownerId === user?.uid);
    const pool = mine.length > 0 ? mine : territories ?? [];
    if (pool.length > 0) {
      const all = pool.flatMap((t) => t.coordinates);
      const lats = all.map((c) => c.latitude);
      const lons = all.map((c) => c.longitude);
      return {
        latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
        longitude: (Math.min(...lons) + Math.max(...lons)) / 2,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      };
    }
    return { latitude: 40.4168, longitude: -3.7038, latitudeDelta: 0.12, longitudeDelta: 0.12 };
  }, [territories, user?.uid]);

  function fillColor(t: Territory): string {
    if (t.ownerId === user?.uid)
      return t.conquests.length > 0 ? "rgba(253,203,110,0.35)" : "rgba(255,107,53,0.35)";
    const mine = t.conquests.find((c) => c.conqueredBy === user?.uid);
    if (mine && mine.percentage >= MIN_CONQUEST_PERCENT) return "rgba(0,184,148,0.35)";
    return "rgba(99,110,114,0.18)";
  }

  function strokeColor(t: Territory): string {
    if (t.ownerId === user?.uid)
      return t.conquests.length > 0 ? Colors.warning : Colors.primary;
    const mine = t.conquests.find((c) => c.conqueredBy === user?.uid);
    if (mine && mine.percentage >= MIN_CONQUEST_PERCENT) return Colors.success;
    return Colors.text.disabled;
  }

  function handleDeleteTerritory(t: Territory) {
    Alert.alert("Eliminar territorio", "¿Eliminar tu territorio? Esta acción no se puede deshacer.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar", style: "destructive",
        onPress: () => deleteMutation.mutate(t.id, {
          onSuccess: () => setSelected(null),
          onError: (e: unknown) =>
            Alert.alert("Error", e instanceof Error ? e.message : "No se pudo eliminar"),
        }),
      },
    ]);
  }

  function handleClaim(t: Territory, best: BestWalk) {
    Alert.alert(
      "Conquistar zona",
      `Tu recorrido cubre el ${best.pct}% de esta zona. ¿Quieres reclamarla?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Conquistar",
          onPress: () =>
            claimMutation.mutate(
              {
                territoryId: t.id,
                walkId: best.walkId,
                percentage: best.pct,
                conqueredByName: user?.displayName ?? "Usuario",
                conqueredByPhotoURL: user?.photoURL ?? undefined,
              },
              {
                onSuccess: () => {
                  Alert.alert("¡Conquistado!", `Has reclamado el ${best.pct}% de esta zona. 🏴`);
                  setSelected(null);
                },
                onError: (e: unknown) =>
                  Alert.alert("Error", e instanceof Error ? e.message : "No se pudo conquistar"),
              }
            ),
        },
      ]
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando territorios…</Text>
      </View>
    );
  }

  const stats = {
    total: territories?.length ?? 0,
    mine: territories?.filter((t) => t.ownerId === user?.uid).length ?? 0,
    conquered: territories?.filter((t) =>
      t.conquests.some((c) => c.conqueredBy === user?.uid)
    ).length ?? 0,
  };

  const isMine = selected?.ownerId === user?.uid;
  const myConquest = selected?.conquests.find((c) => c.conqueredBy === user?.uid);
  const topConquest = isMine
    ? [...(selected?.conquests ?? [])].sort((a, b) => b.percentage - a.percentage)[0]
    : null;

  const allUsedIds = selected
    ? new Set(
        selected.conquests
          .filter((c) => c.conqueredBy === user?.uid)
          .map((c) => c.walkId)
      )
    : new Set<string>();
  const hasUnusedCircularWalks = circularWalks.some((w) => !allUsedIds.has(w.id));

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        onPress={() => setSelected(null)}
      >
        {(territories ?? []).map((t) => (
          <Polygon
            key={t.id}
            coordinates={t.coordinates}
            fillColor={fillColor(t)}
            strokeColor={strokeColor(t)}
            strokeWidth={selected?.id === t.id ? 3 : 2}
            tappable
            onPress={() => setSelected(t)}
          />
        ))}
      </MapView>

      {/* ── Leyenda ─────────────────────────────────────────── */}
      <View style={styles.legend}>
        <LegendDot color={Colors.primary} label="Mío" />
        <LegendDot color={Colors.warning} label="Disputado" />
        <LegendDot color={Colors.success} label="Conquistado" />
        <LegendDot color={Colors.text.disabled} label="Ajeno" />
      </View>

      {/* ── Stats ────────────────────────────────────────────── */}
      <View style={styles.statsBar}>
        <StatChip icon="map-outline" value={stats.total} label="total" />
        <StatChip icon="flag-outline" value={stats.mine} label="míos" />
        <StatChip icon="trophy-outline" value={stats.conquered} label="conquistados" />
      </View>

      {/* ── Panel ────────────────────────────────────────────── */}
      {selected && (
        <View style={styles.panel}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Cabecera con close */}
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>
                {isMine ? "🏠 Tu territorio" : "📍 Territorio"}
              </Text>
              <TouchableOpacity
                onPress={() => setSelected(null)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={22} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* Info del dueño */}
            <View style={styles.ownerRow}>
              <UserAvatar uri={selected.ownerPhotoURL} size={36} />
              <View style={styles.ownerText}>
                <Text style={styles.ownerName}>{selected.ownerName}</Text>
                <Text style={styles.ownerSub}>
                  🐾 {selected.petName} · {formatArea(selected.areaM2)} · {selected.createdDate}
                </Text>
              </View>
            </View>

            {/* Conquistas recibidas (si es mío) */}
            {isMine && selected.conquests.length === 0 && (
              <View style={styles.infoRow}>
                <Ionicons name="shield-checkmark-outline" size={16} color={Colors.success} />
                <Text style={styles.infoText}>Nadie ha conquistado este territorio aún</Text>
              </View>
            )}
            {isMine && topConquest && (
              <View style={styles.conquestRow}>
                <UserAvatar uri={topConquest.conqueredByPhotoURL} size={30} />
                <View style={styles.conquestText}>
                  <Text style={styles.conquestName}>{topConquest.conqueredByName}</Text>
                  <Text style={styles.conquestSub}>
                    Ha conquistado el {topConquest.percentage}% · {topConquest.date}
                  </Text>
                </View>
                <Ionicons name="warning-outline" size={18} color={Colors.warning} />
              </View>
            )}

            {/* Mi conquista actual (si es ajeno) */}
            {!isMine && myConquest && (
              <View style={styles.infoRow}>
                <Ionicons name="trophy-outline" size={16} color={Colors.success} />
                <Text style={styles.infoText}>
                  Tienes conquistado el {myConquest.percentage}% · {myConquest.date}
                </Text>
              </View>
            )}

            {/* Sección de solape (solo territorios ajenos) */}
            {!isMine && (
              <View style={styles.overlapSection}>
                {computingOverlap ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : circularWalks.length === 0 ? (
                  <Text style={styles.noWalksText}>
                    No tienes recorridos circulares para conquistar esta zona
                  </Text>
                ) : !hasUnusedCircularWalks ? (
                  <View style={styles.infoRow}>
                    <Ionicons name="refresh-outline" size={16} color={Colors.warning} />
                    <Text style={styles.infoText}>
                      Ya usaste todos tus recorridos circulares aquí. Haz un nuevo paseo para volver a conquistar.
                    </Text>
                  </View>
                ) : bestWalk !== null ? (
                  <>
                    <View style={styles.overlapRow}>
                      <Text style={styles.overlapLabel}>Tu mejor recorrido nuevo cubre</Text>
                      <Text style={[
                        styles.overlapValue,
                        { color: bestWalk.pct >= MIN_CONQUEST_PERCENT ? Colors.success : Colors.text.secondary },
                      ]}>
                        {bestWalk.pct}%
                      </Text>
                    </View>
                    <View style={styles.progressBg}>
                      <View style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(bestWalk.pct, 100)}%` as `${number}%`,
                          backgroundColor: bestWalk.pct >= MIN_CONQUEST_PERCENT
                            ? Colors.success : Colors.text.disabled,
                        },
                      ]} />
                    </View>
                    {bestWalk.pct < MIN_CONQUEST_PERCENT && (
                      <Text style={styles.hintText}>
                        Necesitas cubrir al menos el {MIN_CONQUEST_PERCENT}% para conquistar
                      </Text>
                    )}
                  </>
                ) : (
                  <Text style={styles.noWalksText}>
                    Ninguno de tus recorridos nuevos supera el mínimo
                  </Text>
                )}
              </View>
            )}

            {/* Acciones */}
            <View style={styles.actions}>
              {isMine ? (
                <TouchableOpacity
                  style={[styles.btn, styles.btnDanger]}
                  onPress={() => handleDeleteTerritory(selected)}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <><Ionicons name="trash-outline" size={18} color="#fff" /><Text style={styles.btnText}>Eliminar territorio</Text></>}
                </TouchableOpacity>
              ) : (
                bestWalk !== null && bestWalk.pct >= MIN_CONQUEST_PERCENT && (
                  <TouchableOpacity
                    style={[styles.btn, styles.btnSuccess]}
                    onPress={() => handleClaim(selected, bestWalk)}
                    disabled={claimMutation.isPending}
                  >
                    {claimMutation.isPending
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <><Ionicons name="flag-outline" size={18} color="#fff" /><Text style={styles.btnText}>Conquistar ({bestWalk.pct}%)</Text></>}
                  </TouchableOpacity>
                )
              )}
            </View>
          </ScrollView>
        </View>
      )}

      {/* ── Estado vacío ─────────────────────────────────────── */}
      {!isLoading && stats.total === 0 && (
        <View style={styles.emptyOverlay}>
          <Text style={styles.emptyEmoji}>🗺️</Text>
          <Text style={styles.emptyTitle}>Sin territorios aún</Text>
          <Text style={styles.emptySubtitle}>
            Completa un recorrido circular y publícalo desde el detalle del paseo
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate("WalksList")}>
            <Text style={styles.emptyBtnText}>Ver mis recorridos</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Componentes auxiliares ─────────────────────────────────────────────────

function UserAvatar({ uri, size }: { uri?: string; size: number }) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: Colors.border }}
      />
    );
  }
  return <Ionicons name="person-circle" size={size} color={Colors.text.disabled} />;
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={legendStyles.item}>
      <View style={[legendStyles.dot, { backgroundColor: color }]} />
      <Text style={legendStyles.label}>{label}</Text>
    </View>
  );
}

function StatChip({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <View style={statStyles.chip}>
      <Ionicons name={icon as any} size={14} color={Colors.text.secondary} />
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function formatArea(m2: number): string {
  if (m2 >= 1_000_000) return `${(m2 / 1_000_000).toFixed(2)} km²`;
  if (m2 >= 10_000) return `${(m2 / 10_000).toFixed(1)} ha`;
  return `${Math.round(m2)} m²`;
}

// ── Estilos ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.md },
  loadingText: { color: Colors.text.secondary, fontSize: FontSize.sm },

  legend: {
    position: "absolute",
    bottom: Spacing.md,
    right: Spacing.md,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: Radius.md,
    padding: Spacing.sm,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  statsBar: {
    position: "absolute",
    top: Spacing.md,
    left: Spacing.md,
    flexDirection: "row",
    gap: Spacing.xs,
  },

  panel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: "60%",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  panelTitle: { fontSize: FontSize.lg, fontWeight: "700", color: Colors.text.primary },

  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.background,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  ownerText: { flex: 1 },
  ownerName: { fontSize: FontSize.md, fontWeight: "600", color: Colors.text.primary },
  ownerSub: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 2 },

  conquestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "rgba(253,203,110,0.15)",
    padding: Spacing.sm,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  conquestText: { flex: 1 },
  conquestName: { fontSize: FontSize.sm, fontWeight: "600", color: Colors.text.primary },
  conquestSub: { fontSize: FontSize.xs, color: Colors.text.secondary },

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.background,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
  },
  infoText: { fontSize: FontSize.sm, color: Colors.text.primary, flex: 1 },

  overlapSection: { marginVertical: Spacing.sm },
  overlapRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  overlapLabel: { fontSize: FontSize.sm, color: Colors.text.secondary },
  overlapValue: { fontSize: FontSize.xl, fontWeight: "700" },
  progressBg: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: Spacing.xs,
  },
  progressFill: { height: "100%", borderRadius: 4 },
  hintText: { fontSize: FontSize.xs, color: Colors.text.secondary, textAlign: "center" },
  noWalksText: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    textAlign: "center",
    padding: Spacing.md,
  },

  actions: { marginTop: Spacing.md, gap: Spacing.sm },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.sm,
  },
  btnDanger: { backgroundColor: Colors.error },
  btnSuccess: { backgroundColor: Colors.success },
  btnText: { color: "#fff", fontWeight: "600", fontSize: FontSize.md },

  emptyOverlay: {
    position: "absolute",
    bottom: Spacing.xl * 2,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: "700", color: Colors.text.primary, marginBottom: Spacing.xs },
  emptySubtitle: { fontSize: FontSize.sm, color: Colors.text.secondary, textAlign: "center", marginBottom: Spacing.md },
  emptyBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.md },
  emptyBtnText: { color: "#fff", fontWeight: "600" },
});

const legendStyles = StyleSheet.create({
  item: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { fontSize: 11, color: Colors.text.primary },
});

const statStyles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  value: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.text.primary },
  label: { fontSize: 11, color: Colors.text.secondary },
});


