import { Exercise, FeedbackConfig, Pose } from "@/types";
import {
  calculateAngle,
  updateRawProp,
  drawExerciseFeedback,
  createMeta,
} from "./utils";
import { synthesizeFeedbackCues } from "@/domain/exrx";

export const BenchPressExercise: Exercise = {
  id: "bench_press",
  name: "Bench Press",
  meta: {
    id: "bench_press",
    name: "Bench Press",
    raw: {
      repCount: [],
      pressStatus: [],
      lastPressStatus: [],
      isBadPose: [],
    },
  },
  processLandmarks: (landmarks: Pose, canvasCtx: CanvasRenderingContext2D) => {
    if (!landmarks || landmarks.length === 0) return;

    // Generate metadata object
    const meta = createMeta(BenchPressExercise.id, canvasCtx);

    // Extract landmarks
    const leftShoulder = landmarks[11];
    const leftElbow = landmarks[13];
    const leftWrist = landmarks[15];
    const rightShoulder = landmarks[12];
    const rightElbow = landmarks[14];
    const rightWrist = landmarks[16];

    // Calculate angles
    const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = calculateAngle(
      rightShoulder,
      rightElbow,
      rightWrist
    );
    const averageElbowAngle = (leftElbowAngle + rightElbowAngle) / 2;

    // Determine press status
    let currentPressStatus: string = "Lowered";
    if (averageElbowAngle > 160) currentPressStatus = "Extended";
    else if (averageElbowAngle > 90) currentPressStatus = "Mid Press";

    // Update rep count if transitioning from "Extended" to "Lowered"
    if (
      BenchPressExercise.meta.raw.lastPressStatus.at(-1)?.value ===
      "Extended" &&
      currentPressStatus === "Lowered"
    ) {
      updateRawProp(
        BenchPressExercise.meta.raw,
        "repCount",
        (BenchPressExercise.meta.raw.repCount.at(-1)?.value || 0) + 1,
        meta // Pass meta
      );
    }

    // Update raw properties
    updateRawProp(
      BenchPressExercise.meta.raw,
      "pressStatus",
      currentPressStatus,
      meta
    );
    updateRawProp(
      BenchPressExercise.meta.raw,
      "lastPressStatus",
      currentPressStatus,
      meta
    );

    // Check for bad pose
    const isBadPose = averageElbowAngle < 140;
    updateRawProp(BenchPressExercise.meta.raw, "isBadPose", isBadPose, meta);

    // Set colors
    const connectorColor = isBadPose
      ? "red"
      : currentPressStatus === "Mid Press"
        ? "white"
        : "blue";

    // Draw feedback
    const feedbackConfig: FeedbackConfig = {
      ...meta,
      landmarks,
      metadata: [
        { label: "Status", value: currentPressStatus, color: "orange" },
        {
          label: "Reps",
          value: BenchPressExercise.meta.raw.repCount.at(-1)?.value || 0,
          color: "orange",
        },
        { label: "Cue", value: synthesizeFeedbackCues("Bench Press")[0], color: "green" },
      ],
      visualProps: {
        ...meta.visualProps,
        connectorColor,
      },
    };
    drawExerciseFeedback(feedbackConfig);
  },
};
