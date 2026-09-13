# Lift-Mate

Camera-first lifting coach built with Ionic + Mithril + Capacitor.

## Run

- Web (SSL): `npm run goweb`
- iOS: `npm run goios`
- Web build: `npm run buildweb`

## Clean Repo Structure

- `src/app/` bootstrap and route wiring
- `src/features/` screen features (home, pose, playback, progress)
- `src/shared/components/` shared UI and shell
- `src/shared/utils/` shared utilities
- `src/stores/` app state persistence and streams
- `src/services/` orchestration services
- `src/domain/` normalized business/data models
  - `src/domain/exrx-data/exercises.json` ExRx dataset
  - `src/domain/exrx.ts` dataset access + cue/profile helpers
  - `src/domain/trackableExercises.ts` trackable exercise aliases
- `design/` current approved mockups and specs only
- `project-docs/` active engineering docs only

## Notes

- Exercise selection and start now happen from the sidebar library.
- Home is session-centric (recent sessions + restart), not exercise catalog.
