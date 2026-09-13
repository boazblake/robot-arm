import { elements, holistic, features, recording, camera } from "./store";
import { DrawOptions } from "./types";
import { Capacitor } from "@capacitor/core";

const defaultDrawOptions: DrawOptions = {
  pose: { color: "red", radius: 5, lineWidth: 2 },
  hands: { color: "green", radius: 5, lineWidth: 2 },
  face: { color: "white", radius: 1, lineWidth: 1 },
};

const isNative = Capacitor.getPlatform() !== "web";
let isRenderLoopRunning = false;
let renderRafId: number | null = null;

export const renderService = {
  startLoop: () => {
    if (isRenderLoopRunning) return;
    isRenderLoopRunning = true;
    const canvas = elements.canvas();
    if (!canvas) {
      isRenderLoopRunning = false;
      return;
    }
    const ctx = canvas.getContext("2d");
    elements.context(ctx);
    const video = elements.video();

    if (!canvas || !ctx || !video) {
      isRenderLoopRunning = false;
      return;
    }

    const draw = () => {
      if (!isRenderLoopRunning) return;
      renderRafId = requestAnimationFrame(draw);

      const canvas = elements.canvas();
      const ctx = elements.context();
      const video = elements.video();

      if (!canvas || !ctx) return;
      if (!isNative && (!video || !video.videoWidth)) return;

      // Set canvas dimensions to match its display size (CSS pixels)
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;

      // Calculate effective video dimensions and position due to object-fit: cover
      const videoAspectRatio = isNative
        ? canvas.width / canvas.height
        : (video as HTMLVideoElement).videoWidth / (video as HTMLVideoElement).videoHeight;
      const canvasAspectRatio = canvas.width / canvas.height;

      let renderedVideoWidth: number;
      let renderedVideoHeight: number;
      let offsetX: number = 0;
      let offsetY: number = 0;

      if (videoAspectRatio > canvasAspectRatio) {
        // Video is wider than canvas, so video height will match canvas height, and width will be cropped
        renderedVideoHeight = canvas.height;
        renderedVideoWidth = renderedVideoHeight * videoAspectRatio;
        offsetX = (canvas.width - renderedVideoWidth) / 2; // Center horizontally
      } else {
        // Video is taller than canvas, so video width will match canvas width, and height will be cropped
        renderedVideoWidth = canvas.width;
        renderedVideoHeight = renderedVideoWidth / videoAspectRatio;
        offsetY = (canvas.height - renderedVideoHeight) / 2; // Center vertically
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!isNative && video) {
        ctx.drawImage(video, offsetX, offsetY, renderedVideoWidth, renderedVideoHeight);
      }

      if (holistic.ready()) {
        const data = holistic.data();
        const shouldMirrorX = isNative && camera.position() === "front";
        // Function to transform normalized landmark coordinates to canvas pixel coordinates
        const transformLandmark = (landmark: any) => {
          if (typeof landmark.x !== 'number' || typeof landmark.y !== 'number' || isNaN(landmark.x) || isNaN(landmark.y)) {
            console.warn("Invalid landmark coordinates:", landmark);
            return { x: NaN, y: NaN, z: landmark.z, visibility: landmark.visibility }; // Return NaN to indicate invalid
          }
          const x = shouldMirrorX ? 1 - landmark.x : landmark.x;
          return {
            x: offsetX + x * renderedVideoWidth,
            y: offsetY + landmark.y * renderedVideoHeight,
            z: landmark.z, // Keep z-coordinate if present
            visibility: landmark.visibility, // Keep visibility if present
          };
        };

        if (features().pose && data.poseLandmarks?.length) {
          drawLandmarks(
            ctx,
            data.poseLandmarks.map(transformLandmark),
            defaultDrawOptions.pose
          );
          drawConnectors(
            ctx,
            data.poseLandmarks.map(transformLandmark),
            POSE_CONNECTIONS,
            defaultDrawOptions.pose
          );
        }
        if (features().hands) {
          if (data.leftHandLandmarks?.length) {
            drawLandmarks(
              ctx,
              data.leftHandLandmarks.map(transformLandmark),
              defaultDrawOptions.hands
            );
            drawConnectors(
              ctx,
              data.leftHandLandmarks.map(transformLandmark),
              HAND_CONNECTIONS,
              defaultDrawOptions.hands
            );
          }
          if (data.rightHandLandmarks?.length) {
            drawLandmarks(
              ctx,
              data.rightHandLandmarks.map(transformLandmark),
              defaultDrawOptions.hands
            );
            drawConnectors(
              ctx,
              data.rightHandLandmarks.map(transformLandmark),
              HAND_CONNECTIONS,
            defaultDrawOptions.hands
            );
          }
        }
        if (features().face && data.faceLandmarks?.length) {
          drawLandmarks(
            ctx,
            data.faceLandmarks.map(transformLandmark),
            defaultDrawOptions.face
          );
        }
      }

      if (recording.active()) {
        recording.frames().push({
          timestamp: Date.now(),
          data: holistic.data(),
        });
      }
    };

    renderRafId = requestAnimationFrame(draw);
  },

  stopLoop: () => {
    isRenderLoopRunning = false;
    if (renderRafId !== null) {
      cancelAnimationFrame(renderRafId);
      renderRafId = null;
    }
  },
};

function drawLandmarks(
  ctx: CanvasRenderingContext2D,
  landmarks: any[],
  options: DrawOptions["pose" | "hands" | "face"]
) {
  ctx.fillStyle = options.color;
  ctx.strokeStyle = options.color;
  ctx.lineWidth = options.lineWidth;

  landmarks.forEach((point) => {
    if (typeof point.x === 'number' && typeof point.y === 'number' && isFinite(point.x) && isFinite(point.y)) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, options.radius, 0, 2 * Math.PI);
      ctx.fill();
    } else {
      console.warn("Skipping drawing point due to invalid coordinates:", point);
    }
  });
}

function drawConnectors(
  ctx: CanvasRenderingContext2D,
  landmarks: any[],
  connections: number[][],
  options: DrawOptions["pose" | "hands" | "face"]
) {
  ctx.strokeStyle = options.color;
  ctx.lineWidth = options.lineWidth;

  connections.forEach(([start, end]) => {
    if (landmarks[start] && landmarks[end]) {
      ctx.beginPath();
      ctx.moveTo(landmarks[start].x, landmarks[start].y);
      ctx.lineTo(landmarks[end].x, landmarks[end].y);
      ctx.stroke();
    }
  });
}

const POSE_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5],
  [5, 6], [6, 8], [9, 10], [11, 12], [11, 13], [13, 15],
  [15, 17], [17, 19], [19, 15], [15, 21], [12, 14], [14, 16],
  [16, 18], [18, 20], [20, 16], [16, 22], [11, 23], [12, 24],
  [23, 24], [23, 25], [24, 26], [25, 27], [26, 28], [27, 29],
  [28, 30], [29, 31], [30, 32], [31, 32]
];

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // Index
  [0, 9], [9, 10], [10, 11], [11, 12], // Middle
  [0, 13], [13, 14], [14, 15], [15, 16], // Ring
  [0, 17], [17, 18], [18, 19], [19, 20]  // Pinky
];
