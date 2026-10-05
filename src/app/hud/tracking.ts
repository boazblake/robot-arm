import m from "mithril";
import TrackingViewer from "./pose-viewer";
import ManualControl from "./so101-manual-control";
export default {
  view: () => m("section.tracking", [m(TrackingViewer), m(ManualControl)]),
} as m.Component;
