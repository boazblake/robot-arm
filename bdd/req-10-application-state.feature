Feature: Requirement 10 - Tracking runtime state ownership
Runtime state has explicit ownership and high-frequency tracking does not become accidental global UI state.

  Scenario: Tracking lifecycle has one authoritative state owner
    When tracking lifecycle state is inspected
    Then one documented module owns whether tracking is idle, starting, ready, streaming, switching, stopped, or failed
    And competing lifecycle state variables are removed or justified

  Scenario: A frame follows one documented path
    Given tracking is streaming
    When a TrackingFrame is produced
    Then it enters application processing through one documented frame-delivery boundary
    And duplicate independent frame pipelines are not created during stabilization

  Scenario: High-frequency frames do not require full application redraws
    Given a TrackingFrame arrives
    And no user-visible state that requires redraw changed
    When frame processing completes
    Then the architecture does not require a full Mithril application redraw solely because the frame arrived

  Scenario: UI state remains separate from frame data
    When stores are inspected
    Then durable session or navigation state is not used as the raw high-frequency frame transport without documented need

  Scenario: Tracking stop terminates frame scheduling
    Given tracking is streaming
    When tracking is stopped
    Then no new tracking frame is scheduled by the stopped loop
    And active camera resources are released according to the platform implementation
    And a later restart does not create two concurrent frame loops

  Scenario: Camera switching does not duplicate processing loops
    Given tracking is streaming
    When the active camera is switched
    Then the old capture path is stopped or replaced
    And only one active processing loop remains after the switch completes

  Scenario: Unused global state is removed
    Given a global stream or store has no runtime reader and no required side effect
    When stabilization is complete
    Then that state is removed
    Or its required purpose is documented in the audit
