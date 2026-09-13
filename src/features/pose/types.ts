export interface HolisticData {
  poseLandmarks: any[];
  faceLandmarks: any[];
  leftHandLandmarks: any[];
  rightHandLandmarks: any[];
}

export interface DrawOptions {
  pose: {
    color: string;
    radius: number;
    lineWidth: number;
  };
  hands: {
    color: string;
    radius: number;
    lineWidth: number;
  };
  face: {
    color: string;
    radius: number;
    lineWidth: number;
  };
}

export type FSMState =
  | "Idle"
  | "Loading"
  | "Ready"
  | "Streaming"
  | "Stopped"
  | "SwitchingCamera";

export type FSMTransitions = {
  [K in FSMState]?: {
    [event: string]: FSMState;
  };
};
