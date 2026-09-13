import { getExRxExerciseNames, synthesizeFeedbackCues } from "@/domain/exrx";

export interface Exercise {
  meta: {
    name: string;
    description: string;
    difficulty: "beginner" | "intermediate" | "advanced";
  };
  validate: (landmarks: any) => boolean;
}

const defaultDifficulty = (name: string): Exercise["meta"]["difficulty"] => {
  if (name.toLowerCase().includes("single leg") || name.toLowerCase().includes("olympic")) {
    return "advanced";
  }
  if (name.toLowerCase().includes("squat") || name.toLowerCase().includes("press")) {
    return "intermediate";
  }
  return "beginner";
};

export const exercises: Exercise[] = getExRxExerciseNames().map((name) => ({
  meta: {
    name,
    description: synthesizeFeedbackCues(name).slice(0, 2).join(" "),
    difficulty: defaultDifficulty(name),
  },
  validate: (_landmarks) => true,
}));
