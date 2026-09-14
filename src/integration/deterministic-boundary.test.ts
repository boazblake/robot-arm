import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sourceRoot = resolve(fileURLToPath(new URL("../", import.meta.url)));
const currentTestFile = fileURLToPath(import.meta.url);
const metaTestFiles = new Set([
  currentTestFile,
  resolve(sourceRoot, "features/tracking/separation.test.ts"),
  resolve(sourceRoot, "platform/platform-support.test.ts"),
]);

type DiscoverTestFiles = (directory: string) => readonly string[];
const discoverTestFiles: DiscoverTestFiles = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = resolve(directory, entry.name);
    if (entry.isDirectory()) return discoverTestFiles(filePath);
    return filePath.endsWith(".test.ts") && !metaTestFiles.has(filePath)
      ? [filePath]
      : [];
  });

const readTestSources = (): string =>
  discoverTestFiles(sourceRoot)
    .map((filePath) => readFileSync(filePath, "utf8"))
    .join("\n");

describe("deterministic test isolation", () => {
  it("does not import hardware, native, robot, or network boundaries", () => {
    const sources = readTestSources();

    expect(sources).not.toMatch(
      /from ["'](?:@capacitor|@mediapipe|capacitor-media-pipe)/
    );
    expect(sources).not.toContain("navigator.mediaDevices");
    expect(sources).not.toContain("fetch(");
    expect(sources).not.toMatch(/clr_ws|robot adapter|CameraPreview/);
  });
});
