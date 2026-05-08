import {
  collection, doc, addDoc, getDoc, getDocs,
  updateDoc, deleteDoc, query, orderBy, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { FoodRecord, PeriodicPurchase, FrequencyUnit } from "../types";
import { omitUndefined } from "../utils/firestore";

const DEV_MODE = false;

// ── In-memory stores ──
const _recordStore: Map<string, FoodRecord> = new Map();
const _periodicStore: Map<string, PeriodicPurchase> = new Map();
let _recCounter = 1;
let _perCounter = 1;

export type FoodRecordInput = {
  petId: string;
  brand: string;
  product: string;
  quantity: number;
  unit: "kg" | "lb" | "bag" | "can";
  purchaseDate: string;
  price?: number;
  notes?: string;
};

export type PeriodicPurchaseInput = {
  petId: string;
  brand: string;
  product: string;
  quantity: number;
  unit: "kg" | "lb" | "bag" | "can";
  frequencyValue: number;
  frequencyUnit: FrequencyUnit;
  lastPurchaseDate?: string;
  notes?: string;
};

// ── Firestore collection paths ──
function recordsCol(userId: string, petId: string) {
  return collection(db, "users", userId, "pets", petId, "foodRecords");
}
function periodicCol(userId: string, petId: string) {
  return collection(db, "users", userId, "pets", petId, "periodicPurchases");
}

// ── Next purchase date calculator ──
export function calcNextPurchaseDate(lastDate: string, value: number, unit: FrequencyUnit): string {
  const d = new Date(lastDate);
  if (unit === "days") d.setDate(d.getDate() + value);
  else if (unit === "weeks") d.setDate(d.getDate() + value * 7);
  else d.setMonth(d.getMonth() + value);
  return d.toISOString().split("T")[0];
}

function _recordFromFirestore(id: string, data: any): FoodRecord {
  return {
    id,
    petId: data.petId,
    brand: data.brand,
    product: data.product,
    quantity: data.quantity,
    unit: data.unit,
    purchaseDate: data.purchaseDate,
    price: data.price,
    notes: data.notes,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
  };
}

function _periodicFromFirestore(id: string, data: any): PeriodicPurchase {
  return {
    id,
    petId: data.petId,
    brand: data.brand,
    product: data.product,
    quantity: data.quantity,
    unit: data.unit,
    frequencyValue: data.frequencyValue,
    frequencyUnit: data.frequencyUnit,
    lastPurchaseDate: data.lastPurchaseDate,
    nextPurchaseDate: data.nextPurchaseDate,
    isActive: data.isActive ?? true,
    notes: data.notes,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
  };
}

const foodService = {
  // ─── Food Records ───────────────────────────────────────
  async getRecordsForPet(userId: string, petId: string): Promise<FoodRecord[]> {
    if (DEV_MODE) {
      return [..._recordStore.values()]
        .filter((r) => r.petId === petId)
        .sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
    }
    const q = query(recordsCol(userId, petId), orderBy("purchaseDate", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => _recordFromFirestore(d.id, d.data()));
  },

  async getRecordsForPets(userId: string, petIds: string[]): Promise<FoodRecord[]> {
    if (DEV_MODE) {
      return [..._recordStore.values()]
        .filter((r) => petIds.includes(r.petId))
        .sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
    }
    const results: FoodRecord[] = [];
    for (const petId of petIds) {
      const list = await foodService.getRecordsForPet(userId, petId);
      results.push(...list);
    }
    return results.sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
  },

  async createRecord(userId: string, input: FoodRecordInput): Promise<FoodRecord> {
    if (DEV_MODE) {
      const id = `dev-record-${_recCounter++}`;
      const record: FoodRecord = { id, createdAt: new Date().toISOString(), ...input };
      _recordStore.set(id, record);
      return record;
    }
    const { petId, ...data } = input;
    const payload = omitUndefined({ ...data, petId, createdAt: serverTimestamp() });
    const docRef = await addDoc(recordsCol(userId, petId), payload);
    const snap = await getDoc(docRef);
    return _recordFromFirestore(snap.id, snap.data()!);
  },

  async updateRecord(userId: string, petId: string, recordId: string, input: Partial<FoodRecordInput>): Promise<void> {
    if (DEV_MODE) {
      const existing = _recordStore.get(recordId);
      if (existing) _recordStore.set(recordId, { ...existing, ...input });
      return;
    }
    const { petId: _pid, ...data } = input as any;
    await updateDoc(doc(recordsCol(userId, petId), recordId), omitUndefined(data));
  },

  async deleteRecord(userId: string, petId: string, recordId: string): Promise<void> {
    if (DEV_MODE) { _recordStore.delete(recordId); return; }
    await deleteDoc(doc(recordsCol(userId, petId), recordId));
  },

  // ─── Periodic Purchases ─────────────────────────────────
  async getPeriodicForPet(userId: string, petId: string): Promise<PeriodicPurchase[]> {
    if (DEV_MODE) {
      return [..._periodicStore.values()]
        .filter((p) => p.petId === petId)
        .sort((a, b) => a.brand.localeCompare(b.brand));
    }
    const q = query(periodicCol(userId, petId), orderBy("brand", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => _periodicFromFirestore(d.id, d.data()));
  },

  async getPeriodicForPets(userId: string, petIds: string[]): Promise<PeriodicPurchase[]> {
    if (DEV_MODE) {
      return [..._periodicStore.values()].filter((p) => petIds.includes(p.petId));
    }
    const results: PeriodicPurchase[] = [];
    for (const petId of petIds) {
      const list = await foodService.getPeriodicForPet(userId, petId);
      results.push(...list);
    }
    return results;
  },

  async createPeriodic(userId: string, input: PeriodicPurchaseInput): Promise<PeriodicPurchase> {
    if (DEV_MODE) {
      const id = `dev-periodic-${_perCounter++}`;
      const now = new Date().toISOString();
      const nextPurchaseDate = input.lastPurchaseDate
        ? calcNextPurchaseDate(input.lastPurchaseDate, input.frequencyValue, input.frequencyUnit)
        : undefined;
      const periodic: PeriodicPurchase = {
        id, createdAt: now, updatedAt: now,
        isActive: true, nextPurchaseDate,
        ...input,
      };
      _periodicStore.set(id, periodic);
      return periodic;
    }
    const { petId, ...data } = input;
    const nextPurchaseDate = data.lastPurchaseDate
      ? calcNextPurchaseDate(data.lastPurchaseDate, data.frequencyValue, data.frequencyUnit)
      : undefined;
    const payload = omitUndefined({
      ...data, petId, isActive: true, nextPurchaseDate: nextPurchaseDate ?? null,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    const docRef = await addDoc(periodicCol(userId, petId), payload);
    const snap = await getDoc(docRef);
    return _periodicFromFirestore(snap.id, snap.data()!);
  },

  async updatePeriodic(userId: string, petId: string, periodicId: string, input: Partial<PeriodicPurchaseInput>): Promise<void> {
    if (DEV_MODE) {
      const existing = _periodicStore.get(periodicId);
      if (!existing) return;
      const updated = { ...existing, ...input, updatedAt: new Date().toISOString() };
      if (input.lastPurchaseDate && (input.frequencyValue || input.frequencyUnit)) {
        updated.nextPurchaseDate = calcNextPurchaseDate(
          input.lastPurchaseDate,
          input.frequencyValue ?? existing.frequencyValue,
          input.frequencyUnit ?? existing.frequencyUnit,
        );
      }
      _periodicStore.set(periodicId, updated);
      return;
    }
    await updateDoc(
      doc(periodicCol(userId, petId), periodicId),
      omitUndefined({ ...input, updatedAt: serverTimestamp() }),
    );
  },

  async deletePeriodic(userId: string, petId: string, periodicId: string): Promise<void> {
    if (DEV_MODE) { _periodicStore.delete(periodicId); return; }
    await deleteDoc(doc(periodicCol(userId, petId), periodicId));
  },
};

export default foodService;
