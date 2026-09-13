# Exercise Screen — MVP Spec

**Route:** `/pose`
**Role:** Live camera session with basic feedback and rep counting

## Purpose
Show the camera, count reps, and keep the user oriented with minimal UI.

## Product story
The screen should stay quiet until it needs to report status, a rep count, or an error.

## Component tree
```text
IonPage
└─ IonContent
   ├─ PoseViewer
   │  ├─ ExerciseSelect
   │  ├─ CameraFeed
   │  ├─ LandmarkCanvas
   │  ├─ RepCounter
   │  ├─ StatusPill
   │  ├─ RecordingIndicator
   │  ├─ StateOverlay
   │  │  ├─ IdleOverlay
   │  │  ├─ LoadingOverlay
   │  │  ├─ ErrorOverlay
   │  │  └─ SummarySheet
   │  └─ ControlDock
   │     ├─ PoseToggle
   │     ├─ HandsToggle
   │     ├─ FaceToggle
   │     ├─ CameraSwitch
   │     └─ RecordToggle / StartButton
   └─ SessionSummarySheet
```

## State table
| State | Visual | Behavior |
|---|---|---|
| Idle | Dim feed, start button, exercise selector | Tap Start → Loading |
| Loading | Simple overlay, controls disabled | Initialize camera and model |
| Streaming | Feed, landmarks, rep count, status pill | Live tracking state |
| Recording | Streaming + record indicator + timer | Save frames locally |
| Summary | Bottom sheet with basic session result | Save, review, or repeat |
| Error | Plain error message with retry | Retry or recover permission |
| No exercise selected | Selector highlighted | User must choose an exercise |

## Layout
- Camera remains the main surface.
- Keep the exercise selector small and near the top.
- Put the rep counter and status near the center or upper third.
- Keep all controls in a bottom dock for thumb reach.
- Summary stays on screen as a sheet, not a separate route.

## Interaction details
- **Start**: move from Idle to Loading.
- **Record**: toggle local recording only while streaming.
- **Camera switch**: brief pause, then resume.
- **Stop**: open Summary.
- **Save & Review**: route to `/playback`.

## Accessibility
- Large rep count with text label.
- Status uses text plus icon.
- Controls stay ≥44px.
- Error copy should say what failed and what to do next.

## Copy
- Idle: “Choose an exercise.”
- Loading: “Starting camera.”
- Error: “Camera blocked.”
- Summary: “Session saved.”
