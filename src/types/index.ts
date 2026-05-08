/**
 * 🐾 Tipos base de la aplicación Apperritos
 *
 * Este archivo define las entidades principales del dominio.
 * Todas las interfaces están tipadas con TypeScript para
 * garantizar seguridad de tipos en toda la app.
 *
 * 📌 Convención: Usamos `id` como string porque Firestore
 * genera IDs como strings automáticamente.
 */

// ─────────────────────────────────────────────
// 👤 Usuario
// ─────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: string; // ISO 8601
}

// ─────────────────────────────────────────────
// 🐕 Mascota
// ─────────────────────────────────────────────
export interface Pet {
  id: string;
  userId: string; // Dueño de la mascota
  name: string;
  species: "dog" | "cat" | "bird" | "rabbit" | "other";
  breed?: string; // Raza (opcional)
  birthDate?: string; // ISO 8601
  weight?: number; // En kilogramos
  photoURL?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
// 💉 Vacuna
// ─────────────────────────────────────────────
export interface Vaccine {
  id: string;
  petId: string; // Mascota vacunada
  name: string; // Nombre de la vacuna
  appliedDate: string; // Fecha en que se aplicó
  nextDoseDate?: string; // Próxima dosis (para recordatorio)
  veterinarian?: string; // Nombre del veterinario
  notes?: string;
  createdAt: string;
  notificationId?: string; // ID de la notificación para la próxima dosis
}

// ─────────────────────────────────────────────
// 📅 Cita (peluquería o veterinario)
// ─────────────────────────────────────────────
export type AppointmentType = "grooming" | "vet";

export interface Appointment {
  id: string;
  petId: string;
  type: AppointmentType;
  title: string; // Ej: "Baño y corte", "Revisión anual"
  dateTime: string; // ISO 8601 con hora
  location?: string; // Dirección o nombre del lugar
  professional?: string; // Nombre del profesional
  notes?: string;
  completed: boolean;
  createdAt: string;
  notificationId?: string; // ID de la notificación local programada
}

// ─────────────────────────────────────────────
// 🍖 Registro de comida comprada
// ─────────────────────────────────────────────
export interface FoodRecord {
  id: string;
  petId: string;
  brand: string; // Marca del alimento
  product: string; // Nombre del producto
  quantity: number; // Cantidad (ej: 1, 2)
  unit: "kg" | "lb" | "bag" | "can"; // Unidad de medida
  purchaseDate: string;
  price?: number; // Precio de compra
  notes?: string;
  createdAt: string;
}

// ─────────────────────────────────────────────
// 🔄 Compra periódica de comida
// ─────────────────────────────────────────────
export type FrequencyUnit = "days" | "weeks" | "months";

export interface PeriodicPurchase {
  id: string;
  petId: string;
  brand: string;
  product: string;
  quantity: number;
  unit: "kg" | "lb" | "bag" | "can";
  frequencyValue: number; // Cada cuánto (ej: 2)
  frequencyUnit: FrequencyUnit; // En qué unidad (ej: "weeks" → cada 2 semanas)
  lastPurchaseDate?: string; // Última vez que se compró
  nextPurchaseDate?: string; // Próxima compra estimada
  isActive: boolean; // Si la compra periódica está activa
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
// 🗺️ Recorrido (paseo con la mascota)
// ─────────────────────────────────────────────
export interface WalkCoordinate {
  latitude: number;
  longitude: number;
  timestamp: number; // Unix ms
}

export interface Walk {
  id: string;
  petId: string;
  userId: string;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  durationSeconds: number;
  distanceMeters: number;
  coordinates: WalkCoordinate[];
  notes?: string;
  createdAt: string;
}

// ─────────────────────────────────────────────
// 🏴 Territorios (paseos circulares compartidos)
// Solo contiene datos mínimos: sin notas, sin info de mascota
// ─────────────────────────────────────────────
export interface TerritoryConquest {
  conqueredBy: string;         // Firebase UID
  conqueredByName: string;     // Nombre visible
  conqueredByPhotoURL?: string;
  walkId: string;              // Walk usado — no se puede reusar para este territorio
  percentage: number;          // 1-100
  date: string;                // "YYYY-MM-DD"
}

export interface Territory {
  id: string;
  ownerId: string;             // Firebase UID
  ownerName: string;           // Nombre visible del dueño
  ownerPhotoURL?: string;
  petName: string;             // Nombre de la mascota con la que se hizo el recorrido
  coordinates: Array<{ latitude: number; longitude: number }>;
  areaM2: number;
  createdDate: string;         // "YYYY-MM-DD"
  conquests: TerritoryConquest[];
}
