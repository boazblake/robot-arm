Feature: Domain-oriented source organization

  The LiftMate source tree must show the system architecture through its directory structure.

  The source layout separates tracking, teleoperation, robotics, application orchestration,
  camera access, rendering, and shared generic code.

  The organization must make dependency ownership clear before robot adapters,
  transport, feedback, recording, and NASA integration increase repository complexity.

  This is a strict final directory migration. Compatibility barrels may exist only
  temporarily during the refactor. The completed source tree must not retain
  compatibility layers or imports under src/domain, src/features, src/integration,
  or src/types. The old architectural directories must no longer exist when this
  requirement passes.

  A type belongs to the domain that owns its meaning, even when other domains use
  it. No generic shared-contracts directory is introduced. Generic mathematics
  belongs under src/shared/geometry only.

  Files use lowercase kebab-case names. Domain names include:

    human-arm-pose.ts, tracking-frame.ts, tracking-validity.ts
    arm-calibration.ts, teleop-mapper.ts, workspace-mapping.ts
    workspace-stabilization.ts, input-freshness.ts, control-policy.ts
    robot-target.ts, robot-adapter.ts, teleop-session.ts

  Tests use the matching name with .test.ts or .boundary.test.ts.

  The intended dependency graph is:

    shared/geometry <- tracking <- teleoperation <- app/session
    robotics/model <- teleoperation where RobotTarget construction requires it
    robotics/ports <- app/session
    robotics/adapters -> robotics/ports and robotics/model

  Tracking does not depend on teleoperation or robotics. Teleoperation does not
  depend on concrete adapters. Domain modules do not depend on app/session.

  Scenario: Top-level source directories represent architectural domains
    Given the application source tree is inspected
    Then src contains an app directory
    And src contains a tracking directory
    And src contains a teleoperation directory
    And src contains a robotics directory
    And src contains a camera directory
    And src contains a rendering directory
    And src contains a shared directory

  Scenario: Generic domain folders are not used as primary organization
    When the source tree is inspected
    Then source code is not primarily organized under generic services directories
    And source code is not primarily organized under generic models directories
    And source code is not primarily organized under generic utils directories
    And source code is not primarily organized under generic types directories
    And src/types does not exist in the completed layout
    And src/integration does not exist in the completed layout
    And src/domain does not exist in the completed layout
    And src/features does not exist in the completed layout
    And src/utils.js does not exist in the completed layout
    And files are grouped by architectural ownership instead

  Scenario: Tracking owns normalized observations of the human
    Given tracking source is inspected
    Then TrackingFrame belongs to tracking
    And HumanArmPose belongs to tracking
    And human landmark accessors belong to tracking
    And TrackingValidity belongs to tracking
    And MediaPipe integration belongs to tracking adapters
    And tracking contains no teleoperation control policy
    And tracking contains no RobotAdapter implementation

  Scenario: Tracking model has a clear location
    When tracking model files are inspected
    Then they are organized under src/tracking/model
    And TrackingFrame is located there
    And HumanArmPose is located there
    And human landmark definitions or accessors are located there

  Scenario: Tracking validity has a clear location
    When tracking validity code is inspected
    Then it is organized under src/tracking/validity
    And Requirement 11 confidence policy belongs there
    And it does not depend on robot implementations

  Scenario: MediaPipe is isolated behind a tracking adapter
    When MediaPipe integration is inspected
    Then it is organized under src/tracking/adapters/mediapipe
    And MediaPipe normalization belongs to that boundary
    And MediaPipe-specific types do not escape into downstream domains

  Scenario: Tracking receives camera samples through a boundary
    When camera and tracking dependencies are inspected
    Then camera owns permissions, lifecycle, platform access, and frame acquisition
    And tracking owns normalization, inference integration, models, and validity
    And camera does not calculate HumanArmPose
    And tracking does not own camera lifecycle

  Scenario: Teleoperation owns interpretation of human movement
    Given teleoperation source is inspected
    Then calibration belongs to teleoperation
    And workspace mapping belongs to teleoperation
    And stabilization belongs to teleoperation
    And freshness policy belongs to teleoperation
    And control policy belongs to teleoperation
    And teleoperation contains no concrete robot implementation

  Scenario: Calibration has a clear location
    When Requirement 10 implementation is inspected
    Then arm calibration is organized under src/teleoperation/calibration
    And calibration remains robot-independent

  Scenario: Mapping has a clear location
    When Requirements 13 and 14 implementations are inspected
    Then TeleopMapper is organized under src/teleoperation/mapping
    And WorkspaceMapping is organized under src/teleoperation/mapping
    And mapping contains no camera or UI dependency
    And mapping contains no concrete robot dependency

  Scenario: Stabilization has a clear location
    When Requirement 15 implementation is inspected
    Then workspace stabilization is organized under src/teleoperation/stabilization
    And stabilization state remains independent for each arm
    And stabilization contains no robot-specific behavior

  Scenario: Freshness has a clear location
    When Requirement 17 implementation is inspected
    Then input freshness policy is organized under src/teleoperation/freshness
    And freshness policy does not belong to RobotAdapter
    And freshness policy does not belong to rendering
    And freshness policy does not belong to tracking adapters

  Scenario: Control policy has a clear location
    When Requirement 16 implementation is inspected
    Then control policy is organized under src/teleoperation/control
    And control state transitions remain pure domain operations
    And control policy contains no UI implementation
    And control policy contains no concrete robot implementation

  Scenario: Robotics owns robot-independent target intent
    Given robotics source is inspected
    Then RobotTarget belongs to robotics
    And RobotAdapter belongs to robotics
    And concrete robot adapters belong to robotics
    And robotics does not perform human tracking
    And robotics does not calculate HumanArmPose

  Scenario: RobotTarget has a clear location
    When Requirement 12 implementation is inspected
    Then RobotTarget is organized under src/robotics/model
    And RobotTarget contains no concrete robot implementation details

  Scenario: RobotTarget validation has one canonical owner
    When RobotTarget validation is inspected
    Then it is organized under src/robotics/model
    And robot-target-validation.ts is the canonical runtime validator
    And transport and concrete adapters reuse that validator
    And validation is not duplicated in each boundary

  Scenario: RobotAdapter is an architectural port
    When Requirement 18 implementation is inspected
    Then RobotAdapter is organized under src/robotics/ports
    And RobotAdapter defines the boundary consumed by application orchestration
    And RobotAdapter contains no NASA-specific implementation
    And RobotAdapter contains no SO-101-specific implementation
    And RobotAdapter contains no MediaPipe dependency

  Scenario: Concrete robot integrations implement the RobotAdapter port
    Given concrete robot integrations exist
    When their source locations are inspected
    Then they are organized under src/robotics/adapters
    And an iMETRO integration belongs under src/robotics/adapters/imetro
    And an SO-101 integration belongs under src/robotics/adapters/so101
    And each concrete adapter implements the RobotAdapter contract

  Scenario: Concrete adapters may depend on robot-specific systems
    Given a concrete robot adapter is inspected
    Then it may contain robot-specific protocols and coordinate conversion
    And those details remain inside that adapter
    And those details do not enter tracking
    And those details do not enter teleoperation
    And those details do not enter RobotTarget

  Scenario: Application orchestration has a clear location
    When session orchestration is inspected
    Then it is organized under src/app/session
    And it composes tracking, teleoperation, control, and robotics boundaries
    And it owns session-scoped state
    And domain modules do not depend on application orchestration
    And tracking-pipeline responsibility is organized under src/app/session
    And session lifecycle responsibility is organized under src/app/session

  Scenario: Teleoperation session composes the complete pipeline
    When src/app/session/teleop-session.ts is inspected
    Then it composes tracking, calibration, freshness, mapping, stabilization, and RobotTarget construction
    And it owns session-scoped pipeline state
    And it does not move camera lifecycle into teleoperation

  Scenario: HUD code has a clear location
    When diagnostic HUD code is inspected
    Then it is organized under src/app/hud
    And tracking HUD code belongs there
    And arm HUD code belongs there
    And workspace HUD code belongs there
    And pipeline HUD code belongs there

  Scenario: HUD code only observes domain output
    Given a HUD component displays domain information
    When its dependencies are inspected
    Then it may consume domain output
    And it may format values for presentation
    And it may calculate screen coordinates for rendering
    But it does not calculate HumanArmPose
    And it does not perform calibration
    And it does not evaluate tracking validity
    And it does not perform workspace mapping
    And it does not perform stabilization
    And it does not make control-state decisions
    And display components remain read-only with respect to domain behavior
    And HUD controllers may dispatch application/session actions
    And HUD controllers do not implement calibration, freshness, or control policy

  Scenario: Camera access remains separate from tracking interpretation
    When camera source is inspected
    Then camera lifecycle and frame acquisition belong under src/camera
    And camera code does not calculate HumanArmPose
    And camera code does not perform teleoperation mapping
    And camera code does not depend on robot adapters

  Scenario: Rendering remains separate from domain behavior
    When rendering source is inspected
    Then canvas rendering belongs under src/rendering
    And rendering consumes prepared render data
    And rendering does not perform MediaPipe inference
    And rendering does not perform calibration
    And rendering does not perform control policy
    And rendering does not transmit robot commands

  Scenario: Shared code contains only generic reusable behavior
    When src/shared is inspected
    Then generic geometry belongs under src/shared/geometry
    And point, angle, and distance primitives may be organized there
    And generic geometry may belong there
    And shared code does not contain tracking policy
    And shared code does not contain teleoperation policy
    And shared code does not contain robot-specific behavior
    And shared does not become a miscellaneous dumping location
    And no shared/domain directory exists
    And no shared/utils.ts directory exists

  Scenario: Domain-owned contracts stay with their meaning
    When domain contracts are inspected
    Then Landmark, TrackingFrame, and ArmSide belong under src/tracking/model
    And WorkspacePosition belongs under src/teleoperation/mapping
    And RobotTarget belongs under src/robotics/model
    And contracts are not moved merely because multiple domains use them

  Scenario: Tests are colocated with their implementation
    Given a domain implementation has deterministic tests
    When its directory is inspected
    Then its unit tests are located beside the implementation
    And its boundary tests are located beside the implementation

  Scenario: Stabilization tests demonstrate colocation
    When workspace stabilization files are inspected
    Then the directory may contain workspace-stabilization.ts
    And it may contain workspace-stabilization.test.ts
    And it may contain workspace-stabilization.boundary.test.ts
    And those files belong under src/teleoperation/stabilization

  Scenario: Dependency direction follows the architecture
    When source imports are inspected
    Then tracking does not depend on teleoperation
    And tracking does not depend on robotics
    And teleoperation may consume tracking domain contracts
    And teleoperation does not depend on concrete robot adapters
    And robotics model does not depend on tracking
    And robotics ports do not depend on concrete adapters
    And application orchestration may compose all required domain boundaries

  Scenario: Concrete robot adapters depend inward through RobotAdapter
    Given a concrete robot integration exists
    When its dependency direction is inspected
    Then it implements the RobotAdapter port
    And the RobotAdapter port does not import that concrete adapter
    And replacing one concrete adapter does not require changes to HumanArmPose
    And replacing one concrete adapter does not require changes to TeleopMapper

  Scenario: Migration follows dependency-safe order
    When the migration plan is inspected
    Then shared geometry is migrated first
    And tracking model, validity, and adapters are migrated next
    And camera is migrated before teleoperation
    And teleoperation calibration, mapping, stabilization, freshness, and control are migrated in that order
    And robotics model and ports are migrated before application session orchestration
    And rendering and app HUD are migrated after session orchestration
    And old directories are removed last
    And tests run after each migration group

  Scenario: Existing behavior survives the source reorganization
    Given source files have been moved into domain-oriented directories
    When the complete automated test suite runs
    Then all existing Requirements 1 through 17 tests continue to pass
    And no runtime behavior changes solely because of file relocation

  Scenario: The production web application survives the source reorganization
    Given the domain-oriented source layout is complete
    When the authoritative production build runs
    Then the build succeeds
    And TypeScript type checking succeeds
    And lint succeeds

  Scenario: Final layout has no old architecture imports
    Given the domain-oriented source layout is complete
    When source imports are inspected
    Then no production import references src/domain
    And no production import references src/features
    And no production import references src/integration
    And no production import references src/types

  Scenario: Architecture boundaries are automatically verified
    Given the domain-oriented source layout is complete
    When architecture tests run
    Then prohibited dependency directions fail the test suite
    And misplaced concrete robot dependencies fail the test suite
    And MediaPipe dependencies outside their permitted boundary fail the test suite
    And application orchestration imported by domain modules fails the test suite
    And dependency-graph tests are the primary enforcement mechanism
    And source-content tests are used only for rules the import graph cannot detect

  Scenario: Future integrations have predefined ownership
    Given later requirements add transport, robot feedback, iMETRO, or SO-101 support
    When those features are implemented
    Then transport orchestration does not enter tracking
    And robot feedback does not enter human tracking models
    And iMETRO implementation remains under robotics adapters
    And SO-101 implementation remains under robotics adapters
    And robot-specific behavior does not require restructuring the human tracking domain
