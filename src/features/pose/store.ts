import Stream from "mithril/stream";
import m from "mithril";
import type { HolisticData, FSMState, FSMTransitions } from "./types";
import type { SessionSummary } from "../../domain/session";

// FSM Definition
const transitions: FSMTransitions = {
  Idle: { start: "Loading" },
  Loading: { ready: "Ready", error: "Idle" },
  Ready: { beginStreaming: "Streaming", switchCamera: "SwitchingCamera" },
  Streaming: { switchCamera: "SwitchingCamera", stop: "Stopped" },
  SwitchingCamera: { completeSwitch: "Streaming" },
  Stopped: { restart: "Idle" },
};

export const state = Stream<FSMState>("Idle");
export const transition = (event: string): boolean => {
  const currentState = state();
  const nextState = transitions[currentState]?.[event];
  if (nextState) {
    state(nextState);
    m.redraw();
    return true;
  }
  return false;
};

// System state streams
export const numberOfCameras = Stream(0);

// Active Models State
export const activeModels = Stream({
  pose: true,
  face: true,
  hands: true,
});

export const camera = {
  position: Stream<"front" | "rear">("front"),
  ready: Stream(false),
  count: Stream(0),
};

export const elements = {
  video: Stream<HTMLVideoElement | null>(null),
  canvas: Stream<HTMLCanvasElement | null>(null),
  context: Stream<CanvasRenderingContext2D | null>(null),
};

export const holistic = {
  instance: Stream<any>(null),
  ready: Stream(false),
  data: Stream<HolisticData>({
    poseLandmarks: [],
    faceLandmarks: [],
    leftHandLandmarks: [],
    rightHandLandmarks: [],
  }),
};

export const features = Stream({
  pose: true,
  face: true,
  hands: true,
});

export const recording = {
  active: Stream(false),
  frames: Stream<any[]>([]),
  startTime: Stream<number | null>(null),
};

export const exercise = Stream<any>(null);
export const startupError = Stream<string | null>(null);

export const coaching = Stream({
  repCount: 0,
  status: "Ready",
  cue: "Select exercise and start",
});

export const summaryDraft = Stream<SessionSummary | null>(null);

export const isLoading = Stream.lift(
  (s: FSMState) => s === "Loading" || s === "SwitchingCamera",
  state
);

export const dimensions = Stream({
  width: 1280,
  height: 720,
});
