Feature: Requirement 6 - Landmark and tracking type safety
Tracking domain code uses explicit types and does not use any as its data model.

  Scenario: New tracking domain code contains no explicit any
    When tracking domain source added or changed by stabilization is inspected
    Then no public tracking type uses any
    And no geometry parameter uses any for Landmark data
    And no TrackingFrame collection uses any

  Scenario: Unknown platform input is narrowed before domain use
    Given platform data has an uncertain runtime shape
    When it enters normalization
    Then uncertain data is treated as unknown or a platform-specific external type
    And runtime shape checks occur before it becomes Landmark

  Scenario: Invalid numeric landmark fields are rejected or omitted
    Given a candidate landmark lacks numeric x, y, or z
    When normalization evaluates the candidate
    Then the candidate does not become a valid Landmark without an explicit normalization rule
    And the behavior is covered by a deterministic test

  Scenario: Visibility remains optional
    Given a valid landmark has no visibility value
    When it is normalized
    Then the resulting Landmark remains valid
    And no fabricated visibility value is required

  Scenario: Type safety is validated by the repository command
    When the documented typecheck command runs
    Then tracking domain code is included
    And the command exits with status code 0
