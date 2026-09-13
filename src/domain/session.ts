export const SESSION_STORAGE_KEY = "liftmate.sessionSummaries.v1";

export interface SessionSummary {
  id: string;
  exercise: string;
  reps: number;
  status: string;
  durationSec: number;
  recordedAt: string;
  frameCount: number;
  score: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object";

const asNonNegativeInt = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.round(n));
};

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

export const toSessionSummary = (value: unknown): SessionSummary | null => {
  if (!isRecord(value)) return null;

  const id = asString(value.id, "");
  const exercise = asString(value.exercise, "Unknown");
  const status = asString(value.status, "Ready");
  const recordedAt = asString(value.recordedAt, new Date().toISOString());

  if (!id || !exercise) return null;

  return {
    id,
    exercise,
    status,
    recordedAt,
    reps: asNonNegativeInt(value.reps),
    durationSec: asNonNegativeInt(value.durationSec),
    frameCount: asNonNegativeInt(value.frameCount),
    score: Math.min(100, asNonNegativeInt(value.score)),
  };
};

export const isSessionSummary = (value: unknown): value is SessionSummary =>
  Boolean(toSessionSummary(value));

export const parseSessionSummaries = (raw: string | null): SessionSummary[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(toSessionSummary)
      .filter((entry): entry is SessionSummary => Boolean(entry));
  } catch {
    return [];
  }
};
