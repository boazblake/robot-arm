export type Unsubscribe = () => void;

export type RosBridgeConnectResult =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; reason: "connection-failed" }>;
export type RosBridgeDisconnectResult =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; reason: "disconnect-failed" }>;
export type RosBridgePublishResult =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; reason: "publish-failed" }>;
export type RosBridgeConnectionLossReason = "network" | "server" | "protocol-error";

export type RosBridgeClient = Readonly<{
  readonly connect: () => Promise<RosBridgeConnectResult>;
  readonly disconnect: () => Promise<RosBridgeDisconnectResult>;
  readonly publish: <Message>(channel: string, message: Message, messageType?: string) => RosBridgePublishResult;
  readonly subscribe: (channel: string, listener: (payload: unknown) => void, messageType?: string) => Unsubscribe;
  readonly onConnectionLost: (listener: (reason: RosBridgeConnectionLossReason) => void) => Unsubscribe;
}>;
