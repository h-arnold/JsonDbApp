## JsonDbApp v0.0.3 — Patch release

Release date: 2025-12-08

### Summary
Introduce conditional handling for backup index file creation and removal based on the `backupOnInitialise` configuration. Includes a test suite to validate this behaviour and updated package dependencies.

### Highlights
- Conditional backup index handling during collection creation/removal controlled via `backupOnInitialise`.
- New tests validating the backup logic and index file handling.
- Package dependency updates and minor fixes to Database optional chaining and test harnesses.

### PRs merged
- #18 — Add conditional backup index handling and tests (merged: 2025-12-08)

### Full changelog
- e5dc0e2 — feat: Add conditional backup index file handling during collection creation and removal
- a547e06 — feat: Add backup index test suite to validate backupOnInitialise behavior
- c2842b1 — feat: Update package.json and package-lock.json to include clasp dependency and version updates
- 7795010 — fix: Remove clasp dependency and improve optional chaining in Database class
- ef6676d9 — fix: Update index file handling in backup tests to ensure correct file counting and listing

### Upgrade notes
- No breaking changes introduced in this patch.
- To enable automatic backup index creation during initialisation, set `backupOnInitialise: true` in `DatabaseConfig`.
