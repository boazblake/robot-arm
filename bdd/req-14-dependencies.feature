Feature: Requirement 14 - Dependency management and package stability
Every dependency has a current reason to exist, and stabilization avoids unrelated upgrades.

  Scenario: Production dependencies have runtime justification
    Given each package under dependencies is inspected
    When imports, runtime loading, build configuration, and native integration are traced
    Then each package has a current runtime or required integration consumer
    And the dependency audit records that consumer

  Scenario: Development dependencies have tooling justification
    Given each package under devDependencies is inspected
    When scripts and configuration are traced
    Then each package has a current build, typecheck, lint, test, or development consumer
    And the dependency audit records that consumer

  Scenario: Confirmed unused dependency is removed
    Given a package has no source, configuration, script, native, or documented tooling consumer
    When stabilization is complete
    Then the package is absent from package.json
    And the authoritative lockfile no longer retains it as a direct dependency

  Scenario: Dependency removal is validated
    Given an unused dependency is removed
    When required validation commands run
    Then build passes
    And typecheck passes
    And tests pass
    And lint passes

  Scenario: Working packages are not upgraded opportunistically
    Given the current package version satisfies project requirements
    And no security or compatibility requirement requires change
    When stabilization is performed
    Then that package is not upgraded solely because a newer release exists

  Scenario: Required validation tooling may be added
    Given no suitable test or lint tool exists for a required validation command
    When a minimal tool is selected
    Then only the required tooling and its necessary peer dependencies are added
    And the reason is recorded in the dependency audit

  Scenario: Framework migration is prohibited
    When stabilization changes are inspected
    Then Mithril is not replaced
    And Ionic is not replaced
    And Capacitor is not replaced
    And MediaPipe is not replaced
    Unless a separate approved requirement explicitly changes that framework
