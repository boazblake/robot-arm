import {
  RawExercise,
  Exercise,
  FeedbackConfig,
  RawExerciseProp,
  PoseFrame,
  ExerciseMeta,
  Pose,
  InjectedMetadata,
} from "@/types";
import { DrawingUtils } from "https://cdn.skypack.dev/@mediapipe/tasks-vision@0.10.0";
import * as Exercises from "./index"; // Import all exercises

/**
 * Generates feedback configuration for drawing and replay.
 *
 * @param canvasCtx - The canvas rendering context.
 * @param landmarks - The pose landmarks for the current frame.
 * @param exerciseId - The exercise ID (e.g., "overhead_press").
 * @param customMetadata - Custom metadata entries for the feedback.
 * @param customVisualProps - Custom visual properties for drawing.
 * @returns A FeedbackConfig object.
 */
export const generateFeedbackConfig = (
  canvasCtx: CanvasRenderingContext2D,
  landmarks: any[],
  exerciseId: string,
  customMetadata: Array<{ label: string; value: any; color: string }> = [],
  customVisualProps: InjectedMetadata = {}
): FeedbackConfig => {
  return {
    id: exerciseId,
    canvasCtx,
    landmarks,
    metadata: customMetadata,
    poseConnections: window.POSE_CONNECTIONS,
    landmarkColor: customVisualProps.landmarkColor || "white",
    connectorColor: customVisualProps.connectorColor || "blue",
    lineWidth: customVisualProps.lineWidth || 2,
    font: customVisualProps.font || "Montserrat",
    fontSize: customVisualProps.fontSize || "30px",
    ...customVisualProps, // Override any default visual properties dynamically
  };
};
// Helper function to calculate the angle between three points
export const calculateAngle = (
  pointA: { x: number; y: number },
  pointB: { x: number; y: number },
  pointC: { x: number; y: number }
): number => {
  const radians =
    Math.atan2(pointC.y - pointB.y, pointC.x - pointB.x) -
    Math.atan2(pointA.y - pointB.y, pointA.x - pointB.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) {
    angle = 360 - angle;
  }
  return angle;
};

export const updateRawProp = <T>(
  raw: RawExercise,
  prop: keyof RawExercise,
  newValue: T,
  meta: FeedbackConfig,
  visualProps: InjectedMetadata = {}
): void => {
  const currentTime = performance.now() / 1000; // Current time in seconds
  const obj: RawExerciseProp<T> = {
    value: newValue,
    timestamp: currentTime,
    meta,
    ...visualProps,
  };
  raw[prop].push(obj);
};

export const createMeta = (
  id: string,
  canvasCtx: CanvasRenderingContext2D | undefined = undefined
): FeedbackConfig => ({
  id,
  canvasCtx,
  landmarks: [],
  poseConnections: window.POSE_CONNECTIONS,
  metadata: [],
  visualProps: {
    landmarkColor: "white",
    connectorColor: "blue",
    lineWidth: 2,
  },
});

export const drawExerciseFeedback = ({
  canvasCtx,
  landmarks,
  metadata,
  poseConnections,
  landmarkColor,
  connectorColor,
  lineWidth,
}: InjectedMetadata) => {
  if (!canvasCtx) return;
  const drawingUtils = new DrawingUtils(canvasCtx);

  console.log({
    canvasCtx,
    landmarks,
    metadata,
    poseConnections,
    landmarkColor,
    connectorColor,
    lineWidth,
  });
  // Draw landmarks and connectors using visual properties
  drawingUtils.drawLandmarks(landmarks, {
    color: landmarkColor,
    lineWidth,
  });
  drawingUtils.drawConnectors(landmarks, poseConnections, {
    color: connectorColor,
    lineWidth,
  });

  // Display metadata dynamically
  canvasCtx.font = "30px Montserrat";
  if (metadata) {
    metadata.forEach((entry, index) => {
      canvasCtx.fillStyle = entry.color || "yellow";
      canvasCtx.fillText(`${entry.label}: ${entry.value}`, 10, 30 + index * 40);
    });
  }

  // Restore canvas state
  canvasCtx.restore();
};

/**
 * Merges pose frames with exercise metadata for replay.
 *
 * @param exercise - The ExerciseMeta object containing raw data and metadata.
 * @param poseFrames - Array of PoseFrame objects collected during recording.
 * @param injectMetadata - A function provided by the exercise module to inject exercise-specific metadata.
 * @returns An array of PoseFrame objects enriched with metadata for feedback and replay.
 */
export const mergePoseWithMeta = (
  exercise: ExerciseMeta,
  poseFrames: PoseFrame[],
  injectMetadata: (
    landmarks: Pose,
    frameMeta: RawExerciseProp["meta"]
  ) => InjectedMetadata
): Array<PoseFrame & { meta: FeedbackConfig }> => {
  console.log(exercise.raw);

  return Object.entries(exercise.raw)
    .flatMap(([key, rawProps]) =>
      rawProps.map((entry) => {
        // Match pose frame by timestamp with a small tolerance (e.g., 10ms)
        const matchingPoseFrame = poseFrames.find(
          (poseFrame) => Math.abs(poseFrame.timestamp - entry.timestamp) < 0.01
        );

        // Extract landmarks or use an empty array if no matching frame
        const landmarks = matchingPoseFrame?.poses[0] || [];

        // Inject custom metadata based on landmarks and frame meta
        const customMetadata = injectMetadata(landmarks, entry.meta);

        // Combine metadata from raw entry and injected metadata
        const metadata = [
          { label: key, value: entry.value, color: "yellow" },
          ...(customMetadata.metadata || []),
        ];

        return {
          ...matchingPoseFrame,
          timestamp: entry.timestamp, // Use raw entry timestamp for replay accuracy
          poses: matchingPoseFrame?.poses || [], // Retain poses from the matched frame
          meta: {
            id: exercise.id,
            canvasCtx: undefined, // Canvas context will be assigned during rendering
            landmarks,
            metadata,
            poseConnections: window.POSE_CONNECTIONS,
            landmarkColor: customMetadata.landmarkColor || "white",
            connectorColor: customMetadata.connectorColor || "blue",
            lineWidth: customMetadata.lineWidth || 2,
            font: customMetadata.font || "Montserrat",
            fontSize: customMetadata.fontSize || "30px",
          } as FeedbackConfig,
        };
      })
    )
    .sort((a, b) => a.timestamp - b.timestamp); // Ensure frames are sorted by timestamp
};

/**
 * Returns the correct exercise based on the metadata's id or name.
 *
 * @param meta - The ExerciseMeta object containing id or name.
 * @returns The corresponding Exercise object or undefined if not found.
 */
export const getExerciseByMeta = (meta: ExerciseMeta): Exercise | undefined => {
  if (!meta || (!meta.id && !meta.name)) {
    console.warn("ExerciseMeta is missing id or name.");
    return undefined;
  }

  // Centralized mapping of exercises by ID or Name
  const exerciseMap: Record<string, Exercise> = Object.values(Exercises).reduce(
    (map: Record<string, Exercise>, exercise: Exercise) => {
      map[exercise.id] = exercise;
      map[exercise.name.toLowerCase()] = exercise; // Map by name (case-insensitive)
      return map;
    },
    {} as Record<string, Exercise>
  );

  // Find exercise by ID or Name
  const exercise = exerciseMap[meta.id] || exerciseMap[meta.name.toLowerCase()];

  if (!exercise) {
    console.warn(
      `No exercise found for id '${meta.id}' or name '${meta.name}'.`
    );
  }

  return exercise;
};
