Feature: Requirement 12 - Repository structure and source ownership
The source tree makes active responsibilities discoverable and removes duplicate ownership.

  Scenario: Application bootstrap has one active entry path
    When production startup is traced from index.html into application source
    Then one documented bootstrap path is active
    And obsolete alternative bootstrap implementations are removed or documented as required

  Scenario: Platform integration has one location per platform
    When MediaPipe integration is located
    Then web integration has one documented source location
    And native TypeScript integration has one documented source location
    And native iOS and Android implementation locations are documented when retained

  Scenario: Tracking domain types have one authoritative location
    When Landmark and TrackingFrame definitions are searched
    Then one production definition of each is authoritative
    And duplicate incompatible definitions do not remain

  Scenario: Generic geometry has one authoritative location
    When generic angle and distance helpers are searched
    Then reusable tracking geometry has one documented domain location
    And duplicate helpers are removed or justified when their semantics differ

  Scenario: Feature UI remains outside domain modules
    When domain modules are inspected
    Then they do not import Mithril view components
    And they do not import Ionic UI components
    And they do not import feature CSS

  Scenario: Legacy source is not retained without a consumer
    Given a legacy file has no import, route, build, script, native-project, or documented tooling consumer
    When stabilization is complete
    Then the file is removed
    Or the final report identifies why it remains

  Scenario: Duplicate data assets are resolved
    Given byte-identical or semantically duplicate large data assets exist in multiple source paths
    When their consumers are traced
    Then one authoritative required copy remains where practical
    And consumers reference that copy
    Or the final report explains why multiple copies are required

  Scenario: Architecture documentation matches the actual tree
    When ARCHITECTURE.md is compared with production source
    Then every documented top-level source responsibility exists
    And removed paths are not described as current
    And active major paths are not omitted
