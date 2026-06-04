## JsonDbApp v0.1.2 — Patch release

Release date: 2026-06-04

### Summary

This patch release fixes two config propagation bugs where `logLevel` and `cacheEnabled` settings supplied via `DatabaseConfig` were not applied at runtime. `JDbLogger.currentLevel` was hardcoded to `DEBUG` and `FileService._cacheEnabled` was hardcoded to `true`, ignoring user configuration.

### Fixes

- **`logLevel` not propagated to `JDbLogger`:** The `Database` constructor now calls `JDbLogger.setLevelByName(this.config.logLevel)` before creating any component loggers, ensuring all subsequent log output respects the configured level. Previously, `JDbLogger.currentLevel` was unconditionally set to `DEBUG` at class-load time and never updated from config.
- **`cacheEnabled` not propagated to `FileService`:** The `Database` constructor now calls `this._fileService.setCacheEnabled(this.config.cacheEnabled)` after `FileService` creation. Previously, `FileService` hardcoded `this._cacheEnabled = true` in its constructor with no way for `Database` to propagate the user's preference.

### Tests added

- 7 regression tests in `tests/unit/database/database-initialisation.test.js` under a new `Config propagation` describe block:
  - 4 tests verifying `logLevel` propagation (`ERROR`, `WARN`, `INFO`, `DEBUG`)
  - 3 tests verifying `cacheEnabled` propagation (`true`, `false`, default)

### Upgrade notes

- No breaking changes.
- No configuration changes required; existing configs now work as originally intended.
