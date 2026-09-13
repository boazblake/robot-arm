import m from "mithril";
import SideMenu from "./SideMenu.js";
import Tabs from "./Tabs.js";
import "./shell.css";

const TITLES = {
  "/": "Home",
  "/pose": "Exercise",
  "/playback": "Review",
  "/progress": "Progress",
  "/settings": "Settings",
  "/about": "About",
};

const Layout = {
  view: (vnode) => {
    const route = m.route.get();
    const title = vnode.attrs.title || TITLES[route] || "Lift Mate";

    return m("ion-app", [
      m(SideMenu),
      m("ion-page.app-shell", { id: "appShellContent" }, [
        m("ion-header", { class: "ion-no-border" }, [
          m("ion-toolbar", [
            m("ion-buttons", { slot: "start" }, [
              m("ion-menu-button", { menu: "mainMenu" }),
            ]),
            m("ion-title", title),
          ]),
        ]),
        m("div", { class: "app-shell-content" }, [
          m("main", { class: "app-shell-main" }, vnode.children),
          m(Tabs),
        ]),
      ]),
    ]);
  },
};

export default Layout;
