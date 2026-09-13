import Stream from "mithril/stream";
import {
  SESSION_STORAGE_KEY,
  type SessionSummary,
  parseSessionSummaries,
} from "../domain/session";

export const sessionSummaries = Stream<SessionSummary[]>([]);

export const loadSessionSummaries = () => {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  sessionSummaries(parseSessionSummaries(raw));
};

export const addSessionSummary = (summary: SessionSummary) => {
  const next = [summary, ...sessionSummaries()].slice(0, 100);
  sessionSummaries(next);
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next));
};

export const calculateSessionScore = (input: {
  reps: number;
  durationSec: number;
  frameCount: number;
  hadError: boolean;
}) => {
  const completion = input.hadError ? 10 : 35;
  const repScore = Math.min(35, input.reps * 3);
  const stability = Math.min(20, Math.floor(input.frameCount / 30));
  const finish = input.durationSec >= 20 ? 10 : 4;
  return Math.max(0, Math.min(100, completion + repScore + stability + finish));
};
