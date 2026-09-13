Feature: Requirement 5 - Preserve platform support

Cleanup must not accidentally remove working platform integrations.

Scenario: Web tracking builds
When the production web build runs
Then it completes successfully

Scenario: Web MediaPipe remains connected
Given the application runs as a web application
When tracking starts
Then the web MediaPipe implementation can provide TrackingFrame values

Scenario: Capacitor configuration remains valid
When Capacitor configuration is inspected
Then required application configuration remains present
And required native project references remain valid

Scenario: Existing iOS MediaPipe code is not removed without evidence
Given iOS contains custom MediaPipe integration
When cleanup occurs
Then required iOS MediaPipe source is retained
Unless it is proven unused by the current native application

Scenario: Existing Android MediaPipe code is not removed without evidence
Given Android contains custom MediaPipe integration
When cleanup occurs
Then required Android MediaPipe source is retained
Unless it is proven unused by the current native application

Scenario: Unavailable native validation is reported accurately
Given a native platform cannot be built in the current environment
When cleanup finishes
Then that platform is reported as NOT VERIFIED
And it is not reported as working solely because the web build passes

---
