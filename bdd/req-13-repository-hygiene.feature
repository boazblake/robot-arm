Feature: Requirement 13 - Repository hygiene and secret safety
  The committed repository contains required source only and no machine-specific or sensitive material.

  Scenario: Tracked macOS metadata is absent
    When the tracked file list is inspected
    Then no tracked path is named .DS_Store
    And .DS_Store is present in .gitignore

  Scenario: Unrequired generated and machine-specific files are absent
    Given every tracked non-source artifact is reviewed
    Then generated files are retained only when required source or documented build input
    And machine-specific files are removed when not required

  Scenario: Native project files are retained only after purpose verification
    Given a native project file is considered for removal
    When its Capacitor purpose is checked
    Then it is not removed unless its purpose is verified as unnecessary

  Scenario: Committed configuration contains no secrets
    When all tracked configuration and source files are audited
    Then no credential is committed
    And no access token is committed
    And no private key is committed
    And no other sensitive information is committed
    And placeholder documentation values are clearly non-secret
