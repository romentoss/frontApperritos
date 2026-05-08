import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView,
  TouchableOpacity, Alert,
} from "react-native";
import MapView, { Polyline, Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { WalkStackParamList } from "../../navigation/types";
import { useWalk } from "../../hooks/useWalks";
import { usePetsList } from "../../hooks/usePets";
import { usePublishTerritory } from "../../hooks/useTerritories";
import { useAuth } from "../../hooks/useAuth";
import {
  isCircularWalk,
  simplifyWalk,
  polygonAreaM2,
} from "../../utils/territoryUtils";
import territoryService from "../../services/territoryService";
import { Colors } from "../../theme/colors";
import { Spacing, FontSize, Radius } from "../../theme/spacing";

type WalkDetailRouteProp = RouteProp<WalkStackParamList, "WalkDetail">;

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
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

export default function WalkDetailScreen() {
  const route = useRoute<WalkDetailRouteProp>();
  const { walkId } = route.params;

  const { user } = useAuth();
  const { data: walk, isLoading } = useWalk(walkId);
  const { data: pets } = usePetsList();
  const publishMutation = usePublishTerritory();

  const [alreadyPublished, setAlreadyPublished] = useState(false);

  // Comprueba si este walk ya fue publicado como territorio
  useEffect(() => {
    if (!user || !walkId) return;
    territoryService.isWalkPublished(user.uid, walkId).then(setAlreadyPublished);
  }, [user, walkId]);

  if (isLoading || !walk) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  const circular = isCircularWalk(walk.coordinates);

  function handlePublish() {
    const simplified = simplifyWalk(walk!.coordinates);
    const areaM2 = polygonAreaM2(simplified);
    const petName = pet?.name ?? "Sin mascota";
    Alert.alert(
      "Publicar territorio",
      `Publicarás esta zona circular (${Math.round(areaM2)} m²) en el mapa compartido.\n\nSe mostrará tu nombre y el de ${petName}. No se comparten notas ni datos sensibles.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Publicar",
          onPress: () => {
            publishMutation.mutate(
              {
                walkId: walk!.id,
                coordinates: simplified,
                areaM2,
                ownerName: user?.displayName ?? "Usuario",
                ...(user?.photoURL ? { ownerPhotoURL: user.photoURL } : {}),
                petName,
              },
              {
                onSuccess: () => {
                  setAlreadyPublished(true);
                  Alert.alert("¡Publicado!", "Tu territorio ya aparece en el mapa compartido. 🏴");
                },
                onError: (e: unknown) =>
                  Alert.alert(
                    "Error",
                    e instanceof Error ? e.message : "No se pudo publicar"
                  ),
              }
            );
          },
        },
      ]
    );
  }

  const pet = pets?.find((p) => p.id === walk.petId);
  const polylineCoords = walk.coordinates.map((c) => ({ latitude: c.latitude, longitude: c.longitude }));

  // Calcular bounding box para la cámara inicial
  const lats = walk.coordinates.map((c) => c.latitude);
  const lons = walk.coordinates.map((c) => c.longitude);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const centerLat = (minLat + maxLat) / 2;
  const centerLon = (minLon + maxLon) / 2;
  const deltaLat = Math.max((maxLat - minLat) * 1.4, 0.004);
  const deltaLon = Math.max((maxLon - minLon) * 1.4, 0.004);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ── Mapa ──────────────────────────────────────────────── */}
      <View style={styles.mapContainer}>
        {polylineCoords.length >= 2 ? (
          <MapView
            style={styles.map}
            provider={PROVIDER_DEFAULT}
            scrollEnabled={false}
            zoomEnabled={false}
            initialRegion={{
              latitude: centerLat, longitude: centerLon,
              latitudeDelta: deltaLat, longitudeDelta: deltaLon,
            }}
          >
            <Polyline
              coordinates={polylineCoords}
              strokeColor={Colors.primary}
              strokeWidth={4}
            />
            <Marker coordinate={polylineCoords[0]} pinColor={Colors.secondary} title="Inicio" />
            <Marker coordinate={polylineCoords[polylineCoords.length - 1]} pinColor={Colors.error} title="Fin" />
          </MapView>
        ) : (
          <View style={[styles.map, styles.noMapPlaceholder]}>
            <Text style={styles.noMapText}>Sin suficientes puntos GPS para mostrar ruta</Text>
          </View>
        )}
      </View>

      {/* ── Métricas ───────────────────────────────────────────── */}
      <View style={styles.metricsCard}>
        <MetricItem icon="navigate-outline" label="Distancia" value={formatDistance(walk.distanceMeters)} color={Colors.primary} />
        <MetricItem icon="time-outline" label="Duración" value={formatDuration(walk.durationSeconds)} color={Colors.secondary} />
        <MetricItem icon="location-outline" label="Puntos GPS" value={String(walk.coordinates.length)} color={Colors.text.secondary} />
      </View>

      {/* ── Detalles ───────────────────────────────────────────── */}
      <View style={styles.detailCard}>
        {pet && (
          <View style={styles.detailRow}>
            <Ionicons name="paw-outline" size={16} color={Colors.primary} />
            <Text style={styles.detailText}>{pet.name}</Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color={Colors.text.secondary} />
          <Text style={styles.detailText}>{formatDate(walk.startTime)}</Text>
        </View>
        {walk.notes && (
          <View style={styles.detailRow}>
            <Ionicons name="chatbubble-outline" size={16} color={Colors.text.secondary} />
            <Text style={styles.detailText}>{walk.notes}</Text>
          </View>
        )}
      </View>

      {/* ── Territorio ─────────────────────────────────────────── */}
      {circular && (
        <View style={styles.territoryCard}>
          <View style={styles.territoryHeader}>
            <Ionicons name="flag-outline" size={20} color={Colors.primary} />
            <Text style={styles.territoryTitle}>Recorrido circular</Text>
          </View>
          <Text style={styles.territorySubtitle}>
            Este recorrido forma un polígono cerrado. Puedes publicarlo como
            territorio en el mapa compartido y que otros lo conquisten.
          </Text>
          {alreadyPublished ? (
            <View style={styles.publishedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Text style={styles.publishedText}>Ya publicado como territorio</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.publishBtn}
              onPress={handlePublish}
              disabled={publishMutation.isPending}
              activeOpacity={0.8}
            >
              {publishMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="globe-outline" size={18} color="#fff" />
                  <Text style={styles.publishBtnText}>Publicar como territorio</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function MetricItem({
  icon, label, value, color,
}: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={metricStyles.item}>
      <Ionicons name={icon as any} size={22} color={color} />
      <Text style={metricStyles.value}>{value}</Text>
      <Text style={metricStyles.label}>{label}</Text>
    </View>
  );
}

const metricStyles = StyleSheet.create({
  item: { flex: 1, alignItems: "center", padding: Spacing.sm },
  value: { fontSize: FontSize.lg, fontWeight: "700", color: Colors.text.primary, marginTop: 4 },
  label: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: Spacing.xl },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  mapContainer: {
    height: 280,
    margin: Spacing.md,
    borderRadius: Radius.lg,
    overflow: "hidden",
  },
  map: { flex: 1 },
  noMapPlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  noMapText: { color: Colors.text.secondary, fontSize: FontSize.sm, textAlign: "center", padding: Spacing.lg },
  metricsCard: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
  },
  detailCard: {
    backgroundColor: Colors.surface,
    margin: Spacing.md, borderRadius: Radius.md,
    padding: Spacing.md,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
    gap: Spacing.md,
  },
  detailRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  detailText: { fontSize: FontSize.sm, color: Colors.text.primary, flex: 1 },

  territoryCard: {
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    marginTop: 0,
    borderRadius: Radius.md,
    padding: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
    gap: Spacing.sm,
  },
  territoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  territoryTitle: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.text.primary,
  },
  territorySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  publishBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  publishBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: FontSize.sm,
  },
  publishedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: "rgba(0,184,148,0.1)",
    borderRadius: Radius.sm,
  },
  publishedText: {
    fontSize: FontSize.sm,
    color: Colors.success,
    fontWeight: "600",
  },
});
