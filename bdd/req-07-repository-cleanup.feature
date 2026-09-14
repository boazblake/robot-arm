Feature: Requirement 7 - Clean the current tracked repository safely

Requirement 7 verifies the current tracked repository state. Historical secret
scanning is outside this requirement. Deletion requires evidence; absence of an
obvious TypeScript import is not evidence that a file or dependency is dead.

Material required for production runtime, tests, BDD requirements, architecture
documentation, supported native integrations, build and development tooling, CI,
and required fixtures is retained.

Scenario: macOS metadata is absent from the tracked tree
When tracked files are inspected
Then no `.DS_Store` file is tracked
And `.gitignore` ignores `.DS_Store`
And the result is reported as `PASS` or `FAILED`

Scenario: Exact duplicate application data is absent
When tracked source-owned locations are inspected
Then exact byte-identical application datasets are identified by content hash
And generated output is treated separately
And only exact duplicates may be automatically removed
And suspected semantic duplicates require manual review
And similar filenames are not treated as evidence
And the result is reported as `PASS` or `FAILED`

Scenario: Dead legacy modules require complete reference evidence
Given a legacy module is proposed for removal
When its references are inspected
Then static imports are absent
And dynamic imports are absent
And routes are absent
And package scripts are absent
And Vite and build references are absent
And aliases are absent
And Capacitor references are absent
And native registration is absent
And Gradle references are absent
And CocoaPods and Xcode references are absent
And tests are absent
And configuration references are absent
And the module is removed only after the evidence is recorded
And `NOT VERIFIED` native status is not treated as unused evidence

Scenario: Obsolete product documentation is removed
Given documentation describes the removed fitness product
And it is not needed to understand current architecture, tracking behavior, native integrations, retained historical decisions, or BDD requirements
When cleanup finishes
Then that documentation is removed
And retained documentation is not deleted merely because production code does not import it

Scenario: A dependency is retained when any supported path requires it
Given a dependency is used by a retained path
When dependency references are inspected
Then source imports are considered
And test imports are considered
And dynamic imports are considered
And package scripts are considered
And configuration is considered
And Vite plugins are considered
And CI is considered
And native tooling and references are considered
And optional dependencies are considered

Scenario: An unused dependency is removed with lockfile consistency
Given no retained runtime, test, build, development, CI, configuration, dynamic, or native path requires a dependency
When dependencies are cleaned
Then the dependency is removed from `package.json`
And `package-lock.json` is updated
And the repository dependency checks pass

Scenario: Tracked source-owned locations are inventoried
When cleanup candidates are reviewed
Then `src/`, `public/`, `bdd/`, native source, configuration, scripts, tests, and repository documentation are inspected
And tracked generated output is scanned for obvious secrets
And generated output is not used to infer dead source modules or dependency ownership
And each candidate is recorded in `docs/repository-cleanup.md`
And each record contains candidate, reason inspected, references found, decision, evidence, and verification

Scenario: Current tracked text files contain no confirmed secrets
When tracked text files are scanned with Gitleaks
Then source, BDD, documentation, configuration, scripts, fixtures, workflows, and native text files are scanned
And binary files are excluded
And confirmed current-tree findings fail the check
And false-positive suppressions require checked-in Gitleaks configuration with a reason
And historical Git data is not claimed to be clean
And the result is reported as `PASS` or `FAILED`

Scenario: Objective cleanup regression checks pass
When repository cleanup checks run
Then `.DS_Store` tracking is checked
And exact duplicate hashes are checked
And removed legacy paths are checked
And removed fitness routes are checked
And dependency consistency is checked
And the Gitleaks scan is checked
And static checks report only `PASS` or `FAILED`

Scenario: Native build evidence respects platform verification states
Given native build evidence is required for a cleanup decision
When the platform is evaluated
Then its result may be `PASS`, `FAILED`, or `NOT VERIFIED`
And `NOT VERIFIED` does not imply unused code
And native code is removed only with the complete Requirement 5 deletion evidence
