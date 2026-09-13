# Home Screen — MVP Spec

**Route:** `/`
**Role:** Start point for a session

## Purpose
Help the user start fast, resume if needed, and see recent workouts without extra noise.

## Product story
Home is a simple launchpad. It should feel ready, but not busy.

## Component tree
```text
IonPage
└─ IonContent
   ├─ HomeSummary
   │  ├─ Title
   │  ├─ SmallStatusLine
   │  └─ OptionalResumeChip
   ├─ PrimaryActions
   │  ├─ StartWorkoutButton
   │  └─ ResumeWorkoutButton (conditional)
   ├─ RecentWorkouts
   │  ├─ WorkoutItem[]
   │  └─ EmptyState
   ├─ LoadingState
   └─ ErrorState
```

## State table
| State | Visual | Behavior |
|---|---|---|
| Loading | Simple text and skeleton rows | Wait for local data |
| Ready | Start button, optional resume, recent list | Start → `/pose` |
| Empty | One message and one CTA | Start is the only action |
| Error | Inline message with retry | Retry reloads local data |
| No resume | Resume hidden | Start stays primary |

## Layout
- Keep content top-aligned and compact.
- Put the main CTA above the fold.
- Recent workouts should be a plain list, not cards with heavy decoration.
- Avoid hero banners, gradients, or large empty surfaces.

## Interaction details
- **Start workout**: go to `/pose`.
- **Resume**: go to `/pose` with last session context if available.
- **Workout item**: opens the chosen workout context or preselects it for the next session.
- **Pull to refresh**: optional if local data refresh is already supported.

## Accessibility
- Primary action first in reading order.
- Minimum 44px touch targets.
- Use text labels for status, not color alone.

## Copy
- Loading: “Loading workouts.”
- Empty: “No workouts yet.”
- Error: “Could not load local data.”
