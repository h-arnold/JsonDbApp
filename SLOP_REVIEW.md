# Slop Review: JDbLogger & DatabaseConfig

**Date**: 2026-06-04  
**Scope**: `src/01_utils/JDbLogger.js`, `src/04_core/DatabaseConfig.js`, and associated tests  
**Result**: **Needs Improvement** — confirmed dead code and unnecessary complexity in both components. No blocking issues, but several clear removal opportunities.

---

## Critical

### 1. Dead code: `JDbLogger.log()` method (lines 123–139)

- **Evidence**: `JDbLogger.log()` is never called from any source file outside `JDbLogger.js`. It duplicates the level-dispatch logic already present in `error`, `warn`, `info`, and `debug`.
- **Why it matters**: 17 lines of dead dispatch code. The `switch` inside `log()` mirrors the dedicated methods' behaviour exactly.
- **Recommendation**: Remove `JDbLogger.log()` entirely.

### 2. Dead code: `JDbLogger.timeOperation()` and its helpers (lines 207–231)

- **Evidence**: `JDbLogger.timeOperation()` is never called from any source file. `startOperation()` and `endOperation()` are only called internally by `timeOperation()`, making them transitively dead.
- **Why it matters**: 25 lines of unused operation-timing machinery (three methods). Adds noise to the public API.
- **Recommendation**: Remove `timeOperation()`, `startOperation()`, and `endOperation()`.

### 3. Dead code: `JDbLogger.getLevelName()` (lines 39–50)

- **Evidence**: Never called from any source file. Only `setLevelByName` (incoming) and the level-guard checks are used externally.
- **Why it matters**: 12 lines of dead introspection. No consumer reads the current level by name.
- **Recommendation**: Remove `getLevelName()`.

### 4. Dead code: `JDbLogger.setLevel(level)` and `JDbLogger.getLevel()` (lines 14–17, 33–37)

- **Evidence**: Never called from any source file. Consumers use `setLevelByName` (called from `Database.js` line 37). No source file reads the numeric level via `getLevel()`.
- **Why it matters**: The numeric-level API (`setLevel`/`getLevel`) exists alongside the name-based API (`setLevelByName`/`getLevelName`) for no reason. Only the name-based write path is used.
- **Recommendation**: Remove `setLevel()` and `getLevel()`. Keep `setLevelByName()`. Make `currentLevel` directly settable via `setLevelByName` only.

### 5. Dead code: `DatabaseConfig.clone()` (lines 313–340)

- **Evidence**: `clone()` is never called from any source file. Only exercised in tests (`DatabaseConfig.test.js` line 171).
- **Why it matters**: 28 lines of clone logic (constructor call with every property spread) that has zero production callers.
- **Recommendation**: Remove `clone()`. If needed later, it can be reinstated with real motivation.

### 6. Dead code: `DatabaseConfig` unused static default getters

Five static getters are defined but have zero external callers:

| Method | Line | Used By |
|---|---|---|
| `getDefaultLockTimeout()` | 429 | **Nothing** |
| `getDefaultCoordinationTimeoutMs()` | 445 | **Nothing** |
| `getDefaultRetryAttempts()` | 453 | **Nothing** |
| `getDefaultRetryDelayMs()` | 461 | **Nothing** |
| `getDefaultLockRetryBackoffBase()` | 469 | **Nothing** |

- **Evidence**: Grep across all `src/**/*.js` — each method appears only at its definition site. The *used* getters (`getDefaultFileRetryAttempts`, `getDefaultFileRetryDelayMs`, `getDefaultFileRetryBackoffBase`, `getDefaultQueryEngineMaxNestedDepth`, `getDefaultQueryEngineSupportedOperators`, `getDefaultQueryEngineLogicalOperators`, `getDefaultCollectionLockLeaseMs`, `getDefaultMasterIndexKey`) all have external callers.
- **Why it matters**: ~60 lines of dead boilerplate. Each getter wraps a module-level constant that is already accessible to callers within the same module. The pattern creates an illusion of a complete API surface that doesn't exist.
- **Recommendation**: Remove all five unused static getters.

---

## Improvement

### 7. Redundant `lockTimeout` alias property on `DatabaseConfig`

- **Evidence**: `this.lockTimeout` is always set to `this.collectionLockLeaseMs` (lines 81, 204). It exists solely as a legacy alias. Consumers outside `DatabaseConfig` use `config.lockTimeout` directly from the input config object — not from the `DatabaseConfig` instance property — in `MasterIndex` (lines 25, 278, 282, 293, 380).
- **Why it matters**: A duplicated property that must be kept in sync, serialised (`toJSON`/`fromJSON`), and validated (line 204). It adds friction without value.
- **Recommendation**: Remove `this.lockTimeout`. Update `MasterIndex` consumers to read `collectionLockLeaseMs` instead. This is a moderate cleanup with ripple effects, so it belongs in Improvement rather than Critical.

### 8. Over-engineered operator-array tracking in `_initialiseQueryEngineConfig`

- **Evidence**: `_initialiseQueryEngineConfig` (lines 132–145) maintains four private tracking properties (`_queryEngineSupportedOperatorsProvided`, `_queryEngineLogicalOperatorsProvided`, `_queryEngineSupportedOperatorsRaw`, `_queryEngineLogicalOperatorsRaw`) solely to produce a better error message in `_validateOperatorArray` when a non-array value is passed.
- **Why it matters**: Thirteen lines of initialisation logic to distinguish "user passed a non-array" from "user passed nothing" in one validation path. The error message difference is marginal.
- **Recommendation**: Collapse the tracking. In `_validateOperatorArray`, if `wasProvided` is needed, pass it from a simpler inline check rather than storing four extra instance properties.

### 9. Sparse test coverage for `JDbLogger`

- **Evidence**: `tests/unit/utils/JDbLogger.test.js` has only 3 test cases covering method existence, basic level setting, and component logger creation. Missing coverage: `formatMessage` output format, `setLevelByName` edge cases (invalid names), component logger message prefixing, log level filtering behaviour.
- **Why it matters**: Several dead methods (items 1–4) exist alongside under-tested live methods. Trimming dead code would partially resolve the coverage gap, but the remaining methods deserve proper tests.
- **Recommendation**: After removing dead methods, add tests for `formatMessage` output, `setLevelByName` invalid input, and component logger prefix behaviour.

### 10. `DatabaseConfig.fromJSON()` throws bare `InvalidArgumentError` instead of using `ErrorHandler.ErrorTypes`

- **Evidence**: Line 409: `throw new InvalidArgumentError(...)` instead of `throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(...)`. The rest of the class uses `ErrorHandler.ErrorTypes.INVALID_ARGUMENT` consistently (lines 87, 270, 276).
- **Why it matters**: Inconsistent error construction. If `InvalidArgumentError` is not in scope at load time in GAS, this throws a `ReferenceError` instead of the intended error. The test file was not consulted for this — it uses `ErrorHandler.ErrorTypes.INVALID_ARGUMENT` for assertion (`expect(error).toBeInstanceOf(ErrorHandler.ErrorTypes.INVALID_ARGUMENT)`).
- **Recommendation**: Change line 409 to `throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(...)`.

---

## Nitpick

### 11. Defensive null-guard on constructor config

- **Evidence**: Line 77: `const resolvedConfig = config || {};`. The parameter already defaults to `{}` in the signature. If `null` were explicitly passed, the error would surface later in validation — failing fast would be better than silently treating `null` as `{}`.
- **Recommendation**: Remove the `|| {}` fallback and let `null` config fail naturally during `_initialiseGeneralDefaults`.

### 12. `JDbLogger` class name vs file name mismatch comment

- **Evidence**: The file is `JDbLogger.js` but the JSDoc comment on line 1 says `GASDBLogger`. The class itself is named `JDbLogger` (line 8). This is a leftover from a rename.
- **Recommendation**: Update the JSDoc comment on line 1 to say `JDbLogger`.

### 13. Test helper `expectInvalidOperatorConfig` uses `toBe` for primitive comparison

- **Evidence**: Line 47: `expect(error.context.providedValue).toBe(expectedValue)`. For object/array values (if ever passed), `toBe` would fail unexpectedly. Currently only primitives are tested, so it's safe but fragile.
- **Recommendation**: Consider `toEqual` for robustness, or add a comment noting the primitive-only assumption.

---

## Summary

| Category | Count | Lines affected |
|---|---|---|
| Critical (dead code) | 6 | ~155 |
| Improvement | 4 | ~20 |
| Nitpick | 3 | ~5 |

The slop profile is moderate. Both files carry dead methods that likely originated from a "generate a complete API surface" pattern rather than "build what's needed." The `DatabaseConfig` static getter explosion is the clearest example: 14 getters were created, only 9 are used. The `JDbLogger` operation-timing API (`timeOperation`/`startOperation`/`endOperation`) was built but never integrated.

No canonical policy deviations were found. The `fromJSON` error inconsistency (item 10) is a genuine bug, not just style.

---

## Validation

Not run — the review identifies dead code and unused exports, which are compile-time/lint-scope findings. Lint and test runs should be performed after any removals to confirm no regressions.

## Files Read

- `/workspace/src/01_utils/JDbLogger.js` (full)
- `/workspace/src/04_core/DatabaseConfig.js` (full)
- `/workspace/src/01_utils/ErrorHandler.js` (lines 1–675, key excerpts)
- `/workspace/src/01_utils/ObjectUtils.js` (lines 1–250)
- `/workspace/src/03_services/DbLockService.js` (lines 1–70)
- `/workspace/tests/unit/utils/JDbLogger.test.js` (full)
- `/workspace/tests/unit/DatabaseConfig/DatabaseConfig.test.js` (full)
- `/workspace/AGENTS.md` (full)
- `/workspace/.github/copilot-instructions.md` (full)
