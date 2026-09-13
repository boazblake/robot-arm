import { CapacitorConfig } from "@capacitor/cli";

const isDev = process.env.NODE_ENV === "development";
const serverUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: "io.boazblake.liftmate",
  appName: "Lift Mate",
  webDir: "docs",
  server: isDev && serverUrl
    ? {
        url: serverUrl,
        cleartext: true,
      }
    : undefined,
  ios: {
    minVersion: "14.0", // Matches plugin's deployment target
    webContentsDebuggingEnabled: true,
    NSCameraUsageDescription:
      "This app uses the camera for real-time pose estimation to track your workouts.",
    NSMicrophoneUsageDescription:
      "This app may use the microphone for video recording during workouts.",
  },
};

export default config;
