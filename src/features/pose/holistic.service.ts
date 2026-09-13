import { holistic, elements, exercise, coaching } from "./store";
import m from "mithril";
import { Capacitor } from "@capacitor/core";
import { CameraPreview } from "@capacitor-community/camera-preview";
import CapacitorMediaPipe from "./media-pipe";
import { getExerciseAnalysisProfile, synthesizeFeedbackCues } from "@/domain/exrx";

// This service abstracts the MediaPipe functionality for both web and native platforms.
// On the web, it uses the JS-based @mediapipe/tasks-vision library.
// On native, it uses the custom CapacitorMediaPipe plugin.
// A Vite alias swaps the native plugin for a web shim during web builds.

const platform = Capacitor.getPlatform();
const isNative = platform !== "web";
let isSendingNativeFrame = false;
let poseLandmarker: any;
let faceLandmarker: any;
let handLandmarker: any;
const TASKS_VISION_VERSION = "0.10.22-rc.20250304";
let lastUiRedrawAt = 0;
let lastExerciseName = "";
let squatWasDown = false;
let pressWasLowered = false;
let pressDownFrames = 0;
let pressUpFrames = 0;
let lastRepAtMs = 0;
let isFrameLoopRunning = false;
let nativeLogCounter = 0;
let lastNativeFrameSentAt = 0;

const NATIVE_FRAME_INTERVAL_MS = 1000 / 12;
const NATIVE_CAPTURE_QUALITY = 35;

const asArray = (value: any): any[] => (Array.isArray(value) ? value : []);
const asLandmarkArray = (value: any): any[] => {
  const arr = asArray(value);
  if (!arr.length) return [];
  const first = arr[0];
  return typeof first?.x === "number" && typeof first?.y === "number" ? arr : [];
};

const pickLandmarks = (source: any, keys: string[]): any[] => {
  for (const key of keys) {
    const direct = asLandmarkArray(source?.[key]);
    if (direct.length) return direct;
    const nested = asArray(source?.[key]);
    if (!nested.length) continue;
    const first = asLandmarkArray(nested[0]);
    if (first.length) return first;
  }
  return [];
};

const normalizeNativeResults = (results: any) => {
  const payload = results?.data ?? results ?? {};
  const poseLandmarks = pickLandmarks(payload, ["poseLandmarks", "pose_landmarks", "multiPoseLandmarks"]);
  const faceLandmarks = pickLandmarks(payload, ["faceLandmarks", "face_landmarks", "multiFaceLandmarks"]);

  let leftHandLandmarks = pickLandmarks(payload, ["leftHandLandmarks", "left_hand_landmarks"]);
  let rightHandLandmarks = pickLandmarks(payload, ["rightHandLandmarks", "right_hand_landmarks"]);

  if (!leftHandLandmarks.length && !rightHandLandmarks.length) {
    const hands = asArray(payload.handLandmarks);
    const handednesses = asArray(payload.handednesses);
    handednesses.forEach((side: any, index: number) => {
      const label = String(side?.[0]?.categoryName || side?.label || "").toLowerCase();
      const points = asLandmarkArray(hands[index]);
      if (!points.length) return;
      if (label.includes("left")) leftHandLandmarks = points;
      if (label.includes("right")) rightHandLandmarks = points;
    });
  }

  if (!leftHandLandmarks.length && !rightHandLandmarks.length) {
    const multiHands = asArray(payload.multiHandLandmarks);
    if (multiHands.length > 0) leftHandLandmarks = asLandmarkArray(multiHands[0]);
    if (multiHands.length > 1) rightHandLandmarks = asLandmarkArray(multiHands[1]);
  }

  return { poseLandmarks, faceLandmarks, leftHandLandmarks, rightHandLandmarks };
};

const redrawPoseUi = () => {
  const now = performance.now();
  if (now - lastUiRedrawAt < 120) return;
  lastUiRedrawAt = now;
  m.redraw();
};

type HolisticInitOptions = {
  modelComplexity?: 'full' | 'lite';
  smoothLandmarks?: boolean;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
};

const computeAngle = (a: any, b: any, c: any): number => {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
};

const elbowsFlexed = (elbowAngle: number) => elbowAngle <= 100;

const poseAngles = (poseLandmarks: any[]) => {
  const leftKnee = computeAngle(poseLandmarks[23], poseLandmarks[25], poseLandmarks[27]);
  const rightKnee = computeAngle(poseLandmarks[24], poseLandmarks[26], poseLandmarks[28]);
  const leftElbow = computeAngle(poseLandmarks[11], poseLandmarks[13], poseLandmarks[15]);
  const rightElbow = computeAngle(poseLandmarks[12], poseLandmarks[14], poseLandmarks[16]);
  const avgKnee = (leftKnee + rightKnee) / 2;
  const avgElbow = (leftElbow + rightElbow) / 2;
  return { avgKnee, avgElbow };
};

const analyzePose = (poseLandmarks: any[]) => {
  if (!poseLandmarks || poseLandmarks.length < 29) {
    return { repCount: coaching().repCount, status: "No pose", cue: "Step into frame" };
  }

  const visible = poseLandmarks.filter(
    (lm) => typeof lm.visibility === "number" && lm.visibility > 0.45
  ).length;
  if (visible < 8) {
    return { repCount: coaching().repCount, status: "Low confidence", cue: "Improve lighting or step back" };
  }

  const selected = exercise()?.meta?.name || "";
  const prev = coaching();
  const selectedCues = selected ? synthesizeFeedbackCues(selected) : [];
  const cueAt = (index: number, fallback: string) => selectedCues[index] || fallback;

  if (selected !== lastExerciseName) {
    lastExerciseName = selected;
    squatWasDown = false;
    pressWasLowered = false;
    pressDownFrames = 0;
    pressUpFrames = 0;
    lastRepAtMs = 0;
  }

  const profile = getExerciseAnalysisProfile(selected || "");
  const { avgKnee, avgElbow } = poseAngles(poseLandmarks);

  if (profile.key === "squat") {
    const knee = avgKnee;
    const status = knee < 90 ? "Down" : knee < 160 ? "Mid" : "Up";
    if (status === "Down") squatWasDown = true;
    const completed = squatWasDown && status === "Up";
    if (completed) squatWasDown = false;
    const repCount = completed ? prev.repCount + 1 : prev.repCount;
    return {
      repCount,
      status,
      cue: status === "Mid" ? cueAt(0, "Go lower") : status === "Down" ? cueAt(1, "Drive up") : cueAt(2, "Control descent"),
    };
  }

  if (profile.key === "lunge") {
    const knee = avgKnee;
    const status = knee < 100 ? "Down" : knee < 155 ? "Mid" : "Up";
    if (status === "Down") squatWasDown = true;
    const completed = squatWasDown && status === "Up";
    if (completed) squatWasDown = false;
    return {
      repCount: completed ? prev.repCount + 1 : prev.repCount,
      status,
      cue: status === "Mid" ? cueAt(0, "Drop into lunge") : status === "Down" ? cueAt(1, "Drive through front heel") : cueAt(2, "Stand tall"),
    };
  }

  if (profile.key === "press") {
    const leftShoulder = poseLandmarks[11];
    const rightShoulder = poseLandmarks[12];
    const leftWrist = poseLandmarks[15];
    const rightWrist = poseLandmarks[16];
    const nose = poseLandmarks[0];
    const elbow = avgElbow;

    const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const avgWristY = (leftWrist.y + rightWrist.y) / 2;
    const avgNoseY = nose?.y ?? 0.45;

    const wristsAboveShoulders = avgWristY < avgShoulderY - 0.03;
    const wristsNearShoulderLine = avgWristY > avgShoulderY - 0.01;
    const wristsNearHeadLevel = avgWristY < avgNoseY + 0.04;

    const isOverheadPress = selected.toLowerCase().includes("overhead") || selected.toLowerCase().includes("shoulder press");

    const isLowered = isOverheadPress
      ? elbowsFlexed(elbow) && wristsNearShoulderLine
      : elbow <= 95;

    const isExtended = isOverheadPress
      ? elbow >= 155 && wristsAboveShoulders && wristsNearHeadLevel
      : elbow >= 155;

    pressDownFrames = isLowered ? pressDownFrames + 1 : 0;
    pressUpFrames = isExtended ? pressUpFrames + 1 : 0;

    if (pressDownFrames >= 2) pressWasLowered = true;

    const now = performance.now();
    const canCountRep = now - lastRepAtMs > 450;
    const completed = pressWasLowered && pressUpFrames >= 2 && canCountRep;

    if (completed) {
      pressWasLowered = false;
      pressDownFrames = 0;
      pressUpFrames = 0;
      lastRepAtMs = now;
    }

    const repCount = completed ? prev.repCount + 1 : prev.repCount;
    const status = isExtended ? "Extended" : isLowered ? "Lowered" : "Mid";
    return {
      repCount,
      status,
      cue:
        status === "Mid"
          ? cueAt(0, "Press through")
          : status === "Lowered"
            ? cueAt(1, "Drive up")
            : cueAt(2, "Lower with control"),
    };
  }

  if (profile.key === "hinge") {
    const hip = computeAngle(poseLandmarks[11], poseLandmarks[23], poseLandmarks[25]);
    const status = hip < 120 ? "Hinged" : hip < 155 ? "Mid" : "Tall";
    if (status === "Hinged") squatWasDown = true;
    const completed = squatWasDown && status === "Tall";
    if (completed) squatWasDown = false;
    return {
      repCount: completed ? prev.repCount + 1 : prev.repCount,
      status,
      cue: status === "Mid" ? cueAt(0, "Push hips back") : status === "Hinged" ? cueAt(1, "Drive hips through") : cueAt(2, "Brace and repeat"),
    };
  }

  if (profile.key === "pull") {
    const status = avgElbow < 95 ? "Pulled" : avgElbow < 145 ? "Mid" : "Extended";
    if (status === "Extended") pressWasLowered = true;
    const completed = pressWasLowered && status === "Pulled";
    if (completed) pressWasLowered = false;
    return {
      repCount: completed ? prev.repCount + 1 : prev.repCount,
      status,
      cue: status === "Mid" ? cueAt(0, "Lead with elbows") : status === "Pulled" ? cueAt(1, "Squeeze back") : cueAt(2, "Control return"),
    };
  }

  if (profile.key === "core") {
    const trunk = computeAngle(poseLandmarks[11], poseLandmarks[23], poseLandmarks[25]);
    const stable = trunk > 145;
    return {
      repCount: prev.repCount,
      status: stable ? "Stable" : "Adjust",
      cue: stable ? cueAt(0, "Brace and breathe") : cueAt(1, "Keep ribs down and pelvis neutral"),
    };
  }

  if (profile.key === "cardio") {
    const cadence = avgKnee < 145 ? "Active" : "Steady";
    return {
      repCount: prev.repCount + (cadence === "Active" ? 1 : 0),
      status: cadence,
      cue: cueAt(0, "Stay rhythmic and upright"),
    };
  }

  return {
    repCount: prev.repCount,
    status: profile.display,
    cue: cueAt(0, "Move with control"),
  };
};

// Web-specific initialization
const createHolisticLandmarker = async () => {
  const { PoseLandmarker, FaceLandmarker, HandLandmarker, FilesetResolver } =
    await import("@mediapipe/tasks-vision");

  const vision = await FilesetResolver.forVisionTasks(
    `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`
  );

  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numPoses: 1,
  });

  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numFaces: 1,
  });

  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 2,
  });
};

// This function runs on a continuous loop to process video frames.
const sendFrames = async () => {
  if (!isFrameLoopRunning) return;
  const video = elements.video();
  if (!isNative && (!video || video.paused || video.ended)) {
    requestAnimationFrame(sendFrames);
    return;
  }

  try {
    if (platform === "web") {
      // On the web, we process the frame with the JS library and manually combine the results.
      const nowInMs = performance.now();
      const poseResult = poseLandmarker.detectForVideo(video, nowInMs);
      const faceResult = faceLandmarker.detectForVideo(video, nowInMs);
      const handResult = handLandmarker.detectForVideo(video, nowInMs);

      const currentHolisticData: {
        poseLandmarks: any[];
        faceLandmarks: any[];
        leftHandLandmarks: any[];
        rightHandLandmarks: any[];
      } = {
        poseLandmarks: poseResult.landmarks[0] || [],
        faceLandmarks: faceResult.faceLandmarks[0] || [],
        leftHandLandmarks: [],
        rightHandLandmarks: [],
      };

      if (handResult.landmarks && handResult.handednesses) {
        handResult.handednesses.forEach((handedness: any, index: number) => {
          if (handedness[0].categoryName === "Left") {
            currentHolisticData.leftHandLandmarks.push(
              ...handResult.landmarks[index]
            );
          } else if (handedness[0].categoryName === "Right") {
            currentHolisticData.rightHandLandmarks.push(
              ...handResult.landmarks[index]
            );
          }
        });
      }
      holistic.data(currentHolisticData);
      coaching(analyzePose(currentHolisticData.poseLandmarks));
      redrawPoseUi();
    } else if (!isSendingNativeFrame) {
      const now = performance.now();
      if (now - lastNativeFrameSentAt < NATIVE_FRAME_INTERVAL_MS) {
        if (isFrameLoopRunning) requestAnimationFrame(sendFrames);
        return;
      }
      lastNativeFrameSentAt = now;
      isSendingNativeFrame = true;
      const frame = await CameraPreview.captureSample({ quality: NATIVE_CAPTURE_QUALITY });
      if (frame?.value) {
        await CapacitorMediaPipe.send({
          image: frame.value,
          rotationDegrees: 0,
          isMirrored: false,
        });
      }
      isSendingNativeFrame = false;
    }
  } catch (error) {
    isSendingNativeFrame = false;
    console.error("Error in sendFrames:", error);
  }

  if (isFrameLoopRunning) requestAnimationFrame(sendFrames);
};

export const holisticService = {
  initialize: async (options: HolisticInitOptions = {}) => {
    try {
      if (platform === "web") {
        await createHolisticLandmarker();
      } else {
        await CapacitorMediaPipe.initialize({
          modelComplexity: options.modelComplexity || 'full',
          smoothLandmarks: options.smoothLandmarks ?? true,
          minDetectionConfidence: options.minDetectionConfidence || 0.5,
          minTrackingConfidence: options.minTrackingConfidence || 0.5,
          holisticModel: "holistic_landmarker.task",
          holisticModelUrl: "https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/latest/holistic_landmarker.task",
        });
        CapacitorMediaPipe.addListener("holisticResults", (results) => {
          const next = normalizeNativeResults(results);
          nativeLogCounter += 1;
          if (nativeLogCounter <= 5 || nativeLogCounter % 60 === 0) {
            const payload = results?.data ?? results ?? {};
            console.info("[LiftMate][NativeMP] payload keys", Object.keys(payload));
            console.info("[LiftMate][NativeMP] landmark counts", {
              pose: next.poseLandmarks.length,
              face: next.faceLandmarks.length,
              leftHand: next.leftHandLandmarks.length,
              rightHand: next.rightHandLandmarks.length,
            });
          }
          holistic.data(next);
          coaching(analyzePose(next.poseLandmarks));
          redrawPoseUi();
        });
      }
      holistic.ready(true);
      isFrameLoopRunning = false;
    } catch (error) {
      console.error("MediaPipe initialization failed:", error);
      holistic.ready(false);
      throw error;
    }
  },

  sendFrames,

  startFrameLoop: () => {
    if (isFrameLoopRunning) return;
    isFrameLoopRunning = true;
    lastNativeFrameSentAt = 0;
    requestAnimationFrame(sendFrames);
  },

  close: async () => {
    isFrameLoopRunning = false;
    lastNativeFrameSentAt = 0;
    if (platform === "web") {
      if (poseLandmarker) await poseLandmarker.close();
      if (faceLandmarker) await faceLandmarker.close();
      if (handLandmarker) await handLandmarker.close();
      poseLandmarker = null;
      faceLandmarker = null;
      handLandmarker = null;
    } else {
      await CapacitorMediaPipe.close();
    }
    holistic.ready(false);
    holistic.data({
      poseLandmarks: [],
      faceLandmarks: [],
      leftHandLandmarks: [],
      rightHandLandmarks: [],
    });
    coaching({ repCount: 0, status: "Ready", cue: "Select exercise and start" });
  },
};
