import type { Landmark, TrackingFrame } from "../domain/tracking";

type UnknownRecord = Record<string, unknown>;

type IsRecord = (value: unknown) => value is UnknownRecord;
const isRecord: IsRecord = (value): value is UnknownRecord => value !== null && typeof value === "object";

type ReadNumber = (value: unknown, fallback?: number) => number;
const readNumber: ReadNumber = (value, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

type ReadLandmarks = (value: unknown) => Landmark[];
const readLandmarks: ReadLandmarks = (value) => {
  const values = Array.isArray(value) ? value : [];
  return values.flatMap((item) => {
    if (!isRecord(item) || typeof item.x !== "number" || typeof item.y !== "number") return [];
    return [{
      x: readNumber(item.x),
      y: readNumber(item.y),
      z: readNumber(item.z),
      ...(typeof item.visibility === "number" ? { visibility: item.visibility } : {}),
    }];
  });
};

type FindLandmarks = (source: UnknownRecord, keys: string[]) => Landmark[];
const findLandmarks: FindLandmarks = (source, keys) => {
  for (const key of keys) {
    const direct = readLandmarks(source[key]);
    if (direct.length) return direct;
    const nested = Array.isArray(source[key]) ? source[key] : [];
    for (const candidate of nested) {
      const collection = readLandmarks(candidate);
      if (collection.length) return collection;
    }
  }
  return [];
};

type NormalizeTrackingResult = (input: unknown, timestamp?: number) => TrackingFrame;
export const normalizeTrackingResult: NormalizeTrackingResult = (input, timestamp = Date.now()) => {
  const inputRecord = isRecord(input) ? input : {};
  const rootValue = inputRecord.data ?? input;
  const root = isRecord(rootValue) ? rootValue : {};
  const hands = Array.isArray(root.handLandmarks) ? root.handLandmarks : [];
  const handedness = Array.isArray(root.handednesses) ? root.handednesses : [];
  let leftHandLandmarks = findLandmarks(root, ["leftHandLandmarks", "left_hand_landmarks"]);
  let rightHandLandmarks = findLandmarks(root, ["rightHandLandmarks", "right_hand_landmarks"]);

  handedness.forEach((entry, index) => {
    const entryRecord = isRecord(entry) ? entry : {};
    const categories = Array.isArray(entryRecord.categories) ? entryRecord.categories : [];
    const category = Array.isArray(entry) ? entry[0] : categories[0] ?? entry;
    const categoryRecord = isRecord(category) ? category : {};
    const label = String(categoryRecord.categoryName ?? categoryRecord.displayName ?? categoryRecord.label ?? "").toLowerCase();
    const points = readLandmarks(hands[index]);
    if (label.includes("left")) leftHandLandmarks = points;
    if (label.includes("right")) rightHandLandmarks = points;
  });

  return {
    timestamp: readNumber(root.timestamp, timestamp),
    poseLandmarks: findLandmarks(root, ["poseLandmarks", "pose_landmarks", "multiPoseLandmarks"]),
    faceLandmarks: findLandmarks(root, ["faceLandmarks", "face_landmarks", "multiFaceLandmarks"]),
    leftHandLandmarks,
    rightHandLandmarks,
  };
};
