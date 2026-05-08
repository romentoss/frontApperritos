import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";

import { VaccineStackParamList, VaccineStackNavigationProp } from "../../navigation/types";
import { useCreateVaccine, useUpdateVaccine, useAllVaccines } from "../../hooks/useVaccines";
import PetSelector from "../../components/PetSelector";
import { isoToDisplay, displayToIso } from "../../utils/dates";
import { Colors } from "../../theme/colors";
import { Spacing, FontSize, Radius } from "../../theme/spacing";

type VaccineFormRouteProp = RouteProp<VaccineStackParamList, "VaccineForm">;

export default function VaccineFormScreen() {
  const navigation = useNavigation<VaccineStackNavigationProp>();
  const route = useRoute<VaccineFormRouteProp>();
  const { vaccineId, petId: initialPetId } = route.params ?? {};
  const isEditing = !!vaccineId;

  // Cargar datos si editamos
  const { data: allVaccines } = useAllVaccines();
  const existing = allVaccines?.find((v) => v.id === vaccineId);

  const createMutation = useCreateVaccine();
  const updateMutation = useUpdateVaccine();

  // Formulario
  const [petId, setPetId] = useState(initialPetId ?? "");
  const [name, setName] = useState("");
  const [appliedDate, setAppliedDate] = useState("");
  const [nextDoseDate, setNextDoseDate] = useState("");
  const [veterinarian, setVeterinarian] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (existing) {
      setPetId(existing.petId);
      setName(existing.name);
      setAppliedDate(isoToDisplay(existing.appliedDate));
      setNextDoseDate(isoToDisplay(existing.nextDoseDate ?? ""));
      setVeterinarian(existing.veterinarian ?? "");
      setNotes(existing.notes ?? "");
    }
  }, [existing]);

  function validate(): string {
    if (!petId) return "Selecciona una mascota.";
    if (!name.trim()) return "El nombre de la vacuna es obligatorio.";
    if (!appliedDate.trim()) return "La fecha de aplicación es obligatoria.";
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(appliedDate)) return "Fecha aplicación: formato DD/MM/AAAA.";
    if (nextDoseDate && !/^\d{2}\/\d{2}\/\d{4}$/.test(nextDoseDate)) return "Próxima dosis: formato DD/MM/AAAA.";
    return "";
  }

  async function handleSubmit() {
    const error = validate();
    if (error) { Alert.alert("Datos incorrectos", error); return; }

    const input = {
      petId,
      name: name.trim(),
      appliedDate: displayToIso(appliedDate),
      nextDoseDate: nextDoseDate ? displayToIso(nextDoseDate) : undefined,
      veterinarian: veterinarian.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ petId, vaccineId: vaccineId!, input });
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

      <Text style={styles.label}>Nombre de la vacuna *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: Rabia, Parvovirus, Antirrábica..."
        placeholderTextColor={Colors.text.disabled}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />

      <Text style={styles.label}>Fecha de aplicación *</Text>
      <TextInput
        style={styles.input}
        placeholder="DD/MM/AAAA"
        placeholderTextColor={Colors.text.disabled}
        value={appliedDate}
        onChangeText={setAppliedDate}
        keyboardType="numbers-and-punctuation"
      />

      <Text style={styles.label}>Próxima dosis</Text>
      <TextInput
        style={styles.input}
        placeholder="DD/MM/AAAA (opcional)"
        placeholderTextColor={Colors.text.disabled}
        value={nextDoseDate}
        onChangeText={setNextDoseDate}
        keyboardType="numbers-and-punctuation"
      />

      <Text style={styles.label}>Veterinario</Text>
      <TextInput
        style={styles.input}
        placeholder="Nombre del veterinario (opcional)"
        placeholderTextColor={Colors.text.disabled}
        value={veterinarian}
        onChangeText={setVeterinarian}
        autoCapitalize="words"
      />

      <Text style={styles.label}>Notas</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Observaciones, lote, etc."
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
            {isEditing ? "Guardar cambios" : "Registrar vacuna"}
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
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    fontSize: FontSize.md, color: Colors.text.primary,
  },
  textArea: { height: 80, paddingTop: Spacing.md },
  saveButton: {
    backgroundColor: Colors.secondary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.xl,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: "#fff", fontSize: FontSize.lg, fontWeight: "600" },
});
