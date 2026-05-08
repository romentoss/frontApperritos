/**
 * 🗺️ WalkMapScreen — Tracking de recorrido en tiempo real
 *
 * Estados:
 *  idle     → botón "Iniciar paseo"
 *  running  → GPS activo, polilínea dibujada, timer, botones Pausar / Detener
 *  paused   → timer parado, botones Reanudar / Detener
 *  done     → modal resumen + botón "Guardar"
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Platform, Modal, TextInput,
} from "react-native";
import MapView, { Polyline, Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { WalkStackParamList, WalkStackNavigationProp } from "../../navigation/types";
import { usePetsList } from "../../hooks/usePets";
import { useSaveWalk } from "../../hooks/useWalks";
import { totalDistance } from "../../services/walkService";
import { WalkCoordinate } from "../../types";
import PetSelector from "../../components/PetSelector";
import { Colors } from "../../theme/colors";
import { Spacing, FontSize, Radius } from "../../theme/spacing";

type WalkMapRouteProp = RouteProp<WalkStackParamList, "WalkMap">;

type TrackingState = "idle" | "running" | "paused" | "done";

const DEFAULT_REGION = {
  latitude: -12.0464,
  longitude: -77.0428,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

const MAP_LOAD_TIMEOUT_MS = 10000;
const TRACKING_TASK_NAME = "apperritos-walk-background-tracking";
const TRACKING_STORAGE_KEY = "apperritos-walk-tracking-points";

async function getTrackedCoordinates(): Promise<WalkCoordinate[]> {
  try {
    const raw = await AsyncStorage.getItem(TRACKING_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WalkCoordinate[];
  } catch {
    return [];
  }
}

async function storeTrackedCoordinates(coords: WalkCoordinate[]): Promise<void> {
  await AsyncStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(coords));
}

if (!TaskManager.isTaskDefined(TRACKING_TASK_NAME)) {
  TaskManager.defineTask(
    TRACKING_TASK_NAME,
    async ({ data, error }: TaskManager.TaskManagerTaskBody<{ locations: Location.LocationObject[] }>) => {
      if (error || !data?.locations?.length) return;

      const newPoints: WalkCoordinate[] = data.locations.map((loc) => ({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        timestamp: loc.timestamp ?? Date.now(),
      }));

      const prev = await getTrackedCoordinates();
      const merged = [...prev];

      for (const point of newPoints) {
        const last = merged[merged.length - 1];
        const isDuplicate =
          !!last &&
          last.timestamp === point.timestamp &&
          last.latitude === point.latitude &&
          last.longitude === point.longitude;
        if (!isDuplicate) merged.push(point);
      }

      await storeTrackedCoordinates(merged);
    }
  );
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

export default function WalkMapScreen() {
  const navigation = useNavigation<WalkStackNavigationProp>();
  const route = useRoute<WalkMapRouteProp>();

  const { data: pets } = usePetsList();
  const saveWalk = useSaveWalk();

  const [petId, setPetId] = useState(route.params?.petId ?? "");
  const [trackingState, setTrackingState] = useState<TrackingState>("idle");
  const [coordinates, setCoordinates] = useState<WalkCoordinate[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [showMapHelp, setShowMapHelp] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [notes, setNotes] = useState("");

  const trackingSyncRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<string>("");
  const endTimeRef = useRef<string>("");
  const mapRef = useRef<MapView>(null);
  const mapLoadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Solicitar permisos al montar
  useEffect(() => {
    (async () => {
      try {
        const fg = await Location.requestForegroundPermissionsAsync();
        if (fg.status !== "granted") {
          setHasPermission(false);
          return;
        }

        const bg = await Location.requestBackgroundPermissionsAsync();
        setHasPermission(bg.status === "granted");

        if (bg.status !== "granted") {
          Alert.alert(
            "Permiso de ubicación limitado",
            "Para que el GPS funcione con la pantalla bloqueada ve a Ajustes → Aplicaciones → Apperritos → Permisos → Ubicación → «Permitir siempre».",
          );
        }

        if (bg.status === "granted") {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setCurrentLocation(coords);
        }
      } catch (e) {
        setHasPermission(false);
      }
    })();
    return () => {
      void stopTracking();
      if (mapLoadTimeoutRef.current) clearTimeout(mapLoadTimeoutRef.current);
    };
  }, [])

  useEffect(() => {
    if (!hasPermission || isMapReady) return;

    mapLoadTimeoutRef.current = setTimeout(() => {
      setShowMapHelp(true);
    }, MAP_LOAD_TIMEOUT_MS);

    return () => {
      if (mapLoadTimeoutRef.current) {
        clearTimeout(mapLoadTimeoutRef.current);
        mapLoadTimeoutRef.current = null;
      }
    };
  }, [hasPermission, isMapReady]);

  useEffect(() => {
    if (!isMapReady || !currentLocation) return;
    mapRef.current?.animateToRegion(
      { ...currentLocation, latitudeDelta: 0.005, longitudeDelta: 0.005 },
      700,
    );
  }, [isMapReady, currentLocation]);

  // Timer
  useEffect(() => {
    if (trackingState === "running") {
      timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [trackingState]);

  const syncTrackedPoints = useCallback(async () => {
    const points = await getTrackedCoordinates();
    setCoordinates(points);
    const last = points[points.length - 1];
    if (last) {
      setCurrentLocation({ latitude: last.latitude, longitude: last.longitude });
    }
  }, []);

  const stopTracking = useCallback(async () => {
    if (trackingSyncRef.current) {
      clearInterval(trackingSyncRef.current);
      trackingSyncRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(TRACKING_TASK_NAME);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(TRACKING_TASK_NAME);
    }
  }, []);

  async function beginLocationTracking() {
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        Alert.alert("Ubicación desactivada", "Activa la ubicación del dispositivo para iniciar el paseo.");
        return false;
      }

      const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(TRACKING_TASK_NAME);
      if (alreadyRunning) {
        await Location.stopLocationUpdatesAsync(TRACKING_TASK_NAME);
      }

      await Location.startLocationUpdatesAsync(TRACKING_TASK_NAME, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 3000,
        distanceInterval: 3,
        activityType: Location.ActivityType.Fitness,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: "Paseo en curso",
          notificationBody: "Apperritos está registrando el recorrido en segundo plano.",
          notificationColor: Colors.primary,
          notificationChannelId: "apperritos-walk-tracking",
          notificationChannelName: "Seguimiento de paseos",
          killServiceOnDestroy: false,
        },
      });

      await syncTrackedPoints();
      if (trackingSyncRef.current) clearInterval(trackingSyncRef.current);
      trackingSyncRef.current = setInterval(() => {
        syncTrackedPoints().catch(() => {
          // Ignorar errores de lectura puntuales para no interrumpir el seguimiento.
        });
      }, 2000);

      return true;
    } catch (e: any) {
      setTrackingState("idle");
      Alert.alert("No se pudo iniciar el GPS", e?.message ?? "Inténtalo de nuevo.");
      return false;
    }
  }

  async function startWalk() {
    if (!petId) { Alert.alert("Selecciona una mascota primero"); return; }
    if (!hasPermission) { Alert.alert("Permisos de ubicación necesarios"); return; }

    await storeTrackedCoordinates([]);
    setCoordinates([]);
    setElapsedSeconds(0);
    startTimeRef.current = new Date().toISOString();

    const started = await beginLocationTracking();
    if (started) {
      setTrackingState("running");
    }
  }

  function pauseWalk() {
    (async () => {
      await stopTracking();
      setTrackingState("paused");
    })().catch(() => {
      Alert.alert("Error", "No se pudo pausar el tracking.");
    });
  }

  async function resumeWalk() {
    const resumed = await beginLocationTracking();
    if (resumed) {
      setTrackingState("running");
    }
  }

  function finishWalk() {
    (async () => {
      await stopTracking();
      await syncTrackedPoints();
      endTimeRef.current = new Date().toISOString();
      setTrackingState("done");
      setShowSummary(true);
    })().catch(() => {
      Alert.alert("Error", "No se pudo finalizar el paseo.");
    });
  }

  async function handleSave() {
    try {
      const latestCoordinates = await getTrackedCoordinates();
      const distMeters = totalDistance(latestCoordinates);

      await saveWalk.mutateAsync({
        petId,
        startTime: startTimeRef.current,
        endTime: endTimeRef.current,
        durationSeconds: elapsedSeconds,
        distanceMeters: distMeters,
        coordinates: latestCoordinates,
        notes: notes.trim() || undefined,
      });
      await storeTrackedCoordinates([]);
      setShowSummary(false);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "No se pudo guardar el recorrido.");
    }
  }

  function handleDiscard() {
    Alert.alert("¿Descartar recorrido?", "Se perderá el recorrido actual.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Descartar", style: "destructive",
        onPress: () => { setShowSummary(false); navigation.goBack(); },
      },
    ]);
  }

  const distanceMeters = totalDistance(coordinates);
  const polylineCoords = coordinates.map((c) => ({ latitude: c.latitude, longitude: c.longitude }));
  const pet = pets?.find((p) => p.id === petId);

  // ── Permiso denegado ──────────────────────────────────────────────────────
  if (hasPermission === false) {
    return (
      <View style={styles.centered}>
        <Ionicons name="location-outline" size={64} color={Colors.text.disabled} />
        <Text style={styles.permissionTitle}>Permiso de ubicación requerido</Text>
        <Text style={styles.permissionSubtitle}>
          Ve a Ajustes y activa la ubicación en segundo plano para registrar el paseo con la pantalla bloqueada.
        </Text>
      </View>
    );
  }

  if (hasPermission === null) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      {/* ── Mapa ──────────────────────────────────────────────────────── */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        showsUserLocation
        followsUserLocation={false}
        initialRegion={DEFAULT_REGION}
        loadingEnabled
        onMapReady={() => {
          setIsMapReady(true);
          setShowMapHelp(false);
        }}
        onMapLoaded={() => {
          setIsMapReady(true);
          setShowMapHelp(false);
        }}
      >
        {polylineCoords.length >= 2 && (
          <Polyline
            coordinates={polylineCoords}
            strokeColor={Colors.primary}
            strokeWidth={4}
          />
        )}
        {polylineCoords.length >= 1 && (
          <Marker
            coordinate={polylineCoords[0]}
            title="Inicio"
            pinColor={Colors.secondary}
          />
        )}
      </MapView>

      {!isMapReady && (
        <View style={styles.mapLoadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.mapLoadingText}>Cargando mapa...</Text>
        </View>
      )}

      {showMapHelp && (
        <View style={styles.mapErrorBanner}>
          <Ionicons name="warning-outline" size={18} color={Colors.warning} />
          <Text style={styles.mapErrorText}>
            El mapa no responde. Verifica internet y que la API key de Google Maps esté habilitada para Android.
          </Text>
        </View>
      )}

      {/* ── Selector de mascota (solo en idle) ──────────────────────── */}
      {trackingState === "idle" && (
        <View style={styles.petSelectorPanel}>
          <Text style={styles.panelLabel}>¿Con quién vas a pasear?</Text>
          <PetSelector selectedPetId={petId || null} onSelect={setPetId} />
        </View>
      )}

      {/* ── Panel de stats (running / paused) ───────────────────────── */}
      {(trackingState === "running" || trackingState === "paused") && (
        <View style={styles.statsPanel}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatDuration(elapsedSeconds)}</Text>
            <Text style={styles.statLabel}>Tiempo</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatDistance(distanceMeters)}</Text>
            <Text style={styles.statLabel}>Distancia</Text>
          </View>
          {pet && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>🐾</Text>
                <Text style={styles.statLabel}>{pet.name}</Text>
              </View>
            </>
          )}
        </View>
      )}

      {/* ── Botones de control ──────────────────────────────────────── */}
      <View style={styles.controlPanel}>
        {trackingState === "idle" && (
          <TouchableOpacity style={styles.btnStart} onPress={startWalk} activeOpacity={0.85}>
            <Ionicons name="play" size={28} color="#fff" />
            <Text style={styles.btnStartText}>Iniciar paseo</Text>
          </TouchableOpacity>
        )}

        {trackingState === "running" && (
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.btnSecondary} onPress={pauseWalk} activeOpacity={0.85}>
              <Ionicons name="pause" size={24} color={Colors.primary} />
              <Text style={styles.btnSecondaryText}>Pausar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnStop} onPress={finishWalk} activeOpacity={0.85}>
              <Ionicons name="stop" size={24} color="#fff" />
              <Text style={styles.btnStopText}>Terminar</Text>
            </TouchableOpacity>
          </View>
        )}

        {trackingState === "paused" && (
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.btnSecondary} onPress={resumeWalk} activeOpacity={0.85}>
              <Ionicons name="play" size={24} color={Colors.primary} />
              <Text style={styles.btnSecondaryText}>Reanudar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnStop} onPress={finishWalk} activeOpacity={0.85}>
              <Ionicons name="stop" size={24} color="#fff" />
              <Text style={styles.btnStopText}>Terminar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Modal resumen ────────────────────────────────────────────── */}
      <Modal visible={showSummary} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🎉 ¡Paseo completado!</Text>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{formatDuration(elapsedSeconds)}</Text>
                <Text style={styles.summaryLabel}>Duración</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{formatDistance(distanceMeters)}</Text>
                <Text style={styles.summaryLabel}>Distancia</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{coordinates.length}</Text>
                <Text style={styles.summaryLabel}>Puntos GPS</Text>
              </View>
            </View>

            <Text style={styles.notesLabel}>Notas (opcional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="¿Cómo fue el paseo?"
              placeholderTextColor={Colors.text.disabled}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.discardBtn} onPress={handleDiscard} activeOpacity={0.8}>
                <Text style={styles.discardText}>Descartar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saveWalk.isPending && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saveWalk.isPending}
                activeOpacity={0.8}
              >
                {saveWalk.isPending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveText}>Guardar recorrido</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.75)",
    gap: Spacing.sm,
  },
  mapLoadingText: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    fontWeight: "600",
  },
  mapErrorBanner: {
    position: "absolute",
    top: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: "#FFF7EA",
    borderWidth: 1,
    borderColor: "#F5D08A",
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  mapErrorText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.text.primary,
  },
  centered: {
    flex: 1, alignItems: "center", justifyContent: "center",
    padding: Spacing.xl, backgroundColor: Colors.background,
  },
  permissionTitle: {
    fontSize: FontSize.lg, fontWeight: "700",
    color: Colors.text.primary, marginTop: Spacing.md, textAlign: "center",
  },
  permissionSubtitle: {
    fontSize: FontSize.sm, color: Colors.text.secondary,
    marginTop: Spacing.sm, textAlign: "center",
  },

  // ── Pet selector overlay ──
  petSelectorPanel: {
    position: "absolute", top: Spacing.md, left: Spacing.md, right: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
  },
  panelLabel: {
    fontSize: FontSize.md, fontWeight: "700",
    color: Colors.text.primary, marginBottom: Spacing.sm,
  },

  // ── Stats panel ──
  statsPanel: {
    position: "absolute", top: Spacing.md, left: Spacing.md, right: Spacing.md,
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: FontSize.xl, fontWeight: "700", color: Colors.text.primary },
  statLabel: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },

  // ── Control panel ──
  controlPanel: {
    position: "absolute", bottom: Spacing.xl, left: Spacing.lg, right: Spacing.lg,
  },
  btnStart: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full, paddingVertical: Spacing.md, gap: Spacing.sm,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  btnStartText: { color: "#fff", fontSize: FontSize.lg, fontWeight: "700" },
  btnRow: { flexDirection: "row", gap: Spacing.md },
  btnSecondary: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.surface,
    borderRadius: Radius.full, paddingVertical: Spacing.md, gap: Spacing.xs,
    borderWidth: 1.5, borderColor: Colors.primary,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  btnSecondaryText: { color: Colors.primary, fontSize: FontSize.md, fontWeight: "700" },
  btnStop: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.error,
    borderRadius: Radius.full, paddingVertical: Spacing.md, gap: Spacing.xs,
    shadowColor: Colors.error, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  btnStopText: { color: "#fff", fontSize: FontSize.md, fontWeight: "700" },

  // ── Modal ──
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg,
    padding: Spacing.lg, paddingBottom: Spacing.xxl,
  },
  modalTitle: {
    fontSize: FontSize.xl, fontWeight: "700",
    color: Colors.text.primary, textAlign: "center", marginBottom: Spacing.lg,
  },
  summaryGrid: { flexDirection: "row", marginBottom: Spacing.lg },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: { fontSize: FontSize.xl, fontWeight: "700", color: Colors.primary },
  summaryLabel: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 2 },
  notesLabel: {
    fontSize: FontSize.sm, fontWeight: "600",
    color: Colors.text.primary, marginBottom: Spacing.xs,
  },
  notesInput: {
    backgroundColor: Colors.background,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, height: 64,
    padding: Spacing.md, marginBottom: Spacing.lg,
    fontSize: FontSize.sm, color: Colors.text.primary,
  },
  modalBtnRow: { flexDirection: "row", gap: Spacing.md },
  discardBtn: {
    flex: 1, alignItems: "center", paddingVertical: Spacing.md,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
  },
  discardText: { color: Colors.text.secondary, fontSize: FontSize.md, fontWeight: "600" },
  saveBtn: {
    flex: 2, alignItems: "center", paddingVertical: Spacing.md,
    borderRadius: Radius.md, backgroundColor: Colors.primary,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { color: "#fff", fontSize: FontSize.md, fontWeight: "700" },
});
