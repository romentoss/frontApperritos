/**
 * 🐕 PetService — Operaciones CRUD de mascotas
 *
 * Toda la comunicación con Firestore y Firebase Storage
 * para la entidad Mascota está aquí centralizada.
 *
 * Estructura en Firestore:
 *   users/{userId}/pets/{petId}
 *
 * En DEV_MODE (sin Firebase real) usa un store en memoria.
 * Cambia DEV_MODE a false cuando tengas credenciales reales.
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  type FieldValue,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { Pet } from "../types";
import { omitUndefined } from "../utils/firestore";

// ─────────────────────────────────────────────
// 🚧 MODO DESARROLLO — store en memoria
// Debe coincidir con el flag en AuthContext.tsx
// ─────────────────────────────────────────────
const DEV_MODE = false;

/** Store en memoria: persiste mientras la app no se reinicia */
const _devStore: Map<string, Pet> = new Map([
  [
    "seed-pet-ander",
    {
      id: "seed-pet-ander",
      userId: "dev-user-001",
      name: "Ander",
      species: "dog",
      breed: "Border Collie",
      birthDate: "2021-03-10",
      weight: 18,
      notes: "Perrito de Leandro ❤️",
      createdAt: "2024-01-01T10:00:00.000Z",
      updatedAt: "2024-01-01T10:00:00.000Z",
    },
  ],
  [
    "seed-pet-boira",
    {
      id: "seed-pet-boira",
      userId: "dev-user-001",
      name: "Boira",
      species: "dog",
      breed: "Golden Retriever",
      birthDate: "2020-07-22",
      weight: 26,
      notes: "Perrita de Virginia ❤️",
      createdAt: "2024-01-01T10:05:00.000Z",
      updatedAt: "2024-01-01T10:05:00.000Z",
    },
  ],
]);
let _devCounter = 1;

function _devGetAll(userId: string): Pet[] {
  return [..._devStore.values()]
    .filter((p) => p.userId === userId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ─────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────

function petsCollection(userId: string) {
  return collection(db, "users", userId, "pets");
}

function petDocument(userId: string, petId: string) {
  return doc(db, "users", userId, "pets", petId);
}

function firestoreDocToPet(id: string, data: any): Pet {
  return {
    id,
    userId: data.userId,
    name: data.name,
    species: data.species,
    breed: data.breed ?? undefined,
    birthDate: data.birthDate ?? undefined,
    weight: data.weight ?? undefined,
    photoURL: data.photoURL ?? undefined,
    notes: data.notes ?? undefined,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : data.createdAt,
    updatedAt:
      data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate().toISOString()
        : data.updatedAt,
  };
}

export type PetInput = Omit<Pet, "id" | "userId" | "createdAt" | "updatedAt">;

// ─────────────────────────────────────────────
// PetService
// ─────────────────────────────────────────────
const petService = {
  async getAllPets(userId: string): Promise<Pet[]> {
    if (DEV_MODE) return _devGetAll(userId);

    const q = query(petsCollection(userId), orderBy("name", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => firestoreDocToPet(d.id, d.data()));
  },

  async getPetById(userId: string, petId: string): Promise<Pet | null> {
    if (DEV_MODE) return _devStore.get(petId) ?? null;

    const snap = await getDoc(petDocument(userId, petId));
    if (!snap.exists()) return null;
    return firestoreDocToPet(snap.id, snap.data());
  },

  async createPet(
    userId: string,
    input: PetInput,
    imageUri?: string
  ): Promise<Pet> {
    if (DEV_MODE) {
      const id = `dev-pet-${_devCounter++}`;
      const now = new Date().toISOString();
      const pet: Pet = {
        ...input,
        id,
        userId,
        // En DEV usamos la URI local directamente (no se sube a Storage)
        photoURL: imageUri ?? input.photoURL,
        createdAt: now,
        updatedAt: now,
      };
      _devStore.set(id, pet);
      return pet;
    }

    let photoURL: string | undefined = input.photoURL;
    if (imageUri) {
      photoURL = await petService.uploadPetPhoto(userId, imageUri);
    }

    const now = new Date().toISOString();
    const payload = omitUndefined({
      ...input,
      photoURL: photoURL ?? null,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const docRef = await addDoc(petsCollection(userId), payload);

    // Construir la mascota localmente — evita un segundo getDoc
    const pet: Pet = {
      ...input,
      id: docRef.id,
      userId,
      photoURL: photoURL ?? undefined,
      createdAt: now,
      updatedAt: now,
    };
    return pet;
  },

  async updatePet(
    userId: string,
    petId: string,
    input: Partial<PetInput>,
    imageUri?: string
  ): Promise<void> {
    if (DEV_MODE) {
      const existing = _devStore.get(petId);
      if (!existing) return;
      _devStore.set(petId, {
        ...existing,
        ...input,
        photoURL: imageUri ?? input.photoURL ?? existing.photoURL,
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    let photoURL = input.photoURL;
    if (imageUri) {
      photoURL = await petService.uploadPetPhoto(userId, imageUri, petId);
    }

    const updatePayload = omitUndefined({
      ...input,
      ...(photoURL !== undefined && { photoURL }),
      updatedAt: serverTimestamp(),
    });
    await updateDoc(petDocument(userId, petId), updatePayload);
  },

  async deletePet(userId: string, petId: string): Promise<void> {
    if (DEV_MODE) {
      _devStore.delete(petId);
      return;
    }

    // Intentar borrar la foto local si existe
    try {
      const pet = await petService.getPetById(userId, petId);
      // Foto local — no hay Storage que limpiar
      void pet;
    } catch {
      // continuar
    }

    await deleteDoc(petDocument(userId, petId));
  },

  async uploadPetPhoto(
    userId: string,
    imageUri: string,
    petId?: string
  ): Promise<string> {
    // Devolver la URI del picker directamente (persistente en iOS/Android)
    return imageUri;
  },
};

export default petService;

