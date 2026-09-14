import { cameraService } from "./camera.service";
import { holisticService } from "./holistic.service";
import { renderService } from "./render.service";
import { startupError, state, transition } from "./store";

type StartTracking = () => Promise<void>;
type StopTracking = () => Promise<void>;

let starting = false;

const startTracking: StartTracking = async () => {
  if (starting || state() === "Streaming") return;
  starting = true;
  startupError(null);
  if (state() === "Stopped") transition("restart");
  transition("start");

  try {
    await cameraService.initialize();
    await holisticService.initialize();
    renderService.startLoop();
    holisticService.startFrameLoop();
    transition("ready");
    transition("beginStreaming");
  } catch (error) {
    startupError(
      error instanceof Error ? error.message : "Unable to start tracking"
    );
    transition("error");
  } finally {
    starting = false;
  }
};

const stopTracking: StopTracking = async () => {
  renderService.stopLoop();
  await holisticService.close();
  await cameraService.stop();
  if (state() === "Streaming" || state() === "Ready") transition("stop");
};

export const trackingSession = {
  start: startTracking,
  stop: stopTracking,
};
