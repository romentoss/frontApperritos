import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";

import { AppointmentStackParamList, AppointmentStackNavigationProp } from "../../navigation/types";
import { useCreateAppointment, useUpdateAppointment, useAllAppointments } from "../../hooks/useAppointments";
import PetSelector from "../../components/PetSelector";
import { isoToDisplay, displayToIso, todayDisplay } from "../../utils/dates";
import { Colors } from "../../theme/colors";
import { Spacing, FontSize, Radius } from "../../theme/spacing";

type AppointmentFormRouteProp = RouteProp<AppointmentStackParamList, "AppointmentForm">;

export default function AppointmentFormScreen() {
  const navigation = useNavigation<AppointmentStackNavigationProp>();
  const route = useRoute<AppointmentFormRouteProp>();
  const { appointmentId, petId: initialPetId } = route.params ?? {};
  const isEditing = !!appointmentId;

  const { data: allAppointments } = useAllAppointments();
  const existing = allAppointments?.find((a) => a.id === appointmentId);

  const createMutation = useCreateAppointment();
  const updateMutation = useUpdateAppointment();

  const [petId, setPetId] = useState(initialPetId ?? "");
  const [type, setType] = useState<"vet" | "grooming">("vet");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");     // YYYY-MM-DD
  const [time, setTime] = useState("");     // HH:MM
  const [location, setLocation] = useState("");
  const [professional, setProfessional] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (existing) {
      setPetId(existing.petId);
      setType(existing.type);
      setTitle(existing.title);
      const dt = new Date(existing.dateTime);
      setDate(isoToDisplay(dt.toISOString().split("T")[0]));
      setTime(dt.toTimeString().slice(0, 5));
      setLocation(existing.location ?? "");
      setProfessional(existing.professional ?? "");
      setNotes(existing.notes ?? "");
    }
  }, [existing]);

  function validate(): string {
    if (!petId) return "Selecciona una mascota.";
    if (!title.trim()) return "El título es obligatorio.";
    if (!date) return "La fecha es obligatoria.";
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(date)) return "Fecha: formato DD/MM/AAAA.";
    if (!time) return "La hora es obligatoria.";
    if (!/^\d{2}:\d{2}$/.test(time)) return "Hora: formato HH:MM.";
    return "";
  }

  async function handleSubmit() {
    const error = validate();
    if (error) { Alert.alert("Datos incorrectos", error); return; }

    const dateTime = new Date(`${displayToIso(date)}T${time}:00`).toISOString();
    const input = {
      petId,
      type,
      title: title.trim(),
      dateTime,
      location: location.trim() || undefined,
      professional: professional.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ petId, appointmentId: appointmentId!, input });
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

      <Text style={styles.label}>Tipo de cita *</Text>
      <View style={styles.typeRow}>
        {([["vet", "🩺", "Veterinario"], ["grooming", "✂️", "Peluquería"]] as const).map(([value, emoji, label]) => (
          <TouchableOpacity
            key={value}
            style={[styles.typeOption, type === value && styles.typeOptionSelected]}
            onPress={() => setType(value)}
          >
            <Text style={styles.typeEmoji}>{emoji}</Text>
            <Text style={[styles.typeLabel, type === value && styles.typeLabelSelected]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Título *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: Revisión anual, Baño y corte..."
        placeholderTextColor={Colors.text.disabled}
        value={title}
        onChangeText={setTitle}
        autoCapitalize="sentences"
      />

      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: Spacing.sm }}>
          <Text style={styles.label}>Fecha *</Text>
          <TextInput
            style={styles.input}
            placeholder="DD/MM/AAAA"
            placeholderTextColor={Colors.text.disabled}
            value={date}
            onChangeText={setDate}
            keyboardType="numbers-and-punctuation"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Hora *</Text>
          <TextInput
            style={styles.input}
            placeholder="HH:MM"
            placeholderTextColor={Colors.text.disabled}
            value={time}
            onChangeText={setTime}
            keyboardType="numbers-and-punctuation"
          />
        </View>
      </View>

      <Text style={styles.label}>Lugar</Text>
      <TextInput
        style={styles.input}
        placeholder="Nombre o dirección del lugar"
        placeholderTextColor={Colors.text.disabled}
        value={location}
        onChangeText={setLocation}
        autoCapitalize="words"
      />

      <Text style={styles.label}>Profesional</Text>
      <TextInput
        style={styles.input}
        placeholder="Nombre del veterinario o peluquero"
        placeholderTextColor={Colors.text.disabled}
        value={professional}
        onChangeText={setProfessional}
        autoCapitalize="words"
      />

      <Text style={styles.label}>Notas</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Observaciones adicionales"
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
            {isEditing ? "Guardar cambios" : "Agendar cita"}
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
  typeRow: { flexDirection: "row", gap: Spacing.md },
  typeOption: {
    flex: 1, alignItems: "center", paddingVertical: Spacing.md,
    borderRadius: Radius.md, borderWidth: 1.5,
    borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  typeOptionSelected: { borderColor: Colors.primary, backgroundColor: "#FFF3EE" },
  typeEmoji: { fontSize: 28 },
  typeLabel: { fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 4 },
  typeLabelSelected: { color: Colors.primary, fontWeight: "700" },
  row: { flexDirection: "row" },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    fontSize: FontSize.md, color: Colors.text.primary,
  },
  textArea: { height: 80, paddingTop: Spacing.md },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md, paddingVertical: Spacing.md,
    alignItems: "center", marginTop: Spacing.xl,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: "#fff", fontSize: FontSize.lg, fontWeight: "600" },
});
