declare module "capacitor-media-pipe" {
  export const CapacitorMediaPipe: {
    readonly initialize: (options?: {
      readonly modelComplexity?: "full" | "lite";
      readonly smoothLandmarks?: boolean;
    }) => Promise<void>;
    readonly send: (options: { readonly image: string }) => Promise<void>;
    readonly close: () => Promise<void>;
    readonly addListener: (
      eventName: string,
      listener: (result: unknown) => void,
    ) => Promise<{ readonly remove: () => Promise<void> }>;
  };
}
