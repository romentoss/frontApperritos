import {
  collection, doc, addDoc, getDoc, getDocs,
  updateDoc, deleteDoc, query, orderBy, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { Appointment } from "../types";
import { omitUndefined } from "../utils/firestore";
import {
  scheduleAppointmentNotification,
  cancelNotification,
} from "./notificationService";

const DEV_MODE = false;

const _store: Map<string, Appointment> = new Map();
let _counter = 1;

export type AppointmentInput = {
  petId: string;
  type: "vet" | "grooming";
  title: string;
  dateTime: string;   // ISO 8601
  location?: string;
  professional?: string;
  notes?: string;
  completed?: boolean;
};

function appointmentsCol(userId: string, petId: string) {
  return collection(db, "users", userId, "pets", petId, "appointments");
}

function _fromFirestore(id: string, data: any): Appointment {
  return {
    id,
    petId: data.petId,
    type: data.type,
    title: data.title,
    dateTime:
      data.dateTime instanceof Timestamp
        ? data.dateTime.toDate().toISOString()
        : data.dateTime,
    location: data.location,
    professional: data.professional,
    notes: data.notes,
    completed: data.completed ?? false,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : data.createdAt,
  };
}

const appointmentService = {
  async getAllForPet(userId: string, petId: string): Promise<Appointment[]> {
    if (DEV_MODE) {
      return [..._store.values()]
        .filter((a) => a.petId === petId)
        .sort((a, b) => b.dateTime.localeCompare(a.dateTime));
    }
    const q = query(appointmentsCol(userId, petId), orderBy("dateTime", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => _fromFirestore(d.id, d.data()));
  },

  async getAllForPets(userId: string, petIds: string[]): Promise<Appointment[]> {
    if (DEV_MODE) {
      return [..._store.values()]
        .filter((a) => petIds.includes(a.petId))
        .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
    }
    const results: Appointment[] = [];
    for (const petId of petIds) {
      const list = await appointmentService.getAllForPet(userId, petId);
      results.push(...list);
    }
    return results.sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  },

  async getById(userId: string, petId: string, appointmentId: string): Promise<Appointment | null> {
    if (DEV_MODE) return _store.get(appointmentId) ?? null;
    const snap = await getDoc(doc(appointmentsCol(userId, petId), appointmentId));
    if (!snap.exists()) return null;
    return _fromFirestore(snap.id, snap.data());
  },

  async create(userId: string, input: AppointmentInput): Promise<Appointment> {
    if (DEV_MODE) {
      const id = `dev-appt-${_counter++}`;
      const appt: Appointment = {
        id,
        createdAt: new Date().toISOString(),
        completed: false,
        ...input,
      };
      const notificationId = await scheduleAppointmentNotification(appt);
      if (notificationId) appt.notificationId = notificationId;
      _store.set(id, appt);
      return appt;
    }
    const { petId, ...data } = input;
    const payload = omitUndefined({
      ...data, petId, completed: false, createdAt: serverTimestamp(),
    });
    const docRef = await addDoc(appointmentsCol(userId, petId), payload);
    const snap = await getDoc(docRef);
    return _fromFirestore(snap.id, snap.data()!);
  },

  async update(userId: string, petId: string, appointmentId: string, input: Partial<AppointmentInput>): Promise<void> {
    if (DEV_MODE) {
      const existing = _store.get(appointmentId);
      if (existing) {
        // Si cambió la fecha/hora, reprogramar la notificación
        if (input.dateTime && input.dateTime !== existing.dateTime) {
          if (existing.notificationId) await cancelNotification(existing.notificationId);
          const updated: Appointment = { ...existing, ...input };
          const notificationId = await scheduleAppointmentNotification(updated);
          _store.set(appointmentId, { ...updated, notificationId: notificationId ?? undefined });
        } else {
          _store.set(appointmentId, { ...existing, ...input });
        }
      }
      return;
    }
    await updateDoc(doc(appointmentsCol(userId, petId), appointmentId), omitUndefined({ ...input }));
  },

  async markComplete(userId: string, petId: string, appointmentId: string): Promise<void> {
    if (DEV_MODE) {
      const existing = _store.get(appointmentId);
      if (existing) _store.set(appointmentId, { ...existing, completed: true });
      return;
    }
    await updateDoc(doc(appointmentsCol(userId, petId), appointmentId), { completed: true });
  },

  async delete(userId: string, petId: string, appointmentId: string): Promise<void> {
    if (DEV_MODE) {
      const existing = _store.get(appointmentId);
      if (existing?.notificationId) await cancelNotification(existing.notificationId);
      _store.delete(appointmentId);
      return;
    }
    await deleteDoc(doc(appointmentsCol(userId, petId), appointmentId));
  },
};

export default appointmentService;
