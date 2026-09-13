export type MovementPattern = "squat" | "horizontal_press" | "vertical_press";

export type TrackableExercise = {
  id: "squat" | "bench-press" | "overhead-press";
  canonicalName: "Squat" | "Bench Press" | "Overhead Press";
  aliases: string[];
  movementPattern: MovementPattern;
};

export const trackableExerciseCatalog: readonly TrackableExercise[] = [
  {
    id: "squat",
    canonicalName: "Squat",
    movementPattern: "squat",
    aliases: [
      "squat",
      "barbell squat",
      "back squat",
      "front squat",
      "high bar squat",
      "low bar squat",
      "smith squat",
      "goblet squat",
    ],
  },
  {
    id: "bench-press",
    canonicalName: "Bench Press",
    movementPattern: "horizontal_press",
    aliases: [
      "bench press",
      "barbell bench press",
      "flat bench press",
      "chest press",
      "barbell chest press",
      "dumbbell bench press",
      "smith bench press",
      "incline bench press",
      "decline bench press",
      "close grip bench press",
    ],
  },
  {
    id: "overhead-press",
    canonicalName: "Overhead Press",
    movementPattern: "vertical_press",
    aliases: [
      "overhead press",
      "shoulder press",
      "military press",
      "barbell overhead press",
      "barbell military press",
      "dumbbell shoulder press",
      "seated shoulder press",
      "standing shoulder press",
      "strict press",
      "ohp",
    ],
  },
] as const;

const normalize = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

export const resolveTrackableExercise = (name: string): TrackableExercise | null => {
  const key = normalize(name);
  for (const item of trackableExerciseCatalog) {
    if (normalize(item.canonicalName) === key) return item;
    if (item.aliases.some((alias) => normalize(alias) === key)) return item;
  }
  if (key.includes("squat")) return trackableExerciseCatalog[0];
  if (key.includes("bench")) return trackableExerciseCatalog[1];
  if (key.includes("overhead") || key.includes("shoulder") || key.includes("press") || key === "ohp") {
    return trackableExerciseCatalog[2];
  }
  return null;
};

export const getTrackableExerciseByName = (name: string) =>
  trackableExerciseCatalog.find((item) => item.canonicalName === name) || null;
