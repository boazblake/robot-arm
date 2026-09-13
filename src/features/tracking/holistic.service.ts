import { Capacitor } from "@capacitor/core";
import { CameraPreview } from "@capacitor-community/camera-preview";
import CapacitorMediaPipe from "./media-pipe";
import { elements, tracking } from "./store";
import { normalizeTrackingResult } from "../../integration/normalize";

const VERSION = "0.10.22-rc.20250304";
let pose: { detectForVideo: (video: HTMLVideoElement, time: number) => unknown; close: () => void } | null = null;
let hands: { detectForVideo: (video: HTMLVideoElement, time: number) => unknown; close: () => void } | null = null;
let face: { detectForVideo: (video: HTMLVideoElement, time: number) => unknown; close: () => void } | null = null;
let running = false;
let listener: { remove: () => Promise<void> } | null = null;

const webInitialize = async () => {
  const vision = await import("@mediapipe/tasks-vision");
  const resolver = await vision.FilesetResolver.forVisionTasks(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`);
  pose = await vision.PoseLandmarker.createFromOptions(resolver, { baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task", delegate: "GPU" }, runningMode: "VIDEO", numPoses: 1 });
  hands = await vision.HandLandmarker.createFromOptions(resolver, { baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task", delegate: "GPU" }, runningMode: "VIDEO", numHands: 2 });
  face = await vision.FaceLandmarker.createFromOptions(resolver, { baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task", delegate: "GPU" }, runningMode: "VIDEO", numFaces: 1 });
};

const sendFrames = async () => {
  if (!running) return;
  const video = elements.video();
  try {
    if (Capacitor.getPlatform() === "web") {
      if (video && !video.paused && pose && hands && face) {
        const timestamp = performance.now();
        // Keep each detector independent: one unavailable model must not discard the
        // pose, hand, or face results produced by the other detectors.
        const detect = (landmarker: { detectForVideo: (source: HTMLVideoElement, time: number) => unknown }, label: string) => {
          try { return landmarker.detectForVideo(video, timestamp) as Record<string, unknown>; }
          catch (error) { console.warn(`[tracking] ${label} detection failed`, error); return {}; }
        };
        const poseResult = detect(pose, "pose");
        const handResult = detect(hands, "hand");
        const faceResult = detect(face, "face");
        const poseFrame = normalizeTrackingResult({ poseLandmarks: Array.isArray(poseResult.landmarks) ? poseResult.landmarks[0] : [] }, Date.now());
        const handFrame = normalizeTrackingResult({
          handLandmarks: handResult.landmarks ?? handResult.handLandmarks,
          handednesses: handResult.handednesses ?? handResult.handedness,
        }, Date.now());
        const faceFrame = normalizeTrackingResult(faceResult, Date.now());
        // Tasks Vision labels assume a mirrored selfie image. The video element is
        // intentionally unmirrored, so correct the labels before publishing them.
        tracking.frame({
          timestamp: Date.now(),
          poseLandmarks: poseFrame.poseLandmarks,
          leftHandLandmarks: handFrame.rightHandLandmarks,
          rightHandLandmarks: handFrame.leftHandLandmarks,
          faceLandmarks: faceFrame.faceLandmarks,
        });
      }
    } else {
      const sample = await CameraPreview.captureSample({ quality: 35 });
      if (sample.value) await CapacitorMediaPipe.send({ image: sample.value });
    }
  } finally { if (running) requestAnimationFrame(() => void sendFrames()); }
};

export const holisticService = {
  initialize: async () => {
    if (Capacitor.getPlatform() === "web") await webInitialize();
    else {
      await CapacitorMediaPipe.initialize({ modelComplexity: "full", smoothLandmarks: true });
      listener = await CapacitorMediaPipe.addListener("holisticResults", (result: unknown) => tracking.frame(normalizeTrackingResult(result)));
    }
    tracking.ready(true);
  },
  startFrameLoop: () => { if (!running) { running = true; void sendFrames(); } },
  close: async () => {
    running = false;
    if (listener) { await listener.remove(); listener = null; }
    pose?.close(); hands?.close(); face?.close();
    pose = null; hands = null; face = null;
    if (Capacitor.getPlatform() !== "web") await CapacitorMediaPipe.close();
    tracking.ready(false);
    tracking.frame({ timestamp: 0, poseLandmarks: [], leftHandLandmarks: [], rightHandLandmarks: [], faceLandmarks: [] });
  },
};
