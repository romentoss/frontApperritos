import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { auth } from "../config/firebase";

const PROFILE_PHOTO_KEY = (uid: string) => `profile_photo_${uid}`;

function getFirebaseErrorMessage(code: string): string {
  const errorMessages: Record<string, string> = {
    "auth/email-already-in-use": "Este correo ya está registrado.",
    "auth/invalid-email": "El correo electrónico no es válido.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/user-not-found": "No existe una cuenta con este correo.",
    "auth/wrong-password": "La contraseña es incorrecta.",
    "auth/too-many-requests": "Demasiados intentos. Intenta de nuevo más tarde.",
    "auth/network-request-failed": "Error de conexión. Verifica tu internet.",
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
  };
  return errorMessages[code] ?? "Ocurrió un error inesperado. Intenta de nuevo.";
}

const authService = {
  async register(email: string, password: string, displayName: string) {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName });
      return credential.user;
    } catch (error: any) {
      throw new Error(getFirebaseErrorMessage(error.code));
    }
  },

  async login(email: string, password: string) {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      return credential.user;
    } catch (error: any) {
      throw new Error(getFirebaseErrorMessage(error.code));
    }
  },

  async logout() {
    try {
      await signOut(auth);
    } catch (error: any) {
      throw new Error("No se pudo cerrar la sesión. Intenta de nuevo.");
    }
  },

  /** Actualiza el nombre visible del usuario en Firebase Auth */
  async updateDisplayName(name: string) {
    const user = auth.currentUser;
    if (!user) throw new Error("No hay sesión activa");
    if (!name.trim()) throw new Error("El nombre no puede estar vacío");
    await updateProfile(user, { displayName: name.trim().slice(0, 60) });
  },

  /** Guarda la URI de la foto de perfil localmente (sin Storage de pago) */
  async saveLocalProfilePhoto(localUri: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error("No hay sesión activa");
    await AsyncStorage.setItem(PROFILE_PHOTO_KEY(user.uid), localUri);
  },

  /** Recupera la URI local de la foto de perfil */
  async getLocalProfilePhoto(uid: string): Promise<string | null> {
    return AsyncStorage.getItem(PROFILE_PHOTO_KEY(uid));
  },
};

export default authService;
