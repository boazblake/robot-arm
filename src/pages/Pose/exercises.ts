import { synthesizeFeedbackCues } from "@/domain/exrx";

export interface Exercise {
  meta: {
    name: string;
    description: string;
    difficulty: "beginner" | "intermediate" | "advanced";
  };
  validate: (landmarks: any) => boolean;
}

export const exercises: Exercise[] = [
  {
    meta: {
      name: "Squat",
      description: synthesizeFeedbackCues("Squat").join(" "),
      difficulty: "beginner",
    },
    validate: (landmarks) => {
      return true;
    },
  },
  {
    meta: {
      name: "Bench Press",
      description: synthesizeFeedbackCues("Bench Press").join(" "),
      difficulty: "intermediate",
    },
    validate: (landmarks) => {
      return true;
    },
  },
  {
    meta: {
      name: "Overhead Press",
      description: synthesizeFeedbackCues("Overhead Press").join(" "),
      difficulty: "intermediate",
    },
    validate: (landmarks) => {
      return true;
    },
  },
];
