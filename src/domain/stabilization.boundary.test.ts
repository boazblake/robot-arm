import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(fileURLToPath(new URL(".", import.meta.url)), "stabilization.ts"),
  "utf8",
);

describe("stabilization boundary", () => {
  it("does not depend on tracking, camera, UI, or robot implementations", () => {
    expect(source).toContain('from "./workspace-mapping"');
    expect(source).not.toMatch(/TrackingFrame|MediaPipe|camera|screen|canvas|window|DOM|UI|RobotTarget|RobotAdapter|NASA|iMETRO|CLR|ROS|MoveIt|MuJoCo|servo/i);
  });
});
