Feature: Requirement 13 - Repository hygiene and secret safety
Version control contains project inputs and required native assets, not local workstation debris or secrets.

  Scenario: macOS metadata is absent
    When tracked paths are listed
    Then no tracked path is named .DS_Store
    And .gitignore contains a rule that ignores .DS_Store

  Scenario: Local environment outputs are not tracked
    When tracked paths are inspected
    Then node_modules is not tracked
    And build output is not tracked unless a documented deployment requirement needs it
    And local logs are not tracked
    And editor swap files are not tracked
    And environment files containing local values are not tracked

  Scenario: Required lockfiles remain tracked
    Given the project uses a package manager with a lockfile
    When repository hygiene is applied
    Then the authoritative lockfile remains tracked
    And dependency changes update it consistently

  Scenario: Native project files are not deleted by assumption
    Given a file under ios or android appears generated
    When removal is considered
    Then its Capacitor, Xcode, Gradle, CocoaPods, or application-build role is checked first
    And it is removed only when that role is verified as unnecessary

  Scenario: Tracked text contains no obvious credential material
    When tracked text configuration and source are scanned
    Then no private key block is present
    And no committed access token is present
    And no committed password is present
    And no committed API secret is present
    And documented example values are clearly non-secret placeholders

  Scenario: Secret scan findings are reported rather than silently ignored
    Given a possible secret is detected
    When its status cannot be proven safe
    Then it is listed as a blocker
    And stabilization is not reported READY until the finding is resolved or proven non-secret

  Scenario: Executable bits are intentional
    Given source or configuration files have executable mode
    When repository modes are audited
    Then executable mode remains only where execution is required
    And accidental executable bits are removed
