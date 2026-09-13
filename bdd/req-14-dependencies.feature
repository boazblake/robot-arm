Feature: Requirement 14 - Dependency management
  Dependencies are justified by current use and are not changed without a requirement.

  Scenario: Every production dependency is justified
    Given each dependency in the production dependency list is inspected
    When its imports, runtime use, and documentation are audited
    Then it has at least one current runtime consumer or an explicitly documented required purpose
    And the audit records that consumer or purpose

  Scenario: Verified unused dependencies are removed
    Given a production dependency has no current runtime consumer and no required purpose
    When the dependency is confirmed unused
    Then it is removed from the production dependency list
    And the lockfile is updated consistently

  Scenario: Working packages are not upgraded opportunistically
    Given a package is working and no requirement requires a version change
    Then its version is not upgraded merely because a newer version exists

  Scenario: Framework migrations are excluded
    Then no framework migration is performed
    And existing framework choices are retained unless a separate requirement explicitly authorizes replacement
