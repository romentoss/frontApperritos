import React, { useMemo, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { AppointmentStackParamList, AppointmentStackNavigationProp } from "../../navigation/types";
import { useAllAppointments, useMarkAppointmentComplete, useDeleteAppointment } from "../../hooks/useAppointments";
import { usePetsList } from "../../hooks/usePets";
import { Appointment, Pet } from "../../types";
import { Colors } from "../../theme/colors";
import { Spacing, FontSize, Radius } from "../../theme/spacing";

type AppointmentsListRouteProp = RouteProp<AppointmentStackParamList, "AppointmentsList">;

const SPECIES_EMOJI: Record<Pet["species"], string> = {
  dog: "🐕", cat: "🐈", bird: "🐦", rabbit: "🐇", other: "🐾",
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })
    + " · " + d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

export default function AppointmentsListScreen() {
  const navigation = useNavigation<AppointmentStackNavigationProp>();
  const route = useRoute<AppointmentsListRouteProp>();
  const filterPetId = route.params?.petId;

  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const { data: appointments, isLoading, isError } = useAllAppointments();
  const { data: pets } = usePetsList();
  const completeMutation = useMarkAppointmentComplete();
  const deleteMutation = useDeleteAppointment();

  const petMap = useMemo(
    () => new Map(pets?.map((p) => [p.id, p]) ?? []),
    [pets]
  );

  const now = new Date();
  const filtered = useMemo(() => {
    if (!appointments) return [];
    let list = filterPetId ? appointments.filter((a) => a.petId === filterPetId) : appointments;
    if (activeTab === "upcoming") {
      return list
        .filter((a) => !a.completed && new Date(a.dateTime) >= now)
        .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
    }
    return list
      .filter((a) => a.completed || new Date(a.dateTime) < now)
      .sort((a, b) => b.dateTime.localeCompare(a.dateTime));
  }, [appointments, activeTab, filterPetId]);

  function handleDelete(appt: Appointment) {
    Alert.alert("Eliminar cita", `¿Eliminar "${appt.title}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar", style: "destructive",
        onPress: () => deleteMutation.mutate({ petId: appt.petId, appointmentId: appt.id }),
      },
    ]);
  }

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      {/* ── Tabs Próximas / Pasadas ── */}
      <View style={styles.tabRow}>
        {(["upcoming", "past"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === "upcoming" ? "Próximas" : "Pasadas"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.listArea}>
        {filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>{activeTab === "upcoming" ? "📅" : "✅"}</Text>
            <Text style={styles.emptyTitle}>
              {activeTab === "upcoming" ? "No hay citas próximas" : "No hay citas pasadas"}
            </Text>
            {activeTab === "upcoming" && (
              <Text style={styles.emptySubtitle}>Toca + para agendar una cita</Text>
            )}
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(a) => a.id}
            contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const pet = petMap.get(item.petId);
          const isPast = item.completed || new Date(item.dateTime) < now;
          return (
            <TouchableOpacity
              style={[styles.card, isPast && styles.cardPast]}
              onPress={() => navigation.navigate("AppointmentForm", { appointmentId: item.id, petId: item.petId })}
              activeOpacity={0.8}
            >
              {/* Icono tipo */}
              <View style={[styles.typeIcon, { backgroundColor: item.type === "vet" ? "#E8F4E8" : "#FFF0E8" }]}>
                <Text style={styles.typeEmoji}>{item.type === "vet" ? "🩺" : "✂️"}</Text>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.apptTitle}>{item.title}</Text>
                {pet && (
                  <Text style={styles.petBadge}>{SPECIES_EMOJI[pet.species]} {pet.name}</Text>
                )}
                <Text style={styles.dateTime}>{formatDateTime(item.dateTime)}</Text>
                {item.location && (
                  <Text style={styles.location}>📍 {item.location}</Text>
                )}
                {item.completed && (
                  <Text style={styles.completedBadge}>✅ Completada</Text>
                )}
              </View>

              <View style={styles.cardActions}>
                {/* Marcar como completada */}
                {!item.completed && (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => completeMutation.mutate({ petId: item.petId, appointmentId: item.id })}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="checkmark-circle-outline" size={22} color={Colors.secondary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleDelete(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.error} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
          />
        )}
      </View>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("AppointmentForm", { petId: filterPetId })}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  listArea: { flex: 1 },
  listContent: { padding: Spacing.md, paddingBottom: 100 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabRow: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: { fontSize: FontSize.md, color: Colors.text.secondary, fontWeight: "500" },
  tabTextActive: { color: Colors.primary, fontWeight: "700" },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: "700", color: Colors.text.primary },
  emptySubtitle: { fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: Spacing.xs },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  cardPast: { opacity: 0.7 },
  typeIcon: {
    width: 44, height: 44,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  typeEmoji: { fontSize: 22 },
  cardBody: { flex: 1 },
  apptTitle: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text.primary },
  petBadge: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: "600", marginTop: 2 },
  dateTime: { fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 3 },
  location: { fontSize: FontSize.xs, color: Colors.text.disabled, marginTop: 2 },
  completedBadge: { fontSize: FontSize.xs, color: Colors.secondary, fontWeight: "600", marginTop: 3 },
  cardActions: { flexDirection: "column", gap: Spacing.xs, marginLeft: Spacing.xs },
  actionBtn: { padding: 2 },
  fab: {
    position: "absolute",
    bottom: Spacing.xl, right: Spacing.lg,
    width: 56, height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
});
