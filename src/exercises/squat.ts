import { Exercise, FeedbackConfig, Pose } from "../types";
import { calculateAngle, updateRawProp, drawExerciseFeedback } from "./utils";
import { synthesizeFeedbackCues } from "@/domain/exrx";

export const SquatExercise: Exercise = {
  id: "squat",
  name: "Squat",
  meta: {
    id: "squat",
    name: "Squat",
    raw: {
      repCount: [],
      squatStatus: [],
      lastSquatStatus: [],
      isBadPose: [],
    },
  },
  processLandmarks: (landmarks: Pose, canvasCtx: CanvasRenderingContext2D) => {
    if (!landmarks || landmarks.length === 0) return;

    const meta: FeedbackConfig = {
      id: SquatExercise.id,
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

    // Extract relevant landmarks
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const leftKnee = landmarks[25];
    const leftAnkle = landmarks[27];
    const rightHip = landmarks[24];
    const rightKnee = landmarks[26];
    const rightAnkle = landmarks[28];

    // Calculate knee angles
    const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
    const averageKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;

    // Determine squat status
    let currentSquatStatus = "Standing";
    if (averageKneeAngle < 90) {
      currentSquatStatus = "Squatting";
    } else if (averageKneeAngle < 160) {
      currentSquatStatus = "Half Squat";
    }

    // Update rep count if transitioning from "Squatting" to "Standing"
    if (
      SquatExercise.meta.raw.lastSquatStatus.at(-1)?.value === "Squatting" &&
      currentSquatStatus === "Standing"
    ) {
      updateRawProp(
        SquatExercise.meta.raw,
        "repCount",
        (SquatExercise.meta.raw.repCount.at(-1)?.value || 0) + 1,
        meta
      );
    }

    // Update raw properties
    updateRawProp(
      SquatExercise.meta.raw,
      "squatStatus",
      currentSquatStatus,
      meta
    );
    updateRawProp(
      SquatExercise.meta.raw,
      "lastSquatStatus",
      currentSquatStatus,
      meta
    );

    // Calculate torso angle for bad pose detection
    const torsoAngle = calculateAngle(
      { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 }, // Average hip position
      {
        x: (leftShoulder.x + rightShoulder.x) / 2,
        y: (leftShoulder.y + rightShoulder.y) / 2,
      }, // Average shoulder position
      {
        x: (leftShoulder.x + rightShoulder.x) / 2,
        y: (leftShoulder.y + rightShoulder.y) / 2 - 0.1,
      } // Virtual top reference for vertical torso alignment
    );

    const isBadPose = torsoAngle < 70; // Arbitrary threshold for bad pose
    updateRawProp(SquatExercise.meta.raw, "isBadPose", isBadPose, meta);

    // Visual Feedback
    const feedbackConfig: FeedbackConfig = {
      ...meta,
      metadata: [
        {
          label: "Reps",
          value: SquatExercise.meta.raw.repCount.at(-1)?.value || 0,
          color: "yellow",
        },
        { label: "Status", value: currentSquatStatus, color: "blue" },
        { label: "Cue", value: synthesizeFeedbackCues("Squat")[0], color: "green" },
      ],
      visualProps: {
        ...meta.visualProps,
        connectorColor: isBadPose ? "red" : "blue",
      },
    };
    drawExerciseFeedback(feedbackConfig);
  },
};
