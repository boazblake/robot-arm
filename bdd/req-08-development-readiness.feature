Feature: Requirement 8 - Repository is ready for new development

The repository is ready when a fresh checkout is independently installable and all
stabilization checks pass. Native runtime status is consumed from Requirement 5.

Scenario: Clean dependency installation succeeds from a fresh checkout
Given the repository has been freshly checked out without sibling repositories
When `npm ci` is run
Then it exits with status code 0
And every dependency is resolved from the package manifest and lockfile
And no dependency uses a sibling filesystem path

Scenario: Development server passes a bounded health check
Given dependencies are installed
When `npm run verify:dev` runs
Then it starts `npm run dev -- --port 4173`
And the process starts within 10 seconds
And `GET http://127.0.0.1:4173/` returns HTTP 200
And the development server process is terminated after the check
And camera initialization is not required

Scenario: TypeScript passes without prohibited suppressions
Given dependencies are installed
When `npm run typecheck` runs
Then it exits with status code 0
And TypeScript errors are not suppressed to obtain success
And production TypeScript under `src/` contains no `@ts-nocheck`
And production TypeScript under `src/` contains no `@ts-ignore`
And each `@ts-expect-error` has an inline reason and a test for its intended boundary
And `tsconfig.json` does not disable meaningful type checking

Scenario: Deterministic tests pass without skipped work
Given dependencies are installed
When `npm test` runs
Then it exits with status code 0
And zero tests fail
And zero tests are skipped
And zero tests are marked todo
And the suite requires no camera, native runtime, robot hardware, or network
And `npm run test:unit` remains available for watch-mode development

Scenario: Production build passes
Given dependencies are installed
When `npm run build` runs
Then it exits with status code 0
And production assets are produced in the configured web output directory

Scenario: Lint passes
Given dependencies are installed
When `npm run lint` runs
Then it exits with status code 0

Scenario: README documents each development workflow separately
When `README.md` is inspected
Then it describes the project as a human-motion tracking foundation for robotics work
And it does not describe the project primarily as a fitness application
And it documents `npm ci` under Install
And it documents `npm run dev` under Development
And it documents `npm test` under Tests
And it documents `npm run typecheck` under Type checking
And it documents `npm run lint` under Lint
And it documents `npm run build` under Production build
And it documents `npm run verify:cleanup` under Cleanup verification

Scenario: Requirement 4 architecture boundaries pass
When Requirement 4 architecture boundary tests run
Then camera, MediaPipe integration, normalization, rendering, geometry, and session boundaries pass
And the tracking modules contain no fitness analysis

Scenario: Production source has no robot-control implementation
When production source and dependency declarations are inspected
Then no `RobotTarget` domain type exists
And no `RobotAdapter` exists
And no robot-control package exists
And no ROS dependency exists
And no servo-control dependency exists
And no inverse-kinematics implementation exists
And no simulator integration exists
And BDD references to future robotics concepts are allowed

Scenario: Fitness removal and repository cleanup evidence are consumed
Given Requirement 1 acceptance passes
And Requirement 7 legacy checks pass
When readiness evidence is reviewed
Then no fitness routes exist
And no fitness UI entry points exist
And no fitness-only state or analysis remains
And `npm run verify:cleanup` exits with status code 0

Scenario: Tracking and platform status are consumed from Requirement 5
Given Requirement 5 deterministic web tracking is `VERIFIED`
And Requirement 5 live web tracking is `VERIFIED` or `NOT VERIFIED`
And Requirement 5 native platform statuses are explicitly reported as `VERIFIED`, `FAILED`, or `NOT VERIFIED`
Then Requirement 8 does not duplicate camera or native runtime tests
And native `NOT VERIFIED` is reported, not treated as a pass
And camera permission, unsupported browser, WASM, model, and native failures are handled by Requirement 5

Scenario: Aggregate readiness gate passes
Given `npm ci` is `PASS`
And the development health check is `PASS`
And `npm test` is `PASS` with zero failed, skipped, and todo tests
And `npm run typecheck` is `PASS`
And `npm run lint` is `PASS`
And `npm run build` is `PASS`
And `npm run verify:cleanup` is `PASS`
And Requirements 1, 3, 4, 5, 6, and 7 are satisfied
And Requirement 5 includes documented native status
And Requirement 9 implementation has not started
When repository stabilization is complete
Then Requirements 1 through 8 are satisfied
And the repository is READY for robot-control development
