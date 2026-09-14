import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const trackingRoot = resolve(fileURLToPath(new URL(".", import.meta.url)));
const readTrackingSource = (fileName: string): string =>
  readFileSync(resolve(trackingRoot, fileName), "utf8");

describe("tracking responsibility boundaries", () => {
  it("keeps camera acquisition and lifecycle in the camera service", () => {
    const camera = readTrackingSource("camera.service.ts");
    const holistic = readTrackingSource("holistic.service.ts");

    expect(camera).toContain('@capacitor-community/camera-preview');
    expect(holistic).not.toContain('@capacitor-community/camera-preview');
    expect(holistic).toContain("cameraService.captureSample");
  });

  it("keeps session orchestration out of the viewer and resource services", () => {
    const viewer = readTrackingSource("PoseViewer.ts");
    const session = readTrackingSource("session.service.ts");
    const camera = readTrackingSource("camera.service.ts");
    const holistic = readTrackingSource("holistic.service.ts");
    const render = readTrackingSource("render.service.ts");

    expect(viewer).toContain("trackingSession.start");
    expect(viewer).not.toContain("cameraService.initialize");
    expect(viewer).not.toContain("holisticService.initialize");
    expect(viewer).not.toContain("renderService.startLoop");
    expect(session).toContain("cameraService.initialize");
    expect(session).toContain("holisticService.initialize");
    expect(session).toContain("renderService.startLoop");
    expect(camera).not.toContain("holisticService");
    expect(holistic).not.toContain("renderService");
    expect(render).not.toContain("holisticService");
  });

  it("keeps MediaPipe inference and rendering independent", () => {
    const holistic = readTrackingSource("holistic.service.ts");
    const render = readTrackingSource("render.service.ts");

    expect(holistic).toContain("@mediapipe/tasks-vision");
    expect(render).not.toContain("@mediapipe/tasks-vision");
    expect(render).not.toContain("media-pipe");
  });

  it("does not place fitness analysis in tracking modules", () => {
    const sourceFiles = [
      "PoseViewer.ts",
      "camera.service.ts",
      "holistic.service.ts",
      "media-pipe.ts",
      "render.service.ts",
      "session.service.ts",
      "store.ts",
    ];
    const trackingSource = sourceFiles
      .map(readTrackingSource)
      .join("\n")
      .toLowerCase();

    expect(trackingSource).not.toMatch(
      /rep.?count|exercise.?class|coaching.?cue|squat.?state|press.?state|workout.?session/
    );
  });
});
