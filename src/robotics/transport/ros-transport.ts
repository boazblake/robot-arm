import type {
  RosBridgeClient,
  RosBridgeConnectionLossReason,
} from "./rosbridge-client";
import type { Unsubscribe } from "./rosbridge-client";

export type RosTransportStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "disconnecting";
export type RosConnectionLossReason = RosBridgeConnectionLossReason;
export type RosConnectFailure = "connection-failed";
export type RosDisconnectFailure = "disconnect-failed";
export type RosPublishFailure = "not-connected" | "publish-failed";
export type RosMessageValidator<Message> = (
  input: unknown,
) =>
  | Readonly<{ ok: true; value: Message }>
  | Readonly<{ ok: false; reason: "invalid-payload" }>;
export type RosConnectResult =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; reason: RosConnectFailure }>;
export type RosDisconnectResult =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; reason: RosDisconnectFailure }>;
export type RosPublishResult =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; reason: RosPublishFailure }>;
export type RosTransportEvent =
  | Readonly<{ type: "connection-lost"; reason: RosConnectionLossReason }>
  | Readonly<{ type: "invalid-message"; channel: string }>;
export type RosTransport = Readonly<{
  readonly connect: () => Promise<RosConnectResult>;
  readonly disconnect: () => Promise<RosDisconnectResult>;
  readonly publish: <Message>(channel: string, message: Message, messageType?: string) => RosPublishResult;
  readonly subscribe: <Message>(
    channel: string,
    validator: RosMessageValidator<Message>,
    listener: (message: Message) => void,
    messageType?: string,
  ) => Unsubscribe;
  readonly onEvent: (listener: (event: RosTransportEvent) => void) => Unsubscribe;
  readonly status: () => RosTransportStatus;
}>;

type CreateRosTransport = (client: RosBridgeClient) => RosTransport;
type Subscription = Readonly<{
  readonly channel: string;
  readonly messageType?: string;
  readonly receive: (payload: unknown, subscriptionGeneration: number) => void;
  readonly setUnsubscribe: (unsubscribe: Unsubscribe) => void;
}>;

const createRosTransport: CreateRosTransport = (client) => {
  let currentStatus: RosTransportStatus = "disconnected";
  let generation = 0;
  let pendingConnect: Promise<RosConnectResult> | undefined;
  let pendingDisconnect: Promise<RosDisconnectResult> | undefined;
  let detachConnection: Unsubscribe = () => undefined;
  const subscriptions = new Set<Subscription>();
  const eventListeners = new Set<(event: RosTransportEvent) => void>();

  const observe = (event: RosTransportEvent): void => {
    for (const listener of eventListeners) {
      try {
        listener(event);
      } catch {
        /* Observers are best effort and cannot alter transport state. */
      }
    }
  };
  const detachSubscriptions = (): void => {
    for (const subscription of subscriptions) subscription.setUnsubscribe(() => undefined);
  };
  const attachSubscriptions = (connectionGeneration: number): void => {
    for (const subscription of subscriptions) {
      subscription.setUnsubscribe(
        client.subscribe(subscription.channel, (payload) => {
          subscription.receive(payload, connectionGeneration);
        }, subscription.messageType),
      );
    }
  };
  const invalidateConnection = (): void => {
    generation += 1;
    detachConnection();
    detachConnection = () => undefined;
    detachSubscriptions();
  };
  const connect = (): Promise<RosConnectResult> => {
    if (pendingConnect !== undefined) return pendingConnect;
    if (currentStatus === "connected") return Promise.resolve({ ok: true });
    currentStatus = "connecting";
    const connectionGeneration = generation + 1;
    generation = connectionGeneration;
    const result = client.connect()
      .then((connectionResult): RosConnectResult => {
        if (!connectionResult.ok || currentStatus !== "connecting" || generation !== connectionGeneration) {
          if (currentStatus === "connecting") currentStatus = "disconnected";
          return Object.freeze({ ok: false, reason: "connection-failed" as const });
        }
        currentStatus = "connected";
        detachConnection = client.onConnectionLost((reason) => {
          if (generation !== connectionGeneration || currentStatus !== "connected") return;
          invalidateConnection();
          currentStatus = "disconnected";
          observe({ type: "connection-lost", reason });
        });
        attachSubscriptions(connectionGeneration);
        return Object.freeze({ ok: true });
      })
      .catch(() => {
        currentStatus = "disconnected";
        return Object.freeze({ ok: false, reason: "connection-failed" as const });
      })
      .finally(() => {
        pendingConnect = undefined;
      });
    pendingConnect = result;
    return result;
  };
  const disconnect = (): Promise<RosDisconnectResult> => {
    if (pendingDisconnect !== undefined) return pendingDisconnect;
    if (currentStatus === "disconnected") return Promise.resolve({ ok: true });
    currentStatus = "disconnecting";
    invalidateConnection();
    const result = client.disconnect()
      .then((disconnectResult): RosDisconnectResult => {
        currentStatus = "disconnected";
        return disconnectResult.ok
          ? Object.freeze({ ok: true })
          : Object.freeze({ ok: false, reason: "disconnect-failed" as const });
      })
      .catch(() => {
        currentStatus = "disconnected";
        return Object.freeze({ ok: false, reason: "disconnect-failed" as const });
      })
      .finally(() => {
        pendingDisconnect = undefined;
      });
    pendingDisconnect = result;
    return result;
  };
  const publish = <Message>(channel: string, message: Message, messageType?: string): RosPublishResult => {
    if (currentStatus !== "connected") return Object.freeze({ ok: false, reason: "not-connected" });
    try {
      const result = client.publish(channel, message, messageType);
      return result.ok
        ? Object.freeze({ ok: true })
        : Object.freeze({ ok: false, reason: "publish-failed" });
    } catch {
      return Object.freeze({ ok: false, reason: "publish-failed" });
    }
  };
  const subscribe = <Message>(
    channel: string,
    validator: RosMessageValidator<Message>,
    listener: (message: Message) => void,
    messageType?: string,
  ): Unsubscribe => {
    let active = true;
    let unsubscribeClient: Unsubscribe = () => undefined;
    const subscription: Subscription = {
      channel,
      messageType,
      receive: (payload, subscriptionGeneration) => {
        if (!active || subscriptionGeneration !== generation || currentStatus !== "connected") return;
        let validation: ReturnType<typeof validator>;
        try {
          validation = validator(payload);
        } catch {
          observe({ type: "invalid-message", channel });
          return;
        }
        if (!validation.ok) {
          observe({ type: "invalid-message", channel });
          return;
        }
        try {
          listener(validation.value);
        } catch {
          /* A subscriber cannot corrupt transport state. */
        }
      },
      setUnsubscribe: (next) => {
        unsubscribeClient();
        unsubscribeClient = next;
      },
    };
    subscriptions.add(subscription);
    if (currentStatus === "connected") {
      const subscriptionGeneration = generation;
      subscription.setUnsubscribe(
        client.subscribe(channel, (payload) => subscription.receive(payload, subscriptionGeneration), messageType),
      );
    }
    return () => {
      if (!active) return;
      active = false;
      subscription.setUnsubscribe(() => undefined);
      subscriptions.delete(subscription);
    };
  };
  const onEvent = (listener: (event: RosTransportEvent) => void): Unsubscribe => {
    let active = true;
    eventListeners.add(listener);
    return () => {
      if (!active) return;
      active = false;
      eventListeners.delete(listener);
    };
  };

  return Object.freeze({ connect, disconnect, publish, subscribe, onEvent, status: () => currentStatus });
};

export { createRosTransport };
