# Robot Arm

A TypeScript human-motion tracking foundation for future robotics work. This repository intentionally does not implement robot control.

## Capabilities

- Web camera input, with existing Capacitor camera integration retained
- MediaPipe pose and two-hand tracking
- Optional face tracking
- Normalized `Landmark` and `TrackingFrame` application types
- Development landmark rendering
- Deterministic geometry and normalization tests

## Development

```sh
npm ci
npm run dev
npm test
npm run typecheck
npm run lint
npm run build
```

Camera and MediaPipe model loading require a supported browser/device and network access to the model assets. Native builds that cannot be run in the current environment must be reported as not verified.
