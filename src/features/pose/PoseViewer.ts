import m from "mithril";
import { Capacitor } from "@capacitor/core";
import {
  state,
  transition,
  camera,
  elements,
  recording,
  exercise,
  isLoading,
  holistic,
  startupError,
  coaching,
  summaryDraft,
} from "./store";
import { cameraService } from "./camera.service";
import { holisticService } from "./holistic.service";
import { renderService } from "./render.service";
import { exercises } from "./exercises";
import { saveRecording } from "./model.utils";
import {
  loadSelectedPoseExercise,
} from "../../stores/poseSelectionStore";
import {
  buildSessionSummary,
  saveSessionSummary,
} from "../../services/sessionFinalize.service";
import "./pose.css";

const clearSessionRuntime = () => {
  recording.active(false);
  recording.startTime(null);
  recording.frames([]);
};

const createSummaryDraft = () => {
  const summary = buildSessionSummary({
    exerciseName: exercise()?.meta?.name || "Unknown",
    reps: coaching().repCount,
    status: coaching().status,
    startTime: recording.startTime(),
    frameCount: recording.frames().length,
    hadError: Boolean(startupError()),
  });
  summaryDraft(summary);
};

let isSavingSummary = false;
let isStartingSession = false;
let shouldAutoStart = false;
let previousShellBackground = "";

const startSession = async () => {
  const hasExercise = Boolean(exercise()?.meta?.name);
  if (!hasExercise || isLoading() || isStartingSession) return;
  isStartingSession = true;
  try {
    transition("start");
    await cameraService.initialize();
    await holisticService.initialize();
    if (camera.ready() && holistic.ready()) {
      startupError(null);
      summaryDraft(null);
      recording.startTime(Date.now());
      transition("ready");
      renderService.startLoop();
      holisticService.startFrameLoop();
      transition("beginStreaming");
    } else {
      transition("error");
    }
  } catch (error) {
    transition("error");
    const message = error instanceof Error ? error.message : "Unknown error";
    startupError(message);
  } finally {
    isStartingSession = false;
  }
};

const PoseViewer: m.Component = {
  oninit: () => {
    const fromRoute = m.route.param("exercise");
    shouldAutoStart = m.route.param("autostart") === "1";
    const fromStorage = loadSelectedPoseExercise();
    const selectedName = fromRoute || fromStorage;
    if (!selectedName) return;
    const selected = exercises.find((ex) => ex.meta.name === selectedName);
    if (selected) {
      exercise(selected);
    }
  },

  oncreate: ({ dom }) => {
    elements.video(dom.querySelector("video"));
    elements.canvas(dom.querySelector("canvas"));
    if (Capacitor.getPlatform() !== "web") {
      const shellMain = document.querySelector(".app-shell-main");
      if (shellMain instanceof HTMLElement) {
        previousShellBackground = shellMain.style.background;
        shellMain.style.background = "transparent";
      }
    }
    if (shouldAutoStart && exercise()?.meta?.name) {
      shouldAutoStart = false;
      setTimeout(() => {
        void startSession();
      }, 0);
    }
  },

  onremove: async () => {
    if (Capacitor.getPlatform() !== "web") {
      const shellMain = document.querySelector(".app-shell-main");
      if (shellMain instanceof HTMLElement) {
        shellMain.style.background = previousShellBackground || "";
      }
    }
    renderService.stopLoop();
    await cameraService.stop();
    await holisticService.close();
    summaryDraft(null);
    isSavingSummary = false;
    clearSessionRuntime();
    transition("stop");
  },

  view: () => {
    const currentState = state();
    const hasExercise = Boolean(exercise()?.meta?.name);
    const draft = summaryDraft();
    const isPreflight = (currentState === "Idle" || currentState === "Stopped") && !draft;
    const isWeb = Capacitor.getPlatform() === "web";
    const shouldMirrorPreview = isWeb && camera.position() === "front";

    return m(
      "section#video-feed.pose-viewer",
      {
        class: isWeb ? "" : "pose-native-preview",
        style: { position: "relative", width: "100%", height: "100%" },
      },
      [
        m("ion-note", { style: "position:absolute; top: 8px; left: 12px; z-index: 26; color: #d7d7d7;" }, "Step 2: Train"),
        m(
          "div",
          { class: "pose-topbar", style: "top: 28px;" },
          m("ion-note", { style: "color:#d7d7d7;" }, exercise()?.meta?.name || "Pick exercise from sidebar")
        ),

        isPreflight &&
          m("div", { class: "pose-idle-overlay" }, [
            m("div", { class: "pose-preflight-card" }, [
              m("h3", "Ready to train"),
              m("p", hasExercise ? "Tap Start to launch live coaching." : "Select an exercise to enable Start."),
              m(
                "ion-button",
                {
                  size: "small",
                  disabled: isLoading() || !hasExercise,
                  onclick: () => void startSession(),
                },
                "Start"
              ),
            ]),
          ]),

        m("video", {
          playsinline: true,
          autoplay: true,
          muted: true,
          style: {
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
            objectFit: "cover",
            zIndex: 1,
            transform: shouldMirrorPreview ? "scaleX(-1)" : "none",
          },
        }),

        m("canvas", {
          style: {
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
            objectFit: "cover",
            zIndex: 10,
            transform: shouldMirrorPreview ? "scaleX(-1)" : "none",
          },
        }),

        isLoading() &&
          m(
            "div.pose-loading-overlay",
            {
              role: "status",
            },
            [m("ion-spinner"), m("p", "Starting camera...")]
          ),

        startupError() && (currentState === "Idle" || currentState === "Stopped") &&
          m("div", { class: "pose-error-banner" }, [
            m("div", { class: "pose-error-title" }, "Could not start exercise"),
            m("div", startupError()),
          ]),

        currentState === "Streaming" &&
          m("div", { class: "pose-controls" }, [
            m(
              "ion-button",
              {
                fill: "outline",
                size: "small",
                onclick: async () => {
                  transition("switchCamera");
                  await cameraService.switch();
                  transition("completeSwitch");
                },
              },
              [m("ion-icon", { slot: "start", name: "camera-reverse-outline" }), "Camera"]
            ),
            m(
              "ion-button",
              {
                color: recording.active() ? "danger" : "primary",
                size: "small",
                onclick: () => {
                  const wasActive = recording.active();
                  recording.active(!wasActive);
                  if (!wasActive && !recording.startTime()) {
                    recording.startTime(Date.now());
                  }
                },
              },
              [
                m("ion-icon", {
                  slot: "start",
                  name: recording.active() ? "stop-circle" : "radio-button-on-outline",
                }),
                recording.active() ? "Stop Recording" : "Record",
              ]
            ),
            m(
              "ion-button",
              {
                fill: "solid",
                color: "medium",
                size: "small",
                onclick: async () => {
                  renderService.stopLoop();
                  await cameraService.stop();
                  await holisticService.close();
                  createSummaryDraft();
                  transition("stop");
                },
              },
              [m("ion-icon", { slot: "start", name: "square-outline" }), "End"]
            ),
          ]),

        currentState === "Streaming" &&
          m("div", { class: "pose-status" }, [
            m("span", exercise()?.meta?.name || "No exercise"),
            m("span", `Reps: ${coaching().repCount}`),
            m("span", coaching().status),
            m("span", coaching().cue),
          ]),

        (currentState === "Stopped" || currentState === "Idle") && draft &&
          m("div", { class: "pose-summary-sheet" }, [
            m("h3", "Session Summary"),
            m("p", `${draft.exercise} - ${draft.reps} reps`),
            m("p", `${draft.durationSec}s - score ${draft.score}`),
            m("div", { class: "pose-summary-actions" }, [
              m(
                "ion-button",
                {
                  size: "small",
                  fill: "outline",
                  onclick: async () => {
                    if (isSavingSummary) return;
                    isSavingSummary = true;
                    try {
                      if (recording.frames().length > 0 && window.confirm("Save recording file?")) {
                        await saveRecording();
                      }
                      saveSessionSummary(draft);
                      summaryDraft(null);
                      clearSessionRuntime();
                      transition("restart");
                    } finally {
                      isSavingSummary = false;
                    }
                  },
                  disabled: isSavingSummary,
                },
                "Save"
              ),
              m(
                "ion-button",
                {
                  size: "small",
                  onclick: async () => {
                    if (isSavingSummary) return;
                    isSavingSummary = true;
                    try {
                      if (recording.frames().length > 0 && window.confirm("Save recording file?")) {
                        await saveRecording();
                      }
                      saveSessionSummary(draft);
                      summaryDraft(null);
                      clearSessionRuntime();
                      transition("restart");
                      m.route.set("/playback");
                    } finally {
                      isSavingSummary = false;
                    }
                  },
                  disabled: isSavingSummary,
                },
                "Save & Review"
              ),
              m(
                "ion-button",
                {
                  size: "small",
                  fill: "clear",
                  color: "medium",
                  onclick: () => {
                    summaryDraft(null);
                    clearSessionRuntime();
                    transition("restart");
                  },
                },
                "Repeat"
              ),
            ]),
          ]),
      ]
    );
  },
};

export default PoseViewer;
