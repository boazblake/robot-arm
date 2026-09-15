import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(fileURLToPath(new URL(".", import.meta.url)), "robot-target.ts"),
  "utf8",
);

describe("RobotTarget boundary", () => {
  it("has no concrete robot or adapter dependencies", () => {
    expect(source).not.toMatch(
      /ROS|MoveIt|MuJoCo|NASA|iMETRO|CLR|UR10e|Hand-E|SO-101|servo|RobotAdapter|robot-specific|control-module/i,
    );
  });
});
