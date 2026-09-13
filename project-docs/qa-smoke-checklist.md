# MVP Smoke Checklist

## Web
- [ ] Home tab visible at launch
- [ ] Start blocked without exercise
- [ ] Start -> Loading -> Streaming works
- [ ] End shows summary overlay
- [ ] Save updates Playback list and Progress totals
- [ ] Playback JSON import handles invalid file with clear message

## iOS
- [ ] App launches with bottom tabs visible
- [ ] Camera permission prompt appears and recovers correctly
- [ ] Start -> Streaming -> End remains stable after camera switch
- [ ] Save and Save & Review complete without crash

## Latest verification notes
- 2026-05-12: `npm run buildweb` passes after flow hardening and playback validation updates.
- 2026-05-12: Manual browser/iOS smoke still pending execution on device/simulator.
