import Stream from "mithril/stream";
import m from "mithril";
import type { TrackingFrame } from "../../domain/tracking";

type State = "Idle" | "Loading" | "Ready" | "Streaming" | "Stopped";
const transitions: Record<State, Partial<Record<string, State>>> = {
  Idle: { start: "Loading" }, Loading: { ready: "Ready", error: "Idle" },
  Ready: { beginStreaming: "Streaming" }, Streaming: { stop: "Stopped" },
  Stopped: { restart: "Idle" },
};
export const state = Stream<State>("Idle");
export const transition = (event: string) => { const next = transitions[state()]?.[event]; if (!next) return false; state(next); m.redraw(); return true; };
export const camera = { position: Stream<"front" | "rear">("front"), ready: Stream(false) };
export const dimensions = Stream({ width: 1280, height: 720 });
export const elements = { video: Stream<HTMLVideoElement | null>(null), canvas: Stream<HTMLCanvasElement | null>(null), context: Stream<CanvasRenderingContext2D | null>(null) };
export const tracking = { ready: Stream(false), frame: Stream<TrackingFrame>({ timestamp: 0, poseLandmarks: [], leftHandLandmarks: [], rightHandLandmarks: [], faceLandmarks: [] }) };
export const features = Stream({ pose: true, hands: true, face: true });
export const startupError = Stream<string | null>(null);
