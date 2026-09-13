// src/shims/capacitor-media-pipe.ts
// This is a mock implementation for the web platform. It provides
// no-op functions so that the app doesn't crash when calling
// native plugin methods on the web.

export const CapacitorMediaPipe = {
  async initialize(options?: any): Promise<void> {
    // No-op for the web. The web-specific MediaPipe tasks are initialized instead.
    console.log("CapacitorMediaPipe (web shim): initialize", options);
  },

  async send(data: { image: string }): Promise<void> {
    // No-op for the web. Frame processing is handled by the JS library.
  },

  async close(): Promise<void> {
    // No-op for the web.
    console.log("CapacitorMediaPipe (web shim): close");
  },

  addListener(eventName: string, listenerFunc: (data: any) => void): any {
    // The web version doesn't emit events this way. Return a dummy
    // subscription object to prevent errors.
    console.log(`CapacitorMediaPipe (web shim): addListener for ${eventName}`);
    return {
      remove: () => {
        console.log(`CapacitorMediaPipe (web shim): removeListener for ${eventName}`);
      },
    };
  },
};
