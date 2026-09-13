import m from "mithril";
import Layout from "../shared/components/Layout.js";
import Home from "../features/home/HomePage";
import Pose from "../features/pose";
import PosePlayback from "../features/playback";
import Progress from "../features/progress/ProgressPage.js";
import Settings from "../pages/Settings.js";
import About from "../pages/About.js";

const routes = () => {
  return {
    "/": {
      render: () => m(Layout, m(Home)),
    },
    "/pose": {
      render: () => m(Layout, m(Pose)),
    },
    "/playback": {
      render: () => m(Layout, m(PosePlayback)),
    },
    "/progress": {
      render: () => m(Layout, m(Progress)),
    },
    "/settings": {
      render: () => m(Layout, m(Settings)),
    },
    "/about": {
      render: () => m(Layout, m(About)),
    },
  };
};

export default routes;
