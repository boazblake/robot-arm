import type { PluginListenerHandle } from "@capacitor/core";
import { CapacitorMediaPipe as NativeCapacitorMediaPipe } from "capacitor-media-pipe";

// Define the TypeScript interface for our native plugin
export interface CapacitorMediaPipePlugin {
  initialize(options: {
    modelComplexity?: 'full' | 'lite';
    smoothLandmarks?: boolean;
    minDetectionConfidence?: number;
    minTrackingConfidence?: number;
    holisticModel?: string;
    holisticModelUrl?: string;
    model?: string;
  }): Promise<void>;
  send(options: {
    image: string;
    width?: number;
    height?: number;
    rotationDegrees?: number;
    isMirrored?: boolean;
  }): Promise<void>;
  close(): Promise<void>;
  addListener(
    eventName: "holisticResults",
    listenerFunc: (results: any) => void
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
}

export default NativeCapacitorMediaPipe as CapacitorMediaPipePlugin;
