Feature: Requirement 20 - Required stabilization work process
  Stabilization is performed in an observable, reversible sequence.

  Scenario: Complete repository inspection occurs first
    When work begins
    Then the complete repository is inspected
    And startup is traced from entry point to running application
    And routing is traced
    And camera acquisition and release are traced
    And MediaPipe initialization and result handling are traced
    And capture and normalization are traced
    And state ownership and updates are traced
    And rendering is traced
    And exercise analysis consumers are traced

  Scenario: Current-state report records explicit decisions
    When inspection is complete
    Then a report identifies the entry point
    And it identifies build, tracking, web/native paths, state, rendering, exercise analysis, and tests
    And each inspected area has exactly one of KEEP, MOVE, REFACTOR, REMOVE, or UNKNOWN
    And every UNKNOWN has a stated resolution plan

  Scenario: Unknowns and baseline precede destructive changes
    Then important unknowns are resolved before destructive changes
    And baseline build, typecheck, test, and lint results are recorded before refactoring

  Scenario: Changes are incremental and validated
    When refactoring is performed
    Then changes are made in small coherent increments
    And the application remains buildable after each increment
    And required isolated tests are added
    And all required validation is run after implementation
    And the required final report is produced
