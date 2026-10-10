# Editorial UI reconnaissance

## Source coverage

Reviewed the current SO-101 manual-control surface and these reference sites:

- Effect Institute: narrow black workspace, utility-style Tailwind classes, ticker/navigation bands, restrained borders, progressive chapter rows.
- Effect Solutions: centered documentation canvas, black surface, mono typography, uppercase tracking, border grid, restrained accent color, visible GitHub/action links.
- Visual Types: experimental typography/graphics-led presentation with the interface treated as the artifact.
- Evil Rabbit: black centered portfolio canvas, mono text, sparse hierarchy, tiny metadata, high contrast, minimal decoration.

`effect-solutions` is backed by `kitlangton/effect-solutions` and uses Tailwind CSS 4, Commit Mono, and Geist Mono. The inspected production CSS for Effect Institute and Visual Types also contains Tailwind CSS 4 output. Evil Rabbit uses Tailwind utility classes in rendered HTML; no public source repository was identified from its page.

## Chosen direction

Keep the existing functional Mithril/WebSocket control core, but rebuild the presentation as a centered light technical workspace: thin rules, mono metadata, compact navigation/status bands, sparse dark typography, and green/coral status accents. This translates the shared primitives without copying any reference layout or branding.

## Rejected alternative

A large decorative dashboard with rounded cards and persistent gradient surfaces was rejected because it conflicts with the references' narrow editorial canvases, quiet black surfaces, and utility-first hierarchy.

## Acceptance criteria

- The control surface reads as a light, centered editorial/technical workspace.
- Bridge state, safety, controls, current position, and configuration remain discoverable.
- Setup, review, and enabled-control states are distinct.
- Joystick and gripper motion cues clarify expected arm movement without changing control mapping.
- Joystick interaction remains horizontal and responsive on mobile widths.
- Focus states and reduced-motion behavior remain accessible.
- Typecheck and production build pass.
