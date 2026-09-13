# Progress Screen — MVP Spec

**Route:** `/progress`
**Role:** Show basic training history and totals

## Purpose
Give the user a simple view of consistency: sessions, reps, streak, and recent activity.

## Product story
This is a lightweight proof screen, not a heavy analytics dashboard.

## Component tree
```text
IonPage
└─ IonContent
   ├─ ProgressHeader
   ├─ SummaryStats
   ├─ SimpleTrend
   ├─ RecentSessions
   ├─ EmptyState
   ├─ LoadingState
   └─ ErrorState
```

## State table
| State | Visual | Behavior |
|---|---|---|
| Loading | Short skeleton rows | Wait for local stats |
| Ready | Stats, simple trend, recent list | Read-only MVP |
| Empty | One message and one CTA | Go to `/pose` |
| Error | Inline retry | Retry local stats load |

## Layout
- Put total stats first.
- Use a simple bar row or list for trend, not a complex chart.
- Keep recent sessions in plain text rows.
- Avoid goals and achievements until there is enough data.

## Interaction details
- **Pull to refresh**: reload local stats.
- **Session row tap**: optional later drill-down; not required for MVP.

## Accessibility
- Large numeric values.
- Labels always present next to numbers.
- Empty/error states must show the next action.

## Copy
- Loading: “Loading progress.”
- Empty: “No progress yet.”
- Error: “Could not load progress.”
