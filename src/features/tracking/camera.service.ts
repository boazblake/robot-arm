import { camera, elements, state, dimensions, transition } from "./store";
import { Capacitor } from "@capacitor/core";
import { CameraPreview } from "@capacitor-community/camera-preview";
import { logger } from "./model.utils";

const safeStopCamera = async () => {
  try {
    await CameraPreview.stop();
  } catch (error) {
    logger.warn(`Safe stop camera: ${String(error)}`);
  }
};

const initializeWebCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: camera.position() === "front" ? "user" : "environment",
        width: { ideal: dimensions().width },
        height: { ideal: dimensions().height },
      },
    });

    const video = elements.video();
    if (video) {
      video.srcObject = stream;
      await new Promise((resolve) =>
        video.addEventListener("loadedmetadata", resolve, { once: true })
      );
      await video.play();
      camera.ready(true);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`Web camera failed: ${String(error)}`);
    return false;
  }
};

const initializeNativeCamera = async () => {
  try {
    // Try to start with more conservative options
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

    camera.ready(true);
    return true;
  } catch (error) {
    logger.error(`Native camera failed: ${String(error)}`);
    return false;
  }
};

export const cameraService = {
  initialize: async () => {
    const platform = Capacitor.getPlatform();
    let success = false;
    let lastError = "Unknown camera error";

    if (platform === "web") {
      success = await initializeWebCamera();
      if (!success) lastError = "Web camera initialization failed";
    } else {
      // Try native camera first
      success = await initializeNativeCamera();
      if (!success) lastError = "Native camera preview initialization failed";

      // If native fails, try web camera as fallback
      if (!success) {
        logger.info("Falling back to web camera implementation");
        success = await initializeWebCamera();
        if (!success) lastError = "Native and fallback web camera initialization both failed";
      }
    }

    if (!success) {
      state("Stopped");
      transition("error");
      throw new Error(lastError);
    }
  },

  stop: async () => {
    const platform = Capacitor.getPlatform();

    if (platform === "web") {
      const video = elements.video();
      if (video?.srcObject) {
        (video.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
        video.srcObject = null;
      }
    } else {
      await safeStopCamera();
    }
    camera.ready(false);
  },

  switch: async () => {
    try {
      await cameraService.stop();
      camera.position(camera.position() === "front" ? "rear" : "front");
      await cameraService.initialize();
    } catch (error) {
      logger.error(`Camera switch failed: ${String(error)}`);
      state("Stopped");
      transition("error");
    }
  },

  cleanup: async () => {
    try {
      await cameraService.stop();
      const video = elements.video();
      if (video) {
        video.srcObject = null;
      }
      camera.ready(false);
      camera.position("front");
    } catch (error) {
      logger.error(`Camera cleanup failed: ${String(error)}`);
    }
  },
};
