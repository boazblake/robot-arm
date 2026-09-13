import m from "mithril";
import Layout from "../shared/components/Layout";
import Tracking from "../features/tracking";

const routes = () => ({
  "/": { render: () => m(Layout, m(Tracking)) },
  "/tracking": { render: () => m(Layout, m(Tracking)) },
});
export default routes;
