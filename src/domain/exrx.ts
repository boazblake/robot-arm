import dataset from "./data/exrx-exercises.json";

export type ExRxClassification = {
  utility?: string;
  mechanics?: string;
  force?: string;
};

export type ExRxExercise = {
  name: string;
  canonicalUrl: string;
  normalizedName: string;
  source: string[];
  classification: ExRxClassification;
  instructions: { preparation: string; execution: string };
  comments: string;
  muscles: Record<string, string[]>;
  relatedLinks?: Array<{ url: string; text: string }>;
};

export type ExRxDataset = { source: string; generatedAt: string; count: number; exercises: ExRxExercise[] };

export const exrx = dataset as ExRxDataset;

const byName = new Map(exrx.exercises.flatMap((e) => [[e.normalizedName, e], [e.name.toLowerCase(), e]]));

export const normalizeExerciseName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export const getExRxExercise = (name: string) => byName.get(normalizeExerciseName(name)) || byName.get(name.toLowerCase());

export const getExRxExerciseNames = () => exrx.exercises.map((exercise) => exercise.name);

export const getExerciseAnalysisProfile = (name: string) => {
  const normalizedName = normalizeExerciseName(name);
  const key = normalizedName.includes("squat")
    ? "squat"
    : normalizedName.includes("lunge")
      ? "lunge"
      : normalizedName.includes("press")
        ? "press"
        : normalizedName.includes("deadlift") || normalizedName.includes("hinge") || normalizedName.includes("row")
          ? "hinge"
          : normalizedName.includes("pull") || normalizedName.includes("curl")
            ? "pull"
            : normalizedName.includes("plank") || normalizedName.includes("crunch") || normalizedName.includes("core")
              ? "core"
              : normalizedName.includes("jump") || normalizedName.includes("run") || normalizedName.includes("burpee")
                ? "cardio"
                : "generic";
  return { key, display: name || "Ready" };
};

const fallbackCues: Record<string, string[]> = {
  squat: ["Brace your core.", "Keep knees tracking over toes.", "Control the descent."],
  "bench press": ["Keep shoulders packed.", "Lower with control.", "Drive through the floor and press evenly."],
  "overhead press": ["Ribs down, glutes tight.", "Press in a straight path.", "Keep wrists stacked over elbows."],
};

export const synthesizeFeedbackCues = (name: string) => {
  const ex = getExRxExercise(name);
  const cues = [ex?.comments, ex?.instructions.preparation, ex?.instructions.execution]
    .filter(Boolean)
    .join(" ")
    .split(/[.\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 18)
    .slice(0, 4);
  return cues.length ? cues : fallbackCues[normalizeExerciseName(name)] || ["Move with control.", "Maintain stable posture."];
};
