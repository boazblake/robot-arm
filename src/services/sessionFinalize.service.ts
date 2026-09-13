import {
  type SessionSummary,
} from "../domain/session";
import { addSessionSummary, calculateSessionScore } from "../stores/sessionStore";

export interface FinalizeSessionInput {
  exerciseName: string;
  reps: number;
  status: string;
  startTime: number | null;
  frameCount: number;
  hadError: boolean;
}

const durationFromStart = (startTime: number | null) => {
  if (!startTime) return 0;
  return Math.max(0, Math.round((Date.now() - startTime) / 1000));
};

export const buildSessionSummary = (
  input: FinalizeSessionInput
): SessionSummary => {
  const durationSec = durationFromStart(input.startTime);
  const score = calculateSessionScore({
    reps: input.reps,
    durationSec,
    frameCount: input.frameCount,
    hadError: input.hadError,
  });

  return {
    id: String(Date.now()),
    exercise: input.exerciseName || "Unknown",
    reps: Math.max(0, Math.round(input.reps || 0)),
    status: input.status || "Ready",
    durationSec,
    recordedAt: new Date().toISOString(),
    frameCount: Math.max(0, Math.round(input.frameCount || 0)),
    score,
  };
};

export const saveSessionSummary = (summary: SessionSummary) => {
  addSessionSummary(summary);
};
