import m from "mithril";
import ManualControl from "./so101-manual-control";
import TrackingViewer from "./pose-viewer";
import "./tracking.css";

type ViewMode = "manual" | "pose";

let viewMode: ViewMode = "manual";

const Tracking: m.Component = {
  view: () => m("section.tracking", [
    m("nav.tracking-mode-switcher", { "aria-label": "Control view" }, [
      m("span.tracking-mode-label", "CONTROL SURFACE"),
      m("button", { class: viewMode === "manual" ? "active" : "", onclick: () => { viewMode = "manual"; } }, "Manual"),
      m("button", { class: viewMode === "pose" ? "active" : "", onclick: () => { viewMode = "pose"; } }, "Camera / pose"),
    ]),
    viewMode === "manual" ? m(ManualControl) : m(TrackingViewer),
  ]),
};

export default Tracking;
