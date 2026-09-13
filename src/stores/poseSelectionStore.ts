const POSE_EXERCISE_KEY = "liftmate:selectedPoseExercise";

export const saveSelectedPoseExercise = (name: string | null) => {
  if (!name) {
    localStorage.removeItem(POSE_EXERCISE_KEY);
    return;
  }
  localStorage.setItem(POSE_EXERCISE_KEY, name);
};

export const loadSelectedPoseExercise = (): string | null => {
  const value = localStorage.getItem(POSE_EXERCISE_KEY);
  return value && value.trim() ? value : null;
};
