Feature: Requirement 17 - Documentation
  Documentation describes how to use and extend the current repository.

  Scenario: README documents installation and development
    Given README.md is opened from a fresh clone
    Then it contains dependency installation instructions
    And it contains the development-server startup command
    And it contains the test command
    And it contains the production build command
    And each instruction is sufficient to execute without repository archaeology

  Scenario: ARCHITECTURE.md describes the current implementation
    Then ARCHITECTURE.md describes the actual current implementation
    And it documents the tracking data flow in order
    And it documents the web and native platform boundary
    And it identifies the current state owner
    And it does not present removed architecture as current

  Scenario: Stale planning documents are removed
    Given planning documents are audited
    When a document no longer provides useful information about current or planned work
    Then it is removed
    And documents that still provide useful information are retained
