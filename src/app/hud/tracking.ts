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
      m("fieldset.tracking-segmented-control", [
        m("legend.sr-only", "Control view"),
        m("input.tracking-segment-radio", { id: "tracking-manual", type: "radio", name: "tracking-view", value: "manual", checked: viewMode === "manual", onchange: () => { viewMode = "manual"; } }),
        m("label", { for: "tracking-manual" }, "Manual"),
        m("input.tracking-segment-radio", { id: "tracking-pose", type: "radio", name: "tracking-view", value: "pose", checked: viewMode === "pose", onchange: () => { viewMode = "pose"; } }),
        m("label", { for: "tracking-pose" }, "Camera / pose"),
      ]),
    ]),
    viewMode === "manual" ? m(ManualControl) : m(TrackingViewer),
  ]),
};

export default Tracking;
