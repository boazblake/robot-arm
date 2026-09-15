Feature: Requirement 15 - Workspace position stabilization

  Requirement 15 stabilizes normalized WorkspacePosition values after Requirement
  14 mapping and before Requirement 13 constructs RobotTarget. It does not smooth
  raw tracking data, ArmDisplacement, or RobotTarget values.

  The stabilization pipeline is:

    WorkspacePosition
      -> per-axis dead-zone filter
      -> EMA smoothing
      -> stabilized WorkspacePosition

  WorkspacePosition and stabilized WorkspacePosition are dimensionless values in
  the inclusive range [-1, 1]. Stabilization has no timestamps or sequence values.

  Stabilization is a pure transformation. The caller owns and supplies the state:

    stabilizeWorkspacePosition(state, side, position, config)
      -> StabilizationResult

  StabilizationConfig contains:

    alpha: finite number in (0, 1]
    deadZone: { x: number, y: number, z: number }

  Each dead-zone value is finite and in [0, 1]. Dead zones are rectangular and
  independent per axis. They are expressed in normalized workspace units.

  The per-axis operation is:

    filtered = abs(value) <= deadZone ? 0 : value
    output = previous === null
      ? filtered
      : alpha * filtered + (1 - alpha) * previous

  The first filtered input initializes the selected side directly. There is no
  implicit transition from zero. EMA state is retained when the filtered value is
  zero; returning to zero therefore eases toward zero normally.

  StabilizationState contains independent history:

    left: WorkspacePosition | null
    right: WorkspacePosition | null

  Scenario: The first filtered input initializes selected-arm state
    Given the left state is null
    And the input WorkspacePosition is { x: 0.4, y: 0, z: 0 }
    And all dead zones are zero
    When the left position is stabilized
    Then the output position is { x: 0.4, y: 0, z: 0 }
    And the left state becomes { x: 0.4, y: 0, z: 0 }

  Scenario: Alpha one passes filtered input unchanged
    Given alpha is 1
    And the previous left state is { x: 0.2, y: -0.3, z: 0.4 }
    And the input WorkspacePosition is { x: 0.7, y: -0.6, z: 0.1 }
    And all dead zones are zero
    When the left position is stabilized
    Then the output position is { x: 0.7, y: -0.6, z: 0.1 }
    And the left state becomes the output position

  Scenario: EMA combines previous and current filtered positions
    Given alpha is 0.5
    And the previous left state is { x: 0.2, y: 0, z: 0 }
    And the input WorkspacePosition is { x: 0.6, y: 0, z: 0 }
    And all dead zones are zero
    When the left position is stabilized
    Then the output position is { x: 0.4, y: 0, z: 0 }

  Scenario: Repeated input converges toward deliberate movement
    Given alpha is 0.5
    And the previous left state is { x: 0, y: 0, z: 0 }
    And the input WorkspacePosition is { x: 1, y: 0, z: 0 }
    And all dead zones are zero
    When the left position is stabilized twice with the same input
    Then the first output x is 0.5
    And the second output x is 0.75

  Scenario: Direction reversal uses normal EMA
    Given alpha is 0.5
    And the previous left state is { x: 0.5, y: 0, z: 0 }
    And the input WorkspacePosition is { x: -0.5, y: 0, z: 0 }
    And all dead zones are zero
    When the left position is stabilized
    Then the output position is { x: 0, y: 0, z: 0 }
    And no special reversal behavior is applied

  Scenario: Returning to zero eases toward zero
    Given alpha is 0.5
    And the previous left state is { x: 0.4, y: 0, z: 0 }
    And the input WorkspacePosition is { x: 0, y: 0, z: 0 }
    And all dead zones are zero
    When the left position is stabilized
    Then the output x is 0.2
    And a subsequent identical input produces x 0.1
    And the state is not snapped directly to zero

  Scenario Outline: Positive and negative values inside a dead zone become zero
    Given the <axis> dead zone is 0.05
    And the input <axis> value is <value>
    When dead-zone filtering runs
    Then the filtered <axis> value is 0

    Examples:
      | axis | value |
      | x    | 0.04  |
      | x    | 0.05  |
      | x    | -0.04 |
      | x    | -0.05 |

  Scenario Outline: Values outside a dead zone are preserved before EMA
    Given the <axis> dead zone is 0.05
    And the input <axis> value is <value>
    When dead-zone filtering runs
    Then the filtered <axis> value is <value>

    Examples:
      | axis | value |
      | x    | 0.06  |
      | x    | -0.06 |

  Scenario: Dead zones apply independently per axis
    Given dead zones are { x: 0.05, y: 0.1, z: 0.2 }
    And the input WorkspacePosition is { x: 0.04, y: 0.2, z: -0.2 }
    When dead-zone filtering runs
    Then the filtered position is { x: 0, y: 0.2, z: 0 }
    And no radial distance is calculated

  Scenario: Stabilization is independent per arm
    Given alpha is 0.5
    And the left state is { x: 0.8, y: 0, z: 0 }
    And the right state is { x: -0.4, y: 0, z: 0 }
    And the new left input is { x: 0, y: 0, z: 0 }
    And the right state receives no input
    When the left position is stabilized
    Then the left output x is 0.4
    And the right state remains { x: -0.4, y: 0, z: 0 }

  Scenario Outline: Invalid alpha is rejected
    Given alpha is <value>
    When StabilizationConfig is constructed
    Then construction fails with reason "alpha-invalid"

    Examples:
      | value    |
      | 0        |
      | -0.1     |
      | 1.1      |
      | NaN      |
      | Infinity |

  Scenario Outline: Invalid dead-zone value is rejected
    Given a dead-zone axis has value <value>
    When StabilizationConfig is constructed
    Then construction fails with reason "dead-zone-invalid"

    Examples:
      | value    |
      | -0.1     |
      | 1.1      |
      | NaN      |
      | Infinity |

  Scenario: Non-finite WorkspacePosition fails without updating state
    Given the previous left state is { x: 0.4, y: 0, z: 0 }
    And the input WorkspacePosition contains NaN or Infinity
    When the left position is stabilized
    Then it returns a failed result with reason "input-invalid"
    And the returned state equals the previous state
    And no EMA history is updated

  Scenario: Stabilization state can be reset for one arm
    Given both left and right states contain EMA history
    When the left stabilization state is reset
    Then left state becomes null
    And right state is unchanged

  Scenario: Calibration change resets only the selected arm
    Given both left and right states contain EMA history
    When calibration changes for the left arm
    And the caller resets left stabilization state
    Then left state becomes null
    And right state is unchanged
    And the next left input initializes directly

  Scenario: Tracking loss resets only the affected arm
    Given both left and right states contain EMA history
    When Requirement 17 reports tracking loss for the left arm
    And the caller resets left stabilization state
    Then left state becomes null
    And right state is unchanged
    And the next recovered left input initializes directly

  Scenario: A new session starts with no stabilization history
    When a new teleoperation session starts
    Then left state is null
    And right state is null

  Scenario: Stabilization runs after workspace clamping
    Given Requirement 14 produced a WorkspacePosition within [-1, 1]
    When stabilization runs
    Then it consumes that normalized position
    And it does not remap ArmDisplacement
    And it does not apply another workspace clamp policy

  Scenario: Stabilization preserves bounded values
    Given the previous and current positions are each within [-1, 1]
    When EMA smoothing runs
    Then every output axis remains within [-1, 1]

  Scenario: Configuration, state, results, and positions are deeply readonly
    Given a valid StabilizationConfig is constructed
    And stabilization produces a successful result
    When the configuration, state, result, and position are inspected
    Then each runtime-created object is deeply frozen

  Scenario: Stabilization is pure and deterministic
    Given the same state, side, position, and configuration
    When stabilization runs twice
    Then both results are exactly equal
    And neither call changes the caller-owned input state
    And no clock or randomness is read

  Scenario: Stabilization has no tracking, camera, UI, or robot dependency
    When smoothing and dead-zone logic is inspected
    Then it accepts WorkspacePosition rather than TrackingFrame or MediaPipe data
    And it does not depend on camera, screen, canvas, window, DOM, or UI state
    And it does not depend on RobotTarget, RobotAdapter, NASA, iMETRO, CLR, ROS, MoveIt, MuJoCo, or servo protocols

  Scenario: Stabilization HUD presents raw and stabilized positions separately
    Given Requirement 14 produced a raw WorkspacePosition
    And Requirement 15 produced a stabilized WorkspacePosition
    When the positions are displayed in the workspace visualization
    Then both positions are visible
    And a line connects raw to stabilized
    And camera mirroring does not alter either normalized position

  Scenario: Stabilization HUD does not own stabilization history
    Given the HUD displays a short stabilized-position trail
    When the HUD is recreated or rendering pauses
    Then the trail is presentation history only
    And stabilization state remains owned by the caller of Requirement 15
