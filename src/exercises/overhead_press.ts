import { Exercise, FeedbackConfig, Pose } from "../types";
import { calculateAngle, updateRawProp, drawExerciseFeedback } from "./utils";
import { synthesizeFeedbackCues } from "@/domain/exrx";

export const OverheadPressExercise: Exercise = {
  id: "overhead_press",
  name: "Overhead Press",
  meta: {
    id: "overhead_press",
    name: "Overhead Press",
    raw: {
      repCount: [],
      pressStatus: [],
      lastPressStatus: [],
      isBadPose: [],
    },
  },
  processLandmarks: (landmarks: Pose, canvasCtx: CanvasRenderingContext2D) => {
    if (!landmarks || landmarks.length === 0) return;

    const meta: FeedbackConfig = {
      id: OverheadPressExercise.id,
      canvasCtx,
      landmarks,
      poseConnections: window.POSE_CONNECTIONS || [],
      metadata: [],
      visualProps: {
        landmarkColor: "white",
        connectorColor: "blue",
        lineWidth: 2,
      },
    };

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
    let currentPressStatus = "Lowered";
    if (averageElbowAngle > 160) {
      currentPressStatus = "Extended";
    } else if (averageElbowAngle > 90) {
      currentPressStatus = "Mid Press";
    }

    // Update rep count if transitioning from "Extended" to "Lowered"
    if (
      OverheadPressExercise.meta.raw.lastPressStatus.at(-1)?.value ===
      "Extended" &&
      currentPressStatus === "Lowered"
    ) {
      updateRawProp(
        OverheadPressExercise.meta.raw,
        "repCount",
        (OverheadPressExercise.meta.raw.repCount.at(-1)?.value || 0) + 1,
        meta
      );
    }

    // Update raw properties
    updateRawProp(
      OverheadPressExercise.meta.raw,
      "pressStatus",
      currentPressStatus,
      meta
    );
    updateRawProp(
      OverheadPressExercise.meta.raw,
      "lastPressStatus",
      currentPressStatus,
      meta
    );

    // Bad pose detection
    const isBadPose = averageElbowAngle < 140; // Arbitrary threshold for bad posture
    updateRawProp(OverheadPressExercise.meta.raw, "isBadPose", isBadPose, meta);

    // Visual Feedback
    const feedbackConfig: FeedbackConfig = {
      ...meta,
      metadata: [
        {
          label: "Reps",
          value: OverheadPressExercise.meta.raw.repCount.at(-1)?.value || 0,
          color: "yellow",
        },
        { label: "Status", value: currentPressStatus, color: "blue" },
        { label: "Cue", value: synthesizeFeedbackCues("Overhead Press")[0], color: "green" },
      ],
      visualProps: {
        ...meta.visualProps,
        connectorColor: isBadPose ? "red" : "blue",
      },
    };
    drawExerciseFeedback(feedbackConfig);
  },
};
