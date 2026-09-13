# Lift-Mate Project Notes

## Purpose
Single source of truth for product direction, agent outputs, and execution status across long sessions.

## Current North Star
- Build a reliable, camera-first MVP that gives users one clear form win quickly.
- Keep UX simple and guided: Home -> Exercise -> Summary -> Playback -> Progress.
- Prevent invalid states by design (never rely on user guesswork).

## Locked Product Direction
- Use only current screen specs in `design/*-spec.md` and `design/*-mockup.html`.
- Archive drafts are intentionally removed to keep execution surface minimal.

## Agent Roles
- `ideator` (invoked through runtime `design` subagent): concept + storyline + scope.
- `designer`: UX flows, state specs, component contracts.
- `stylist`: visual tokens and polish.
- `builder`: implementation against approved specs.

## Governance Rules
- No major coding without approved storyline/scope.
- Every route must expose valid empty/loading/error/success states.
- Keep tabs stable; guard invalid actions inside route state logic.
- Keep commits vertical and scoped to one concern.

## Current Execution Focus
1. Exercise flow guardrails (preflight/loading/streaming/summary/error).
2. Navigation safety (active session leave confirmation).
3. Home launchpad hierarchy (Start/Resume/Recent).
4. Playback and Progress baseline completion.

## Open Risks
- Tab/shell regressions on iOS device if Ionic internals are over-styled.
- Session-loss risk if user leaves route during active workout.
- iOS signing/environment drift between branches.

## Validation Checklist (MVP Critical)
- Tabs remain visible and stable on all top routes.
- `/pose` always opens to a valid state (no dead-end).
- Start is gated until prerequisites are valid.
- End session shows summary before route transition.
- Playback can open newest saved session.
- Progress updates from local data after session save.

## Session Notes (2026-05-12)
- Added route guard helper: `src/shared/utils/navigationGuards.ts`.
- Wired guard into `src/shared/components/Tabs.js` and `src/shared/components/SideMenu.js`.
- When leaving active Exercise states (`Loading`, `Ready`, `Streaming`, `SwitchingCamera`), app now asks for confirmation.
- Replaced browser `window.confirm` with native-style `ion-alert` confirmation for active Exercise leave flow.
- Verified project builds after changes (`npm run buildweb`).
- Replaced Exercise start FAB with a guided preflight card state in `src/features/pose/PoseViewer.ts`.
- Added explicit loading overlay copy ("Starting camera...") and styling in `src/features/pose/pose.css`.
- Added Home CTA hierarchy enhancement in `src/features/home/HomePage.ts`: Start, Resume, and Recent session shortcut to Playback.
- Added Recent Sessions list on Home from `src/stores/sessionStore.ts` data.
