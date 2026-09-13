import m from "mithril";

const Settings = {
  view: () =>
    m("section", { style: "padding: 16px; max-width: 780px; margin: 0 auto;" }, [
      m("h2", { style: "margin: 0 0 12px;" }, "Settings"),
      m("ion-card", [
        m("ion-card-content", [
          m("p", { style: "margin: 0 0 8px;" }, "All processing is on-device for MVP."),
          m("p", { style: "margin: 0; color: var(--ion-color-medium);" }, "Camera and session data stay local on this device."),
        ]),
      ]),
    ]),
};

export default Settings;
