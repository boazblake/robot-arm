import m from "mithril";
import { loadSessionSummaries, sessionSummaries } from "../../stores/sessionStore";
import { loadSelectedPoseExercise } from "../../stores/poseSelectionStore";

let lastSelectedExercise = "";

const goToPose = (exerciseName?: string | null, autoStart = false) => {
  m.route.set("/pose", {
    exercise: exerciseName || undefined,
    autostart: autoStart ? "1" : undefined,
  });
};

const HomePage: m.Component = {
  oninit: () => {
    loadSessionSummaries();
    const persisted = loadSelectedPoseExercise();
    if (persisted) lastSelectedExercise = persisted;
  },

  view: () => {
    const recentSessions = sessionSummaries().slice(0, 8);
    const latest = recentSessions[0] || null;

    return m("section.home-launch", [
      m("section.home-hero", [
        m("p.home-eyebrow", "Lift-Mate"),
        m("h2.home-title", "Train from recent history"),
        m("p.home-subtitle", "Pick any exercise from the sidebar library on camera page. Home focuses on your latest sessions."),
      ]),

      m("section.home-actions", [
        m(
          "ion-button",
          {
            expand: "block",
            class: "home-start-btn",
            onclick: () => goToPose(lastSelectedExercise || undefined),
          },
          "Open Exercise Camera"
        ),
        latest
          ? m(
              "ion-button",
              {
                expand: "block",
                fill: "outline",
                onclick: () => goToPose(latest.exercise, true),
              },
              `Resume Last: ${latest.exercise}`
            )
          : null,
        m(
          "ion-button",
          {
            expand: "block",
            fill: "outline",
            onclick: () => m.route.set("/progress"),
          },
          "View Progress"
        ),
      ]),

      m("ion-card", [
        m("ion-card-header", m("ion-card-title", "Recent Sessions")),
        m(
          "ion-card-content",
          recentSessions.length === 0
            ? m("div", [
                m("p", { style: "margin: 0 0 10px;" }, "No sessions yet."),
                m("p", { style: "margin: 0 0 12px; color: var(--ion-color-medium);" }, "Open camera and select an exercise from the sidebar to start."),
              ])
            : m(
                "ion-list",
                { inset: true },
                recentSessions.map((session) =>
                  m(
                    "ion-item",
                    {
                      button: true,
                      detail: true,
                      onclick: () => goToPose(session.exercise, true),
                    },
                    [
                      m("ion-icon", { slot: "start", name: "play-back-outline" }),
                      m("ion-label", [
                        m("h3", session.exercise),
                        m("p", `${session.reps} reps - ${session.durationSec}s - score ${session.score}`),
                        m("p", { style: "color: var(--ion-color-medium);" }, `${new Date(session.recordedAt).toLocaleString()} - ${session.status}`),
                      ]),
                    ]
                  )
                )
              )
        ),
      ]),
    ]);
  },
};

export default HomePage;
