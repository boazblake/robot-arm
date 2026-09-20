import ROSLIB from "roslib";
import type {
  RosBridgeClient,
  RosBridgeConnectResult,
  RosBridgeConnectionLossReason,
  RosBridgeDisconnectResult,
  RosBridgePublishResult,
  Unsubscribe,
} from "./rosbridge-client";

type RoslibTopic = InstanceType<typeof ROSLIB.Topic>;

type CreateRoslibRosBridgeClient = (url: string) => RosBridgeClient;

export const createRoslibRosBridgeClient: CreateRoslibRosBridgeClient = (url) => {
  let ros: InstanceType<typeof ROSLIB.Ros> | null = null;
  const topics = new Map<string, RoslibTopic>();
  const connectionListeners = new Set<(reason: RosBridgeConnectionLossReason) => void>();
  const createTopic = (channel: string, messageType: string): RoslibTopic => {
    const topic = new ROSLIB.Topic({ ros: ros as InstanceType<typeof ROSLIB.Ros>, name: channel, messageType, reconnect_on_close: false });
    topics.set(`${channel}:${messageType}`, topic);
    return topic;
  };
  const connect = (): Promise<RosBridgeConnectResult> =>
    new Promise((resolve) => {
      const connection = new ROSLIB.Ros();
      ros = connection;
      const finish = (result: RosBridgeConnectResult): void => {
        connectionListeners.clear();
        resolve(result);
      };
      connection.on("connection", () => finish({ ok: true }));
      connection.on("error", () => finish({ ok: false, reason: "connection-failed" }));
      connection.on("close", () => {
        if (ros !== connection) return;
        for (const listener of connectionListeners) listener("network");
      });
      try {
        connection.connect(url);
      } catch {
        finish({ ok: false, reason: "connection-failed" });
      }
    });
  const disconnect = (): Promise<RosBridgeDisconnectResult> => {
    const connection = ros;
    ros = null;
    topics.clear();
    connectionListeners.clear();
    if (!connection) return Promise.resolve({ ok: true });
    try {
      connection.close();
      return Promise.resolve({ ok: true });
    } catch {
      return Promise.resolve({ ok: false, reason: "disconnect-failed" });
    }
  };
  const publish = <Message>(channel: string, message: Message, messageType = "std_msgs/String"): RosBridgePublishResult => {
    if (ros === null || !ros.isConnected || typeof message !== "object" || message === null) return { ok: false, reason: "publish-failed" };
    try {
      const topic = topics.get(`${channel}:${messageType}`) ?? createTopic(channel, messageType);
      topic.advertise();
      topic.publish(new ROSLIB.Message(message as Record<string, unknown>));
      return { ok: true };
    } catch {
      return { ok: false, reason: "publish-failed" };
    }
  };
  const subscribe = (channel: string, listener: (payload: unknown) => void, messageType = "std_msgs/String"): Unsubscribe => {
    if (ros === null || !ros.isConnected) return () => undefined;
    const topic = topics.get(`${channel}:${messageType}`) ?? createTopic(channel, messageType);
    const callback = (message: InstanceType<typeof ROSLIB.Message>): void => listener(message);
    topic.subscribe(callback);
    return () => topic.unsubscribe(callback);
  };
  const onConnectionLost = (listener: (reason: RosBridgeConnectionLossReason) => void): Unsubscribe => {
    connectionListeners.add(listener);
    return () => connectionListeners.delete(listener);
  };
  return Object.freeze({ connect, disconnect, publish, subscribe, onConnectionLost });
};
