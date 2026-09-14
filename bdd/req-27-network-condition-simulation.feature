Feature: Requirement 27 - Network-condition simulation

Controlled network conditions can be applied at the remote adapter boundary.

Scenario: Artificial latency is configurable
Given network simulation is enabled
When a configured latency is applied
Then it affects the browser-to-adapter boundary
And the configured value is recorded

Scenario: Local tracking remains independent
Given artificial network latency is enabled
Then local MediaPipe tracking continues at its normal rate

Scenario: Transport semantics remain stable
Given network conditions delay a RobotTarget
When the adapter receives it
Then its semantics remain unchanged
And stale-input policy remains applicable
