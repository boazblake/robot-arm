Feature: Requirement 22 - clr_ws connectivity

NASA clr_ws is an external dependency used without modification.

Scenario: clr_ws is independently attributable
When the integration baseline is recorded
Then it identifies https://github.com/NASA-JSC-Robotics/clr_ws
And it identifies the jazzy-devel branch
And it records the exact verified commit SHA

Scenario: clr_ws runs without LiftMate
Given clr_ws is installed locally
When the documented CLR simulation starts
Then it runs without LiftMate
And the CLR target becomes available

Scenario: LiftMate does not manage clr_ws
When LiftMate starts
Then it does not install, modify, or assume clr_ws is available

Scenario: Unavailability is explicit
Given clr_ws is unavailable
When the adapter attempts communication
Then the target is reported unavailable
And LiftMate tracking remains operational
