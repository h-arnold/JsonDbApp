## JsonDbApp v0.1.3 — Breaking cleanup release

Release date: 2026-06-04

### Summary

This release removes dead code from `JDbLogger` and `DatabaseConfig` — methods and properties that were defined but never called from any production source file. A few minor bug fixes are included.

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

- **`JDbLogger` JSDoc:** Class comment corrected from `GASDBLogger` to `JDbLogger`.
- **`DatabaseConfig.fromJSON()` error construction:** Changed `new InvalidArgumentError(...)` → `new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(...)` for consistency with the rest of the class.
- **`DatabaseConfig` constructor null-guard removed:** Passing `null` as config now fails fast instead of silently treating `null` as `{}`.

### Upgrade notes

- If you were calling any of the removed `JDbLogger` methods, switch to the alternatives listed above.
- If you were calling `DatabaseConfig.clone()`, use `new DatabaseConfig({ ...config.toJSON(), ...overrides })` instead.
- If you were reading `config.lockTimeout`, use `config.collectionLockLeaseMs` instead.
- The legacy `lockTimeout` key in the constructor input object is still accepted as a backward-compatible alias.
