import m from "mithril";
import { elements, startupError, state, tracking, transition } from "./store";
import { cameraService } from "./camera.service";
import { holisticService } from "./holistic.service";
import { renderService } from "./render.service";
import "./pose.css";

const TrackingViewer: m.Component = {
  oncreate: ({ dom }) => { elements.video(dom.querySelector("video")); elements.canvas(dom.querySelector("canvas")); },
  onremove: async () => { renderService.stopLoop(); await holisticService.close(); await cameraService.stop(); transition("stop"); },
  view: () => {
    const frame = tracking.frame();
    return m("section.tracking-viewer", [
      m("video", { playsinline: true, autoplay: true, muted: true }),
      m("canvas", { "aria-label": "Detected pose, hand, and face landmarks" }),
      m("div.tracking-toolbar", [m("strong", "Human-motion tracking"), m("span", `Pose ${frame.poseLandmarks.length} · Hands ${frame.leftHandLandmarks.length + frame.rightHandLandmarks.length} · Face ${frame.faceLandmarks.length}`), m("ion-button", { size: "small", onclick: () => void start() }, state() === "Streaming" ? "Tracking" : "Start")]),
      startupError() ? m("p.tracking-error", startupError()) : null,
    ]);
  },
};
let starting = false;
const start = async () => { if (starting || state() === "Streaming") return; starting = true; startupError(null); transition("start"); try { await cameraService.initialize(); await holisticService.initialize(); renderService.startLoop(); holisticService.startFrameLoop(); transition("ready"); transition("beginStreaming"); } catch (error) { startupError(error instanceof Error ? error.message : "Unable to start tracking"); transition("error"); } finally { starting = false; } };
export default TrackingViewer;
