import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { useAuth } from "../../hooks/useAuth";
import authService from "../../services/authService";
import { Colors } from "../../theme/colors";
import { Spacing, FontSize, Radius } from "../../theme/spacing";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.displayName ?? "");
  const [isSavingName, setIsSavingName] = useState(false);
  // Nombre mostrado en pantalla (actualiza inmediatamente tras guardar)
  const [displayedName, setDisplayedName] = useState(user?.displayName ?? "");
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Cargar foto local guardada
  useEffect(() => {
    if (user?.uid) {
      authService.getLocalProfilePhoto(user.uid).then(setLocalPhotoUri);
    }
  }, [user?.uid]);

  async function handlePickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso necesario", "Necesitamos acceso a tu galería para cambiar la foto.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    setIsUploadingPhoto(true);
    try {
      await authService.saveLocalProfilePhoto(result.assets[0].uri);
      setLocalPhotoUri(result.assets[0].uri);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "No se pudo guardar la foto");
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function handleSaveName() {
    if (!newName.trim()) {
      Alert.alert("Nombre vacío", "Por favor introduce un nombre.");
      return;
    }
    setIsSavingName(true);
    try {
      await authService.updateDisplayName(newName.trim());
      setDisplayedName(newName.trim());
      setIsEditingName(false);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "No se pudo guardar el nombre");
    } finally {
      setIsSavingName(false);
    }
  }

  function handleLogout() {
    Alert.alert("Cerrar sesión", "¿Estás seguro de que quieres salir?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Cerrar sesión", style: "destructive", onPress: logout },
    ]);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <TouchableOpacity
          style={styles.avatarWrapper}
          onPress={handlePickPhoto}
          disabled={isUploadingPhoto}
        >
          {isUploadingPhoto ? (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : localPhotoUri ? (
            <Image source={{ uri: localPhotoUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={56} color={Colors.text.disabled} />
            </View>
          )}
          <View style={styles.editPhotoOverlay}>
            <Ionicons name="camera" size={14} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Nombre */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Nombre</Text>
        {isEditingName ? (
          <View style={styles.nameEditRow}>
            <TextInput
              style={styles.nameInput}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              maxLength={60}
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveName} disabled={isSavingName}>
              {isSavingName
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.saveBtnText}>Guardar</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => { setIsEditingName(false); setNewName(user?.displayName ?? ""); }}
            >
              <Ionicons name="close" size={20} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.nameRow}>
            <Text style={styles.nameText}>
              {displayedName
                ? displayedName
                : <Text style={styles.namePlaceholder}>Sin nombre</Text>}
            </Text>
            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => { setNewName(user?.displayName ?? ""); setIsEditingName(true); }}
            >
              <Ionicons name="pencil-outline" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Email */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Correo electrónico</Text>
        <Text style={styles.cardValue}>{user?.email}</Text>
      </View>

      {/* Cerrar sesión */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={Colors.error} />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 48 },

  avatarSection: { alignItems: "center", marginBottom: Spacing.sm },
  avatarWrapper: { position: "relative" },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: {
    backgroundColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  editPhotoOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.background,
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLabel: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: Spacing.xs,
  },
  cardValue: { fontSize: FontSize.md, color: Colors.text.primary },

  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  nameText: { fontSize: FontSize.md, color: Colors.text.primary, flex: 1 },
  namePlaceholder: { color: Colors.text.disabled, fontStyle: "italic" },

  nameEditRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  nameInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text.primary,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.primary,
    paddingVertical: 2,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  saveBtnText: { color: "#fff", fontWeight: "600", fontSize: FontSize.sm },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.error,
    marginTop: Spacing.lg,
  },
  logoutText: { fontSize: FontSize.md, fontWeight: "600", color: Colors.error },
});
