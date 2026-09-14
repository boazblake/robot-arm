Feature: Requirement 15 - Smoothing and dead zones

Tracking stabilization reduces noise without introducing robot-specific behavior.

Scenario: Small fluctuations are stabilized
Given tracking fluctuates within the configured noise range
When smoothing is applied
Then RobotTarget remains substantially stable

Scenario: Deliberate movement remains responsive
Given smoothing is active
When deliberate human movement occurs
Then mapped intent follows that movement

Scenario: Dead zones are configurable
When stabilization is configured
Then dead-zone behavior is explicit and configurable

Scenario: Stabilization is robot-independent
When smoothing and dead-zone logic is inspected
Then it contains no target-specific robot behavior
