import m from "mithril";
import {
  elements,
  previewFit,
  startupError,
  state,
  tracking,
} from "./store";
import { trackingSession } from "./session.service";
import "./pose.css";

const TrackingViewer: m.Component = {
  oncreate: ({ dom }) => {
    elements.video(dom.querySelector("video"));
    elements.canvas(dom.querySelector("canvas"));
  },
  onremove: () => {
    void trackingSession.stop().catch((error) =>
      console.error("[tracking] failed to stop session", error)
    );
  },
  view: () => {
    const frame = tracking.frame();
    return m(
      `section.tracking-viewer.preview-${previewFit()}`,
      [
        m("video", { playsinline: true, autoplay: true, muted: true }),
        m("canvas", {
          "aria-label": "Detected pose, hand, and face landmarks",
        }),
        m("div.tracking-toolbar", [
          m("strong", "Human-motion tracking"),
          m(
            "span",
            `Pose ${frame.poseLandmarks.length} · Hands ${frame.leftHandLandmarks.length + frame.rightHandLandmarks.length
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
            { size: "small", onclick: () => void trackingSession.start() },
            state() === "Streaming" ? "Tracking" : "Start"
          ),
        ]),
        startupError() ? m("p.tracking-error", startupError()) : null,
      ]
    );
  },
};
export default TrackingViewer;
