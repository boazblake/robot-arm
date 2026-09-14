import m from "mithril";
import TrackingViewer from "./PoseViewer";
export default {
  view: () => m("section.tracking", m(TrackingViewer)),
} as m.Component;
