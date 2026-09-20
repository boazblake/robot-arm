import type { Landmark, TrackingFrame } from "../../model/tracking-frame";

type UnknownRecord = Readonly<Record<string, unknown>>;

type IsRecord = (value: unknown) => value is UnknownRecord;
const isRecord: IsRecord = (value): value is UnknownRecord =>
  value !== null && typeof value === "object" && !Array.isArray(value);

type IsFiniteNumber = (value: unknown) => value is number;
const isFiniteNumber: IsFiniteNumber = (value): value is number =>
  typeof value === "number" && Number.isFinite(value);

type ReadLandmark = (value: unknown) => Landmark | null;
const readLandmark: ReadLandmark = (value) => {
  if (
    !isRecord(value) ||
    !isFiniteNumber(value.x) ||
    !isFiniteNumber(value.y) ||
    !isFiniteNumber(value.z)
  )
    return null;
  if (value.visibility !== undefined && !isFiniteNumber(value.visibility))
    return null;
  return Object.freeze({
    x: value.x,
    y: value.y,
    z: value.z,
    ...(value.visibility === undefined ? {} : { visibility: value.visibility }),
  });
};

type NormalizeLandmarkCollection = (value: unknown) => readonly Landmark[];
const normalizeLandmarkCollection: NormalizeLandmarkCollection = (value) => {
  if (!Array.isArray(value) || value.length === 0) return Object.freeze([]);
  const points = Array.isArray(value[0])
    ? value.find((candidate): candidate is unknown[] => Array.isArray(candidate)) ?? []
    : value;
  const landmarks = points.map(readLandmark);
  const validLandmarks = landmarks.filter(
    (landmark): landmark is Landmark => landmark !== null
  );
  if (validLandmarks.length !== landmarks.length) return Object.freeze([]);
  return Object.freeze(validLandmarks);
};

type FindLandmarks = (
  source: UnknownRecord,
  keys: readonly string[]
) => readonly Landmark[];
const findLandmarks: FindLandmarks = (source, keys) => {
  const key = keys.find((candidate) =>
    Object.prototype.hasOwnProperty.call(source, candidate)
  );
  return key === undefined
    ? Object.freeze([])
    : normalizeLandmarkCollection(source[key]);
};

const MINIMUM_HAND_CONFIDENCE = 0.5;

type ReadHandCategoryLabel = (value: unknown) => "left" | "right" | null;
const readHandCategoryLabel: ReadHandCategoryLabel = (value) => {
  if (!isRecord(value)) return null;
  const label = value.categoryName ?? value.displayName ?? value.label;
  if (typeof label !== "string") return null;
  if (
    value.score !== undefined &&
    (!isFiniteNumber(value.score) || value.score < MINIMUM_HAND_CONFIDENCE)
  )
    return null;
  const normalized = label.trim().toLowerCase();
  return normalized === "left" || normalized === "right" ? normalized : null;
};

type ReadHandLabel = (value: unknown) => "left" | "right" | null;
const readHandLabel: ReadHandLabel = (value) => {
  const categories = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.categories)
      ? value.categories
      : [value];
  const labels = categories
    .map(readHandCategoryLabel)
    .filter((label): label is "left" | "right" => label !== null);
  const uniqueLabels = [...new Set(labels)];
  return uniqueLabels.length === 1 ? uniqueLabels[0] : null;
};

type HandAssignment = Readonly<{
  readonly left: readonly Landmark[];
  readonly right: readonly Landmark[];
}>;

const wristDistance = (hand: readonly Landmark[], poseWrist: Landmark): number => {
  const handWrist = hand[0];
  return handWrist === undefined
    ? Number.POSITIVE_INFINITY
    : Math.hypot(handWrist.x - poseWrist.x, handWrist.y - poseWrist.y);
};

type AssignHandsToPose = (
  hands: readonly (readonly Landmark[])[],
  pose: readonly Landmark[],
) => HandAssignment | null;
const assignHandsToPose: AssignHandsToPose = (hands, pose) => {
  const leftWrist = pose[15];
  const rightWrist = pose[16];
  if (leftWrist === undefined || rightWrist === undefined || hands.length === 0 || hands.length > 2) {
    return null;
  }
  if (hands.length === 1) {
    return wristDistance(hands[0], leftWrist) <= wristDistance(hands[0], rightWrist)
      ? { left: hands[0], right: [] }
      : { left: [], right: hands[0] };
  }
  const firstAsLeft = wristDistance(hands[0], leftWrist) + wristDistance(hands[1], rightWrist);
  const firstAsRight = wristDistance(hands[0], rightWrist) + wristDistance(hands[1], leftWrist);
  return firstAsLeft <= firstAsRight
    ? { left: hands[0], right: hands[1] }
    : { left: hands[1], right: hands[0] };
};

export type WebTrackingResults = {
  readonly pose: unknown;
  readonly hands: unknown;
  readonly face: unknown;
};

type NormalizeTrackingResult = (
  input: unknown,
  timestamp?: number
) => TrackingFrame;
export const normalizeTrackingResult: NormalizeTrackingResult = (
  input,
  timestamp
) => {
  const boundaryTimestamp = isFiniteNumber(timestamp) ? timestamp : Date.now();
  const inputRecord = isRecord(input) ? input : {};
  const rootValue = inputRecord.data ?? input;
  const root = isRecord(rootValue) ? rootValue : {};
  const sourceTimestamp = root.timestamp;
  const frameTimestamp = isFiniteNumber(timestamp)
    ? timestamp
    : timestamp !== undefined
      ? boundaryTimestamp
      : isFiniteNumber(sourceTimestamp)
        ? sourceTimestamp
        : boundaryTimestamp;
  const hands = Array.isArray(root.handLandmarks)
    ? root.handLandmarks
    : Array.isArray(root.multiHandLandmarks)
      ? root.multiHandLandmarks
      : [];
  const handedness = Array.isArray(root.handednesses)
    ? root.handednesses
    : Array.isArray(root.handedness)
      ? root.handedness
      : [];
  const explicitLeftHandLandmarks = findLandmarks(root, [
    "leftHandLandmarks",
    "left_hand_landmarks",
  ]);
  const explicitRightHandLandmarks = findLandmarks(root, [
    "rightHandLandmarks",
    "right_hand_landmarks",
  ]);
  const poseLandmarks = findLandmarks(root, [
    "poseLandmarks",
    "pose_landmarks",
    "multiPoseLandmarks",
  ]);
  const poseWorldLandmarks = findLandmarks(root, [
    "poseWorldLandmarks",
    "pose_world_landmarks",
    "worldLandmarks",
    "world_landmarks",
  ]);
  const normalizedHands = hands
    .map(normalizeLandmarkCollection)
    .filter((points): points is readonly Landmark[] => points.length > 0);
  const poseAssignment = assignHandsToPose(normalizedHands, poseLandmarks);
  const assignments = handedness.reduce<Readonly<Record<"left" | "right", readonly Landmark[] | null | undefined>>>((result, entry, index) => {
    const label = readHandLabel(entry);
    const points = label === null ? Object.freeze([]) : normalizeLandmarkCollection(hands[index]);
    if (label === null || points.length === 0) return result;
    if (result[label] !== undefined) return { ...result, [label]: null };
    return { ...result, [label]: points };
  }, { left: undefined, right: undefined });
  const leftHandLandmarks = explicitLeftHandLandmarks.length > 0
    ? explicitLeftHandLandmarks
    : poseAssignment?.left ?? assignments.left ?? Object.freeze([]);
  const rightHandLandmarks = explicitRightHandLandmarks.length > 0
    ? explicitRightHandLandmarks
    : poseAssignment?.right ?? assignments.right ?? Object.freeze([]);

  return Object.freeze({
    timestamp: frameTimestamp,
    poseLandmarks,
    ...(poseWorldLandmarks.length > 0 ? { poseWorldLandmarks } : {}),
    leftHandLandmarks,
    rightHandLandmarks,
    faceLandmarks: findLandmarks(root, [
      "faceLandmarks",
      "face_landmarks",
      "multiFaceLandmarks",
    ]),
  });
};

type NormalizeWebTrackingResults = (
  results: WebTrackingResults,
  timestamp: number
) => TrackingFrame;
export const normalizeWebTrackingResults: NormalizeWebTrackingResults = (
  results,
  timestamp
) => {
  const pose = isRecord(results.pose) ? results.pose : {};
  return normalizeTrackingResult(
    {
      poseLandmarks: Array.isArray(pose.landmarks)
        ? pose.landmarks[0]
        : [],
      handLandmarks: isRecord(results.hands)
        ? results.hands.landmarks
        : undefined,
      handednesses: isRecord(results.hands)
        ? results.hands.handednesses
        : undefined,
      ...(isRecord(results.face) ? results.face : {}),
    },
    timestamp
  );
};
