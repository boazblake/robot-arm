import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(fileURLToPath(new URL(".", import.meta.url)), "robot-state.ts"), "utf8");

describe("RobotState boundary", () => {
  it("contains no implementation-specific robot dependencies", () => {
    expect(source).not.toMatch(/ROS|ROSLIB|rosbridge|MoveIt|MuJoCo|NASA|iMETRO|CLR|clr_ws|OInK|JointTrajectory|sensor_msgs|geometry_msgs|UR10e|Hand-E|SO-101|servo|WebSocket|RobotAdapter|MediaPipe|camera|UI/i);
  });

  it("contains only robot-independent observed-state fields", () => {
    expect(source).not.toMatch(/jointPositions|jointNames|connectionId|adapterId|sessionId|enabled|disabled|stopped|error:\s*string/);
    expect(source).not.toMatch(/gripper/);
  });
});
