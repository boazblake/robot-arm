# Lift-Mate stabilization BDD requirements

This package contains the revised stabilization requirements for `boazblake/robot-arm`.

## Authority

The numbered `.feature` files are the acceptance requirements. This index is descriptive only.

## Stabilization boundary

Current work ends at `TrackingFrame`. The later conceptual flow is:

```text
Camera -> MediaPipe -> TrackingFrame -> HumanArmPose -> RobotMapper -> RobotTarget -> Simulator or PhysicalRobot
```

`HumanArmPose` and all later stages are future work. They are not stabilization implementation requirements.

## Result words

Use `PASS`, `FAIL`, and `NOT VERIFIED` for final validation results. Use `READY` only when Requirement 2 permits it.

## Files

- `req-01-objective-and-scope.feature`
- `req-02-definition-of-done.feature`
- `req-03-preserve-existing-tracking-behavior.feature`
- `req-04-tracking-contract.feature`
- `req-05-platform-boundary.feature`
- `req-06-landmark-type-safety.feature`
- `req-07-geometry.feature`
- `req-08-coordinate-and-unit-safety.feature`
- `req-09-human-motion-boundary.feature`
- `req-10-application-state.feature`
- `req-11-fitness-isolation.feature`
- `req-12-repository-structure.feature`
- `req-13-repository-hygiene.feature`
- `req-14-dependencies.feature`
- `req-15-testing.feature`
- `req-16-developer-workflow.feature`
- `req-17-documentation.feature`
- `req-18-explicit-non-requirements.feature`
- `req-19-refactoring-rules.feature`
- `req-20-required-work-process.feature`
- `req-21-final-report.feature`
- `req-22-final-acceptance.feature`
