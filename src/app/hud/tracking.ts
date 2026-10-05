import m from "mithril";
import ManualControl from "./so101-manual-control";
export default {
  view: () => m("section.tracking", [m(ManualControl)]),
} as m.Component;
