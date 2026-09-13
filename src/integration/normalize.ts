import type { Landmark, TrackingFrame } from "../domain/tracking";

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
const number = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const landmarks = (value: unknown): Landmark[] => {
  const values = Array.isArray(value) ? value : [];
  return values.flatMap((item) => {
    const point = record(item);
    return typeof point.x === "number" && typeof point.y === "number"
      ? [{ x: number(point.x), y: number(point.y), z: number(point.z), ...(typeof point.visibility === "number" ? { visibility: point.visibility } : {}) }]
      : [];
  });
};
const first = (source: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) { const value = landmarks(source[key]); if (value.length) return value; }
  return [];
};

export const normalizeTrackingResult = (input: unknown, timestamp = Date.now()): TrackingFrame => {
  const root = record(record(input).data ?? input);
  const hands = Array.isArray(root.handLandmarks) ? root.handLandmarks : [];
  const handedness = Array.isArray(root.handednesses) ? root.handednesses : [];
  let left = first(root, ["leftHandLandmarks", "left_hand_landmarks"]);
  let right = first(root, ["rightHandLandmarks", "right_hand_landmarks"]);
  handedness.forEach((entry, index) => {
    const label = String(record(Array.isArray(entry) ? entry[0] : entry).categoryName ?? record(entry).label ?? "").toLowerCase();
    const points = landmarks(hands[index]);
    if (label.includes("left")) left = points;
    if (label.includes("right")) right = points;
  });
  return {
    timestamp: number(root.timestamp, timestamp),
    poseLandmarks: first(root, ["poseLandmarks", "pose_landmarks", "multiPoseLandmarks"]),
    faceLandmarks: first(root, ["faceLandmarks", "face_landmarks", "multiFaceLandmarks"]),
    leftHandLandmarks: left,
    rightHandLandmarks: right,
  };
};
