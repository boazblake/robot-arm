import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const domainRoot = resolve(fileURLToPath(new URL(".", import.meta.url)));
const readDomainSource = (fileName: string): string =>
  readFileSync(resolve(domainRoot, fileName), "utf8");

describe("HumanArmPose boundary", () => {
  it("does not depend on robot-control concepts", () => {
    const source = ["../model/human-arm-pose.ts", "human-landmarks.ts"]
      .map(readDomainSource)
      .join("\n");
    expect(source).not.toMatch(
      /RobotTarget|TeleopMapper|RobotAdapter|NASA|iMETRO|SO-101|ROS|robot-control/,
    );
  });

  it("uses named landmark accessors at the construction boundary", () => {
    const source = readDomainSource("../model/human-arm-pose.ts");
    expect(source).toContain("getLeftShoulder");
    expect(source).toContain("getRightShoulder");
    expect(source).toContain("getHandAnchor");
    expect(source).not.toMatch(/poseLandmarks\[\d+\]/);
    expect(source).not.toMatch(/HandLandmarks\[\d+\]/);
  });
});
