import { Capacitor } from "@capacitor/core";
import CapacitorMediaPipe from "./media-pipe";
import { elements, tracking } from "./store";
import { cameraService } from "./camera.service";
import {
  normalizeTrackingResult,
  normalizeWebTrackingResults,
} from "../../integration/normalize";

const VERSION = "0.10.22-rc.20250304";
let pose: {
  detectForVideo: (video: HTMLVideoElement, time: number) => unknown;
  close: () => void;
} | null = null;
let hands: {
  detectForVideo: (video: HTMLVideoElement, time: number) => unknown;
  close: () => void;
} | null = null;
let face: {
  detectForVideo: (video: HTMLVideoElement, time: number) => unknown;
  close: () => void;
} | null = null;
let running = false;
let listener: { remove: () => Promise<void> } | null = null;
let lastDetectionTimestamp = 0;

type NextDetectionTimestamp = () => number;
const nextDetectionTimestamp: NextDetectionTimestamp = () => {
  const currentTimestamp = Math.ceil(performance.now());
  lastDetectionTimestamp = Math.max(
    currentTimestamp,
    lastDetectionTimestamp + 1,
    1
  );
  return lastDetectionTimestamp;
};

const webInitialize = async () => {
  const vision = await import("@mediapipe/tasks-vision");
  const resolver = await vision.FilesetResolver.forVisionTasks(
    `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`
  );
  pose = await vision.PoseLandmarker.createFromOptions(resolver, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numPoses: 1,
  });
  hands = await vision.HandLandmarker.createFromOptions(resolver, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 2,
  });
  face = await vision.FaceLandmarker.createFromOptions(resolver, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numFaces: 1,
  });
};

const sendFrames = async () => {
  if (!running) return;
  const video = elements.video();
  try {
    if (Capacitor.getPlatform() === "web") {
      if (video && !video.paused && pose && hands && face) {
        const frameTimestamp = Date.now();
        const detectionTimestamp = nextDetectionTimestamp();
        // Keep each detector independent: one unavailable model must not discard the
        // pose, hand, or face results produced by the other detectors.
        const detect = (
          landmarker: {
            detectForVideo: (source: HTMLVideoElement, time: number) => unknown;
          },
          label: string
        ) => {
          try {
            return landmarker.detectForVideo(
              video,
              detectionTimestamp
            ) as Record<string, unknown>;
          } catch (error) {
            console.warn(`[tracking] ${label} detection failed`, error);
            return {};
          }
        };
        const frame = normalizeWebTrackingResults(
          {
            pose: detect(pose, "pose"),
            hands: detect(hands, "hand"),
            face: detect(face, "face"),
          },
          frameTimestamp
        );
        tracking.frame(frame);
      }
    } else {
      const sample = await cameraService.captureSample();
      if (sample.value) await CapacitorMediaPipe.send({ image: sample.value });
    }
  } finally {
    if (running) requestAnimationFrame(() => void sendFrames());
  }
};

export const holisticService = {
  initialize: async () => {
    if (Capacitor.getPlatform() === "web") await webInitialize();
    else {
      await CapacitorMediaPipe.initialize({
        modelComplexity: "full",
        smoothLandmarks: true,
      });
      listener = await CapacitorMediaPipe.addListener(
        "holisticResults",
        (result: unknown) => tracking.frame(normalizeTrackingResult(result))
      );
    }
    tracking.ready(true);
  },
  startFrameLoop: () => {
    if (!running) {
      running = true;
      void sendFrames();
    }
  },
  close: async () => {
    running = false;
    if (listener) {
      await listener.remove();
      listener = null;
    }
    pose?.close();
    hands?.close();
    face?.close();
    pose = null;
    hands = null;
    face = null;
    lastDetectionTimestamp = 0;
    if (Capacitor.getPlatform() !== "web") await CapacitorMediaPipe.close();
    tracking.ready(false);
    tracking.frame({
      timestamp: 0,
      poseLandmarks: [],
      leftHandLandmarks: [],
      rightHandLandmarks: [],
      faceLandmarks: [],
    });
  },
};
