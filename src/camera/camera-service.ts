import { camera, elements, dimensions } from "../app/session/store";
import { Capacitor } from "@capacitor/core";
import { CameraPreview } from "@capacitor-community/camera-preview";
import { logger } from "../tracking/adapters/mediapipe/tracking-logger";

const safeStopCamera = async () => {
  try {
    await CameraPreview.stop();
  } catch (error) {
    logger.warn(`Safe stop camera: ${String(error)}`);
  }
};

let cameraGeneration = 0;
let currentStream: MediaStream | null = null;
const isCurrent = (generation: number): boolean => generation === cameraGeneration;
const stopStream = (stream: MediaStream): void => {
  stream.getTracks().forEach((track) => track.stop());
};
const discardStream = (stream: MediaStream, video: HTMLVideoElement | null): void => {
  if (video?.srcObject === stream) video.srcObject = null;
  stopStream(stream);
};

const initializeWebCamera = async (generation: number): Promise<boolean> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: camera.position() === "front" ? "user" : "environment",
        width: { ideal: dimensions().width },
        height: { ideal: dimensions().height },
      },
    });
    const video = elements.video();
    if (!isCurrent(generation)) {
      discardStream(stream, video);
      return false;
    }
    if (!video) {
      stopStream(stream);
      return false;
    }
    video.srcObject = stream;
    try {
      await new Promise<void>((resolve) =>
        video.addEventListener("loadedmetadata", () => resolve(), { once: true })
      );
      if (!isCurrent(generation)) {
        discardStream(stream, video);
        return false;
      }
      await video.play();
      if (!isCurrent(generation)) {
        discardStream(stream, video);
        return false;
      }
      currentStream = stream;
      camera.ready(true);
      return true;
    } catch (error) {
      discardStream(stream, video);
      throw error;
    }
  } catch (error) {
    logger.error(`Web camera failed: ${String(error)}`);
    return false;
  }
};

const initializeNativeCamera = async (generation: number): Promise<boolean> => {
  try {
    await CameraPreview.start({
      position: camera.position() === "front" ? "front" : "rear",
      parent: "video-feed",
      className: "camera-preview",
      width: window.innerWidth,
      height: window.innerHeight,
      x: 0,
      y: 0,
      toBack: true,
      enableHighResolution: false,
    });
    if (!isCurrent(generation)) {
      await safeStopCamera();
      return false;
    }
    camera.ready(true);
    return true;
  } catch (error) {
    logger.error(`Native camera failed: ${String(error)}`);
    return false;
  }
};

type CameraSample = { readonly value?: string };
type CaptureSample = () => Promise<CameraSample>;
const captureSample: CaptureSample = () => CameraPreview.captureSample({ quality: 35 });

type CameraService = {
  readonly captureSample: CaptureSample;
  readonly initialize: () => Promise<void>;
  readonly stop: () => Promise<void>;
  readonly switch: () => Promise<void>;
  readonly cleanup: () => Promise<void>;
};

export const cameraService: CameraService = {
  captureSample,
  initialize: async (): Promise<void> => {
    const generation = ++cameraGeneration;
    const platform = Capacitor.getPlatform();
    let success = false;
    let lastError = "Unknown camera error";
    if (platform === "web") {
      success = await initializeWebCamera(generation);
      if (!success) lastError = "Web camera initialization failed";
    } else {
      success = await initializeNativeCamera(generation);
      if (!success) lastError = "Native camera preview initialization failed";
      if (!success && isCurrent(generation)) {
        logger.info("Falling back to web camera implementation");
        success = await initializeWebCamera(generation);
        if (!success) lastError = "Native and fallback web camera initialization both failed";
      }
    }
    if (!success) throw new Error(lastError);
  },
  stop: async (): Promise<void> => {
    ++cameraGeneration;
    const stream = currentStream;
    currentStream = null;
    if (stream) stopStream(stream);
    const platform = Capacitor.getPlatform();
    if (platform === "web") {
      const video = elements.video();
      if (video?.srcObject) {
        const videoStream = video.srcObject as MediaStream;
        if (videoStream !== stream) stopStream(videoStream);
        video.srcObject = null;
      }
    } else {
      await safeStopCamera();
    }
    camera.ready(false);
  },
  switch: async (): Promise<void> => {
    try {
      await cameraService.stop();
      camera.position(camera.position() === "front" ? "rear" : "front");
      await cameraService.initialize();
    } catch (error) {
      logger.error(`Camera switch failed: ${String(error)}`);
    }
  },
  cleanup: async (): Promise<void> => {
    try {
      await cameraService.stop();
      const video = elements.video();
      if (video) video.srcObject = null;
      camera.ready(false);
      camera.position("front");
    } catch (error) {
      logger.error(`Camera cleanup failed: ${String(error)}`);
    }
  },
};
