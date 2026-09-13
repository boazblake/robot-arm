// Import external types
import { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { Holistic } from "@mediapipe/holistic";
declare global {
  interface Window {
    Holistic: typeof Holistic;
    POSE_CONNECTIONS: PoseConnection[]; // Array of landmark connections
    HAND_CONNECTIONS: PoseConnection[]; // Array of landmark connections
    FACEMESH_CONTOURS: PoseConnection[]; // Array of landmark connections
    FACEMESH_TESSELATION: PoseConnection[]; // Array of landmark connections
    FACEMESH_LIPS: PoseConnection[]; // Array of landmark connections
    FACEMESH_LEFT_EYE: PoseConnection[]; // Array of landmark connections
    FACEMESH_LEFT_IRIS: PoseConnection[]; // Array of landmark connections
    FACEMESH_LEFT_EYEBROW: PoseConnection[]; // Array of landmark connections
    FACEMESH_RIGHT_EYE: PoseConnection[]; // Array of landmark connections
    FACEMESH_RIGHT_EYEBROW: PoseConnection[]; // Array of landmark connections
    FACEMESH_RIGHT_IRIS: PoseConnection[]; // Array of landmark connections
    FACEMESH_FACE_OVAL: PoseConnection[]; // Array of landmark connections
  }
}

// --- CORE TYPES ---
export type PoseConnection = [number, number];
export type Pose = Array<NormalizedLandmark>;

export enum Mode {
  RealTime,
  Record,
  Replay,
}

export interface BaseFrameMeta {
  id: string;
  isBadPose?: boolean;
}

// Unified metadata for exercises
export interface BaseExerciseMeta extends BaseFrameMeta {
  [key: string]: any; // Extendable for exercise-specific metadata
}

export interface MetadataEntry {
  label: string;
  value: string | number | boolean;
  color?: string;
}

export interface FeedbackConfig<T extends BaseExerciseMeta = BaseExerciseMeta> {
  id: string;
  canvasCtx?: CanvasRenderingContext2D;
  landmarks: Pose;
  poseConnections?: PoseConnection[];
  metadata?: MetadataEntry[];
  frameMeta?: T;
  visualProps?: Partial<{
    landmarkColor: string;
    connectorColor: string;
    lineWidth: number;
    font: string;
    fontSize: string;
  }>;
}

export interface PoseFrame {
  timestamp: number;
  poses: Pose[];
  meta?: BaseExerciseMeta;
}

// --- EXERCISE TYPES ---
export interface RawExerciseProp<T = any> {
  value: T;
  timestamp: number;
  meta?: BaseExerciseMeta;
}

export interface RawExercise {
  [key: string]: RawExerciseProp[];
}

export interface ExerciseMeta {
  id: string;
  name: string;
  raw: RawExercise;
}

export interface ExerciseBase {
  id: string; // Unique identifier
  name: string; // Display name
  meta: ExerciseMeta; // Metadata for the exercise
  injectMetadata?: (
    landmarks: Pose,
    frameMeta: BaseFrameMeta
  ) => Partial<FeedbackConfig>; // Optional metadata injection function
}

export interface RealTimeExercise extends ExerciseBase {
  processLandmarks: (
    landmarks: Pose,
    canvasCtx: CanvasRenderingContext2D
  ) => void; // Process landmarks live
}

export interface ReplayExercise extends ExerciseBase {
  replayLandmarks: (
    canvasCtx: CanvasRenderingContext2D,
    playbackSpeed?: number
  ) => void; // Replay landmarks
}

// Unified Exercise Type
export type Exercise = RealTimeExercise | ReplayExercise;

// --- PIPELINE TYPES ---
export interface PipelineContext<
  T extends BaseExerciseMeta = BaseExerciseMeta
> {
  mode: Mode;
  landmarks: Pose;
  frameMeta?: T;
  canvasCtx?: CanvasRenderingContext2D;
  stage?: string;
}

export type InjectedMetadata = Partial<FeedbackConfig> & {
  landmarkColor?: string;
  connectorColor?: string;
  lineWidth?: number;
  font?: string;
  fontSize?: string;
};

export interface HolisticData {
  poseLandmarks: NormalizedLandmark[];
  faceLandmarks: NormalizedLandmark[];
  leftHandLandmarks: NormalizedLandmark[];
  rightHandLandmarks: NormalizedLandmark[];
}
export type StateTransitions = {
  Idle: { start: "Loading" };
  Loading: { ready: "Ready"; error: "Idle" };
  Ready: { beginStreaming: "Streaming"; switchCamera: "SwitchingCamera" }; // Added "switchCamera"
  Streaming: { switchCamera: "SwitchingCamera"; stop: "Stopped" };
  SwitchingCamera: { completeSwitch: "Streaming" };
  Stopped: { restart: "Idle" };
};

export type StateTransitionEvent =
  | "start"
  | "ready"
  | "beginStreaming"
  | "switchCamera"
  | "stop"
  | "completeSwitch"
  | "restart"
  | "error";

export type DisplayType = "phone" | "tablet" | "desktop";

export interface Settings {
  width: number;
  displayType: DisplayType;
}

export interface Model {
  settings: Settings;
}
