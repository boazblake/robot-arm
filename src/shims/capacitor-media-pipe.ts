// src/shims/capacitor-media-pipe.ts
// This is a mock implementation for the web platform. It provides
// no-op functions so that the app doesn't crash when calling
// native plugin methods on the web.

type InitializeOptions = {
  readonly modelComplexity?: "full" | "lite";
  readonly smoothLandmarks?: boolean;
};

export const CapacitorMediaPipe = {
  async initialize(options?: InitializeOptions): Promise<void> {
    // No-op for the web. The web-specific MediaPipe tasks are initialized instead.
    console.log("CapacitorMediaPipe (web shim): initialize", options);
  },

  async send(_data: { image: string }): Promise<void> {
    // No-op for the web. Frame processing is handled by the JS library.
  },

  async close(): Promise<void> {
    // No-op for the web.
    console.log("CapacitorMediaPipe (web shim): close");
  },

  addListener(eventName: string, listenerFunc: (data: unknown) => void): { remove: () => void } {
    // The web version doesn't emit events this way. Return a dummy
    // subscription object to prevent errors.
    console.log(`CapacitorMediaPipe (web shim): addListener for ${eventName}`);
    void listenerFunc;
    return {
      remove: () => {
        console.log(`CapacitorMediaPipe (web shim): removeListener for ${eventName}`);
      },
    };
  },
};
