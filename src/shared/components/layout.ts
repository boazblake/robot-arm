import m from "mithril";
import "./shell.css";
const Layout: m.Component = {
  view: (vnode) =>
    m(
      "ion-app",
      m("ion-page.app-shell", [
        m("ion-header", m("ion-toolbar", m("ion-title", "Robot Arm Tracking"))),
        m("main.app-shell-main", vnode.children),
      ])
    ),
};
export default Layout;
