Feature: Requirement 11 - Fitness isolation
  Fitness functionality remains usable without becoming a platform or robot-control dependency.

  Scenario: Existing fitness consumers continue to work
    Given a fitness feature has a current consumer
    When the stabilized application runs that consumer
    Then the fitness feature remains available
    And its existing supported behavior is preserved

  Scenario: Exercise analysis consumes domain data
    Given exercise analysis evaluates tracking or motion
    Then its input is a domain tracking or motion contract
    And it does not consume raw platform result objects

  Scenario: Exercise analysis does not initialize MediaPipe
    Given exercise analysis is loaded or invoked
    Then MediaPipe initialization is not performed by exercise analysis
    And platform initialization remains in the platform integration boundary

  Scenario: Future robot control is independent of fitness
    Given future robot-control code is added after the documented boundary
    Then it can consume the human-motion contract without importing exercise analysis

  Scenario: Abandoned fitness code is removed only after consumer verification
    Given a fitness module is proposed for removal
    When repository consumers are audited
    Then it is removed only if no current consumer exists
    And a module with a current consumer is retained
