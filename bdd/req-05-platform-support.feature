Feature: Requirement 5 - Preserve supported platform tracking paths

The refactoring in Requirements 1 through 4 must not silently break supported web,
iOS, or Android tracking paths. This requirement does not prove camera quality,
MediaPipe accuracy, or robot behavior.

Scenario: The authoritative production web build succeeds
When the repository production build runs with `npm run build`
Then the command exits with code 0
And production assets are produced in the configured web output directory
And the build reports zero TypeScript or build errors

Scenario: Deterministic web tracking reaches the TrackingFrame consumer
Given a deterministic camera or prerecorded test frame
And the web MediaPipe model-loading boundary is mocked
When the web MediaPipe adapter processes the frame
Then the result passes through normalization
And the normalized result satisfies the Requirement 3 TrackingFrame contract
And the TrackingFrame reaches the tracking consumer or store
And no real camera is required

Scenario: Local web runtime initialization is separately verified
Given a supported browser with camera permission and network access
When web tracking is initialized locally
Then the retained MediaPipe WASM runtime loads
And all retained web detectors initialize
And live inference produces TrackingFrame values

Scenario: Capacitor configuration targets remain valid
When the Capacitor and native configuration are inspected
Then `capacitor.config.ts` retains the application ID, app name, and web directory
And `ios/App/App/Info.plist` remains valid
And `ios/App/Podfile` remains valid
And `android/app/src/main/AndroidManifest.xml` remains valid when present
And `android/app/build.gradle` remains valid when present
And `android/settings.gradle` remains valid
And each retained integration has valid configuration for its platform

Scenario: Retained iOS tracking integration remains connected
Given the retained iOS integration is under `ios/App/MediaPipe/`
When iOS project references and plugin registration are inspected
Then the required iOS MediaPipe source remains referenced by the native application
And the iOS tracking path has a documented validation status

Scenario: Retained Android tracking integration remains connected
Given the retained Android integration is under `android/src/main/java/io/boazblake/liftmate/capacitormediapipe/`
When Android project references and plugin registration are inspected
Then the required Android MediaPipe source remains referenced by the native application
And the Android tracking path has a documented validation status

Scenario: Native integration is not deleted without complete evidence
Given a native MediaPipe integration is proposed for deletion
When deletion evidence is reviewed
Then there is no application import or reference
And there is no Capacitor or plugin registration
And there is no native build reference
And the platform build still succeeds
And a documented replacement exists or intentional removal is recorded

Scenario: Unavailable native validation is reported accurately
Given a native platform cannot be built in the current environment
When platform verification finishes
Then its status is `NOT VERIFIED`
And the report includes the specific missing environment or capability
And web build success is not used as evidence that the native platform works

Scenario: Platform verification uses explicit statuses
When platform verification results are recorded
Then every platform is reported as exactly `VERIFIED`, `FAILED`, or `NOT VERIFIED`
And a `FAILED` status includes the failing check
And a `NOT VERIFIED` status is not treated as a pass

Scenario: Required native references have regression protection
Given a retained native platform requires MediaPipe integration
When source and configuration boundary tests run
Then they fail if a required native integration reference is removed
Unless an explicit removal decision includes replacement or removal evidence
