import m from "mithril";
import { loadSessionSummaries, sessionSummaries } from "../../stores/sessionStore";
import {
  type RecordingFrame as PlaybackFrame,
  parseRecordingFrames,
} from "../../domain/recording";

const drawFrame = (canvas: HTMLCanvasElement, frame: PlaybackFrame | undefined) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#101114";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!frame?.data?.poseLandmarks?.length) return;

  ctx.fillStyle = "#33d17a";
  frame.data.poseLandmarks.forEach((point) => {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
    ctx.beginPath();
    ctx.arc(point.x * canvas.width, point.y * canvas.height, 3, 0, Math.PI * 2);
    ctx.fill();
  });
};

const PosePlayback: m.Component = {
  selectedSessionId: null as string | null,
  importMessage: "",
  importStats: { total: 0, valid: 0, dropped: 0 },
  frames: [] as PlaybackFrame[],
  frameIndex: 0,
  isPlaying: false,
  rafId: null as number | null,
  canvas: null as HTMLCanvasElement | null,

  oninit: () => {
    loadSessionSummaries();
  },

  onremove: function () {
    if (this.rafId) cancelAnimationFrame(this.rafId);
  },

  playNext: function () {
    if (!this.isPlaying || this.frames.length === 0) return;
    this.frameIndex = Math.min(this.frameIndex + 1, this.frames.length - 1);
    if (this.canvas) drawFrame(this.canvas, this.frames[this.frameIndex]);
    if (this.frameIndex >= this.frames.length - 1) {
      this.isPlaying = false;
      this.rafId = null;
      m.redraw();
      return;
    }
    this.rafId = requestAnimationFrame(() => this.playNext());
    m.redraw();
  },

  stopPlayback: function () {
    this.isPlaying = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  },

  loadFile: function (event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const raw = String(e.target?.result || "[]");
      const result = parseRecordingFrames(raw);

      if (result.error) {
        this.importMessage = result.error;
        this.importStats = { total: 0, valid: 0, dropped: 0 };
        this.frames = [];
        this.frameIndex = 0;
      } else {
        const total = result.frames.length + result.droppedFrames;
        this.frames = result.frames;
        this.frameIndex = 0;
        this.importStats = {
          total,
          valid: result.frames.length,
          dropped: result.droppedFrames,
        };
        if (!result.frames.length) {
          this.importMessage = "Recording is empty.";
        } else if (result.droppedFrames > 0) {
          this.importMessage = `Recording loaded with ${result.droppedFrames} invalid frame(s) skipped.`;
        } else {
          this.importMessage = "Recording loaded.";
        }
        if (this.canvas) drawFrame(this.canvas, this.frames[0]);
      }
      m.redraw();
    };
    reader.readAsText(file);
  },

  view: function () {
    const sessions = sessionSummaries();
    const selected = sessions.find((s) => s.id === this.selectedSessionId) || null;

    return m("section", { style: "padding: 16px; max-width: 780px; margin: 0 auto;" }, [
      m("ion-note", { style: "display:block; margin-bottom: 10px; color: var(--ion-color-medium);" }, "Flow: 1) Start  2) Train  3) Review  4) Progress"),
      m("h2", { style: "margin: 0 0 12px;" }, "Step 3: Review your session"),

      m("ion-card", [
        m("ion-card-header", m("ion-card-title", "Playback")),
        m("ion-card-content", [
          selected
            ? m("div", { style: "margin: 0 0 10px;" }, [
                m("p", { style: "margin: 0 0 4px;" }, `${selected.exercise} · ${selected.reps} reps · ${selected.durationSec}s`),
                m(
                  "p",
                  { style: "margin: 0; color: var(--ion-color-medium);" },
                  `status ${selected.status} · score ${selected.score} · frames ${selected.frameCount} · ${new Date(selected.recordedAt).toLocaleString()}`
                ),
              ])
            : m("p", { style: "margin: 0 0 10px; color: var(--ion-color-medium);" }, "Select a session from the list, then load a recording JSON file to scrub/play."),

          m("ion-item", [
            m("ion-label", { for: "upload-recording" }, "Import local JSON recording"),
            m("ion-input", {
              type: "file",
              id: "upload-recording",
              accept: "application/json",
              onchange: (e: Event) => this.loadFile(e),
            }),
          ]),

          this.importMessage
            ? m("ion-note", { color: this.importMessage.startsWith("Invalid") ? "danger" : "success" }, this.importMessage)
            : null,

          this.importStats.total > 0
            ? m("ion-card", { style: "margin-top: 10px;" }, [
                m("ion-card-content", [
                  m("p", { style: "margin: 0 0 6px; font-weight: 600;" }, "Import Diagnostics"),
                  m(
                    "p",
                    { style: "margin: 0; color: var(--ion-color-medium);" },
                    `Frames: ${this.importStats.valid}/${this.importStats.total} valid · ${this.importStats.dropped} dropped`
                  ),
                ]),
              ])
            : null,

          m("canvas", {
            oncreate: ({ dom }: { dom: HTMLCanvasElement }) => {
              this.canvas = dom;
              dom.width = 720;
              dom.height = 480;
              dom.style.width = "100%";
              dom.style.height = "260px";
              dom.style.border = "1px solid var(--ion-color-step-200)";
              dom.style.borderRadius = "8px";
              drawFrame(dom, this.frames[this.frameIndex]);
            },
          }),

          m("ion-range", {
            min: 0,
            max: Math.max(0, this.frames.length - 1),
            value: this.frameIndex,
            snaps: true,
            step: 1,
            disabled: this.frames.length === 0,
            onIonChange: (e: any) => {
              this.frameIndex = Number(e.detail.value || 0);
              if (this.canvas) drawFrame(this.canvas, this.frames[this.frameIndex]);
            },
          }),

          m("div", { style: "display:flex; gap:8px; margin-top: 10px;" }, [
            m(
              "ion-button",
              {
                size: "small",
                disabled: this.frames.length === 0 || this.isPlaying,
                onclick: () => {
                  this.isPlaying = true;
                  this.playNext();
                },
              },
              "Play"
            ),
            m(
              "ion-button",
              {
                size: "small",
                fill: "outline",
                disabled: !this.isPlaying,
                onclick: () => this.stopPlayback(),
              },
              "Pause"
            ),
            m(
              "ion-button",
              {
                size: "small",
                fill: "clear",
                color: "medium",
                disabled: this.frames.length === 0,
                onclick: () => {
                  this.stopPlayback();
                  this.frameIndex = 0;
                  if (this.canvas) drawFrame(this.canvas, this.frames[0]);
                },
              },
              "Reset"
            ),
          ]),
        ]),
      ]),

      sessions.length === 0
        ? m("ion-card", [
            m("ion-card-content", [
              m("h3", { style: "margin: 0 0 8px;" }, "No recent sessions yet."),
              m("p", { style: "margin: 0 0 12px; color: var(--ion-color-medium);" }, "Finish a workout and save to see playback-ready sessions here."),
              m("ion-button", { size: "small", onclick: () => m.route.set("/pose") }, "Go to Exercise"),
            ]),
          ])
        : m("ion-card", [
            m("ion-card-header", m("ion-card-title", "Recent Sessions")),
            m(
              "ion-list",
              { inset: true },
              sessions.slice(0, 12).map((s) =>
                m(
                  "ion-item",
                  {
                    button: true,
                    detail: false,
                    onclick: () => {
                      this.selectedSessionId = s.id;
                    },
                  },
                  [
                    m("ion-label", [
                      m("h3", s.exercise),
                      m("p", `${s.reps} reps · ${s.durationSec}s · score ${s.score}`),
                      m("p", { style: "color: var(--ion-color-medium);" }, `${new Date(s.recordedAt).toLocaleString()} · frames ${s.frameCount} · ${s.status}`),
                    ]),
                  ]
                )
              )
            ),
          ]),
    ]);
  },
};

export default PosePlayback;
