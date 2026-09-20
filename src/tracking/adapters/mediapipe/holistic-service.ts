import m from "mithril";
import { Capacitor } from "@capacitor/core";
import CapacitorMediaPipe from "./media-pipe";
import { elements, tracking } from "../../../app/session/store";
import { processTrackingFrame, resetTrackingPipeline } from "../../../app/session/teleop-session";
import { cameraService } from "../../../camera/camera-service";
import type { HolisticLandmarkerResult } from "@mediapipe/tasks-vision";
import { normalizeTrackingResult } from "./normalize-tracking-result";

const VERSION = "0.10.22-rc.20250304";
type HolisticLandmarkerInstance = {
  detectForVideo: (video: HTMLVideoElement, time: number) => HolisticLandmarkerResult;
  close: () => void;
};
type NativeListener = { remove: () => Promise<void> };

let holistic: HolisticLandmarkerInstance | null = null;
let listener: NativeListener | null = null;
let running = false;
let lifecycleGeneration = 0;
let loopGeneration = 0;
let rafId: number | null = null;
let lastDetectionTimestamp = 0;

type NextDetectionTimestamp = () => number;
const nextDetectionTimestamp: NextDetectionTimestamp = () => {
  const currentTimestamp = Math.ceil(performance.now());
  lastDetectionTimestamp = Math.max(currentTimestamp, lastDetectionTimestamp + 1, 1);
  return lastDetectionTimestamp;
};

const isCurrentInitialization = (generation: number): boolean =>
  generation === lifecycleGeneration;
const isCurrentLoop = (generation: number): boolean =>
  running && generation === loopGeneration;

const closeLandmarker = (landmarker: HolisticLandmarkerInstance | null): void => {
  landmarker?.close();
};

const closeLandmarkers = (): void => {
  closeLandmarker(holistic);
  holistic = null;
};

const webInitialize = async (generation: number): Promise<void> => {
  const vision = await import("@mediapipe/tasks-vision");
  if (!isCurrentInitialization(generation)) return;
  const resolver = await vision.FilesetResolver.forVisionTasks(
    `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`
  );
  if (!isCurrentInitialization(generation)) return;

  const createdHolistic = await vision.HolisticLandmarker.createFromOptions(resolver, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/1/holistic_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minHandLandmarksConfidence: 0.5,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
  });
  if (!isCurrentInitialization(generation)) {
    createdHolistic.close();
    return;
  }
  holistic = createdHolistic;
};

type SendFrames = (generation: number) => Promise<void>;
const sendFrames: SendFrames = async (generation) => {
  if (!isCurrentLoop(generation)) return;
  const video = elements.video();
  try {
    if (!isCurrentLoop(generation)) return;
    if (Capacitor.getPlatform() === "web") {
      if (video && !video.paused && holistic && isCurrentLoop(generation)) {
        const frameTimestamp = Date.now();
        const detectionTimestamp = nextDetectionTimestamp();
        let result: HolisticLandmarkerResult | null;
        try {
          result = holistic.detectForVideo(video, detectionTimestamp);
        } catch (error) {
          console.warn("[tracking] holistic detection failed", error);
          result = null;
        }
        const frame = normalizeTrackingResult({
          poseLandmarks: result?.poseLandmarks[0] ?? [],
          poseWorldLandmarks: result?.poseWorldLandmarks?.[0] ?? [],
          leftHandLandmarks: result?.leftHandLandmarks[0] ?? [],
          rightHandLandmarks: result?.rightHandLandmarks[0] ?? [],
          faceLandmarks: result?.faceLandmarks[0] ?? [],
        }, frameTimestamp);
        if (!isCurrentLoop(generation)) return;
        tracking.frame(frame);
        processTrackingFrame(frame);
        m.redraw();
      }
    } else {
      const sample = await cameraService.captureSample();
      if (!isCurrentLoop(generation)) return;
      if (sample.value) await CapacitorMediaPipe.send({ image: sample.value });
    }
  } finally {
    if (isCurrentLoop(generation)) {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        void sendFrames(generation);
      });
    }
  }
};

const removeListener = async (candidate: NativeListener | null): Promise<void> => {
  if (candidate) await candidate.remove();
};

export const holisticService = {
  initialize: async (): Promise<void> => {
    const generation = ++lifecycleGeneration;
    running = false;
    loopGeneration += 1;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    closeLandmarkers();
    const oldListener = listener;
    listener = null;
    await removeListener(oldListener);
    if (!isCurrentInitialization(generation)) return;

    if (Capacitor.getPlatform() === "web") {
      await webInitialize(generation);
    } else {
      await CapacitorMediaPipe.initialize({ modelComplexity: "full", smoothLandmarks: true });
      if (!isCurrentInitialization(generation)) return;
      const candidate = await CapacitorMediaPipe.addListener(
        "holisticResults",
        (result: unknown) => {
          if (!isCurrentInitialization(generation)) return;
          const frame = normalizeTrackingResult(result);
          tracking.frame(frame);
          processTrackingFrame(frame);
          m.redraw();
        }
      );
      if (!isCurrentInitialization(generation)) {
        await candidate.remove();
        return;
      }
      listener = candidate;
    }
    if (isCurrentInitialization(generation)) tracking.ready(true);
  },
  startFrameLoop: (): void => {
    if (running) return;
    running = true;
    loopGeneration += 1;
    const generation = loopGeneration;
    rafId = requestAnimationFrame(() => {
      if (!isCurrentLoop(generation)) return;
      rafId = null;
      void sendFrames(generation);
    });
  },
  stopFrameLoop: (): void => {
    if (!running && rafId === null) return;
    running = false;
    loopGeneration += 1;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  },
  close: async (): Promise<void> => {
    ++lifecycleGeneration;
    running = false;
    loopGeneration += 1;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    const oldListener = listener;
    listener = null;
    await removeListener(oldListener);
    closeLandmarkers();
    lastDetectionTimestamp = 0;
    if (Capacitor.getPlatform() !== "web") await CapacitorMediaPipe.close();
    tracking.ready(false);
    tracking.paused(false);
    tracking.frame({ timestamp: 0, poseLandmarks: [], leftHandLandmarks: [], rightHandLandmarks: [], faceLandmarks: [] });
    resetTrackingPipeline();
  },
};
