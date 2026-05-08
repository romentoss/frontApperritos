import React from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { FoodStackParamList, FoodStackNavigationProp } from "../../navigation/types";
import { useAllFoodRecords, useDeleteFoodRecord } from "../../hooks/useFood";
import { usePetsList } from "../../hooks/usePets";
import { Pet } from "../../types";
import { Colors } from "../../theme/colors";
import { Spacing, FontSize, Radius } from "../../theme/spacing";

type FoodRecordDetailRouteProp = RouteProp<FoodStackParamList, "FoodRecordDetail">;

const UNIT_LABEL: Record<string, string> = {
  kg: "kg", lb: "lb", bag: "bolsa(s)", can: "lata(s)",
};

const SPECIES_EMOJI: Record<Pet["species"], string> = {
  dog: "🐕", cat: "🐈", bird: "🐦", rabbit: "🐇", other: "🐾",
};

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

export default function FoodRecordDetailScreen() {
  const navigation = useNavigation<FoodStackNavigationProp>();
  const route = useRoute<FoodRecordDetailRouteProp>();
  const { recordId } = route.params;

  const { data: records, isLoading } = useAllFoodRecords();
  const { data: pets } = usePetsList();
  const deleteMutation = useDeleteFoodRecord();

  const record = records?.find((r) => r.id === recordId);
  const pet = pets?.find((p) => p.id === record?.petId);

  function handleDelete() {
    if (!record) return;
    Alert.alert(
      "Eliminar registro",
      `¿Eliminar la compra de ${record.brand} ${record.product}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar", style: "destructive",
          onPress: async () => {
            await deleteMutation.mutateAsync({ petId: record.petId, recordId: record.id });
            navigation.goBack();
          },
        },
      ]
    );
  }

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  if (!record) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFound}>Registro no encontrado</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header card */}
      <View style={styles.headerCard}>
        <View style={styles.iconBox}>
          <Text style={styles.iconEmoji}>🛒</Text>
        </View>
        <Text style={styles.productName}>{record.brand} {record.product}</Text>
        {pet && (
          <Text style={styles.petBadge}>
            {SPECIES_EMOJI[pet.species]} {pet.name}
          </Text>
        )}
      </View>

      {/* Details */}
      <View style={styles.section}>
        <DetailRow icon="cube-outline" label="Cantidad" value={`${record.quantity} ${UNIT_LABEL[record.unit] ?? record.unit}`} />
        <DetailRow icon="calendar-outline" label="Fecha de compra" value={formatDate(record.purchaseDate)} />
        {record.price !== undefined && (
          <DetailRow icon="cash-outline" label="Precio" value={`$${record.price.toFixed(2)}`} />
        )}
        {record.notes && (
          <DetailRow icon="document-text-outline" label="Notas" value={record.notes} />
        )}
        <DetailRow icon="time-outline" label="Registrado el" value={formatDate(record.createdAt)} />
      </View>

      {/* Actions */}
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => navigation.navigate("FoodRecordForm", { recordId: record.id, petId: record.petId })}
        activeOpacity={0.8}
      >
        <Ionicons name="pencil-outline" size={18} color="#fff" />
        <Text style={styles.editButtonText}>Editar registro</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={handleDelete}
        activeOpacity={0.8}
      >
        <Ionicons name="trash-outline" size={18} color={Colors.error} />
        <Text style={styles.deleteButtonText}>Eliminar registro</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function DetailRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  notFound: { fontSize: FontSize.md, color: Colors.text.secondary },

  headerCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: "center",
    marginBottom: Spacing.lg,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8,
    elevation: 2,
  },
  iconBox: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "#E8F4E8",
    justifyContent: "center", alignItems: "center",
    marginBottom: Spacing.sm,
  },
  iconEmoji: { fontSize: 32 },
  productName: {
    fontSize: FontSize.xl, fontWeight: "700",
    color: Colors.text.primary, textAlign: "center",
    marginBottom: 4,
  },
  petBadge: {
    fontSize: FontSize.sm, color: Colors.text.secondary,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
    borderRadius: Radius.sm, marginTop: 4,
  },

  section: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6,
    elevation: 1,
  },
  row: {
    flexDirection: "row", alignItems: "flex-start",
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  rowIcon: {
    width: 32, marginTop: 2, alignItems: "center",
  },
  rowBody: { flex: 1, marginLeft: Spacing.sm },
  rowLabel: {
    fontSize: FontSize.xs, color: Colors.text.secondary,
    fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5,
    marginBottom: 2,
  },
  rowValue: { fontSize: FontSize.md, color: Colors.text.primary },

  editButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.md, paddingVertical: Spacing.md,
    gap: Spacing.xs, marginBottom: Spacing.sm,
  },
  editButtonText: { color: "#fff", fontSize: FontSize.md, fontWeight: "600" },

  deleteButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.error,
    borderRadius: Radius.md, paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  deleteButtonText: { color: Colors.error, fontSize: FontSize.md, fontWeight: "600" },
});
