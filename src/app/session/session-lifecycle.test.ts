import { describe, expect, it, vi } from "vitest";
import { processTrackingFrame, pipeline, resetTrackingPipeline } from "./teleop-session";
import { tracking, state } from "./store";
import { trackingSession } from "./session-lifecycle";
import type { Landmark, TrackingFrame } from "../../tracking/model/tracking-frame";

const { stopFrameLoop, startFrameLoop } = vi.hoisted(() => ({
  stopFrameLoop: vi.fn(),
  startFrameLoop: vi.fn(),
}));

vi.mock("../../tracking/adapters/mediapipe/holistic-service", () => ({
  holisticService: {
    stopFrameLoop,
    startFrameLoop,
    initialize: vi.fn(),
    close: vi.fn(),
  },
}));
vi.mock("../../camera/camera-service", () => ({
  cameraService: { initialize: vi.fn(), stop: vi.fn() },
}));
vi.mock("../../rendering/render-service", () => ({
  renderService: { startLoop: vi.fn(), stopLoop: vi.fn() },
}));

const landmark = (x: number, y: number, z: number): Landmark => ({ x, y, z, visibility: 1 });
const validFrame = (): TrackingFrame => {
  const poseLandmarks = Array.from({ length: 17 }, () => landmark(0, 0, 0));
  poseLandmarks[11] = landmark(0, 0, 0);
  poseLandmarks[13] = landmark(0.1, 0, 0);
  poseLandmarks[15] = landmark(0.1, 0.1, 0);
  poseLandmarks[12] = landmark(0, 0, 0);
  poseLandmarks[14] = landmark(-0.1, 0, 0);
  poseLandmarks[16] = landmark(-0.1, 0.1, 0);
  return {
    timestamp: 100,
    poseLandmarks,
    leftHandLandmarks: [landmark(0.1, 0.1, 0)],
    rightHandLandmarks: [landmark(-0.1, 0.1, 0)],
    faceLandmarks: [],
  };
};

describe("tracking session pause boundary", () => {
  it("stops input, resets both pipeline states, and does not advance freshness while paused", () => {
    resetTrackingPipeline();
    processTrackingFrame(validFrame());
    tracking.paused(false);

    trackingSession.pause();
    const paused = pipeline();

    expect(stopFrameLoop).toHaveBeenCalled();
    expect(tracking.paused()).toBe(true);
    expect(paused.freshness.left.status).toBe("lost");
    expect(paused.freshness.right.status).toBe("lost");
    expect(paused.calibration).toEqual({ left: null, right: null });
    expect(paused.arms.left.stabilized).toBeNull();
    expect(paused.arms.right.stabilized).toBeNull();

    const snapshotBeforeWait = pipeline();
    vi.spyOn(performance, "now").mockReturnValue(100_000);
    expect(pipeline()).toEqual(snapshotBeforeWait);
    vi.restoreAllMocks();
  });

  it("resumes input production without processing a frame or enabling control", () => {
    resetTrackingPipeline();
    state("Streaming");
    trackingSession.pause();
    trackingSession.resume();

    expect(startFrameLoop).toHaveBeenCalled();
    expect(tracking.paused()).toBe(false);
    expect(pipeline().freshness.left.status).toBe("lost");
    expect(pipeline().arms.left.validity.valid).toBe(false);
  });
});
