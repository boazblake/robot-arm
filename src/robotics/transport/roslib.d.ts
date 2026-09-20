declare module "roslib" {
  export type RosEvent = "connection" | "error" | "close";
  export type RosMessage = Record<string, unknown>;
  export class Ros {
    constructor(options?: { readonly url?: string });
    on(event: RosEvent, listener: (...args: unknown[]) => void): void;
    connect(url: string): void;
    close(): void;
    isConnected: boolean;
  }
  export class Topic {
    constructor(options: {
      readonly ros: Ros;
      readonly name: string;
      readonly messageType: string;
      readonly reconnect_on_close?: boolean;
    });
    advertise(): void;
    unadvertise(): void;
    publish(message: Message): void;
    subscribe(listener: (message: Message) => void): void;
    unsubscribe(listener?: (message: Message) => void): void;
  }
  export class Message {
    constructor(values: Record<string, unknown>);
  }
  const ROSLIB: { readonly Ros: typeof Ros; readonly Topic: typeof Topic; readonly Message: typeof Message };
  export default ROSLIB;
}
