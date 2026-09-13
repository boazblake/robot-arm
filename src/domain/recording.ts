export interface RecordingPoint {
  x: number;
  y: number;
}

export interface RecordingFrame {
  timestamp: number;
  data: {
    poseLandmarks?: RecordingPoint[];
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object";

const isPoint = (value: unknown): value is RecordingPoint => {
  if (!isRecord(value)) return false;
  return Number.isFinite(Number(value.x)) && Number.isFinite(Number(value.y));
};

const toFrame = (value: unknown): RecordingFrame | null => {
  if (!isRecord(value)) return null;
  const timestamp = Number(value.timestamp);
  if (!Number.isFinite(timestamp)) return null;

  const data = isRecord(value.data) ? value.data : {};
  const poseLandmarks = Array.isArray(data.poseLandmarks)
    ? data.poseLandmarks.filter(isPoint)
    : [];

  return {
    timestamp,
    data: { poseLandmarks },
  };
};

export const parseRecordingFrames = (raw: string): {
  frames: RecordingFrame[];
  droppedFrames: number;
  error?: string;
} => {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return { frames: [], droppedFrames: 0, error: "Recording JSON must be an array." };
    }

    const next = parsed.map(toFrame);
    const frames = next.filter((f): f is RecordingFrame => Boolean(f));
    const droppedFrames = parsed.length - frames.length;
    return { frames, droppedFrames };
  } catch {
    return { frames: [], droppedFrames: 0, error: "Invalid JSON file." };
  }
};
