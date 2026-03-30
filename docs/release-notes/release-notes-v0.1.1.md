## JsonDbApp v0.1.1 — Patch release

Release date: 2026-03-30

### Summary

This patch release hardens collection locking and master-index coordination. It separates lock lease duration from overall coordination timeout, renews collection locks when operations approach expiry, and reloads master index state while holding `ScriptLock` to avoid stale overwrites. Includes supporting test and documentation updates.

[Get copies of the latest scripts here](https://drive.google.com/drive/folders/1EqZJjMRCHfXDvVtGbqrD85xFuQBYGf11?usp=drive_link)

### Highlights

- Split lock timing into separate collection lease and coordination timeout settings.
- Add lock renewal support for long-running collection operations.
- Reload master index state under `ScriptLock` to prevent stale overwrites.
- Expand validation and test coverage for lock timing and recovery paths.
- Update supporting documentation for the new locking behaviour.

### PRs merged

- #50 — Introduce `collectionLockLeaseMs` and `coordinationTimeoutMs`; add lock renewal and validations
- #49 — Reload MasterIndex state under `ScriptLock` to prevent stale overwrites and add cross-instance lock tests

### Full changelog

- dafec87 — feat: Introduce `collectionLockLeaseMs` and `coordinationTimeoutMs`; add lock renewal and validations (#50)
- a3d4420 — fix: Reload MasterIndex state under `ScriptLock` to prevent stale overwrites and add cross-instance lock tests (#49)
- 6389bf5 — docs: update links to project copy in README and Quick Start Guide
- 09305c4 — docs: update release notes for v0.1.0, fix formatting and improve clarity
- Added: lock lease renewal logic in `CollectionCoordinator` and `MasterIndexLockManager`
- Added: configuration split for `collectionLockLeaseMs` and `coordinationTimeoutMs`
- Added: focused tests for lock renewal, master-index recovery, and timing validation

### Upgrade notes

- No breaking changes introduced.
- `lockTimeout` remains supported for compatibility, but new code should prefer `collectionLockLeaseMs` and `coordinationTimeoutMs` when tuning lock behaviour.
