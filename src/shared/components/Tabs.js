import m from "mithril";
import { canNavigateTo } from "../utils/navigationGuards";

const tabs = [
  { route: "/", icon: "home-outline", label: "Home" },
  { route: "/pose", icon: "fitness-outline", label: "Exercise" },
  { route: "/playback", icon: "refresh-outline", label: "Review" },
  { route: "/progress", icon: "stats-chart-outline", label: "Progress" },
];

const Tabs = {
  view: () => {
    const activeRoute = m.route.get();
    const isActive = (route) =>
      route === "/"
        ? activeRoute === "/"
        : activeRoute === route || activeRoute.startsWith(route + "/");

    return m("div.app-tabbar", [
      m("ion-toolbar", { class: "app-tabbar-toolbar" }, [
        m(
          "div",
          { class: "app-tabbar-grid" },
          tabs.map((tab) =>
            m(
              "button",
              {
                key: tab.route,
                type: "button",
                class: `app-tabbar-btn ${isActive(tab.route) ? "is-active" : ""}`,
                onclick: () => {
                  void (async () => {
                    if (!isActive(tab.route) && (await canNavigateTo(tab.route))) {
                      m.route.set(tab.route);
                    }
                  })();
                },
              },
              [m("ion-icon", { name: tab.icon }), m("span", tab.label)],
            ),
          ),
        ),
      ]),
    ]);
  },
};

export default Tabs;
