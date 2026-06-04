## JsonDbApp v0.2.0 — Breaking cleanup release

Release date: 2026-06-04

### Summary

This minor release merges the config propagation fixes from v0.1.2 with a cleanup of dead code in `JDbLogger` and `DatabaseConfig`. The `JDbLogger` removed methods and `DatabaseConfig` static getters were never called from any production source file and have been removed. The `DatabaseConfig.lockTimeout` **instance property** (distinct from the static getters) is also removed — it was a live property on every instance that external consumers could read, making this a breaking change. A few additional bug fixes are included.

### Breaking Changes

#### JDbLogger — removed methods

The following methods were never called from any source file and have been removed:

| Removed method                                         | Migration                                                           |
| ------------------------------------------------------ | ------------------------------------------------------------------- |
| `JDbLogger.setLevel(level)`                            | Use `JDbLogger.setLevelByName(levelName)`                           |
| `JDbLogger.getLevel()`                                 | Read `JDbLogger.currentLevel` directly                              |
| `JDbLogger.getLevelName()`                             | No replacement — no consumer reads the current level by name        |
| `JDbLogger.log(level, message, context)`               | Use the dedicated methods: `error()`, `warn()`, `info()`, `debug()` |
| `JDbLogger.startOperation(operation, context)`         | Removed (transitively dead via `timeOperation` removal)             |
| `JDbLogger.endOperation(operation, duration, context)` | Removed (transitively dead via `timeOperation` removal)             |
| `JDbLogger.timeOperation(operation, fn, context)`      | Removed — never called from any source file                         |

**Still available:** `setLevelByName()`, `currentLevel`, `formatMessage()`, `error()`, `warn()`, `info()`, `debug()`, `createComponentLogger()`, `LOG_LEVELS`.

#### DatabaseConfig — removed methods and property

The static getters listed below were never called from any source file. The `this.lockTimeout` instance property was a live property set by the constructor that external consumers could read — its removal is a breaking change.

| Removed                                            | Migration                                                                                                                                                            |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DatabaseConfig.clone()`                           | Construct a new `DatabaseConfig` from `toJSON()` output instead                                                                                                      |
| `DatabaseConfig.getDefaultLockTimeout()`           | Removed — had no external callers                                                                                                                                    |
| `DatabaseConfig.getDefaultCoordinationTimeoutMs()` | Removed — had no external callers                                                                                                                                    |
| `DatabaseConfig.getDefaultRetryAttempts()`         | Removed — had no external callers                                                                                                                                    |
| `DatabaseConfig.getDefaultRetryDelayMs()`          | Removed — had no external callers                                                                                                                                    |
| `DatabaseConfig.getDefaultLockRetryBackoffBase()`  | Removed — had no external callers                                                                                                                                    |
| `this.lockTimeout` (instance property)             | Use `this.collectionLockLeaseMs` directly. The constructor's `_resolveTimingConfig()` still accepts legacy `config.lockTimeout` as input for backward compatibility. |

**Still available static getters:** `getDefaultMasterIndexKey()`, `getDefaultCollectionLockLeaseMs()`, `getDefaultFileRetryAttempts()`, `getDefaultFileRetryDelayMs()`, `getDefaultFileRetryBackoffBase()`, `getDefaultQueryEngineMaxNestedDepth()`, `getDefaultQueryEngineSupportedOperators()`, `getDefaultQueryEngineLogicalOperators()`.

### Fixes

- **`logLevel` not propagated to `JDbLogger`:** The `Database` constructor now calls `JDbLogger.setLevelByName(this.config.logLevel)` before creating any component loggers, ensuring all subsequent log output respects the configured level. Previously, `JDbLogger.currentLevel` was unconditionally set to `DEBUG` at class-load time and never updated from config.
- **`cacheEnabled` not propagated to `FileService`:** The `Database` constructor now calls `this._fileService.setCacheEnabled(this.config.cacheEnabled)` after `FileService` creation. Previously, `FileService` hardcoded `this._cacheEnabled = true` in its constructor, and `Database` did not call the existing `setCacheEnabled()` method to apply the user's preference.
- **`JDbLogger` JSDoc:** Class comment corrected from `GASDBLogger` to `JDbLogger`.
- **`DatabaseConfig.fromJSON()` error construction:** Changed `new InvalidArgumentError(...)` → `new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(...)` for consistency with the rest of the class.
- **`DatabaseConfig` constructor null-guard removed:** Passing `null` as config now fails fast instead of silently treating `null` as `{}`.

### Tests added

- 7 regression tests in `tests/unit/database/database-initialisation.test.js` under a new `Config propagation` describe block:
  - 4 tests verifying `logLevel` propagation (`ERROR`, `WARN`, `INFO`, `DEBUG`)
  - 3 tests verifying `cacheEnabled` propagation (`true`, `false`, default)

### Upgrade notes

- If you were calling any of the removed `JDbLogger` methods, switch to the alternatives listed above.
- If you were calling `DatabaseConfig.clone()`, use `new DatabaseConfig({ ...config.toJSON(), ...overrides })` instead.
- If you were reading `config.lockTimeout` from a `DatabaseConfig` instance, use `config.collectionLockLeaseMs` instead.
- The legacy `lockTimeout` key in the constructor input object is still accepted as a backward-compatible alias.
- No configuration changes required; existing configs now work as originally intended.
