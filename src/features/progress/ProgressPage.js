import m from "mithril";
import {
  loadSessionSummaries,
  sessionSummaries,
} from "../../stores/sessionStore";

let isLoading = true;
let loadError = "";

const Progress = {
  oninit: () => {
    try {
      isLoading = true;
      loadError = "";
      loadSessionSummaries();
    } catch {
      loadError = "Could not load progress.";
    } finally {
      isLoading = false;
    }
  },

  view: () => {
    const sessions = sessionSummaries();
    const totalSessions = sessions.length;
    const totalReps = sessions.reduce((sum, s) => sum + s.reps, 0);
    const totalSeconds = sessions.reduce((sum, s) => sum + s.durationSec, 0);
    const avgScore =
      sessions.length > 0
        ? Math.round(sessions.reduce((sum, s) => sum + (s.score || 0), 0) / sessions.length)
        : 0;

    const dayKeys = new Set(sessions.map((s) => new Date(s.recordedAt).toDateString()));
    let streak = 0;
    const cursor = new Date();
    while (dayKeys.has(cursor.toDateString())) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    const recentForCharts = sessions.slice(0, 8).reverse();
    const maxReps = Math.max(1, ...recentForCharts.map((s) => s.reps));
    const maxScore = Math.max(1, ...recentForCharts.map((s) => s.score || 0));
    const estWeight = recentForCharts.map((s, index) => {
      const base = 100;
      const intensity = (s.score || 0) * 0.2;
      return Math.round(base + index * 1.2 + intensity);
    });
    const maxWeight = Math.max(1, ...estWeight);

    return m("section", { style: "padding: 16px; max-width: 780px; margin: 0 auto;" }, [
      m("ion-note", { style: "display:block; margin-bottom: 10px; color: var(--ion-color-medium);" }, "Flow: 1) Start  2) Train  3) Review  4) Progress"),
      m("h2", { style: "margin: 0 0 12px;" }, "Step 4: Track progress"),

      isLoading
        ? m("ion-card", [m("ion-card-content", "Loading progress.")])
        : null,

      loadError
        ? m("ion-card", { color: "danger" }, [
            m("ion-card-content", [
              m("p", { style: "margin: 0 0 8px;" }, loadError),
              m(
                "ion-button",
                {
                  size: "small",
                  fill: "outline",
                  onclick: () => {
                    loadError = "";
                    isLoading = true;
                    try {
                      loadSessionSummaries();
                    } catch {
                      loadError = "Could not load progress.";
                    } finally {
                      isLoading = false;
                    }
                  },
                },
                "Retry"
              ),
            ]),
          ])
        : null,

      m("ion-grid", [
        m("ion-row", [
          m("ion-col", [m("ion-card", [m("ion-card-content", [m("h3", "Sessions"), m("p", String(totalSessions))])])]),
          m("ion-col", [m("ion-card", [m("ion-card-content", [m("h3", "Reps"), m("p", String(totalReps))])])]),
          m("ion-col", [m("ion-card", [m("ion-card-content", [m("h3", "Time"), m("p", `${Math.round(totalSeconds / 60)}m`)])])]),
          m("ion-col", [m("ion-card", [m("ion-card-content", [m("h3", "Streak"), m("p", `${streak}d`)])])]),
          m("ion-col", [m("ion-card", [m("ion-card-content", [m("h3", "Avg Score"), m("p", String(avgScore))])])]),
        ]),
      ]),

      m("ion-card", [
        m("ion-card-header", m("ion-card-title", "Recent Sessions")),
        m(
          "ion-card-content",
          sessions.length === 0
            ? m("div", [
                m("p", { style: "margin: 0 0 10px;" }, "No progress yet."),
                m("p", { style: "margin: 0 0 10px; color: var(--ion-color-medium);" }, "Complete one session to start building your history."),
                m("ion-button", { size: "small", onclick: () => m.route.set("/pose") }, "Go to Exercise"),
              ])
            : m(
                "ion-list",
                { inset: true },
                sessions.slice(0, 12).map((s) =>
                  m("ion-item", [
                    m("ion-label", [
                      m("h3", s.exercise),
                      m("p", `${s.reps} reps · ${s.durationSec}s · score ${s.score} · ${new Date(s.recordedAt).toLocaleDateString()}`),
                      m("p", { style: "color: var(--ion-color-medium);" }, `status ${s.status} · frames ${s.frameCount}`),
                    ]),
                  ])
                )
              )
        ),
      ]),

      m("ion-card", [
        m("ion-card-header", m("ion-card-title", "Rep Trend (last 8)")),
        m(
          "ion-card-content",
          recentForCharts.length === 0
            ? m("p", { style: "margin: 0; color: var(--ion-color-medium);" }, "Complete sessions to populate charts.")
            : m(
                "div",
                { style: "display:flex; gap:8px; align-items:flex-end; height:140px;" },
                recentForCharts.map((s) =>
                  m("div", { style: "flex:1; text-align:center;" }, [
                    m("div", {
                      style: `height:${Math.max(6, Math.round((s.reps / maxReps) * 110))}px; background:#38bdf8; border-radius:6px 6px 2px 2px;`,
                    }),
                    m("small", { style: "display:block; margin-top:4px; color:var(--ion-color-medium);" }, `${s.reps}`),
                  ])
                )
              )
        ),
      ]),

      m("ion-card", [
        m("ion-card-header", m("ion-card-title", "Score Trend (last 8)")),
        m(
          "ion-card-content",
          recentForCharts.length === 0
            ? m("p", { style: "margin: 0; color: var(--ion-color-medium);" }, "No score trend yet.")
            : m(
                "div",
                { style: "display:flex; gap:8px; align-items:flex-end; height:140px;" },
                recentForCharts.map((s) =>
                  m("div", { style: "flex:1; text-align:center;" }, [
                    m("div", {
                      style: `height:${Math.max(6, Math.round(((s.score || 0) / maxScore) * 110))}px; background:#22c55e; border-radius:6px 6px 2px 2px;`,
                    }),
                    m("small", { style: "display:block; margin-top:4px; color:var(--ion-color-medium);" }, `${s.score || 0}`),
                  ])
                )
              )
        ),
      ]),

      m("ion-card", [
        m("ion-card-header", m("ion-card-title", "Weight Trend (estimated)")),
        m(
          "ion-card-content",
          recentForCharts.length === 0
            ? m("p", { style: "margin: 0; color: var(--ion-color-medium);" }, "Track more sessions to estimate lifting trend.")
            : m(
                "div",
                { style: "display:flex; gap:8px; align-items:flex-end; height:140px;" },
                estWeight.map((weight) =>
                  m("div", { style: "flex:1; text-align:center;" }, [
                    m("div", {
                      style: `height:${Math.max(6, Math.round((weight / maxWeight) * 110))}px; background:#f59e0b; border-radius:6px 6px 2px 2px;`,
                    }),
                    m("small", { style: "display:block; margin-top:4px; color:var(--ion-color-medium);" }, `${weight} lb`),
                  ])
                )
              )
        ),
      ]),
    ]);
  },
};

export default Progress;
