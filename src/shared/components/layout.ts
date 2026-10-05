import m from "mithril";
import "./shell.css";
const Layout: m.Component = {
  view: (vnode) =>
    m(
      "ion-app",
      m("ion-page.app-shell", [
        m("ion-header.app-shell-header", m("ion-toolbar", [m("span.app-shell-kicker", "LIFTMATE / ROBOTICS LAB"), m("ion-title", "SO—101 CONTROL")])),
        m("main.app-shell-main", vnode.children),
      ])
    ),
};
export default Layout;
