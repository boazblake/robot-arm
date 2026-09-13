
# Robot Arm Base Repository Requirements

## Purpose

This repository was copied from Lift-Mate.

Lift-Mate was a fitness application.

The new repository will become a human-motion robot-control project.

This work does not implement robot control.

This work removes the old product and leaves the useful tracking foundation.

The completed repository must provide:

1. a working TypeScript application;
2. camera input;
3. MediaPipe pose tracking;
4. MediaPipe hand tracking;
5. MediaPipe face tracking if retaining it has no material cost;
6. landmark rendering for development;
7. shared tracking data types;
8. basic geometry functions;
9. working web support;
10. retained native support where it currently works;
11. automated tests for deterministic tracking code;
12. no fitness-product dependencies.

---

Feature: Requirement 1 - Remove the Lift-Mate fitness application

The repository must no longer behave as a fitness application.

Scenario: Fitness features are removed
When the final source tree is inspected
Then no workout feature exists
And no exercise-selection feature exists
And no rep-counting feature exists
And no coaching feature exists
And no workout-progress feature exists
And no workout-playback feature exists
And no exercise-history feature exists

Scenario: Exercise implementations are removed
When the final source tree is inspected
Then src/exercises does not exist
And exercise-specific pose-analysis modules do not exist
And squat-specific logic does not exist
And bench-press-specific logic does not exist
And overhead-press-specific logic does not exist

Scenario: Exercise data is removed
When the final repository is inspected
Then ExRx exercise datasets do not exist
And duplicate ExRx datasets do not exist
And ExRx ingestion scripts do not exist
And ExRx-specific domain modules do not exist

Scenario: Fitness state is removed
When application state is inspected
Then workout state does not exist
And session state used only for workouts does not exist
And exercise-selection state does not exist
And coaching state does not exist
And rep-count state does not exist

Scenario: Fitness UI is removed
When application routes are inspected
Then no Home workout dashboard route exists
And no Playback route exists
And no Progress route exists
And no workout-specific navigation item exists

Scenario: Old fitness design material is removed
When repository support files are inspected
Then obsolete workout mockups are removed
And obsolete workout specifications are removed
And obsolete fitness planning documents are removed

---

Feature: Requirement 2 - Preserve the useful tracking application

The cleanup must retain the working computer-vision foundation.

Scenario: Camera input remains available
Given the application is running on a supported platform
When the user starts tracking
Then the application can request camera access
And camera frames can enter the tracking pipeline

Scenario: Pose tracking remains available
Given camera input is active
When MediaPipe detects a person
Then pose landmarks are available to application code

Scenario: Hand tracking remains available
Given camera input is active
When MediaPipe detects a hand
Then hand landmarks are available to application code

Scenario: Two hands can remain distinct
Given MediaPipe detects two hands
When tracking results are processed
Then the application can distinguish the two detected hands

Scenario: Missing hands do not cause failure
Given MediaPipe detects no hands
When a frame is processed
Then processing completes without an exception
And the hand collections are empty

Scenario: Missing pose does not cause failure
Given MediaPipe detects no pose
When a frame is processed
Then processing completes without an exception
And the pose collection is empty

Scenario: Development landmark rendering remains available
Given tracking results exist
When the tracking view is active
Then detected landmarks can be drawn over the camera image

---

Feature: Requirement 3 - Create one tracking data contract

Application code must not depend directly on raw MediaPipe results.

Scenario: A landmark has one application type
When tracking types are inspected
Then a Landmark type exists
And Landmark contains numeric x
And Landmark contains numeric y
And Landmark contains numeric z
And Landmark can contain visibility when supplied

Scenario: A frame has one application type
When tracking types are inspected
Then a TrackingFrame type exists
And TrackingFrame contains a timestamp
And TrackingFrame contains pose landmarks
And TrackingFrame contains left-hand landmarks
And TrackingFrame contains right-hand landmarks
And TrackingFrame contains face landmarks if face tracking is retained

Scenario: Missing detections use empty collections
Given a tracking category has no detection
When TrackingFrame is created
Then that category contains an empty collection
And it does not contain null
And it does not contain undefined

Scenario: MediaPipe results are normalized
Given MediaPipe produces a tracking result
When the result enters application tracking code
Then it is converted to TrackingFrame
And downstream application code consumes TrackingFrame

Scenario: Raw MediaPipe types remain inside the integration
When source imports are inspected
Then general application code does not import MediaPipe result types
And MediaPipe-specific types remain inside MediaPipe integration code

Scenario: Tracking domain types do not use any
When tracking domain types are inspected
Then Landmark does not use any
And TrackingFrame does not use any

---

Feature: Requirement 4 - Separate tracking responsibilities

The current large tracking implementation must be divided into focused responsibilities.

Scenario: Camera code has one location
When source structure is inspected
Then camera acquisition and camera lifecycle code have one clear source location

Scenario: MediaPipe integration has one location
When source structure is inspected
Then MediaPipe initialization and inference code have one clear source location

Scenario: Result normalization is separate
When source structure is inspected
Then conversion from MediaPipe results to TrackingFrame is testable without starting a camera

Scenario: Rendering is separate
When source structure is inspected
Then canvas drawing code is separate from MediaPipe inference
And rendering code does not perform exercise analysis

Scenario: Geometry is separate
When source structure is inspected
Then generic angle and distance calculations are separate from MediaPipe initialization
And geometry functions do not access UI state
And geometry functions do not access camera state

Scenario: Tracking contains no fitness analysis
When tracking modules are inspected
Then they contain no rep counting
And they contain no exercise classification
And they contain no coaching cues
And they contain no squat state
And they contain no press state
And they contain no workout session state

---

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

Feature: Requirement 6 - Establish deterministic geometry and normalization tests

Core tracking transformations must be testable without a camera.

Scenario: Test framework exists
When repository scripts are inspected
Then a unit-test command exists
And the command runs without physical hardware

Scenario: Landmark normalization is tested
Given fixed MediaPipe-like input
When normalization runs
Then the expected TrackingFrame is produced

Scenario: Missing detections are tested
Given MediaPipe-like input contains no detection
When normalization runs
Then the corresponding TrackingFrame collection is empty

Scenario: Handedness is tested
Given fixed left-hand and right-hand detection data
When normalization runs
Then each hand is assigned to the expected collection

Scenario: Angle calculation is tested
Given three known points
When their joint angle is calculated
Then the expected angle is returned within a documented numeric tolerance

Scenario: Distance calculation is tested
Given two known points
When their distance is calculated
Then the expected distance is returned within a documented numeric tolerance

Scenario: Tests need no camera
When the complete unit-test suite runs
Then no physical camera is required

Scenario: Tests need no robot
When the complete unit-test suite runs
Then no robot hardware is required

---

Feature: Requirement 7 - Clean the repository

The repository must contain only material required for the new application or its development.

Scenario: macOS metadata is removed
When tracked files are inspected
Then .DS_Store is not tracked
And .gitignore ignores .DS_Store

Scenario: Duplicate source data is removed
When tracked files are inspected
Then the same large application dataset is not stored in multiple source locations

Scenario: Dead legacy modules are removed
Given a legacy module has no production import
And it has no route
And it has no build-system reference
And it has no native-system reference
When cleanup finishes
Then that module is removed

Scenario: Obsolete documentation is removed
Given documentation describes the old fitness product
And the document is not needed to understand retained code
When cleanup finishes
Then the document is removed

Scenario: Unused dependencies are removed
Given a package has no source import
And it has no build-tool use
And it has no native-tool use
When dependencies are cleaned
Then that package is removed from package.json
And package-lock.json is updated

Scenario: No secrets are committed
When tracked text files are inspected
Then no credential is committed
And no API token is committed
And no private key is committed

---

Feature: Requirement 8 - Repository is ready for new development

The repository is complete only when a developer can use it as a normal development base.

Scenario: Clean dependency installation succeeds
Given the repository has been freshly checked out
When npm ci is run
Then it exits with status code 0

Scenario: Development server starts
Given dependencies are installed
When the package.json development script runs
Then the development server starts successfully

Scenario: TypeScript passes
Given dependencies are installed
When the package.json typecheck script runs
Then it exits with status code 0
And TypeScript errors are not suppressed to obtain success

Scenario: Unit tests pass
Given dependencies are installed
When the package.json test script runs
Then it exits with status code 0
And all enabled tests pass

Scenario: Production build passes
Given dependencies are installed
When the package.json build script runs
Then it exits with status code 0

Scenario: Lint passes
Given dependencies are installed
When the package.json lint script runs
Then it exits with status code 0

Scenario: README describes the new repository
When README.md is inspected
Then it describes the project as a human-motion tracking foundation for robotics work
And it does not describe the project primarily as a fitness application
And it documents installation
And it documents development
And it documents tests
And it documents production build

Scenario: Source tree is understandable
When the final src directory is inspected
Then application startup has one clear location
And tracking has one clear location
And camera integration has one clear location
And MediaPipe integration has one clear location
And tracking types have one clear location
And geometry has one clear location
And rendering has one clear location

Scenario: No robotics implementation has started
When production source is inspected
Then no robot driver exists
And no SO-101-specific code exists
And no servo protocol exists
And no robot mapping exists
And no inverse kinematics exists
And no robot simulator exists
And no robotics hardware dependency exists

Scenario: Final readiness
Given npm ci passes
And typecheck passes
And tests pass
And build passes
And lint passes
And the tracking application remains functional
And the fitness application has been removed
When repository stabilization is complete
Then the repository is READY for robot-control development

