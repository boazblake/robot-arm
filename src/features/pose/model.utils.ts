import { recording } from "./store";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import sanitizeFilename from "sanitize-filename";

export const logger = {
  info: (msg: string) =>
    console.log(
      JSON.stringify({
        level: "info",
        message: msg,
        timestamp: new Date().toISOString(),
      })
    ),
  warn: (msg: string) =>
    console.warn(
      JSON.stringify({
        level: "warn",
        message: msg,
        timestamp: new Date().toISOString(),
      })
    ),
  error: (msg: string) =>
    console.error(
      JSON.stringify({
        level: "error",
        message: msg,
        timestamp: new Date().toISOString(),
      })
    ),
  debug: (msg: string) =>
    console.debug(
      JSON.stringify({
        level: "debug",
        message: msg,
        timestamp: new Date().toISOString(),
      })
    ),
};

export function drawLandmarks(
  ctx: CanvasRenderingContext2D,
  landmarks: any[],
  options: { color: string; radius: number; lineWidth: number }
) {
  const { width, height } = ctx.canvas;
  ctx.fillStyle = options.color;
  ctx.strokeStyle = options.color;
  ctx.lineWidth = options.lineWidth;

  landmarks.forEach((point) => {
    if (point.visibility && point.visibility < 0.5) return;
    ctx.beginPath();
    ctx.arc(point.x * width, point.y * height, options.radius, 0, 2 * Math.PI);
    ctx.fill();
  });
}

export async function saveRecording() {
  logger.info("Saving recording...");
  try {
    const data = JSON.stringify(recording.frames(), null, 2);
    const fileName = sanitizeFilename(
      `pose_recording_${new Date().toISOString()}.json`
    );
    const fileUri = await Filesystem.writeFile({
      path: fileName,
      data,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });

    if (window.Capacitor.getPlatform() === "web") {
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      logger.info("File saved for web as downloadable link.");
    } else {
      await Share.share({
        title: "Pose Recording",
        url: fileUri.uri,
        dialogTitle: "Share Pose Recording",
      });
      logger.info("Recording saved and shared successfully: " + fileUri.uri);
    }
  } catch (error) {
    logger.error(
      "Error saving or sharing recording: " + (error as Error).message
    );
  }
}
