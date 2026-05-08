import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";

import { FoodStackParamList, FoodStackNavigationProp } from "../../navigation/types";
import { useCreateFoodRecord, useUpdateFoodRecord, useAllFoodRecords } from "../../hooks/useFood";
import PetSelector from "../../components/PetSelector";
import { isoToDisplay, displayToIso, todayDisplay } from "../../utils/dates";
import { Colors } from "../../theme/colors";
import { Spacing, FontSize, Radius } from "../../theme/spacing";

type FoodRecordFormRouteProp = RouteProp<FoodStackParamList, "FoodRecordForm">;

const UNITS = ["kg", "lb", "bag", "can"] as const;
const UNIT_LABEL: Record<typeof UNITS[number], string> = {
  kg: "kg", lb: "lb", bag: "Bolsas", can: "Latas",
};

export default function FoodRecordFormScreen() {
  const navigation = useNavigation<FoodStackNavigationProp>();
  const route = useRoute<FoodRecordFormRouteProp>();
  const { petId: initialPetId, recordId } = route.params ?? {};
  const isEditing = !!recordId;

  const { data: allRecords } = useAllFoodRecords();
  const existing = allRecords?.find((r) => r.id === recordId);

  const createMutation = useCreateFoodRecord();
  const updateMutation = useUpdateFoodRecord();

  const [petId, setPetId] = useState(initialPetId ?? "");
  const [brand, setBrand] = useState("");
  const [product, setProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<typeof UNITS[number]>("kg");
  const [purchaseDate, setPurchaseDate] = useState(todayDisplay());
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (existing) {
      setPetId(existing.petId);
      setBrand(existing.brand);
      setProduct(existing.product);
      setQuantity(String(existing.quantity));
      setUnit(existing.unit);
      setPurchaseDate(
        existing.purchaseDate ? existing.purchaseDate.includes("/")
          ? existing.purchaseDate
          : existing.purchaseDate.split("-").reverse().join("/")
        : todayDisplay()
      );
      setPrice(existing.price !== undefined ? String(existing.price) : "");
      setNotes(existing.notes ?? "");
    }
  }, [existing]);

  function validate(): string {
    if (!petId) return "Selecciona una mascota.";
    if (!brand.trim()) return "La marca es obligatoria.";
    if (!product.trim()) return "El producto es obligatorio.";
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) return "Ingresa una cantidad válida.";
    if (!purchaseDate) return "La fecha de compra es obligatoria.";
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(purchaseDate)) return "Fecha: formato DD/MM/AAAA.";
    if (price && (isNaN(Number(price)) || Number(price) < 0)) return "Precio inválido.";
    return "";
  }

  async function handleSubmit() {
    const error = validate();
    if (error) { Alert.alert("Datos incorrectos", error); return; }

    const input = {
      petId,
      brand: brand.trim(),
      product: product.trim(),
      quantity: Number(quantity),
      unit,
      purchaseDate: displayToIso(purchaseDate),
      price: price ? Number(price) : undefined,
      notes: notes.trim() || undefined,
    };

    try {
      if (isEditing && existing) {
        await updateMutation.mutateAsync({ petId: existing.petId, recordId: existing.id, input });
      } else {
        await createMutation.mutateAsync(input);
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "No se pudo guardar.");
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.label}>Mascota *</Text>
      <PetSelector selectedPetId={petId || null} onSelect={setPetId} />

      <Text style={styles.label}>Marca *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: Royal Canin, Purina, Pedigree..."
        placeholderTextColor={Colors.text.disabled}
        value={brand}
        onChangeText={setBrand}
        autoCapitalize="words"
      />

      <Text style={styles.label}>Producto *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: Adultos razas medianas, Kitten..."
        placeholderTextColor={Colors.text.disabled}
        value={product}
        onChangeText={setProduct}
        autoCapitalize="sentences"
      />

      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: Spacing.sm }}>
          <Text style={styles.label}>Cantidad *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 2, 0.5"
            placeholderTextColor={Colors.text.disabled}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Unidad *</Text>
          <View style={styles.unitRow}>
            {UNITS.map((u) => (
              <TouchableOpacity
                key={u}
                style={[styles.unitChip, unit === u && styles.unitChipSelected]}
                onPress={() => setUnit(u)}
              >
                <Text style={[styles.unitText, unit === u && styles.unitTextSelected]}>
                  {UNIT_LABEL[u]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <Text style={styles.label}>Fecha de compra *</Text>
      <TextInput
        style={styles.input}
        placeholder="DD/MM/AAAA"
        placeholderTextColor={Colors.text.disabled}
        value={purchaseDate}
        onChangeText={setPurchaseDate}
        keyboardType="numbers-and-punctuation"
      />

      <Text style={styles.label}>Precio</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: 24.99 (opcional)"
        placeholderTextColor={Colors.text.disabled}
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>Notas</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Observaciones (opcional)"
        placeholderTextColor={Colors.text.disabled}
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
        activeOpacity={0.8}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>{isEditing ? "Guardar cambios" : "Registrar compra"}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  label: {
    fontSize: FontSize.sm, fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: Spacing.xs, marginTop: Spacing.md,
  },
  row: { flexDirection: "row" },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    fontSize: FontSize.md, color: Colors.text.primary,
  },
  textArea: { height: 80, paddingTop: Spacing.md },
  unitRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  unitChip: {
    paddingHorizontal: 8, paddingVertical: 6,
    borderRadius: Radius.sm, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  unitChipSelected: { borderColor: Colors.primary, backgroundColor: "#FFF3EE" },
  unitText: { fontSize: FontSize.xs, color: Colors.text.secondary },
  unitTextSelected: { color: Colors.primary, fontWeight: "700" },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md, paddingVertical: Spacing.md,
    alignItems: "center", marginTop: Spacing.xl,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: "#fff", fontSize: FontSize.lg, fontWeight: "600" },
});
