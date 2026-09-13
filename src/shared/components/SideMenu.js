import m from "mithril";
import { canNavigateTo } from "../utils/navigationGuards";
import { exercises } from "../../features/pose/exercises";
import { loadSelectedPoseExercise, saveSelectedPoseExercise } from "../../stores/poseSelectionStore";

const items = [
  { route: "/", icon: "home-outline", label: "Home" },
  { route: "/pose", icon: "barbell-outline", label: "Exercise" },
  { route: "/playback", icon: "play-back-outline", label: "Review" },
  { route: "/progress", icon: "stats-chart-outline", label: "Progress" },
];

const quickLinks = [
  { route: "/settings", icon: "settings-outline", label: "Settings" },
  { route: "/progress", icon: "body-outline", label: "Body Stats" },
  { route: "/about", icon: "person-circle-outline", label: "Profile" },
];

const allExerciseNames = exercises.map((ex) => ex.meta.name).sort((a, b) => a.localeCompare(b));
let filterQuery = "";

const usageKey = "liftmate:exerciseUsage";
const loadUsage = () => {
  try {
    return JSON.parse(localStorage.getItem(usageKey) || "{}") || {};
  } catch {
    return {};
  }
};
const saveUsage = (usage) => localStorage.setItem(usageKey, JSON.stringify(usage));

const sortByUsageThenAlpha = (names) => {
  const usage = loadUsage();
  return [...names].sort((a, b) => {
    const ac = usage[a] || 0;
    const bc = usage[b] || 0;
    if (ac !== bc) return bc - ac;
    return a.localeCompare(b);
  });
};

const filteredExerciseNames = () => {
  const needle = filterQuery.trim().toLowerCase();
  const ordered = sortByUsageThenAlpha(allExerciseNames);
  if (!needle) return ordered;
  return ordered.filter((name) => name.toLowerCase().includes(needle));
};

const mostSelectedNames = (names) => {
  const usage = loadUsage();
  return names.filter((name) => (usage[name] || 0) > 0).slice(0, 8);
};

const alphaGroups = (names) => {
  const groups = {};
  for (const name of names) {
    const letter = /^[a-z]/i.test(name) ? name[0].toUpperCase() : "#";
    if (!groups[letter]) groups[letter] = [];
    groups[letter].push(name);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
};

const chooseExercise = async (name) => {
  if (!name) return;
  saveSelectedPoseExercise(name);
  const usage = loadUsage();
  usage[name] = (usage[name] || 0) + 1;
  saveUsage(usage);
  if (await canNavigateTo("/pose")) {
    m.route.set("/pose", { exercise: name, autostart: "1" });
  }
  const menu = document.querySelector("ion-menu");
  if (menu && typeof menu.close === "function") {
    await menu.close();
  }
};

const navigate = async (route) => {
  if (await canNavigateTo(route)) {
    m.route.set(route);
  }
  const menu = document.querySelector("ion-menu");
  if (menu && typeof menu.close === "function") {
    await menu.close();
  }
};

const SideMenu = {
  view: () => {
    const activeRoute = m.route.get();
    const filtered = filteredExerciseNames();
    const mostSelected = mostSelectedNames(filtered);
    const groups = alphaGroups(filtered);
    const isActive = (route) =>
      route === "/"
        ? activeRoute === "/"
        : activeRoute === route || activeRoute.startsWith(route + "/");

    return m(
      "ion-menu",
      { side: "start", menuId: "mainMenu", contentId: "appShellContent" },
      [
        m("ion-header", [m("ion-toolbar", [m("ion-title", "Menu")])]),
        m("ion-content", [
          m(
            "ion-list.menu-list",
            items.map((item) =>
              m(
                "ion-item",
                {
                  key: item.route,
                  button: true,
                  detail: false,
                  class: `menu-item ${isActive(item.route) ? "menu-item-active" : ""}`,
                  onclick: () => navigate(item.route),
                },
                [m("ion-icon", { class: "menu-item-icon", name: item.icon, slot: "start" }), m("ion-label", { class: "menu-item-label" }, item.label)]
              )
            )
          ),
          m("div.sidebar-exercise-library", [
            m("ion-note", { class: "sidebar-library-note" }, "Exercise Library (pick starts session)"),
            m("input.exercise-autocomplete-input", {
              value: filterQuery,
              placeholder: "Filter exercises",
              oninput: (e) => {
                filterQuery = e.target.value || "";
              },
            }),
            mostSelected.length
              ? m("div.sidebar-most-selected", [
                  m("ion-note", { class: "sidebar-section-label" }, "Most Selected"),
                  m(
                    "div",
                    { class: "sidebar-chip-row" },
                    mostSelected.map((name) =>
                      m(
                        "button.exercise-autocomplete-item",
                        {
                          type: "button",
                          class: "sidebar-chip-btn",
                          onclick: () => {
                            void chooseExercise(name);
                          },
                        },
                        name
                      )
                    )
                  ),
                ])
              : null,
            m("div.sidebar-az-section", [
              m("ion-note", { class: "sidebar-section-label" }, `A-Z (${filtered.length})`),
              m(
                "div",
                { class: "sidebar-az-list" },
                groups.flatMap(([letter, names]) => [
                  m("div", { class: "sidebar-az-letter" }, letter),
                  ...names.map((name) =>
                    m(
                      "button.exercise-autocomplete-item",
                      {
                        type: "button",
                        onclick: () => {
                          void chooseExercise(name);
                        },
                      },
                      name
                    )
                  ),
                ])
              ),
            ]),
          ]),
          m("ion-list", { inset: true }, [
            m("ion-list-header", "Quick Links"),
            ...quickLinks.map((item) =>
              m(
                "ion-item",
                {
                  button: true,
                  detail: false,
                  onclick: () => navigate(item.route),
                },
                [m("ion-icon", { name: item.icon, slot: "start" }), m("ion-label", item.label)]
              )
            ),
          ]),
        ]),
      ],
    );
  },
};

export default SideMenu;
