/**
 * 🗺️ walkService — Almacena y recupera recorridos (paseos)
 *
 * Los paseos se guardan localmente en AsyncStorage del dispositivo.
 * Clave: "walks_{userId}"  →  JSON array de Walk
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Walk, WalkCoordinate } from "../types";

const DEV_MODE = false;

// ── AsyncStorage helpers ────────────────────────────────────────────────────
function _storageKey(userId: string) {
  return `walks_${userId}`;
}

async function _loadAll(userId: string): Promise<Map<string, Walk>> {
  try {
    const raw = await AsyncStorage.getItem(_storageKey(userId));
    if (!raw) return new Map();
    const arr: Walk[] = JSON.parse(raw);
    return new Map(arr.map((w) => [w.id, w]));
  } catch {
    return new Map();
  }
}

async function _saveAll(userId: string, store: Map<string, Walk>): Promise<void> {
  await AsyncStorage.setItem(
    _storageKey(userId),
    JSON.stringify(Array.from(store.values()))
  );
}

export interface WalkInput {
  petId: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  distanceMeters: number;
  coordinates: WalkCoordinate[];
  notes?: string;
}

// ── DEV store ──────────────────────────────────────────────────────────────
let _store: Map<string, Walk> = new Map([
  [
    "walk_seed_ander_001",
    {
      id: "walk_seed_ander_001",
      userId: "dev-user-001",
      petId: "seed-pet-ander",
      startTime: "2026-04-17T07:30:00.000Z",
      endTime: "2026-04-17T07:58:00.000Z",
      durationSeconds: 1680,
      distanceMeters: 1120,
      notes: "Mañana en el Retiro, Ander estaba muy animado 🐾",
      createdAt: "2026-04-17T07:58:00.000Z",
      coordinates: [
        { latitude: 40.4155, longitude: -3.6843, timestamp: 1745126400000 },
        { latitude: 40.4162, longitude: -3.6836, timestamp: 1745126552000 },
        { latitude: 40.4169, longitude: -3.6826, timestamp: 1745126704000 },
        { latitude: 40.4174, longitude: -3.6812, timestamp: 1745126856000 },
        { latitude: 40.4173, longitude: -3.6799, timestamp: 1745127008000 },
        { latitude: 40.4167, longitude: -3.6789, timestamp: 1745127160000 },
        { latitude: 40.4158, longitude: -3.6785, timestamp: 1745127312000 },
        { latitude: 40.4149, longitude: -3.6790, timestamp: 1745127464000 },
        { latitude: 40.4145, longitude: -3.6803, timestamp: 1745127616000 },
        { latitude: 40.4147, longitude: -3.6818, timestamp: 1745127768000 },
        { latitude: 40.4152, longitude: -3.6832, timestamp: 1745127920000 },
        { latitude: 40.4155, longitude: -3.6843, timestamp: 1745128072000 },
      ],
    },
  ],
  [
    "walk_seed_boira_001",
    {
      id: "walk_seed_boira_001",
      userId: "dev-user-001",
      petId: "seed-pet-boira",
      startTime: "2026-04-16T17:15:00.000Z",
      endTime: "2026-04-16T17:34:00.000Z",
      durationSeconds: 1140,
      distanceMeters: 820,
      notes: "Tarde tranquila, Boira disfrutando del sol ☀️",
      createdAt: "2026-04-16T17:34:00.000Z",
      coordinates: [
        { latitude: 40.4168, longitude: -3.6852, timestamp: 1745421300000 },
        { latitude: 40.4174, longitude: -3.6845, timestamp: 1745421426000 },
        { latitude: 40.4179, longitude: -3.6833, timestamp: 1745421552000 },
        { latitude: 40.4181, longitude: -3.6820, timestamp: 1745421678000 },
        { latitude: 40.4178, longitude: -3.6808, timestamp: 1745421804000 },
        { latitude: 40.4170, longitude: -3.6801, timestamp: 1745421930000 },
        { latitude: 40.4161, longitude: -3.6806, timestamp: 1745422056000 },
        { latitude: 40.4157, longitude: -3.6819, timestamp: 1745422182000 },
        { latitude: 40.4160, longitude: -3.6836, timestamp: 1745422308000 },
        { latitude: 40.4168, longitude: -3.6852, timestamp: 1745422434000 },
      ],
    },
  ],
]);

function _makeId() {
  return "walk_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Distancia en metros entre dos coordenadas (Haversine) */
export function haversineDistance(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const R = 6371000; // Radio de la Tierra en metros
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const aVal =
    sinLat * sinLat +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinLon * sinLon;
  return R * 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
}

/** Calcula distancia total de un array de coordenadas */
export function totalDistance(coords: WalkCoordinate[]): number {
  let dist = 0;
  for (let i = 1; i < coords.length; i++) {
    dist += haversineDistance(coords[i - 1], coords[i]);
  }
  return dist;
}

// ── CRUD ───────────────────────────────────────────────────────────────────

async function getAllForPet(userId: string, petId: string): Promise<Walk[]> {
  const store = await _loadAll(userId);
  return Array.from(store.values()).filter(
    (w) => w.userId === userId && w.petId === petId
  );
}

async function getAllForUser(userId: string): Promise<Walk[]> {
  const store = await _loadAll(userId);
  return Array.from(store.values())
    .filter((w) => w.userId === userId)
    .sort((a, b) => b.startTime.localeCompare(a.startTime));
}

async function getAllForPets(userId: string, petIds: string[]): Promise<Walk[]> {
  const store = await _loadAll(userId);
  return Array.from(store.values())
    .filter((w) => w.userId === userId && petIds.includes(w.petId))
    .sort((a, b) => b.startTime.localeCompare(a.startTime));
}

async function getById(userId: string, walkId: string): Promise<Walk | null> {
  const store = await _loadAll(userId);
  return store.get(walkId) ?? null;
}

async function create(userId: string, input: WalkInput): Promise<Walk> {
  const store = await _loadAll(userId);
  const now = new Date().toISOString();
  const walk: Walk = { id: _makeId(), userId, ...input, createdAt: now };
  store.set(walk.id, walk);
  await _saveAll(userId, store);
  return walk;
}

async function deleteWalk(userId: string, walkId: string): Promise<void> {
  const store = await _loadAll(userId);
  store.delete(walkId);
  await _saveAll(userId, store);
}

const walkService = {
  getAllForPet,
  getAllForUser,
  getAllForPets,
  getById,
  create,
  delete: deleteWalk,
};

export default walkService;
