Feature: Requirement 7 - Clean the repository

The repository must contain only material required for the new application or its development.

Scenario: macOS metadata is removed
When tracked files are inspected
Then .DS_Store is not tracked
And .gitignore ignores .DS_Store

Scenario: Duplicate source data is removed
When tracked files are inspected
Then the same large application dataset is not stored in multiple source locations

Scenario: Dead legacy modules are removed
Given a legacy module has no production import
And it has no route
And it has no build-system reference
And it has no native-system reference
When cleanup finishes
Then that module is removed

Scenario: Obsolete documentation is removed
Given documentation describes the old fitness product
And the document is not needed to understand retained code
When cleanup finishes
Then the document is removed

Scenario: Unused dependencies are removed
Given a package has no source import
And it has no build-tool use
And it has no native-tool use
When dependencies are cleaned
Then that package is removed from package.json
And package-lock.json is updated

Scenario: No secrets are committed
When tracked text files are inspected
Then no credential is committed
And no API token is committed
And no private key is committed

---
