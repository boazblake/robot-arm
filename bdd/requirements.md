# Lift-Mate Repository Stabilization Requirements

## 1. Objective and scope

- Prepare Lift-Mate as a clean, verified base for robotics development.
- This is stabilization/refactoring, not robotics implementation.
- Preserve the future pipeline boundary:
  `Camera -> MediaPipe -> TrackingFrame -> HumanArmPose -> RobotMapper -> RobotTarget -> Simulator or physical robot`.
- Stop this task before `RobotMapper`.

## 2. Definition of done

- Production build exits successfully.
- TypeScript typecheck exits successfully with no suppressed errors.
- All unit tests pass.
- Lint exits successfully.
- Development server starts without startup errors.
- Any untestable scenario must be reported as `NOT VERIFIED`, never as passing.

## 3. Preserve existing tracking behavior

### Pose

- Detected pose landmarks become normalized landmarks.
- No-pose results become an empty pose collection.
- No-pose processing must not throw.
- Application code must not require raw MediaPipe result types.

### Hands

- Left and right detected hands must be identified correctly.
- With one detected hand, return it on the correct side and leave the other side empty.
- With no hands, both collections are empty and processing does not throw.

### Face

- Detected face landmarks become normalized face landmarks.
- No-face results become an empty face collection.
- No-face processing must not throw.

## 4. Tracking contract

- Define one platform-independent `Landmark` type:
  - numeric `x`, `y`, and `z`
  - optional numeric `visibility`
- Define one platform-independent `TrackingFrame` containing:
  - `timestamp`
  - readonly `pose`
  - readonly `leftHand`
  - readonly `rightHand`
  - readonly `face`
- Web tracking results must cross the boundary as `TrackingFrame`.
- Native tracking results must cross the boundary as `TrackingFrame`.
- Consumers must consume `TrackingFrame`, not raw MediaPipe results.

## 5. Platform boundary

- Keep web and native MediaPipe implementations behind one boundary.
- Web uses the web MediaPipe implementation.
- Capacitor uses the native MediaPipe implementation.
- Domain logic must not know which platform produced a frame.
- Domain modules must not import `@mediapipe/*`, `@capacitor/*`, `camera-preview`, browser APIs, or native plugin APIs.

## 6. Landmark type safety

- Do not allow raw landmark arrays typed as `any` into new domain code.
- Domain landmark coordinates and visibility must be type-safe.
- Do not use `as any`, `@ts-ignore`, or equivalent error suppression.

## 7. Geometry

- Provide pure, MediaPipe-independent geometry operations for:
  - joint angle
  - landmark distance
  - coordinate normalization where required
- Known valid points must produce expected angles within a defined tolerance.
- Missing or invalid angle points must return an explicit invalid result or be rejected by the caller.
- Valid landmark distance must be geometrically correct.
- Distance between identical points must be zero.
- Geometry must not access stores or trigger UI updates.

## 8. Coordinate and unit safety

- Document the MediaPipe normalized-coordinate convention.
- Make angle units explicit.
- Prevent normalized coordinates from being silently treated as servo positions.
- Do not use ambiguous generic-number conventions for different units.

## 9. Human motion boundary

- Define a robot-independent `HumanArmPose` boundary containing approximately:
  - `shoulderYaw`
  - `shoulderPitch`
  - `elbowFlexion`
  - `wristPitch`
  - `wristRoll`
  - `grip`
- Document units and ranges where applicable.
- Provide a defined future location for `TrackingFrame -> HumanArmPose` conversion.
- Do not implement that conversion during stabilization.
- `HumanArmPose` must not depend on SO-101 or any robot hardware.

## 10. Application state

- Tracking state must have clear ownership.
- A new frame must follow one documented data path.
- A frame arrival must not require a full redraw when no visible UI state changed.
- Stopping tracking must stop frame processing.
- Camera resources must be released where applicable.
- Remove unused global streams.
- Do not introduce another global state system.

## 11. Fitness isolation

- Preserve working fitness functionality with current consumers.
- Exercise analysis must consume domain tracking or motion information.
- Exercise analysis must not own MediaPipe initialization.
- Future robot control must not depend on exercise analysis.
- Remove abandoned fitness code only when it has no current consumer.

## 12. Repository structure

- Keep application startup/routing in `src/app/`.
- Keep tracking UI in a clear feature location.
- Keep platform integration in one clear location, preferably `src/platform/mediapipe/{web,native}/`.
- Keep geometry and tracking contracts in `src/domain/tracking/`.
- Keep human motion types in `src/domain/motion/`.
- Keep state in `src/stores/` or one clearly documented owner.
- Keep shared UI/utilities in `src/shared/`.
- Every directory must have a current purpose.
- Remove unused legacy code while preserving Git history.

## 13. Repository hygiene

- Remove tracked `.DS_Store` files.
- Add `.DS_Store` to `.gitignore`.
- Remove generated or machine-specific files that are not required source.
- Do not remove native project files until their Capacitor purpose is verified.
- Audit tracked configuration for credentials, tokens, private keys, and secrets.
- No sensitive information may remain committed.

## 14. Dependencies

- Every production dependency must have a current runtime consumer or documented required purpose.
- Remove unused dependencies when verified unused.
- Do not upgrade working packages merely because newer versions exist.
- Do not perform framework migrations.

## 15. Testing

- Use Vitest unless an existing suitable framework is already present.
- Add deterministic tests for:
  - landmark normalization
  - web result normalization
  - native result normalization
  - angle calculations
  - distance calculations
  - missing landmarks
  - handedness normalization
- Tests must run without a camera or robot.
- Fixed MediaPipe-like fixtures must produce deterministic `TrackingFrame` values.
- Do not add Cypress without a demonstrated browser-automation requirement.

## 16. Developer workflow

Expose successful commands equivalent to:

- `dev`
- `build`
- `typecheck`
- `test`
- `lint`

Do not make validation pass by excluding problematic application code.

## 17. Documentation

- README must explain installation, development startup, tests, and builds.
- `ARCHITECTURE.md` must describe the current implementation.
- It must document tracking data flow and the platform boundary.
- It must not describe removed architecture as current.
- Remove stale planning documents that no longer provide useful information.

## 18. Explicit non-requirements

Do not implement:

- SO-101 drivers
- servo communication
- Web Serial
- robot WebSockets
- inverse kinematics
- `RobotMapper`
- Three.js
- robot simulator

Do not:

- visually redesign the product
- migrate from Mithril
- replace Ionic
- replace Capacitor
- replace MediaPipe

## 19. Refactoring rules

- Prefer pure functions, composition, and immutable transformations.
- Do not introduce classes without a concrete requirement.
- Do not create hypothetical abstractions.
- Do not add dependencies when TypeScript or browser APIs suffice.
- Do not use `any` in new domain code.
- Do not suppress TypeScript errors.
- Do not preserve dead code for possible future use.
- Do not change working behavior without a stated reason.
- Keep modules focused on one responsibility.
- Keep platform code outside domain code.
- Keep UI code outside domain logic.
- Keep hardware concepts outside human-motion models.

## 20. Required work process

1. Inspect the complete repository and trace startup, routing, camera, MediaPipe, capture, normalization, state, rendering, and exercise analysis.
2. Report the current state, including entry point, build, tracking, web/native paths, state, rendering, exercise analysis, tests, and KEEP/MOVE/REFACTOR/REMOVE/UNKNOWN decisions.
3. Resolve important unknowns before destructive changes.
4. Establish and record the validation baseline.
5. Refactor in small coherent changes while keeping the application buildable.
6. Add the required isolated tests.
7. Run all required validation.
8. Produce the required final report.

## 21. Final report requirements

The final report must contain:

- `STATUS`: `READY` or `NOT READY`
- baseline build/typecheck/test/lint results
- changes
- removed items
- final architecture
- tracking data flow
- validation results for build, typecheck, test, lint, web, iOS, and Android
- remaining technical debt
- next development boundary
- blockers

`READY` requires build, typecheck, test, and lint to pass. Unavailable runtime platforms remain `NOT VERIFIED`.

## 22. Final acceptance

A developer must be able to clone the repository, install dependencies, validate it, locate the tracking pipeline, and begin `HumanArmPose` work without additional cleanup.
