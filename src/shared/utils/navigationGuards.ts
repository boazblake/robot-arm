import m from "mithril";
import { state } from "../../features/pose/store";

const ACTIVE_POSE_STATES = new Set(["Loading", "Ready", "Streaming", "SwitchingCamera"]);

const confirmLeaveExercise = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    const alert = document.createElement("ion-alert");
    alert.header = "Leave exercise?";
    alert.message = "Your current session is active. End session and leave this screen?";
    alert.buttons = [
      {
        text: "Stay",
        role: "cancel",
        handler: () => resolve(false),
      },
      {
        text: "Leave",
        role: "destructive",
        handler: () => resolve(true),
      },
    ];
    alert.addEventListener(
      "ionAlertDidDismiss",
      () => {
        if (!alert.role || alert.role === "backdrop") resolve(false);
        alert.remove();
      },
      { once: true }
    );
    document.body.appendChild(alert);
    void alert.present();
  });
};

export const canNavigateTo = async (nextRoute: string): Promise<boolean> => {
  const currentRoute = m.route.get();
  if (currentRoute === nextRoute) return false;

  if (currentRoute !== "/pose") return true;
  if (!ACTIVE_POSE_STATES.has(state())) return true;

  return confirmLeaveExercise();
};
