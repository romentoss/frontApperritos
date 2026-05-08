import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";

import { FoodStackParamList, FoodStackNavigationProp } from "../../navigation/types";
import { useCreatePeriodic, useUpdatePeriodic, useAllPeriodicPurchases } from "../../hooks/useFood";
import PetSelector from "../../components/PetSelector";
import { isoToDisplay, displayToIso, todayDisplay } from "../../utils/dates";
import { Colors } from "../../theme/colors";
import { Spacing, FontSize, Radius } from "../../theme/spacing";

type PeriodicFormRouteProp = RouteProp<FoodStackParamList, "PeriodicForm">;

const UNITS = ["kg", "lb", "bag", "can"] as const;
type UnitType = typeof UNITS[number];
const UNIT_LABEL: Record<UnitType, string> = { kg: "kg", lb: "lb", bag: "Bolsas", can: "Latas" };

const FREQ_UNITS = [
  { value: "days", label: "Días" },
  { value: "weeks", label: "Semanas" },
  { value: "months", label: "Meses" },
] as const;
type FreqUnit = typeof FREQ_UNITS[number]["value"];

export default function PeriodicFormScreen() {
  const navigation = useNavigation<FoodStackNavigationProp>();
  const route = useRoute<PeriodicFormRouteProp>();
  const { periodicId, petId: initialPetId } = route.params ?? {};
  const isEditing = !!periodicId;

  const { data: allPeriodics } = useAllPeriodicPurchases();
  const existing = allPeriodics?.find((p) => p.id === periodicId);

  const createMutation = useCreatePeriodic();
  const updateMutation = useUpdatePeriodic();

  const [petId, setPetId] = useState(initialPetId ?? "");
  const [brand, setBrand] = useState("");
  const [product, setProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<UnitType>("kg");
  const [freqValue, setFreqValue] = useState("30");
  const [freqUnit, setFreqUnit] = useState<FreqUnit>("days");
  const [lastDate, setLastDate] = useState(todayDisplay());
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (existing) {
      setPetId(existing.petId);
      setBrand(existing.brand);
      setProduct(existing.product);
      setQuantity(String(existing.quantity));
      setUnit(existing.unit as UnitType);
      setFreqValue(String(existing.frequencyValue));
      setFreqUnit(existing.frequencyUnit as FreqUnit);
      if (existing.lastPurchaseDate) setLastDate(isoToDisplay(existing.lastPurchaseDate));
      setNotes(existing.notes ?? "");
    }
  }, [existing]);

  function validate(): string {
    if (!petId) return "Selecciona una mascota.";
    if (!brand.trim()) return "La marca es obligatoria.";
    if (!product.trim()) return "El producto es obligatorio.";
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) return "Cantidad inválida.";
    if (!freqValue || isNaN(Number(freqValue)) || Number(freqValue) <= 0) return "Frecuencia inválida.";
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
      frequencyValue: Number(freqValue),
      frequencyUnit: freqUnit,
      lastPurchaseDate: lastDate ? displayToIso(lastDate) : undefined,
      isActive: true,
      notes: notes.trim() || undefined,
    };

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ petId, periodicId: periodicId!, input });
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
        placeholder="Ej: Royal Canin, Purina..."
        placeholderTextColor={Colors.text.disabled}
        value={brand}
        onChangeText={setBrand}
        autoCapitalize="words"
      />

      <Text style={styles.label}>Producto *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: Adultos razas medianas..."
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
            placeholder="Ej: 2"
            placeholderTextColor={Colors.text.disabled}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Unidad *</Text>
          <View style={styles.chipRow}>
            {UNITS.map((u) => (
              <TouchableOpacity
                key={u}
                style={[styles.chip, unit === u && styles.chipSelected]}
                onPress={() => setUnit(u)}
              >
                <Text style={[styles.chipText, unit === u && styles.chipTextSelected]}>
                  {UNIT_LABEL[u]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <Text style={styles.label}>Frecuencia de compra *</Text>
      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: Spacing.sm }}>
          <TextInput
            style={styles.input}
            placeholder="30"
            placeholderTextColor={Colors.text.disabled}
            value={freqValue}
            onChangeText={setFreqValue}
            keyboardType="number-pad"
          />
        </View>
        <View style={{ flex: 2 }}>
          <View style={styles.chipRow}>
            {FREQ_UNITS.map((fu) => (
              <TouchableOpacity
                key={fu.value}
                style={[styles.chip, freqUnit === fu.value && styles.chipSelected]}
                onPress={() => setFreqUnit(fu.value)}
              >
                <Text style={[styles.chipText, freqUnit === fu.value && styles.chipTextSelected]}>
                  {fu.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <Text style={styles.label}>Última compra</Text>
      <TextInput
        style={styles.input}
        placeholder="DD/MM/AAAA"
        placeholderTextColor={Colors.text.disabled}
        value={lastDate}
        onChangeText={setLastDate}
        keyboardType="numbers-and-punctuation"
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
          <Text style={styles.saveButtonText}>
            {isEditing ? "Guardar cambios" : "Configurar compra periódica"}
          </Text>
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
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 2 },
  chip: {
    paddingHorizontal: 8, paddingVertical: 6,
    borderRadius: Radius.sm, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: Colors.surface,
    marginRight: 4, marginBottom: 4,
  },
  chipSelected: { borderColor: Colors.secondary, backgroundColor: "#F0FAF4" },
  chipText: { fontSize: FontSize.xs, color: Colors.text.secondary },
  chipTextSelected: { color: Colors.secondary, fontWeight: "700" },
  saveButton: {
    backgroundColor: Colors.secondary,
    borderRadius: Radius.md, paddingVertical: Spacing.md,
    alignItems: "center", marginTop: Spacing.xl,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: "#fff", fontSize: FontSize.lg, fontWeight: "600" },
});
