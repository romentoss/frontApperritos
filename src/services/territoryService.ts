/**
 * 🗺️ territoryService — Territorios compartidos entre usuarios
 *
 * ─── QUÉ SE ALMACENA ───────────────────────────────────────────
 *  ✅  ownerId, ownerName, ownerPhotoURL (opcional)
 *  ✅  petName (nombre de la mascota con la que se hizo el recorrido)
 *  ✅  coordinates []  (solo lat/lng, SIN timestamps ni notas)
 *  ✅  areaM2, createdDate ("YYYY-MM-DD")
 *  ✅  conquests [] → { conqueredBy UID, name, photo, walkId, %, date }
 *
 *  ❌  Notas de paseo / email / hora exacta
 *
 * ─── LÓGICA DE CONQUISTA ───────────────────────────────────────
 *  Cada conquista queda ligada al walkId físico que se usó.
 *  El mismo walk NO puede usarse dos veces para el mismo territorio.
 *  Para volver a conquistar hay que hacer un nuevo recorrido físico.
 */

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../config/firebase";
import { Territory, TerritoryConquest } from "../types";
import { LatLng } from "../utils/territoryUtils";

const COLLECTION = "territories";

// ─── Cache local: walks ya publicados como territorio ──────────────────────

function _publishedKey(userId: string) {
  return `published_walks_${userId}`;
}

async function _getPublishedSet(userId: string): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(_publishedKey(userId));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

async function _markPublished(userId: string, walkId: string): Promise<void> {
  const ids = await _getPublishedSet(userId);
  ids.add(walkId);
  await AsyncStorage.setItem(_publishedKey(userId), JSON.stringify([...ids]));
}

export async function isWalkPublished(
  userId: string,
  walkId: string
): Promise<boolean> {
  const ids = await _getPublishedSet(userId);
  return ids.has(walkId);
}

// ─── CRUD ─────────────────────────────────────────────────────────────────

export interface PublishTerritoryInput {
  userId: string;
  walkId: string;
  coordinates: LatLng[];
  areaM2: number;
  ownerName: string;
  ownerPhotoURL?: string;
  petName: string;
}

/** Publica un recorrido circular como territorio en Firestore */
export async function publishTerritory(
  input: PublishTerritoryInput
): Promise<Territory> {
  const { userId, walkId, coordinates, areaM2, ownerName, ownerPhotoURL, petName } = input;

  if (!userId) throw new Error("Usuario no autenticado");
  if (coordinates.length < 3) throw new Error("Polígono inválido: mínimo 3 puntos");
  if (coordinates.length > 300) throw new Error("Polígono demasiado complejo (max 300 vértices)");
  if (!Number.isFinite(areaM2) || areaM2 <= 0 || areaM2 > 50_000_000)
    throw new Error("Área inválida");

  if (await isWalkPublished(userId, walkId))
    throw new Error("Este recorrido ya fue publicado");

  const safeCoords = coordinates.map(({ latitude, longitude }) => ({ latitude, longitude }));

  const data: Omit<Territory, "id"> = {
    ownerId: userId,
    ownerName: ownerName.slice(0, 60),
    ...(ownerPhotoURL ? { ownerPhotoURL } : {}),
    petName: petName.slice(0, 40),
    coordinates: safeCoords,
    areaM2: Math.round(areaM2),
    createdDate: new Date().toISOString().slice(0, 10),
    conquests: [],
  };

  const ref = await addDoc(collection(db, COLLECTION), data);
  await _markPublished(userId, walkId);
  return { id: ref.id, ...data };
}

/** Carga todos los territorios públicos */
export async function getAllTerritories(): Promise<Territory[]> {
  const snap = await getDocs(collection(db, COLLECTION));
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Territory, "id">),
  }));
}

/** Elimina un territorio propio (valida ownership) */
export async function deleteTerritory(
  userId: string,
  territoryId: string
): Promise<void> {
  if (!userId) throw new Error("Usuario no autenticado");
  const ref = doc(db, COLLECTION, territoryId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Territorio no encontrado");
  if (snap.data().ownerId !== userId)
    throw new Error("No autorizado: no eres el dueño");
  await deleteDoc(ref);
}

export interface ClaimConquestInput {
  userId: string;
  territoryId: string;
  walkId: string;         // Walk físico usado para la conquista
  percentage: number;
  conqueredByName: string;
  conqueredByPhotoURL?: string;
}

/**
 * Registra una conquista sobre un territorio ajeno.
 * El mismo walkId NO puede usarse dos veces para el mismo territorio:
 * hay que hacer un nuevo recorrido físico.
 */
export async function claimConquest(input: ClaimConquestInput): Promise<void> {
  const { userId, territoryId, walkId, percentage, conqueredByName, conqueredByPhotoURL } = input;

  if (!userId) throw new Error("Usuario no autenticado");
  if (!Number.isInteger(percentage) || percentage < 1 || percentage > 100)
    throw new Error("Porcentaje inválido");

  const ref = doc(db, COLLECTION, territoryId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Territorio no encontrado");
  if (snap.data().ownerId === userId)
    throw new Error("No puedes conquistar tu propio territorio");

  const existing: TerritoryConquest[] = snap.data().conquests ?? [];

  // Verificar que este walkId no se haya usado ya para este territorio
  const walkAlreadyUsed = existing.some(
    (c) => c.conqueredBy === userId && c.walkId === walkId
  );
  if (walkAlreadyUsed)
    throw new Error("Ya usaste este recorrido para conquistar esta zona. Haz un nuevo paseo.");

  const conquest: TerritoryConquest = {
    conqueredBy: userId,
    conqueredByName: conqueredByName.slice(0, 60),
    ...(conqueredByPhotoURL ? { conqueredByPhotoURL } : {}),
    walkId,
    percentage,
    date: new Date().toISOString().slice(0, 10),
  };

  // Reemplaza la conquista previa del mismo usuario (si existe con otro walk)
  const others = existing.filter((c) => c.conqueredBy !== userId);
  await updateDoc(ref, { conquests: [...others, conquest] });
}

const territoryService = {
  publishTerritory,
  getAllTerritories,
  deleteTerritory,
  claimConquest,
  isWalkPublished,
};

export default territoryService;
