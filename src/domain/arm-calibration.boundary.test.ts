import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(fileURLToPath(new URL(".", import.meta.url)), "arm-calibration.ts"),
  "utf8",
);

describe("arm calibration boundary", () => {
  it("does not depend on robot-control or persistence concepts", () => {
    expect(source).not.toMatch(
      /RobotTarget|TeleopMapper|RobotAdapter|NASA|iMETRO|SO-101|ROS|MoveIt|robot-control|localStorage|IndexedDB|sessionStorage/,
    );
  });

  it("imports only human arm pose domain types", () => {
    expect(source).toContain('from "./human-arm-pose"');
    expect(source).not.toMatch(/from ["'][^"']*(store|adapter|platform|robot)[^"']*["']/i);
  });
});
