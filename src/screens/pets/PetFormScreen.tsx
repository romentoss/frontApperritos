/**
 * 📝 PetFormScreen — Formulario para crear o editar una mascota
 *
 * Pantalla dual:
 *   - Sin petId en params → modo CREAR (formulario vacío)
 *   - Con petId en params → modo EDITAR (formulario pre-rellenado)
 *
 * Funciones:
 *   - Selector de foto con expo-image-picker
 *   - Validación de campos obligatorios
 *   - Selector de especie con opciones visuales
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import { PetStackParamList, PetStackNavigationProp } from "../../navigation/types";
import { useCreatePet, useUpdatePet, usePet } from "../../hooks/usePets";
import { Pet } from "../../types";
import { isoToDisplay, displayToIso } from "../../utils/dates";
import { Colors } from "../../theme/colors";
import { Spacing, FontSize, Radius } from "../../theme/spacing";

type PetFormRouteProp = RouteProp<PetStackParamList, "PetForm">;

// ── Opciones de especie ──
const SPECIES_OPTIONS: { value: Pet["species"]; emoji: string; label: string }[] = [
  { value: "dog", emoji: "🐕", label: "Perro" },
  { value: "cat", emoji: "🐈", label: "Gato" },
  { value: "bird", emoji: "🐦", label: "Pájaro" },
  { value: "rabbit", emoji: "🐇", label: "Conejo" },
  { value: "other", emoji: "🐾", label: "Otro" },
];

export default function PetFormScreen() {
  const navigation = useNavigation<PetStackNavigationProp>();
  const route = useRoute<PetFormRouteProp>();
  const { petId } = route.params ?? {};
  const isEditing = !!petId;

  // ── Cargar datos si estamos editando ──
  const { data: existingPet } = usePet(petId ?? "");
  const createPet = useCreatePet();
  const updatePet = useUpdatePet(petId ?? "");

  // ── Estado del formulario ──
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<Pet["species"]>("dog");
  const [breed, setBreed] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [existingPhotoURL, setExistingPhotoURL] = useState<string | undefined>();

  // Pre-rellenar campos cuando llegan los datos del pet existente
  useEffect(() => {
    if (existingPet && isEditing) {
      setName(existingPet.name);
      setSpecies(existingPet.species);
      setBreed(existingPet.breed ?? "");
      setBirthDate(isoToDisplay(existingPet.birthDate ?? ""));
      setWeight(existingPet.weight?.toString() ?? "");
      setNotes(existingPet.notes ?? "");
      setExistingPhotoURL(existingPet.photoURL);
    }
  }, [existingPet]);

  // ── Selector de imagen ──
  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permiso necesario",
        "Necesitamos acceso a tu galería para agregar una foto."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Cuadrada
      quality: 0.7,   // Comprimir para no gastar storage
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }

  // ── Validación ──
  function validate(): string {
    if (!name.trim()) return "El nombre es obligatorio.";
    if (weight && isNaN(parseFloat(weight))) return "El peso debe ser un número válido.";
    // Validación básica de fecha: formato YYYY-MM-DD
    if (birthDate && !/^\d{2}\/\d{2}\/\d{4}$/.test(birthDate)) {
      return "La fecha de nacimiento debe tener el formato DD/MM/AAAA.";
    }
    return "";
  }

  // ── Submit ──
  async function handleSubmit() {
    const validationError = validate();
    if (validationError) {
      Alert.alert("Datos incompletos", validationError);
      return;
    }

    const input = {
      name: name.trim(),
      species,
      breed: breed.trim() || undefined,
      birthDate: birthDate.trim() ? displayToIso(birthDate.trim()) : undefined,
      weight: weight ? parseFloat(weight) : undefined,
      notes: notes.trim() || undefined,
      photoURL: existingPhotoURL,
    };

    try {
      if (isEditing) {
        await updatePet.mutateAsync({ input, imageUri: imageUri ?? undefined });
        navigation.goBack();
      } else {
        const newPet = await createPet.mutateAsync({
          input,
          imageUri: imageUri ?? undefined,
        });
        // Navegar al detalle de la mascota recién creada
        navigation.replace("PetDetail", { petId: newPet.id });
      }
    } catch (error: any) {
      Alert.alert("Error", error.message ?? "No se pudo guardar la mascota.");
    }
  }

  const isSubmitting = createPet.isPending || updatePet.isPending;

  // ── Imagen a mostrar (nueva o existente) ──
  const displayImageUri = imageUri ?? existingPhotoURL;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Selector de foto ── */}
      <TouchableOpacity style={styles.photoSelector} onPress={handlePickImage}>
        {displayImageUri ? (
          <Image source={{ uri: displayImageUri }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="camera-outline" size={36} color={Colors.text.disabled} />
            <Text style={styles.photoPlaceholderText}>Agregar foto</Text>
          </View>
        )}
        {/* Botón de cámara superpuesto */}
        <View style={styles.cameraIcon}>
          <Ionicons name="camera" size={16} color={Colors.text.inverse} />
        </View>
      </TouchableOpacity>

      {/* ── Especie ── */}
      <Text style={styles.label}>Tipo de animal *</Text>
      <View style={styles.speciesGrid}>
        {SPECIES_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.speciesOption,
              species === option.value && styles.speciesOptionSelected,
            ]}
            onPress={() => setSpecies(option.value)}
          >
            <Text style={styles.speciesEmoji}>{option.emoji}</Text>
            <Text
              style={[
                styles.speciesLabel,
                species === option.value && styles.speciesLabelSelected,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Nombre ── */}
      <Text style={styles.label}>Nombre *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: Luna, Max, Coco..."
        placeholderTextColor={Colors.text.disabled}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        returnKeyType="next"
      />

      {/* ── Raza ── */}
      <Text style={styles.label}>Raza</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: Labrador, Siamés..."
        placeholderTextColor={Colors.text.disabled}
        value={breed}
        onChangeText={setBreed}
        autoCapitalize="words"
        returnKeyType="next"
      />

      {/* ── Fecha de nacimiento ── */}
      <Text style={styles.label}>Fecha de nacimiento</Text>
      <TextInput
        style={styles.input}
        placeholder="DD/MM/AAAA (ej: 15/03/2020)"
        placeholderTextColor={Colors.text.disabled}
        value={birthDate}
        onChangeText={setBirthDate}
        keyboardType="numbers-and-punctuation"
        returnKeyType="next"
      />

      {/* ── Peso ── */}
      <Text style={styles.label}>Peso (kg)</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: 8.5"
        placeholderTextColor={Colors.text.disabled}
        value={weight}
        onChangeText={setWeight}
        keyboardType="decimal-pad"
        returnKeyType="next"
      />

      {/* ── Notas ── */}
      <Text style={styles.label}>Notas</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Alergias, condiciones especiales, etc."
        placeholderTextColor={Colors.text.disabled}
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      {/* ── Botón guardar ── */}
      <TouchableOpacity
        style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
        activeOpacity={0.8}
      >
        {isSubmitting ? (
          <ActivityIndicator color={Colors.text.inverse} />
        ) : (
          <Text style={styles.saveButtonText}>
            {isEditing ? "Guardar cambios" : "Registrar mascota"}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  photoSelector: {
    alignSelf: "center",
    marginBottom: Spacing.lg,
    position: "relative",
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: Radius.lg,
    backgroundColor: Colors.border,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  photoPlaceholderText: {
    fontSize: FontSize.xs,
    color: Colors.text.disabled,
    marginTop: 4,
  },
  cameraIcon: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    padding: 6,
  },
  speciesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  speciesOption: {
    flexBasis: "18%",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  speciesOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: "#FFF3EE",
  },
  speciesEmoji: {
    fontSize: 24,
    marginBottom: 2,
  },
  speciesLabel: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
  },
  speciesLabelSelected: {
    color: Colors.primary,
    fontWeight: "600",
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text.primary,
  },
  textArea: {
    height: 80,
    paddingTop: Spacing.md,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.xl,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.text.inverse,
    fontSize: FontSize.lg,
    fontWeight: "600",
  },
});
