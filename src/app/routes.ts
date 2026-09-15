import m from "mithril";
import Layout from "../shared/components/layout";
import Tracking from "./hud/tracking";

const routes = () => ({
  "/": { render: () => m(Layout, m(Tracking)) },
  "/tracking": { render: () => m(Layout, m(Tracking)) },
});
export default routes;
