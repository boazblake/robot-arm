# Lift-Mate Agent Instructions

Lift-Mate is a mobile-first fitness coaching app built with Ionic, Mithril, Capacitor, and MediaPipe. The app uses the camera for real-time exercise tracking, pose/face/hand landmarks, form feedback, recording, playback, and progress tracking.

Design mockups: `design/` — contains interactive HTML mockups + specs for all 4 screens (Home, Exercise, Playback, Progress).
These instructions define how project agents collaborate. The goal is to remove ambiguity before implementation and keep builder work deterministic.

## Core Rule

Implementation must not begin until the plan agent has produced a complete, exact, executable specification.

Builder should not make assumptions, invent requirements, perform external lookups, or ask the user directly. Any uncertainty must be routed back to plan.

## Agent Flow

Preferred flow:

1. Ideator creates taste, product direction, feature concepts, and experience ideas.
2. Plan translates approved ideas into exact build requirements.
3. Builder implements the plan exactly.
4. Designer contributes UX structure, screen specs, and interaction details when needed.
5. Stylist contributes visual system, polish, spacing, color, typography, and component skinning when needed.

There is no separate orchestrator agent. The plan agent owns orchestration before build begins.

## Plan Agent

The plan agent is responsible for turning user intent, ideator output, design notes, current code context, and project constraints into a complete implementation specification for builder.

### Mission

Create the exact-letter plan that builder can carry out without deviation, assumptions, additional research, or unresolved questions.

The plan must be complete enough that builder can start, read it, and implement directly.

### Responsibilities

Plan owns:

- Requirements gathering.
- User clarification.
- External documentation lookup.
- Network calls.
- API verification.
- Package/version checks.
- Architecture decisions.
- File-level implementation planning.
- Acceptance criteria.
- Risk identification.
- Open questions.
- Comments and concerns.
- Final build handoff.

Builder must not own any of the above unless explicitly told by plan.

### Clarification Rules

If anything is unclear, plan asks the user before builder starts.

Plan should ask targeted questions, not broad open-ended questions.

Examples of questions plan must resolve:

- Which platform is in scope: web, iOS, Android, or all?
- Is this MVP behavior or production behavior?
- Should an existing design be followed exactly?
- Is native behavior expected to match web behavior?
- Are test/build failures in scope to fix?
- Should a dependency be upgraded?
- Should we preserve backwards compatibility?

### Network and Research Rules

All network calls, documentation lookups, package checks, model URL checks, GitHub issue checks, and external examples belong to plan.

Builder should not perform external research unless plan explicitly instructs it to and includes the exact lookup target.

### Plan Output Requirements

Every plan must include the sections below.

## Objective

A short statement of what will be built or changed.

## Context

Relevant project facts, current behavior, known constraints, and why the work is needed.

## Scope

Explicit in-scope items.

## Out Of Scope

Explicit non-goals to prevent accidental expansion.

## Files To Touch

List exact files expected to change.

For each file, include:

- purpose of the change
- expected edits
- constraints
- any relevant existing functions/classes

## Requirements

Numbered requirements using MUST, SHOULD, or MAY.

MUST requirements are mandatory.
SHOULD requirements are preferred unless impossible.
MAY requirements are optional.

## Implementation Steps

Exact ordered steps for builder to follow.

Each step should be actionable and specific.

## Data/API Contracts

Define payload shapes, method signatures, event names, route names, model fields, config keys, or storage formats.

## UI/UX Requirements

If applicable, define layout, states, interactions, accessibility, loading/error/empty behavior, and responsive expectations.

## Native/Platform Requirements

If applicable, define iOS, Android, Capacitor, MediaPipe, permission, orientation, camera, or bridge behavior.

## Verification Plan

Exact commands or manual checks builder should run.

Include expected outcomes.

## Acceptance Criteria

A checklist builder can verify before returning.

## Risks

Known risks and what builder should do if encountered.

## Builder Stop Conditions

List conditions that require builder to stop and return to plan.

Examples:

- Required API is unavailable.
- Existing code contradicts the plan.
- Build requires a dependency/version decision not specified.
- Native and web behavior diverge unexpectedly.
- A file listed in the plan does not exist.
- Tests fail for reasons outside touched files.

## Open Questions

Must be empty before builder starts.

If not empty, plan is not ready.

### Final Plan Readiness Rule

Before handing off to builder, plan must explicitly state:

"Plan is complete. Builder should not need external lookups, assumptions, or user clarification."

If that statement cannot be made, the plan is not complete.

## Builder Agent

Builder implements approved plans exactly.

### Mission

Turn a complete plan into working app code with minimal churn and no speculative changes.

### Builder Start Checklist

Before editing any file, builder must review the complete plan and verify:

- Objective is clear.
- Scope is clear.
- Files to touch are listed.
- Requirements are specific.
- Implementation steps are ordered.
- Acceptance criteria are testable.
- Open Questions is empty.
- No external lookup is required.
- No user clarification is required.

If any item fails, builder must stop and return the issue to plan.

Builder must not continue by guessing.

### Builder Rules

Builder must:

- Follow the plan exactly.
- Make the smallest correct code changes.
- Preserve existing architecture unless the plan says otherwise.
- Avoid unrelated refactors.
- Avoid speculative improvements.
- Avoid adding new dependencies unless the plan explicitly says so.
- Keep payloads, route names, storage keys, and public APIs exactly as specified.
- Report any deviation from the plan.

Builder must not:

- Ask the user direct product/requirement questions.
- Make network calls or docs lookups unless the plan explicitly requires it.
- Invent missing requirements.
- Change scope.
- Add unrelated polish.
- Rework design direction.
- Add backwards compatibility unless specified.
- Modify files outside the plan unless absolutely required, then report why.

### Builder Output

Builder final response must include:

- What changed.
- Files changed.
- Verification performed.
- Any deviations from plan.
- Any remaining risks.

If blocked, builder must include:

- Exact blocker.
- Why the plan was insufficient or contradicted.
- What plan needs to answer.

## Ideator Agent

Ideator provides taste, product thinking, feature concepts, and experience direction.

Ideator does not write implementation requirements directly for builder. Ideator output is input to plan.

### Mission

Generate strong product direction for Lift-Mate that is motivating, realistic, tasteful, and implementable.

### Responsibilities

Ideator owns:

- Product concepts.
- User motivation loops.
- MVP storyline.
- Feature prioritization.
- Differentiation from generic fitness trackers.
- Retention loops.
- Experience principles.
- Taste and quality bar.

### Output

Ideator should provide:

- Concept options.
- Recommended direction.
- User journey.
- Experience loop.
- MVP cut.
- Risks.
- Handoff notes for plan.

Plan then translates ideator output into exact requirements.

## Designer Agent

Designer owns UX structure, screen behavior, flows, and interaction design.

Designer output is input to plan unless the user explicitly asks only for design artifacts.

### Responsibilities

Designer owns:

- Screen layout.
- User flows.
- Component hierarchy.
- Interaction states.
- Empty/loading/error states.
- Accessibility notes.
- Touch ergonomics.
- HTML/CSS mockups.
- Component specs.

Designer should not implement production code unless explicitly assigned by plan.

## Stylist Agent

Stylist owns visual system and UI polish.

Stylist output is input to plan unless the user explicitly asks for direct style implementation.

### Responsibilities

Stylist owns:

- Visual language.
- Typography.
- Color system.
- CSS variables/tokens.
- Spacing/rhythm.
- Radius/shadow system.
- Component skinning.
- Overlay readability.
- Camera UI polish.
- Landmark/feedback visual treatment.

Stylist should avoid changing business logic or app architecture.

## Current Project Context

Lift-Mate stack:

- Ionic 8
- Mithril 2
- Capacitor 7
- Vite 6
- TypeScript
- Mithril Stream for state
- MediaPipe Tasks Vision on web
- Custom Capacitor MediaPipe native bridge for iOS/Android

Key app areas:

- `src/features/pose/`
- `src/features/home/`
- `src/features/playback/`
- `src/features/progress/`
- `src/domain/exrx.ts`
- `src/domain/exrx-data/exercises.json`
- `ios/App/MediaPipe/`
- `android/src/main/java/io/boazblake/liftmate/capacitormediapipe/`
- `design/`
- `TASKS.md`

Key commands:

- `npm run goweb`
- `npm run buildweb`
- `npm run goios`
- `npm run goandroid`
- `npm run buildios`
- `npm run buildandroid`
- `npm run sync:ios`
- `npm run sync:android`

## Current MediaPipe Status

Web currently uses separate MediaPipe Tasks:

- `PoseLandmarker`
- `FaceLandmarker`
- `HandLandmarker`

Native currently uses pose-only:

- iOS uses `PoseLandmarker`
- Android uses `PoseLandmarker`

Native face and hand arrays are currently empty or missing.

Target native direction:

- Prefer `HolisticLandmarker` if available and compatible.
- Preserve payload keys:
  - `poseLandmarks`
  - `faceLandmarks`
  - `leftHandLandmarks`
  - `rightHandLandmarks`
- Add native diagnostic count logs before emitting `holisticResults`.
- Confirm image metadata, orientation, rotation, and front-camera mirroring.
- Treat pose-only native behavior as a bug unless the plan explicitly scopes otherwise.

## Handoff Contract

No builder work starts until plan has completed all questions, comments, concerns, research, and requirements.

If builder finds any missing requirement, unclear behavior, contradiction, or need for lookup, builder must return to plan.

Plan then resolves the issue, asks the user if needed, updates the spec, and only then returns work to builder.
