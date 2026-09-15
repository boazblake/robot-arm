import m from "mithril";
import {
  elements,
  previewFit,
  startupError,
  tracking,
  isFrontCamera,
} from "./store";
import TrackingHud from "./TrackingHud";
import { trackingSession } from "./session.service";
import "./pose.css";

const TrackingViewer: m.Component = {
  oncreate: ({ dom }) => {
    elements.video(dom.querySelector("video"));
    elements.canvas(dom.querySelector("canvas"));
    void trackingSession.start().catch((error) =>
      console.error("[tracking] failed to start session", error)
    );
  },
  onremove: () => {
    void trackingSession
      .stop()
      .catch((error) =>
        console.error("[tracking] failed to stop session", error)
      );
  },
  view: () => {
    const frame = tracking.frame();
    return m(
      `section.tracking-viewer.preview-${previewFit()} ${isFrontCamera()}`,
      [
        m("video", { playsinline: true, autoplay: true, muted: true }),
        m("canvas", {
          "aria-label": "Detected pose, hand, and face landmarks",
        }),
        m("div.tracking-toolbar", [
          m("strong", "Human-motion tracking"),
          m(
            "span",
            `Pose ${frame.poseLandmarks.length} · Hands ${
              frame.leftHandLandmarks.length + frame.rightHandLandmarks.length
            } · Face ${frame.faceLandmarks.length}`
          ),
          m(
            "ion-button",
            {
              size: "small",
              onclick: () =>
                previewFit(previewFit() === "cover" ? "contain" : "cover"),
            },
            previewFit() === "cover" ? "Zoom out" : "Fill"
          ),
          m(
            "ion-button",
            {
              size: "small",
              disabled: !tracking.ready(),
              onclick: () => tracking.paused() ? trackingSession.resume() : trackingSession.pause(),
            },
            tracking.paused() ? "Resume Tracking" : tracking.ready() ? "Pause Tracking" : "Starting…"
          ),
        ]),
        startupError() ? m("p.tracking-error", startupError()) : null,
        m(TrackingHud),
      ]
    );
  },
};
export default TrackingViewer;
