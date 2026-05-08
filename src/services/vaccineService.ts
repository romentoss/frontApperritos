import {
  collection, doc, addDoc, getDoc, getDocs,
  updateDoc, deleteDoc, query, orderBy, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { Vaccine } from "../types";
import { omitUndefined } from "../utils/firestore";
import {
  scheduleVaccineNotification,
  cancelNotification,
} from "./notificationService";

const DEV_MODE = false;

const _store: Map<string, Vaccine> = new Map();
let _counter = 1;

export type VaccineInput = {
  petId: string;
  name: string;
  appliedDate: string;
  nextDoseDate?: string;
  veterinarian?: string;
  notes?: string;
};

function vaccinesCol(userId: string, petId: string) {
  return collection(db, "users", userId, "pets", petId, "vaccines");
}

function _fromFirestore(id: string, data: any): Vaccine {
  return {
    id,
    petId: data.petId,
    name: data.name,
    appliedDate: data.appliedDate,
    nextDoseDate: data.nextDoseDate,
    veterinarian: data.veterinarian,
    notes: data.notes,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : data.createdAt,
  };
}

const vaccineService = {
  async getAllForPet(userId: string, petId: string): Promise<Vaccine[]> {
    if (DEV_MODE) {
      return [..._store.values()]
        .filter((v) => v.petId === petId)
        .sort((a, b) => b.appliedDate.localeCompare(a.appliedDate));
    }
    const q = query(vaccinesCol(userId, petId), orderBy("appliedDate", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => _fromFirestore(d.id, d.data()));
  },

  async getAllForPets(userId: string, petIds: string[]): Promise<Vaccine[]> {
    if (DEV_MODE) {
      return [..._store.values()]
        .filter((v) => petIds.includes(v.petId))
        .sort((a, b) => b.appliedDate.localeCompare(a.appliedDate));
    }
    const results: Vaccine[] = [];
    for (const petId of petIds) {
      const list = await vaccineService.getAllForPet(userId, petId);
      results.push(...list);
    }
    return results.sort((a, b) => b.appliedDate.localeCompare(a.appliedDate));
  },

  async getById(userId: string, petId: string, vaccineId: string): Promise<Vaccine | null> {
    if (DEV_MODE) return _store.get(vaccineId) ?? null;
    const snap = await getDoc(doc(vaccinesCol(userId, petId), vaccineId));
    if (!snap.exists()) return null;
    return _fromFirestore(snap.id, snap.data());
  },

  async create(userId: string, input: VaccineInput): Promise<Vaccine> {
    if (DEV_MODE) {
      const id = `dev-vaccine-${_counter++}`;
      const vaccine: Vaccine = { id, createdAt: new Date().toISOString(), ...input };
      const notificationId = await scheduleVaccineNotification(vaccine);
      if (notificationId) vaccine.notificationId = notificationId;
      _store.set(id, vaccine);
      return vaccine;
    }
    const { petId, ...data } = input;
    const payload = omitUndefined({
      ...data, petId, createdAt: serverTimestamp(),
    });
    const docRef = await addDoc(vaccinesCol(userId, petId), payload);
    const snap = await getDoc(docRef);
    return _fromFirestore(snap.id, snap.data()!);
  },

  async update(userId: string, petId: string, vaccineId: string, input: Partial<VaccineInput>): Promise<void> {
    if (DEV_MODE) {
      const existing = _store.get(vaccineId);
      if (existing) {
        if (input.nextDoseDate && input.nextDoseDate !== existing.nextDoseDate) {
          if (existing.notificationId) await cancelNotification(existing.notificationId);
          const updated: Vaccine = { ...existing, ...input };
          const notificationId = await scheduleVaccineNotification(updated);
          _store.set(vaccineId, { ...updated, notificationId: notificationId ?? undefined });
        } else {
          _store.set(vaccineId, { ...existing, ...input });
        }
      }
      return;
    }
    await updateDoc(doc(vaccinesCol(userId, petId), vaccineId), omitUndefined({ ...input }));
  },

  async delete(userId: string, petId: string, vaccineId: string): Promise<void> {
    if (DEV_MODE) {
      const existing = _store.get(vaccineId);
      if (existing?.notificationId) await cancelNotification(existing.notificationId);
      _store.delete(vaccineId);
      return;
    }
    await deleteDoc(doc(vaccinesCol(userId, petId), vaccineId));
  },
};

export default vaccineService;
