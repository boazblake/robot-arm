import { cameraService } from "../../camera/camera-service";
import { holisticService } from "../../tracking/adapters/mediapipe/holistic-service";
import { renderService } from "../../rendering/render-service";
import { resetTrackingPipeline } from "./teleop-session";
import { startupError, state, tracking, transition } from "./store";

type StartTracking = () => Promise<void>;
type StopTracking = () => Promise<void>;

let starting = false;
let lifecycleGeneration = 0;
const isCurrent = (generation: number): boolean => generation === lifecycleGeneration;

type RollbackStartup = () => Promise<void>;
const rollbackStartup: RollbackStartup = async () => {
  try {
    await holisticService.close();
  } catch (error) {
    console.error("[tracking] failed to roll back MediaPipe", error);
  }
  try {
    await cameraService.stop();
  } catch (error) {
    console.error("[tracking] failed to roll back camera", error);
  }
};

const startTracking: StartTracking = async () => {
  if (starting || state() === "Streaming") return;
  starting = true;
  const generation = ++lifecycleGeneration;
  startupError(null);
  if (state() === "Stopped") transition("restart");
  transition("start");

  try {
    await cameraService.initialize();
    if (!isCurrent(generation)) return;
    await holisticService.initialize();
    if (!isCurrent(generation)) return;
    renderService.startLoop();
    tracking.paused(false);
    holisticService.startFrameLoop();
    transition("ready");
    transition("beginStreaming");
  } catch (error) {
    if (!isCurrent(generation)) return;
    await rollbackStartup();
    startupError(error instanceof Error ? error.message : "Unable to start tracking");
    transition("error");
  } finally {
    if (isCurrent(generation)) starting = false;
  }
};

const pauseTracking = (): void => {
  holisticService.stopFrameLoop();
  resetTrackingPipeline();
  tracking.paused(true);
};

const resumeTracking = (): void => {
  if (state() !== "Streaming") return;
  tracking.paused(false);
  holisticService.startFrameLoop();
};

const stopTracking: StopTracking = async () => {
  ++lifecycleGeneration;
  starting = false;
  renderService.stopLoop();
  await holisticService.close();
  await cameraService.stop();
  if (state() === "Streaming" || state() === "Ready") transition("stop");
};

export const trackingSession = {
  start: startTracking,
  stop: stopTracking,
  pause: pauseTracking,
  resume: resumeTracking,
};
