Feature: Requirement 10 - Application state ownership and frame lifecycle
  Tracking state has one owner and a documented, efficient lifecycle.

  Scenario: Tracking state has one clear owner
    Given all tracking state declarations are inspected
    Then ownership is assigned to one documented state owner
    And there is no competing global tracking-state owner
    And no second global state-management system is introduced

  Scenario: A frame follows one documented data path
    Given tracking is active and a new frame arrives
    When the frame is accepted
    Then it follows the documented path from platform adapter to TrackingFrame consumer
    And each handoff is identifiable in the architecture documentation
    And the frame is not routed through an undocumented duplicate path

  Scenario: Unchanged visible state does not cause a full redraw
    Given a frame arrives without changing visible UI state
    When the frame is processed
    Then frame processing completes without requiring a full application redraw
    And any redraw that does occur is limited to a documented visible-state change

  Scenario: Stopping tracking stops processing
    Given tracking is active
    When tracking is stopped
    Then no subsequently received frame is processed by the stopped tracking session
    And the processing loop or subscription is stopped

  Scenario: Camera resources are released
    Given tracking used camera resources
    When tracking is stopped or the owner is disposed
    Then applicable camera resources are released
    And no camera stream remains active for the stopped session

  Scenario: Unused global streams are removed
    Given global stream declarations are inspected
    Then every retained global stream has a current consumer and documented purpose
    And unused global streams are absent
