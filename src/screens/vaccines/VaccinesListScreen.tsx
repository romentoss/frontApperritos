import React, { useMemo } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { VaccineStackParamList, VaccineStackNavigationProp } from "../../navigation/types";
import { useAllVaccines, useDeleteVaccine } from "../../hooks/useVaccines";
import { usePetsList } from "../../hooks/usePets";
import { Vaccine, Pet } from "../../types";
import { Colors } from "../../theme/colors";
import { Spacing, FontSize, Radius } from "../../theme/spacing";

type VaccinesListRouteProp = RouteProp<VaccineStackParamList, "VaccinesList">;

const SPECIES_EMOJI: Record<Pet["species"], string> = {
  dog: "🐕", cat: "🐈", bird: "🐦", rabbit: "🐇", other: "🐾",
};

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getDoseStatus(nextDoseDate?: string): "overdue" | "soon" | "ok" | "none" {
  if (!nextDoseDate) return "none";
  const next = new Date(nextDoseDate);
  const now = new Date();
  if (next < now) return "overdue";
  const in30 = new Date(); in30.setDate(now.getDate() + 30);
  if (next < in30) return "soon";
  return "ok";
}

export default function VaccinesListScreen() {
  const navigation = useNavigation<VaccineStackNavigationProp>();
  const route = useRoute<VaccinesListRouteProp>();
  const filterPetId = route.params?.petId;

  const { data: vaccines, isLoading, isError } = useAllVaccines();
  const { data: pets } = usePetsList();
  const deleteMutation = useDeleteVaccine();

  const petMap = useMemo(
    () => new Map(pets?.map((p) => [p.id, p]) ?? []),
    [pets]
  );

  const displayList = useMemo(() => {
    if (!vaccines) return [];
    return filterPetId ? vaccines.filter((v) => v.petId === filterPetId) : vaccines;
  }, [vaccines, filterPetId]);

  function handleDelete(vaccine: Vaccine) {
    Alert.alert("Eliminar vacuna", `¿Eliminar "${vaccine.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar", style: "destructive",
        onPress: () => deleteMutation.mutate({ petId: vaccine.petId, vaccineId: vaccine.id }),
      },
    ]);
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>No se pudieron cargar las vacunas.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {displayList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>💉</Text>
          <Text style={styles.emptyTitle}>Sin vacunas registradas</Text>
          <Text style={styles.emptySubtitle}>Toca + para registrar la primera vacuna</Text>
        </View>
      ) : (
        <FlatList
          data={displayList}
          keyExtractor={(v) => v.id}
          contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const pet = petMap.get(item.petId);
          const status = getDoseStatus(item.nextDoseDate);
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("VaccineForm", { vaccineId: item.id, petId: item.petId })}
              activeOpacity={0.8}
            >
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>💉</Text>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.vaccineName}>{item.name}</Text>

                {pet && (
                  <Text style={styles.petBadge}>
                    {SPECIES_EMOJI[pet.species]} {pet.name}
                  </Text>
                )}

                <Text style={styles.dateText}>
                  Aplicada: {formatDate(item.appliedDate)}
                </Text>

                {item.nextDoseDate && (
                  <Text style={[
                    styles.nextDose,
                    status === "overdue" && styles.overdue,
                    status === "soon" && styles.soon,
                  ]}>
                    {status === "overdue" ? "⚠️ Vencida: " : status === "soon" ? "🔔 Próxima: " : "📅 Próxima: "}
                    {formatDate(item.nextDoseDate)}
                  </Text>
                )}

                {item.veterinarian && (
                  <Text style={styles.vet}>👨‍⚕️ {item.veterinarian}</Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.deleteBtn}
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

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("VaccineForm", { petId: filterPetId })}
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
  errorText: { fontSize: FontSize.md, color: Colors.text.secondary },
  listContent: { padding: Spacing.md, paddingBottom: 100 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
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
  cardIcon: {
    width: 44, height: 44,
    backgroundColor: "#E8F4E8",
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  cardIconText: { fontSize: 22 },
  cardBody: { flex: 1 },
  vaccineName: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text.primary },
  petBadge: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: "600",
    marginTop: 2,
  },
  dateText: { fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 4 },
  nextDose: { fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 2 },
  overdue: { color: Colors.error, fontWeight: "600" },
  soon: { color: Colors.warning, fontWeight: "600" },
  vet: { fontSize: FontSize.xs, color: Colors.text.disabled, marginTop: 2 },
  deleteBtn: { padding: Spacing.xs },
  fab: {
    position: "absolute",
    bottom: Spacing.xl,
    right: Spacing.lg,
    width: 56, height: 56,
    borderRadius: 28,
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
