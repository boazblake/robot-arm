Feature: Requirement 16 - Developer commands and reproducible workflow
A developer can install, run, validate, and build the repository from documented root commands.

  Scenario: Clean dependency installation is documented
    Given a fresh checkout with the supported Node version
    When the documented install command runs from the repository root
    Then dependencies install using the authoritative package manifest and lockfile
    And no undocumented manual package installation is required

  Scenario Outline: Required root command exists
    When package scripts and repository documentation are inspected
    Then a documented root command exists for <purpose>

    Examples:
      | purpose   |
      | dev       |
      | build     |
      | typecheck |
      | test      |
      | lint      |

  Scenario: Build command represents production web output
    When the documented build command runs
    Then it builds the production web application
    And it exits nonzero on a build failure

  Scenario: Typecheck command does not emit application output as its purpose
    When the documented typecheck command runs
    Then it validates TypeScript compatibility
    And it exits nonzero when a checked TypeScript error exists

  Scenario: Test command is non-interactive by default
    When the documented test command runs in validation
    Then it completes without requiring interactive input
    And it exits nonzero when a test fails

  Scenario: Lint command checks committed application source
    When the documented lint command runs
    Then it checks the configured production and test source
    And it exits nonzero when a lint error exists

  Scenario: Development command does not modify tracked source as a startup requirement
    When the documented development command starts
    Then it does not require manual edits to tracked files before serving the application

  Scenario: Supported runtime prerequisites are documented
    When README development prerequisites are inspected
    Then the required Node version or supported range is stated
    And the package manager is stated
    And native prerequisites are separated from web prerequisites
