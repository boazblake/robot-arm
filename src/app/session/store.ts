import Stream from "mithril/stream";
import m from "mithril";
import type { TrackingFrame } from "../../tracking/model/tracking-frame";
import type { Point3D } from "../../tracking/model/pose-world-diagnostic";

type State = "Idle" | "Loading" | "Ready" | "Streaming" | "Stopped";
const transitions: Record<State, Partial<Record<string, State>>> = {
  Idle: { start: "Loading" },
  Loading: { ready: "Ready", error: "Idle" },
  Ready: { beginStreaming: "Streaming", stop: "Stopped" },
  Streaming: { stop: "Stopped" },
  Stopped: { restart: "Idle" },
};
export const state = Stream<State>("Idle");
export const transition = (event: string) => {
  const next = transitions[state()]?.[event];
  if (!next) return false;
  state(next);
  m.redraw();
  return true;
};
export const camera = {
  position: Stream<"front" | "rear">("front"),
  ready: Stream(false),
};
export const dimensions = Stream({ width: 1280, height: 720 });
export const previewFit = Stream<"cover" | "contain">("contain");
export const previewRotationDegrees = Stream(0);
const PREVIEW_ROTATION_STEP_DEGREES = 10;
const PREVIEW_ROTATION_LIMIT_DEGREES = 360;

type RotatePreview = (direction: -1 | 1) => void;
export const rotatePreview: RotatePreview = (direction) => {
  const next = previewRotationDegrees() + direction * PREVIEW_ROTATION_STEP_DEGREES;
  previewRotationDegrees(
    Math.min(PREVIEW_ROTATION_LIMIT_DEGREES, Math.max(-PREVIEW_ROTATION_LIMIT_DEGREES, next)),
  );
  m.redraw();
};

export const isFrontCamera = Stream<"web-camera-front" | null>(
  "web-camera-front"
);
export const elements = {
  video: Stream<HTMLVideoElement | null>(null),
  canvas: Stream<HTMLCanvasElement | null>(null),
  comparisonCanvas: Stream<HTMLCanvasElement | null>(null),
  comparisonContext: Stream<CanvasRenderingContext2D | null>(null),
  context: Stream<CanvasRenderingContext2D | null>(null),
};
const freezeTrackingFrame = (frame: TrackingFrame): TrackingFrame => Object.freeze({
  ...frame,
  poseLandmarks: Object.freeze(frame.poseLandmarks.map((point) => Object.freeze({ ...point }))),
  ...(frame.poseWorldLandmarks ? { poseWorldLandmarks: Object.freeze(frame.poseWorldLandmarks.map((point) => Object.freeze({ ...point }))) } : {}),
  leftHandLandmarks: Object.freeze(frame.leftHandLandmarks.map((point) => Object.freeze({ ...point }))),
  rightHandLandmarks: Object.freeze(frame.rightHandLandmarks.map((point) => Object.freeze({ ...point }))),
  faceLandmarks: Object.freeze(frame.faceLandmarks.map((point) => Object.freeze({ ...point }))),
});
export const comparison = {
  frame: Stream<TrackingFrame>({ timestamp: 0, poseLandmarks: [], leftHandLandmarks: [], rightHandLandmarks: [], faceLandmarks: [] }),
  frozenFrame: Stream<TrackingFrame | null>(null),
  available: Stream(false),
};
export const freezeComparisonFrame = (): void => {
  comparison.frozenFrame(freezeTrackingFrame(comparison.frame()));
};
export const clearComparisonFrame = (): void => {
  comparison.frozenFrame(null);
};
export const tracking = {
  ready: Stream(false),
  paused: Stream(false),
  frame: Stream<TrackingFrame>({
    timestamp: 0,
    poseLandmarks: [],
    poseWorldLandmarks: [],
    leftHandLandmarks: [],
    rightHandLandmarks: [],
    faceLandmarks: [],
  }),
};
export const features = Stream({ pose: true, hands: true, face: true });
export const diagnosticPoseWorldSource = Stream<readonly Point3D[] | null>(null);
export const diagnosticPoseWorldAngle = Stream(0);
export const diagnosticPoseWorldFrameId = Stream(0);
export const freezePoseWorldDiagnostic = (source: readonly Point3D[], frameId = 0): void => {
  diagnosticPoseWorldSource(Object.freeze(source.map((point) => Object.freeze({ ...point }))));
  diagnosticPoseWorldFrameId(frameId);
  diagnosticPoseWorldAngle(0);
  previewRotationDegrees(0);
  m.redraw();
};
export const setDiagnosticPoseWorldAngle = (degrees: number): void => {
  diagnosticPoseWorldAngle(degrees);
  previewRotationDegrees(degrees);
  m.redraw();
};
export const clearPoseWorldDiagnostic = (): void => {
  diagnosticPoseWorldSource(null);
  diagnosticPoseWorldFrameId(0);
  diagnosticPoseWorldAngle(0);
  previewRotationDegrees(0);
  m.redraw();
};
export const startupError = Stream<string | null>(null);
