# Lift-Mate Tasks

## Legend
- `[ ]` pending
- `[/]` in progress
- `[x]` done
- `[~]` blocked

---

## MVP North Star (Locked)
- [x] Define product promise: camera-first, on-device lifting coach
- [x] Define golden path: Home -> Exercise -> Summary -> Playback -> Progress
- [x] Define primary user story from first session to habit loop

## Home Screen
- [x] Convert `Home.js` → `Home.ts`
- [x] Design mockup in `design/`
- [ ] Implement workout list with real data
- [ ] Loading / empty / error states

## Exercise Screen (`/pose`)
- [x] Camera + canvas overlay pipeline
- [x] MediaPipe holistic integration (web)
- [x] Design mockup + spec in `design/`
- [ ] Polish exercise selector UX
- [ ] Visible rep counter overlay
- [ ] Form feedback status indicators
- [ ] Recording control UX polish
- [ ] Exercise completion flow
- [ ] Wire up production exercise logic (`src/exercises/`) to pose screen

## Playback (`/playback`)
- [x] Design mockup + spec in `design/`
- [ ] Recording browser / list view
- [ ] Timeline scrubber
- [ ] Recording metadata (date, duration, exercise type)
- [ ] Empty state ("no recordings")

## Progress (`/progress`)
- [x] Design mockup + spec in `design/`
- [ ] Stats dashboard / charts
- [ ] History / goals / achievements

## App Shell
- [x] Navigation spec added to `design/home-spec.md`
- [ ] Settings screen
- [ ] About screen
- [ ] Active tab highlighting
- [ ] Dark mode (uncomment Ionic dark palette)

## Infrastructure
- [x] Set up opencode config + AGENTS.md + designer subagent
- [x] Created all 4 screen mockups + specs in `design/`
- [ ] Install test framework (vitest + cypress)
- [ ] Wire up `ledger.md` for session logging

## Slice 1 - Shell and Navigation Coherence (Current)
- [x] Stabilize app shell layout (`header`, `mainContent`, bottom tab bar)
- [x] Make sidebar only contain valid routes (`/`, `/pose`, `/playback`, `/progress`)
- [x] Ensure active tab state is visible and consistent on all routes
- [/] Verify no header/content/tab overlap on iPhone viewport

## Slice 2 - Home as Launchpad
- [/] Keep Home usable and scroll-safe inside app shell
- [ ] Add clear primary CTA hierarchy: `Start Workout`, `Resume`, `Recent`
- [ ] Align Home empty/loading/error states with MVP story
- [ ] Remove dead-end links/routes from Home cards and actions

## Slice 3 - Exercise Core Loop (`/pose`)
- [x] iOS camera permission crash fixed (`NSCameraUsageDescription`)
- [x] Native plugin callable from JS (`CapacitorMediaPipe`)
- [x] Native frame flow connected (camera preview -> sample -> plugin)
- [x] Landmark overlay direction aligned with front camera
- [ ] Add explicit Exercise state overlays (Idle, Loading, Streaming, Error)
- [ ] Add visible rep counter + form feedback status pill
- [ ] Add end-of-session summary overlay (save/review actions)

## Slice 4 - Playback MVP (`/playback`)
- [ ] Recording list with empty state
- [ ] Basic scrub + play/pause controls
- [ ] Session metadata (date, duration, exercise)

## Slice 5 - Progress MVP (`/progress`)
- [ ] Local stats cards: sessions, reps, streak, last workout
- [ ] Basic recent history list/chart placeholder
- [ ] Empty state guidance for first-time users

## Support Screens
- [ ] Create minimal `Settings` route and screen
- [ ] Create minimal `About` route and screen
- [ ] Add camera/privacy explanatory copy (on-device processing)

## Design System and Styling
- [x] Add `designer` agent context in `.opencode/AGENTS.md`
- [x] Add `stylist` agent spec in `.opencode/agent/stylist.md`
- [ ] Define shared visual tokens (type, spacing, radius, semantic color)
- [ ] Apply token-based styles to shell + Home first

## Reliability and Dev Workflow
- [x] Snapshot branch/tag created before recovery work
- [ ] Keep `vite`/core config unchanged unless explicitly requested
- [/] Add short smoke checklist (sim + device + start exercise + tab nav)
- [ ] Install test framework (`vitest` + `cypress`) when MVP flow stabilizes

### Shell + Camera Smoke Checklist
- [ ] Home tab visible at app launch and after route changes
- [ ] Exercise tab visible while camera is running
- [ ] Sidebar opens with solid background and does not overlap tab interactions
- [ ] Exercise selector opens/closes cleanly on device (`ion-select` alert mode)
- [ ] Start button disabled until exercise is selected
- [ ] Start -> Streaming -> End returns to stable shell without missing tabs
