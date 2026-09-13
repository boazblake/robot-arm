# Lift-Mate Architecture

## Source of truth

- UI screens live in `src/features/`
- Shared UI lives in `src/shared/components/`
- Shared non-UI helpers live in `src/shared/utils/`
- Domain logic and datasets live in `src/domain/`
- Runtime state is in `src/stores/`
- Cross-feature services are in `src/services/`

## Tree

```txt
src/
  app/
    bootstrap.ts
    routes.ts
  features/
    home/
      HomePage.ts
    pose/
      PoseViewer.ts
      camera.service.ts
      exercises.ts
      holistic.service.ts
      index.ts
      media-pipe.ts
      model.utils.ts
      pose.css
      render.service.ts
      store.ts
      types.ts
    playback/
      index.ts
    progress/
      ProgressPage.js
  shared/
    components/
      ExerciseAutocomplete.ts
      Layout.js
      SideMenu.js
      Tabs.js
      shell.css
    utils/
      navigationGuards.ts
  domain/
    exrx-data/
      exercises.json
    exrx.ts
    recording.ts
    session.ts
    trackableExercises.ts
  services/
    sessionFinalize.service.ts
  stores/
    poseSelectionStore.ts
    sessionStore.ts
    workoutStore.ts
```

## Rules

1. Do not add new screen code under legacy `src/pages/*` except standalone static routes (`About`, `Settings`) until they are migrated.
2. Do not add shared UI under legacy `src/components/*`; use `src/shared/components/*`.
3. Keep exercise analysis logic in `src/features/pose/holistic.service.ts` only.
4. Keep ExRx dataset path fixed at `src/domain/exrx-data/exercises.json`.
