import m from "mithril";
import routes from "./routes";
import { getRoutePrefix } from "./routePrefix";
import model from "../model";
import type { Model, DisplayType } from "../types";
import "setimmediate";

/* Core CSS required for Ionic components to work properly */
import "@ionic/core/css/core.css";
//
// /* Basic CSS for apps built with Ionic */
import "@ionic/core/css/normalize.css";
import "@ionic/core/css/structure.css";
import "@ionic/core/css/typography.css";
//
// /* Optional CSS utils that can be commented out */
import "@ionic/core/css/padding.css";
import "@ionic/core/css/float-elements.css";
import "@ionic/core/css/text-alignment.css";
import "@ionic/core/css/text-transformation.css";
import "@ionic/core/css/flex-utils.css";
import "@ionic/core/css/display.css";
//
/**
 * Ionic Dark Palette
 * -----------------------------------------------------
 * For more information, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */
//
// import "@ionic/core/css/palettes/dark.always.css";
// import "@ionic/core/css/palettes/dark.class.css";
// import "@ionic/core/css/palettes/dark.system.css";

/* Theme variables */
// import "./theme/variables.css";

const installErrorDiagnostics = () => {
  if (!isDev) return;

  window.addEventListener("error", (event) => {
    console.error("[LiftMate][window.error]", {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    console.error("[LiftMate][unhandledrejection]", {
      message: reason?.message ?? String(reason),
      stack: reason?.stack,
      reason,
    });
  });
};

const isDev = Boolean((import.meta as any).env?.DEV);

if (isDev && "serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) =>
      Promise.all(registrations.map((registration) => registration.unregister()))
    )
    .catch(() => undefined);
}

const root = document.getElementById("app");
let winW = window.innerWidth;

const getDisplayType = (w: number): DisplayType => {
  if (w < 600) return "phone";
  if (w < 920) return "tablet";
  return "desktop";
};

const checkWidth = (winW: number): number => {
  const w = window.innerWidth;
  if (winW !== w) {
    winW = w;
    const lastDisplayType = (model as Model).settings.displayType;
    (model as Model).settings.width = w;
    (model as Model).settings.displayType = getDisplayType(w);
    if (lastDisplayType !== (model as Model).settings.displayType) m.redraw();
  }
  return requestAnimationFrame(() => checkWidth(winW));
};

const start = async () => {
  if (!root) throw new Error("Missing #app mount point");

  installErrorDiagnostics();
  await import(/* @vite-ignore */ `${import.meta.env.BASE_URL}ionic.esm.js`);

  (model as Model).settings.displayType = getDisplayType(winW);
  checkWidth(winW);
  m.route.prefix = getRoutePrefix(import.meta.env.BASE_URL);
  m.route(root, "/", routes());
};

void start();
