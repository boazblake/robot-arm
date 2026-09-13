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
