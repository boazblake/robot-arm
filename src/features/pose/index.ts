import m from "mithril";
import PoseViewer from "./PoseViewer";

const Pose: m.Component = {
  view: () => m("section.pose", m(PoseViewer)),
};

export default Pose;
