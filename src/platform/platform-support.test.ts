import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const readProjectFile = (relativePath: string): string =>
  readFileSync(resolve(root, relativePath), "utf8");

const hasProjectFile = (relativePath: string): boolean =>
  existsSync(resolve(root, relativePath));

describe("platform support boundaries", () => {
  it("retains the production web and Capacitor configuration", () => {
    const capacitorConfig = readProjectFile("capacitor.config.ts");
    const packageJson = readProjectFile("package.json");
    const infoPlist = readProjectFile("ios/App/App/Info.plist");
    const podfile = readProjectFile("ios/App/Podfile");

    expect(packageJson).toContain('"build": "vite build"');
    expect(capacitorConfig).toContain('appId: "io.boazblake.robotarm"');
    expect(capacitorConfig).toContain('webDir: "docs"');
    expect(infoPlist).toContain("NSCameraUsageDescription");
    expect(podfile).toContain("CapacitorCommunityCameraPreview");
    expect(podfile).toContain("CapacitorCamera");
  });

  it("retains the iOS MediaPipe files in the Xcode sources phase", () => {
    const project = readProjectFile("ios/App/App.xcodeproj/project.pbxproj");

    expect(hasProjectFile("ios/App/MediaPipe/MediaPipePlugin.swift")).toBe(true);
    const bridgeController = readProjectFile(
      "ios/App/App/BridgeViewController.swift"
    );

    expect(hasProjectFile("ios/App/MediaPipe/MediaPipeProcessor.swift")).toBe(true);
    expect(project).toContain("MediaPipePlugin.swift in Sources");
    expect(project).toContain("MediaPipeProcessor.swift in Sources");
    expect(project).not.toContain("MediaPipeProccessor.swift");
    expect(bridgeController).toContain(
      "bridge?.registerPluginInstance(MediaPipePlugin())"
    );
  });

  it("retains the Android MediaPipe registration boundary", () => {
    const settings = readProjectFile("android/settings.gradle");
    const activity = readProjectFile(
      "android/src/main/java/io/boazblake/liftmate/MainActivity.java"
    );
    const plugin = readProjectFile(
      "android/src/main/java/io/boazblake/liftmate/capacitormediapipe/CapacitorMediaPipePlugin.java"
    );

    expect(settings).toContain("include ':capacitor-media-pipe'");
    expect(settings).toContain("capacitormediapipe");
    expect(activity).toContain("CapacitorMediaPipePlugin.class");
    expect(plugin).toContain('@CapacitorPlugin(name = "CapacitorMediaPipe")');
  });

  it("does not assume an absent Android app module is verified", () => {
    expect(hasProjectFile("android/app/build.gradle")).toBe(false);
    expect(hasProjectFile("android/gradlew")).toBe(false);
  });
});
