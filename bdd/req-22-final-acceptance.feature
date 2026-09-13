Feature: Requirement 22 - Final acceptance
  The stabilized repository is usable by the next developer without cleanup.

  Scenario: A fresh clone can be prepared
    Given a developer clones the repository
    When the documented dependency-installation procedure is followed
    Then dependencies install successfully
    And no undocumented cleanup step is required

  Scenario: A developer can validate the repository
    Given dependencies are installed in the fresh clone
    When the documented dev, build, typecheck, test, and lint commands are run
    Then each command is discoverable from the documentation
    And each required validation result is explicit
    And a failure is not hidden by exclusion or suppression

  Scenario: The tracking pipeline is discoverable
    Given a developer needs to inspect tracking
    When the repository structure and ARCHITECTURE.md are consulted
    Then the platform adapters, TrackingFrame contract, domain tracking code, state owner, and consumers can be located
    And the documented flow is Camera to MediaPipe to TrackingFrame to HumanArmPose boundary

  Scenario: HumanArmPose work can begin without cleanup
    Given the developer has completed the documented validation
    When the developer begins HumanArmPose work
    Then the human-motion boundary exists
    And its fields, units, ranges, and hardware independence are documented
    And no additional repository cleanup is required before implementation begins
