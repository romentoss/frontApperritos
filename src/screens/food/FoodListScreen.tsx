import React, { useMemo } from "react";
import {
  View, Text, SectionList, SectionListData, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { FoodStackParamList, FoodStackNavigationProp } from "../../navigation/types";
import {
  useAllFoodRecords, useAllPeriodicPurchases,
  useDeleteFoodRecord, useDeletePeriodic,
} from "../../hooks/useFood";
import { usePetsList } from "../../hooks/usePets";
import { FoodRecord, PeriodicPurchase, Pet } from "../../types";
import { Colors } from "../../theme/colors";
import { Spacing, FontSize, Radius } from "../../theme/spacing";

type FoodListRouteProp = RouteProp<FoodStackParamList, "FoodList">;

type ListItem = FoodRecord | PeriodicPurchase;
interface FoodSection extends SectionListData<ListItem> {
  title: string;
  data: ListItem[];
  type: "periodic" | "record";
}

const SPECIES_EMOJI: Record<Pet["species"], string> = {
  dog: "🐕", cat: "🐈", bird: "🐦", rabbit: "🐇", other: "🐾",
};

const UNIT_LABEL: Record<string, string> = {
  kg: "kg", lb: "lb", bag: "bolsa(s)", can: "lata(s)",
};

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getNextPurchaseStatus(nextDate?: string): "overdue" | "soon" | "ok" {
  if (!nextDate) return "ok";
  const next = new Date(nextDate);
  const now = new Date();
  if (next < now) return "overdue";
  const in7 = new Date(); in7.setDate(now.getDate() + 7);
  return next < in7 ? "soon" : "ok";
}

export default function FoodListScreen() {
  const navigation = useNavigation<FoodStackNavigationProp>();
  const route = useRoute<FoodListRouteProp>();
  const filterPetId = route.params?.petId;

  const { data: records, isLoading: loadingRecords } = useAllFoodRecords();
  const { data: periodics, isLoading: loadingPeriodics } = useAllPeriodicPurchases();
  const { data: pets } = usePetsList();

  const deleteRecordMutation = useDeleteFoodRecord();
  const deletePeriodicMutation = useDeletePeriodic();

  const petMap = useMemo(
    () => new Map(pets?.map((p) => [p.id, p]) ?? []),
    [pets]
  );

  const displayRecords = useMemo(() => {
    if (!records) return [];
    const list = filterPetId ? records.filter((r) => r.petId === filterPetId) : records;
    return list.sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
  }, [records, filterPetId]);

  const displayPeriodics = useMemo(() => {
    if (!periodics) return [];
    const list = filterPetId ? periodics.filter((p) => p.petId === filterPetId) : periodics;
    return list.filter((p) => p.isActive);
  }, [periodics, filterPetId]);

  const sections: FoodSection[] = useMemo(() => {
    const result: FoodSection[] = [];
    if (displayPeriodics.length > 0) {
      result.push({ title: "Compras periódicas", data: displayPeriodics as ListItem[], type: "periodic" });
    }
    if (displayRecords.length > 0) {
      result.push({ title: "Historial de compras", data: displayRecords as ListItem[], type: "record" });
    }
    return result;
  }, [displayPeriodics, displayRecords]);

  function handleDeleteRecord(record: FoodRecord) {
    Alert.alert("Eliminar registro", `¿Eliminar compra de ${record.brand} ${record.product}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar", style: "destructive",
        onPress: () => deleteRecordMutation.mutate({ petId: record.petId, recordId: record.id }),
      },
    ]);
  }

  function handleDeletePeriodic(item: PeriodicPurchase) {
    Alert.alert("Eliminar periódica", `¿Eliminar configuración de ${item.brand} ${item.product}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar", style: "destructive",
        onPress: () => deletePeriodicMutation.mutate({ petId: item.petId, periodicId: item.id }),
      },
    ]);
  }

  const isLoading = loadingRecords || loadingPeriodics;

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      {sections.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🍖</Text>
          <Text style={styles.emptyTitle}>Sin registros de comida</Text>
          <Text style={styles.emptySubtitle}>Toca + para registrar una compra</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item, section }) => {
            if (section.type === "periodic") {
              const p = item as PeriodicPurchase;
              const pet = petMap.get(p.petId);
              const status = getNextPurchaseStatus(p.nextPurchaseDate);
              return (
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => navigation.navigate("PeriodicForm", { periodicId: p.id, petId: p.petId })}
                  activeOpacity={0.8}
                >
                  <View style={[styles.iconBox, { backgroundColor: "#FFF3E0" }]}>
                    <Text style={styles.iconEmoji}>🔄</Text>
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.productName}>{p.brand} {p.product}</Text>
                    {pet && <Text style={styles.petBadge}>{SPECIES_EMOJI[pet.species]} {pet.name}</Text>}
                    <Text style={styles.metaText}>
                      {p.frequencyValue} {p.frequencyUnit === "days" ? "días" : p.frequencyUnit === "weeks" ? "semanas" : "meses"} · {p.quantity} {UNIT_LABEL[p.unit] ?? p.unit}
                    </Text>
                    {p.nextPurchaseDate && (
                      <Text style={[
                        styles.nextDate,
                        status === "overdue" && styles.overdue,
                        status === "soon" && styles.soon,
                      ]}>
                        {status === "overdue" ? "⚠️ Vence: " : status === "soon" ? "🔔 Próxima: " : "📅 Próxima: "}
                        {formatDate(p.nextPurchaseDate)}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeletePeriodic(p)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={18} color={Colors.error} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            }
            const r = item as FoodRecord;
            const pet = petMap.get(r.petId);
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate("FoodRecordDetail", { recordId: r.id })}
                activeOpacity={0.8}
              >
                <View style={[styles.iconBox, { backgroundColor: "#E8F4E8" }]}>
                  <Text style={styles.iconEmoji}>🛒</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.productName}>{r.brand} {r.product}</Text>
                  {pet && <Text style={styles.petBadge}>{SPECIES_EMOJI[pet.species]} {pet.name}</Text>}
                  <Text style={styles.metaText}>
                    {r.quantity} {UNIT_LABEL[r.unit] ?? r.unit}
                    {r.price ? ` · $${r.price.toFixed(2)}` : ""}
                  </Text>
                  <Text style={styles.dateText}>{formatDate(r.purchaseDate)}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteRecord(r)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.error} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* FAB group */}
      <View style={styles.fabGroup}>
        <TouchableOpacity
          style={[styles.fab, styles.fabSecondary]}
          onPress={() => navigation.navigate("PeriodicForm", { petId: filterPetId })}
          activeOpacity={0.85}
        >
          <Text style={styles.fabSecondaryText}>🔄</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("FoodRecordForm", { petId: filterPetId })}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: Spacing.md, paddingBottom: 120 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: "700", color: Colors.text.primary },
  emptySubtitle: { fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: Spacing.xs },
  sectionHeader: {
    backgroundColor: Colors.background,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.text.secondary, textTransform: "uppercase", letterSpacing: 0.5 },
  card: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: Radius.md,
    alignItems: "center", justifyContent: "center",
    marginRight: Spacing.md,
  },
  iconEmoji: { fontSize: 22 },
  cardBody: { flex: 1 },
  productName: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text.primary },
  petBadge: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: "600", marginTop: 2 },
  metaText: { fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 3 },
  dateText: { fontSize: FontSize.xs, color: Colors.text.disabled, marginTop: 2 },
  nextDate: { fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 2 },
  overdue: { color: Colors.error, fontWeight: "600" },
  soon: { color: Colors.warning, fontWeight: "600" },
  fabGroup: {
    position: "absolute", bottom: Spacing.xl, right: Spacing.lg,
    flexDirection: "column", gap: Spacing.sm, alignItems: "center",
  },
  fab: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  fabSecondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5, borderColor: Colors.border,
    shadowColor: "#000", shadowOpacity: 0.1,
  },
  fabSecondaryText: { fontSize: 22 },
});
