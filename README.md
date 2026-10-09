# Robot Arm

A TypeScript human-motion tracking foundation for robotics work, including SO-101 manual control.

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

### SO-101 manual control

Start the bridge in dry-run mode first:

```sh
python scripts/so101-bridge.py
```

The web app connects to `ws://127.0.0.1:8765`. Dry-run mode never opens the
robot serial port. Only start live mode after confirming the arm is clear and
ready:

```sh
python scripts/so101-bridge.py \\
  --port /dev/tty.usbmodem5B790163741 \\
  --robot-id my_so101_arm \\
  --live
```

The app starts disabled. Connect the bridge, connect the robot, and explicitly
enable control before moving a joint. `STOP` disconnects the robot and the
bridge disables control after 500 ms without a target.

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
