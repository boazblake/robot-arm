import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const domainDirectory = resolve(fileURLToPath(new URL(".", import.meta.url)));
const source = readFileSync(resolve(domainDirectory, "tracking-validity.ts"), "utf8");
const humanArmPoseSource = readFileSync(resolve(domainDirectory, "../model/human-arm-pose.ts"), "utf8");

describe("tracking validity boundary", () => {
  it("does not depend on robot-control concepts", () => {
    expect(source).not.toMatch(
      /RobotTarget|TeleopMapper|RobotAdapter|NASA|iMETRO|SO-101|ROS|MoveIt|robot-control/,
    );
  });

  it("keeps confidence metadata out of HumanArmPose", () => {
    expect(source).toContain('from "../model/human-arm-pose"');
    expect(humanArmPoseSource).not.toContain("visibility");
  });
});
