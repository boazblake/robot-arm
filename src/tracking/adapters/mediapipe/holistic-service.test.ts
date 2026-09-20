import { afterEach, describe, expect, it, vi } from "vitest";
import m from "mithril";
import { elements } from "../../../app/session/store";
import { holisticService } from "./holistic-service";

const factories = vi.hoisted(() => ({
  holistic: vi.fn(),
  landmark: null as ReturnType<typeof makeLandmarker> | null,
}));

vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: () => "web" } }));
vi.mock("./media-pipe", () => ({ default: { send: vi.fn(), close: vi.fn() } }));
vi.mock("@mediapipe/tasks-vision", () => ({
  FilesetResolver: { forVisionTasks: vi.fn(async () => ({})) },
  HolisticLandmarker: { createFromOptions: factories.holistic },
  PoseLandmarker: undefined,
  HandLandmarker: undefined,
  FaceLandmarker: undefined,
}));
vi.mock("../../../camera/camera-service", () => ({
  cameraService: { captureSample: vi.fn(async () => ({ value: undefined })) },
}));

const callbacks: FrameRequestCallback[] = [];
const requestFrame = vi.fn((callback: FrameRequestCallback): number => {
  callbacks.push(callback);
  return callbacks.length;
});
const cancelFrame = vi.fn();

function makeLandmarker() {
  return {
    detectForVideo: vi.fn(() => ({ poseLandmarks: [], leftHandLandmarks: [], rightHandLandmarks: [], faceLandmarks: [] })),
    close: vi.fn(),
  };
}

const setup = async () => {
  factories.landmark = makeLandmarker();
  factories.holistic.mockResolvedValue(factories.landmark);
  await holisticService.initialize();
  elements.video({ paused: false } as HTMLVideoElement);
  globalThis.requestAnimationFrame = requestFrame;
  globalThis.cancelAnimationFrame = cancelFrame;
  vi.spyOn(m, "redraw").mockImplementation(() => undefined);
};

afterEach(async () => {
  await holisticService.close();
  elements.video(null);
  callbacks.length = 0;
  requestFrame.mockClear();
  cancelFrame.mockClear();
  vi.restoreAllMocks();
});

describe("holistic inference lifecycle", () => {
  it("ignores a stale RAF callback after stop and start", async () => {
    await setup();
    const redraw = m.redraw;
    holisticService.startFrameLoop();
    holisticService.stopFrameLoop();
    holisticService.startFrameLoop();
    callbacks[0](0);
    expect(factories.landmark?.detectForVideo).not.toHaveBeenCalled();
    expect(redraw).not.toHaveBeenCalled();
    callbacks[1](0);
    expect(factories.landmark?.detectForVideo).toHaveBeenCalledTimes(1);
    expect(redraw).toHaveBeenCalledTimes(1);
  });

  it("keeps one chain across repeated stop and start", async () => {
    await setup();
    holisticService.startFrameLoop();
    holisticService.stopFrameLoop();
    holisticService.startFrameLoop();
    holisticService.stopFrameLoop();
    holisticService.startFrameLoop();
    callbacks[0](0);
    callbacks[1](0);
    callbacks[2](0);
    expect(factories.landmark?.detectForVideo).toHaveBeenCalledTimes(1);
    expect(requestFrame).toHaveBeenCalledTimes(4);
  });

  it("makes start and stop idempotent and cancels its RAF", async () => {
    await setup();
    holisticService.startFrameLoop();
    holisticService.startFrameLoop();
    expect(requestFrame).toHaveBeenCalledTimes(1);
    holisticService.stopFrameLoop();
    holisticService.stopFrameLoop();
    expect(cancelFrame).toHaveBeenCalledTimes(1);
    expect(callbacks).toHaveLength(1);
  });
});
