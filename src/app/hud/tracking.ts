import m from "mithril";
import TrackingViewer from "./pose-viewer";
export default {
  view: () => m("section.tracking", m(TrackingViewer)),
} as m.Component;
