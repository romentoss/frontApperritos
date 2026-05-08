/**
 * 🔥 Configuración de Firebase para el Frontend
 *
 * Este archivo inicializa Firebase en la app móvil.
 *
 * 📌 CONFIGURACIÓN:
 * 1. Ve a Firebase Console → Configuración del proyecto → Apps
 * 2. Registra una app web (o usa la config de tu app existente)
 * 3. Copia los valores de firebaseConfig aquí abajo
 *
 * ⚠️ En producción, estas variables deberían venir de
 * variables de entorno o un archivo de configuración seguro.
 */

import { initializeApp } from "firebase/app";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ─────────────────────────────────────────────
// 🔑 Configuración de Firebase
// Los valores se leen desde variables de entorno EXPO_PUBLIC_*
// Crea un archivo .env en la raíz de /frontend con los valores reales.
// Ver .env.example como referencia.
// ─────────────────────────────────────────────
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// ─────────────────────────────────────────────
// Inicializar servicios de Firebase
// ─────────────────────────────────────────────
const app = initializeApp(firebaseConfig);

/** Cliente de autenticación */
let authInstance: Auth;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  // initializeAuth puede lanzar si Auth ya fue inicializado; reutilizamos la instancia existente.
  authInstance = getAuth(app);
}
export const auth = authInstance;

/** Cliente de base de datos Firestore (long polling forzado para Expo Go/React Native) */
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

/** Cliente de Firebase Storage (fotos de perfil, etc.) */
export const storage = getStorage(app);

/** Cliente de almacenamiento de archivos */
export const storageRef = getStorage(app);

export default app;
