# Playback Screen — MVP Spec

**Route:** `/playback`
**Role:** Review saved sessions

## Purpose
Let the user pick a saved session, play it back, and scrub basic timing.

## Product story
The list comes first. Review is a secondary step after a session exists.

## Component tree
```text
IonPage
└─ IonContent
   ├─ PlaybackHeader
   ├─ SessionList
   │  ├─ SessionItem[]
   │  ├─ EmptyState
   │  └─ ErrorState
   ├─ PlayerArea
   │  ├─ PlayerCanvas
   │  ├─ SessionMeta
   │  ├─ TimelineScrubber
   │  └─ PlaybackControls
   ├─ SettingsSheet
   └─ DeleteAction
```

## State table
| State | Visual | Behavior |
|---|---|---|
| List | Recording list with date and duration | Tap to open player |
| Empty | Short message and one CTA | Go to `/pose` |
| Player | Canvas, metadata, scrubber, controls | Play, pause, scrub |
| Paused | Same view, paused control state | Resume same session |
| Error | Plain error with retry | Return to list on retry |

## Layout
- Show the session list first.
- Keep the player simple and focused on one recording.
- Put scrubber and controls low on the screen.
- Keep settings in a sheet, not another route.

## Interaction details
- **Open session**: show player for that recording.
- **Play/pause**: toggle state only.
- **Scrub**: update frame position immediately.
- **Delete**: ask for confirmation before removing local data.

## Accessibility
- Text labels for every control.
- Timeline uses time and position text.
- Empty and error states should always say what to do next.

## Copy
- Empty: “No recordings yet.”
- Error: “Could not load this session.”
