import m from "mithril";

const About = {
  view: () =>
    m("section", { style: "padding: 16px; max-width: 780px; margin: 0 auto;" }, [
      m("h2", { style: "margin: 0 0 12px;" }, "About Lift Mate"),
      m("ion-card", [
        m("ion-card-content", [
          m("p", { style: "margin: 0 0 8px;" }, "Lift Mate is a camera-first workout companion."),
          m("p", { style: "margin: 0; color: var(--ion-color-medium);" }, "MVP focus: start quickly, track reps, review sessions, and see progress."),
        ]),
      ]),
    ]),
};

export default About;
