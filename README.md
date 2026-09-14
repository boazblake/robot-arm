# Robot Arm

A TypeScript human-motion tracking foundation for future robotics work. This repository intentionally does not implement robot control.

## Capabilities

- Web camera input, with existing Capacitor camera integration retained
- MediaPipe pose and two-hand tracking
- Optional face tracking
- Normalized `Landmark` and `TrackingFrame` application types
- Development landmark rendering
- Deterministic geometry and normalization tests

## Install

```sh
npm ci
```

## Development

```sh
npm run dev
```

The bounded development health check starts the server on port 4173, verifies
`GET http://127.0.0.1:4173/` returns HTTP 200 within 10 seconds, and terminates it:

```sh
npm run verify:dev
```

## Tests

```sh
npm test
```

## Type checking

```sh
npm run typecheck
```

Production TypeScript under `src/` may not use `@ts-nocheck` or `@ts-ignore`.
`@ts-expect-error` requires an inline reason.

## Lint

```sh
npm run lint
```

## Production build

```sh
npm run build
```

## Cleanup verification

```sh
npm run verify:cleanup
```

Camera and MediaPipe model loading require a supported browser/device and network access to the model assets. Native builds that cannot be run in the current environment must be reported as not verified.
