Feature: Requirement 14 - Calibrated displacement to workspace mapping

  Requirement 14 converts calibrated ArmDisplacement into bounded,
  robot-independent WorkspacePosition coordinates. It does not consume raw
  MediaPipe positions, tracking frames, camera data, or robot coordinates.

  WorkspacePosition is dimensionless and has x, y, and z values in the inclusive
  range [-1, 1]. Zero is the workspace center. It is not measured in meters.

  WorkspaceMapping accepts one ArmDisplacement and a selected ArmSide:

    mapDisplacement(side, displacement) -> WorkspaceMappingResult

  The default mapping uses the same configured transform for both arms. Supplying
  a side does not automatically mirror or invert the displacement.

  A WorkspaceMappingConfig contains one AxisMapping for each target axis:

    x: AxisMapping
    y: AxisMapping
    z: AxisMapping

  Each AxisMapping contains:

    source: "x" | "y" | "z"
    direction: 1 | -1
    range: finite number greater than zero

  The mapping equation for each target axis is:

    normalized = sourceDisplacement / range
    directed = normalized * direction
    targetPosition = clamp(directed, -1, 1)

  Requirement 10 owns calibration and zero displacement. Requirement 14 does not
  add offsets or normalize by arm length. Later robot adapters own conversion from
  normalized workspace coordinates to physical robot coordinates.

  Scenario: Zero calibrated displacement maps to workspace center
    Given ArmDisplacement is { x: 0, y: 0, z: 0 }
    And each configured axis has a valid positive range
    When workspace mapping runs
    Then it produces WorkspacePosition { x: 0, y: 0, z: 0 }

  Scenario: Positive displacement maps according to configured ranges
    Given each target axis maps the same source axis with direction 1
    And the x, y, and z ranges are 0.4, 0.2, and 0.5
    And ArmDisplacement is { x: 0.2, y: 0.1, z: 0.25 }
    When workspace mapping runs
    Then it produces WorkspacePosition { x: 0.5, y: 0.5, z: 0.5 }

  Scenario: Negative displacement maps according to configured ranges
    Given each target axis maps the same source axis with direction 1
    And the x, y, and z ranges are 0.4, 0.2, and 0.5
    And ArmDisplacement is { x: -0.2, y: -0.1, z: -0.25 }
    When workspace mapping runs
    Then it produces WorkspacePosition { x: -0.5, y: -0.5, z: -0.5 }

  Scenario: Axis swaps and direction inversions are explicit
    Given the configuration is:
      | target axis | source axis | direction | range |
      | x           | x           | 1         | 0.4   |
      | y           | z           | -1        | 0.2   |
      | z           | y           | 1         | 0.5   |
    And ArmDisplacement is { x: 0.20, y: 0.25, z: 0.10 }
    When workspace mapping runs
    Then the x position is 0.20 / 0.40 = 0.5
    And the y position is -(0.10 / 0.20) = -0.5
    And the z position is 0.25 / 0.50 = 0.5
    And it produces WorkspacePosition { x: 0.5, y: -0.5, z: 0.5 }

  Scenario: Exact positive boundaries are preserved
    Given each source displacement equals its configured positive range
    When workspace mapping runs
    Then each corresponding workspace position equals 1

  Scenario: Exact negative boundaries are preserved
    Given each source displacement equals the negative of its configured range
    When workspace mapping runs
    Then each corresponding workspace position equals -1

  Scenario: Positive movement beyond a range is clamped
    Given the x axis source is x with direction 1 and range 0.4
    And x displacement is 0.8
    When workspace mapping runs
    Then the calculated value 0.8 / 0.4 equals 2
    And the x workspace position equals 1
    And the mapping succeeds

  Scenario: Negative movement beyond a range is clamped
    Given the x axis source is x with direction 1 and range 0.4
    And x displacement is -0.8
    When workspace mapping runs
    Then the calculated value -0.8 / 0.4 equals -2
    And the x workspace position equals -1
    And the mapping succeeds

  Scenario: Configuration accepts finite positive ranges
    Given every AxisMapping has a source axis used exactly once
    And every direction is either 1 or -1
    And every range is finite and greater than zero
    When WorkspaceMapping is constructed
    Then construction succeeds
    And the resulting mapping is deeply readonly

  Scenario Outline: Invalid range is rejected
    Given an AxisMapping has range <value>
    When WorkspaceMapping is constructed
    Then construction fails with reason "range-invalid"

    Examples:
      | value    |
      | 0        |
      | -0.1     |
      | NaN      |
      | Infinity |

  Scenario: Invalid source axis is rejected
    Given an AxisMapping has a source other than "x", "y", or "z"
    When WorkspaceMapping is constructed
    Then construction fails with reason "source-axis-invalid"

  Scenario: Invalid direction is rejected
    Given an AxisMapping has a direction other than 1 or -1
    When WorkspaceMapping is constructed
    Then construction fails with reason "direction-invalid"

  Scenario: Duplicate source axes are rejected
    Given two target axes use the same source axis
    When WorkspaceMapping is constructed
    Then construction fails with reason "duplicate-source-axis"

  Scenario: Every source axis is used exactly once
    Given the configuration has three target axes
    When WorkspaceMapping is constructed
    Then construction succeeds only when x, y, and z each occur exactly once as source axes

  Scenario: Non-finite displacement is rejected
    Given WorkspaceMapping has a valid configuration
    And ArmDisplacement contains NaN or Infinity in any axis
    When workspace mapping runs
    Then it returns a failed result with reason "workspace-invalid"
    And it does not clamp the non-finite value

  Scenario: Finite displacement always produces bounded output
    Given WorkspaceMapping has a valid configuration
    And ArmDisplacement contains finite values
    When workspace mapping runs
    Then it either succeeds with every position in [-1, 1]
    Or it returns a failed result with reason "workspace-invalid"

  Scenario: Both arms use the same transform by default
    Given the left and right arms provide identical ArmDisplacement values
    And both calls use the same WorkspaceMapping
    When workspace mapping runs for the left and right sides
    Then both calls produce identical WorkspacePosition values
    And no automatic left/right mirroring occurs

  Scenario: Human arm length does not affect mapping
    Given two operators have different human arm lengths
    And both produce the same calibrated ArmDisplacement
    And both use the same WorkspaceMapping configuration
    When workspace mapping runs
    Then both operators produce identical WorkspacePosition values
    And arm length is not an input to the mapping

  Scenario: Screen and camera dimensions do not affect mapping
    Given a fixed ArmDisplacement and WorkspaceMapping configuration
    When mapping runs with different screen sizes
    And mapping runs with different canvas sizes
    And mapping runs with different camera resolutions
    And mapping runs with different device pixel ratios
    Then every run produces the same WorkspacePosition

  Scenario: Calibration defines zero without an additional origin
    Given Requirement 10 produces zero ArmDisplacement at the calibration point
    When workspace mapping runs
    Then the result is WorkspacePosition { x: 0, y: 0, z: 0 }
    And no configurable offset is applied

  Scenario: Mapping does not consume raw tracking or MediaPipe data
    When WorkspaceMapping dependencies are inspected
    Then it accepts ArmDisplacement rather than TrackingFrame or raw hand position
    And it does not depend on MediaPipe types
    And it does not depend on camera APIs
    And it does not depend on screen, canvas, window, DOM, or UI state

  Scenario: Mapping does not depend on robot implementations
    When WorkspaceMapping dependencies are inspected
    Then it depends only on generic geometry, ArmDisplacement, ArmSide, and workspace mapping types
    And it does not depend on RobotAdapter, NASA, iMETRO, CLR, UR10e, Hand-E, SO-101, ROS, ROS 2, MoveIt, MuJoCo, clr_ws, or servo protocols

  Scenario: Workspace values and results are deeply readonly
    Given a WorkspaceMapping has been constructed
    When mapping produces a successful result
    Then the mapping configuration cannot be mutated
    And the result cannot be mutated
    And the WorkspacePosition cannot be mutated

  Scenario: WorkspaceMapping is pure and deterministic
    Given the same ArmDisplacement, ArmSide, and WorkspaceMapping configuration
    When workspace mapping runs more than once
    Then every run produces the same result
    And it reads no clock, randomness, screen state, camera state, or robot state

  Scenario: Workspace HUD is independent of camera mirroring
    Given a WorkspacePosition is displayed in the workspace visualization
    When the front camera preview is mirrored
    Then the displayed x, y, and z values remain unchanged
    And the workspace cube uses normalized coordinates in [-1, 1]
    And it does not use robot dimensions or screen dimensions
