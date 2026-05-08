import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { Appointment } from "../types";

/** Configura el canal de notificaciones para Android (obligatorio en Android 8+) */
export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("appointments", {
      name: "Citas",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF6B35",
      sound: "default",
    });
  }
}

/** Solicita permisos al usuario (iOS requiere permiso explícito). */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/**
 * Programa una notificación local para el día de la cita.
 *
 * Lógica de trigger:
 *  1. Si la cita es hoy y son antes de las 9:00 → dispara a las 9:00 AM.
 *  2. Si la cita es hoy y ya pasaron las 9:00 → dispara 1 hora antes de la cita.
 *  3. Si la cita es otro día → dispara a las 9:00 AM de ese día.
 *  4. Si todo quedó en el pasado → no programa.
 *
 * @returns el identificador de la notificación (para cancelarla después), o null.
 */
export async function scheduleAppointmentNotification(
  appointment: Appointment,
  petName?: string
): Promise<string | null> {
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return null;

    const apptDate = new Date(appointment.dateTime);
    const now = new Date();

    // Intento 1: 9:00 AM del día de la cita
    const nineAM = new Date(apptDate);
    nineAM.setHours(9, 0, 0, 0);

    let triggerDate: Date;
    if (nineAM > now) {
      triggerDate = nineAM;
    } else {
      // Intento 2: 1 hora antes de la cita
      triggerDate = new Date(apptDate.getTime() - 60 * 60 * 1000);
    }

    // Si el trigger ya pasó, no programar
    if (triggerDate <= now) return null;

    const typeLabel = appointment.type === "vet" ? "veterinario" : "peluquería";
    const title = `🐾 Cita hoy — ${appointment.title}`;
    const body = petName
      ? `${petName} tiene cita de ${typeLabel} hoy`
      : `Tienes una cita de ${typeLabel} programada para hoy`;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { appointmentId: appointment.id },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    return id;
  } catch {
    return null;
  }
}

/** Cancela una notificación programada por su identificador. */
export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Ignorar si ya fue disparada o no existe
  }
}

/**
 * Programa una notificación el día de la próxima dosis de una vacuna.
 * Dispara a las 9:00 AM de ese día (o 1 hora antes si ya pasó las 9:00).
 */
export async function scheduleVaccineNotification(
  vaccine: { id: string; name: string; nextDoseDate?: string },
  petName?: string
): Promise<string | null> {
  if (!vaccine.nextDoseDate) return null;
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return null;

    const doseDate = new Date(vaccine.nextDoseDate);
    // Poner la hora al inicio del día para calcular las 9:00 AM
    const nineAM = new Date(doseDate);
    nineAM.setHours(9, 0, 0, 0);

    const now = new Date();
    let triggerDate: Date;
    if (nineAM > now) {
      triggerDate = nineAM;
    } else {
      // 1 hora antes del final del día si ya pasó las 9:00
      triggerDate = new Date(doseDate);
      triggerDate.setHours(18, 0, 0, 0); // 18:00 como fallback
    }

    if (triggerDate <= now) return null;

    const body = petName
      ? `${petName} necesita la dosis de ${vaccine.name} hoy`
      : `Toca poner la dosis de ${vaccine.name} hoy`;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `💉 Vacuna hoy — ${vaccine.name}`,
        body,
        data: { vaccineId: vaccine.id },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    return id;
  } catch {
    return null;
  }
}
