import { Walk } from "../types";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  color: string; // fondo del badge cuando está desbloqueado
  unlocked: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function totalMeters(walks: Walk[]): number {
  return walks.reduce((s, w) => s + w.distanceMeters, 0);
}

function consecutiveDays(walks: Walk[]): number {
  if (!walks.length) return 0;
  const days = [
    ...new Set(
      walks.map((w) => new Date(w.startTime).toISOString().slice(0, 10))
    ),
  ].sort();
  let best = 1;
  let current = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const curr = new Date(days[i]);
    const diffDays =
      (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays === 1) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }
  return best;
}

// ── Definición de conquistas ───────────────────────────────────────────────

type AchievementDef = Omit<Achievement, "unlocked"> & {
  check: (walks: Walk[]) => boolean;
};

const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: "first_walk",
    emoji: "🥾",
    title: "Primer paso",
    description: "Completa tu primer recorrido",
    color: "#FF6B35",
    check: (w) => w.length >= 1,
  },
  {
    id: "walks_5",
    emoji: "🔥",
    title: "En racha",
    description: "Completa 5 paseos",
    color: "#E05020",
    check: (w) => w.length >= 5,
  },
  {
    id: "walks_20",
    emoji: "🎯",
    title: "Veterano",
    description: "Completa 20 paseos",
    color: "#C04010",
    check: (w) => w.length >= 20,
  },
  {
    id: "walks_100",
    emoji: "💯",
    title: "Centenario",
    description: "Completa 100 paseos",
    color: "#9B2000",
    check: (w) => w.length >= 100,
  },
  {
    id: "km_1_single",
    emoji: "📏",
    title: "1 km de un tirón",
    description: "Recorre 1 km en un solo paseo",
    color: "#4ECDC4",
    check: (w) => w.some((x) => x.distanceMeters >= 1000),
  },
  {
    id: "km_5_single",
    emoji: "🏃",
    title: "5 km sin parar",
    description: "Recorre 5 km en un solo paseo",
    color: "#2EADA4",
    check: (w) => w.some((x) => x.distanceMeters >= 5000),
  },
  {
    id: "km_total_5",
    emoji: "🗺️",
    title: "Explorador",
    description: "Acumula 5 km en total",
    color: "#2E86AB",
    check: (w) => totalMeters(w) >= 5000,
  },
  {
    id: "km_total_20",
    emoji: "🌍",
    title: "Gran Explorador",
    description: "Acumula 20 km en total",
    color: "#1A6585",
    check: (w) => totalMeters(w) >= 20000,
  },
  {
    id: "km_total_100",
    emoji: "🏆",
    title: "Maratón canino",
    description: "Acumula 100 km en total",
    color: "#F6C90E",
    check: (w) => totalMeters(w) >= 100000,
  },
  {
    id: "long_walk_30",
    emoji: "⏱️",
    title: "Paseo largo",
    description: "Un paseo de 30 minutos seguidos",
    color: "#9B59B6",
    check: (w) => w.some((x) => x.durationSeconds >= 1800),
  },
  {
    id: "long_walk_60",
    emoji: "⌛",
    title: "Hora de paseo",
    description: "Un paseo de 1 hora seguida",
    color: "#6C3483",
    check: (w) => w.some((x) => x.durationSeconds >= 3600),
  },
  {
    id: "early_bird",
    emoji: "🌅",
    title: "Madrugador",
    description: "Un paseo que empiece antes de las 8:00",
    color: "#F39C12",
    check: (w) =>
      w.some((x) => new Date(x.startTime).getHours() < 8),
  },
  {
    id: "night_owl",
    emoji: "🌙",
    title: "Noctámbulo",
    description: "Un paseo que empiece después de las 21:00",
    color: "#2C3E50",
    check: (w) =>
      w.some((x) => new Date(x.startTime).getHours() >= 21),
  },
  {
    id: "streak_3",
    emoji: "📅",
    title: "3 días seguidos",
    description: "Pasea 3 días consecutivos",
    color: "#27AE60",
    check: (w) => consecutiveDays(w) >= 3,
  },
  {
    id: "streak_7",
    emoji: "🗓️",
    title: "Semana perfecta",
    description: "Pasea 7 días seguidos",
    color: "#1E8449",
    check: (w) => consecutiveDays(w) >= 7,
  },
  {
    id: "journalist",
    emoji: "📝",
    title: "Memorialista",
    description: "Añade una nota a un recorrido",
    color: "#E67E22",
    check: (w) => w.some((x) => !!x.notes?.trim()),
  },
];

// ── Función pública ────────────────────────────────────────────────────────

/** Devuelve todas las conquistas con su estado unlocked calculado */
export function computeAchievements(walks: Walk[]): Achievement[] {
  return ACHIEVEMENT_DEFS.map((def) => ({
    id: def.id,
    title: def.title,
    description: def.description,
    emoji: def.emoji,
    color: def.color,
    unlocked: def.check(walks),
  }));
}

/** Cuántas conquistas están desbloqueadas */
export function countUnlocked(walks: Walk[]): number {
  return ACHIEVEMENT_DEFS.filter((def) => def.check(walks)).length;
}

export const TOTAL_ACHIEVEMENTS = ACHIEVEMENT_DEFS.length;
