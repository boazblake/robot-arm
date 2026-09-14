# Repository cleanup inventory

This inventory covers the current tracked tree. It does not claim that Git history
has been scanned for secrets.

| Candidate | Reason inspected | References found | Decision | Evidence | Verification |
| --- | --- | --- | --- | --- | --- |
| `.DS_Store` | macOS metadata can be accidentally committed | No tracked instances; `.gitignore` contains `.DS_Store` | Retain ignore rule; no file to remove | `git ls-files` and `.gitignore` inspection | `npm run verify:cleanup` |
| Tracked application datasets | Duplicate application data can increase maintenance and bundle risk | No tracked dataset duplicate was identified; exact hashes are checked for supported data extensions | No automatic deletion based on names or semantic similarity | SHA-256 comparison of tracked source-owned data files | `npm run verify:cleanup` |
| Tracking source and tests | Required production runtime and deterministic verification | Imported by routes, application bootstrap, or test suite | Retain | `src/app/routes.ts`, tracking tests, and BDD 3–6 | `npm test`, `npm run typecheck` |
| iOS MediaPipe integration | Supported native integration must not be removed without evidence | Xcode source phase and `BridgeViewController` registration reference `ios/App/MediaPipe/` | Retain | `ios/App/App.xcodeproj/project.pbxproj` and native registration | Structural checks; native runtime remains `NOT VERIFIED` |
| Android MediaPipe integration | Supported native integration must not be removed without evidence | Gradle settings and `MainActivity` register the custom plugin | Retain | `android/settings.gradle` and Android source | Structural checks; native runtime remains `NOT VERIFIED` |
| Repository documentation and BDD | Architecture, retained tracking behavior, and requirements are required material | `README.md`, `ARCHITECTURE.md`, and `bdd/` describe retained behavior and decisions | Retain | Documentation and requirements inspection | `git ls-files` |
| Runtime/build dependencies | Dependencies may be used by tests, Vite, CI, configuration, or native tooling | Package scripts, Vite config, source imports, CI, Podfile, and native project references | Retain pending dependency-specific evidence | Package/configuration/reference inspection | `npm ci`, typecheck, build, and tests |
| Current tracked text files | Confirmed secrets must not enter the repository | Gitleaks configuration and CI scan configured; history is out of scope | Scan in CI; suppress only with a reasoned checked-in rule | `.gitleaks.toml` and workflow | Gitleaks CI step |

Generated Pages output is ignored by this repository and is not used to infer dead
source modules or dependency ownership. If generated output becomes tracked, its
text files must be included in the current-tree secret scan.
