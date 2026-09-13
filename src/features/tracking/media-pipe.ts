import type { PluginListenerHandle } from "@capacitor/core";
import { CapacitorMediaPipe as NativeMediaPipe } from "capacitor-media-pipe";

export interface CapacitorMediaPipePlugin {
  initialize(options: { modelComplexity?: "full" | "lite"; smoothLandmarks?: boolean }): Promise<void>;
  send(options: { image: string }): Promise<void>;
  close(): Promise<void>;
  addListener(eventName: "holisticResults", listener: (result: unknown) => void): Promise<PluginListenerHandle>;
}
export default NativeMediaPipe as CapacitorMediaPipePlugin;
