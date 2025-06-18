# LockService Extraction Implementation Plan (Revised)

## Overview

Extract only the Google Apps Script LockService operations from `MasterIndex` into a separate `LockService` wrapper to improve testability and separation of concerns. All coordination logic remains in `MasterIndex`.

## Scope Limitation

This refactor only extracts the low-level GAS lock operations. All virtual locking, coordination protocol, modification tokens, and conflict resolution remain in `MasterIndex` for Section 8 implementation.

## Implementation Steps

### 1. Define `LockService` wrapper class

- **Location**: `src/03_services/LockService.js`
- **Limited Responsibilities**:
  • Wrap `LockService.getScriptLock()` operations only
  • Handle `tryLock()` timeout logic
  • Provide `releaseLock()` wrapper
- **Simple API methods**:
  • `acquireScriptLock(timeout: number): GoogleAppsScript.Lock.Lock`
  • `releaseScriptLock(lock: GoogleAppsScript.Lock.Lock): void`
- Basic input validation only

### 2. Write minimal unit tests for `LockService` (TDD)

- Create `tests/unit/services/LockServiceTest.js`
- Mock GAS `LockService.getScriptLock()` only
- Basic tests for:
  • Successful lock acquisition and release
  • Lock timeout error
  • Invalid timeout values

### 3. Refactor `MasterIndex` constructor minimally

- Add optional parameter: `constructor(config = {}, lockService = null)`
- Default to `new LockService()` if not provided
- Store as `this._lockService`

### 4. Replace only GAS lock calls in MasterIndex

- Keep `_withScriptLock` method in `MasterIndex`
- Replace `LockService.getScriptLock()` calls with `this._lockService.acquireScriptLock()`
- Replace direct `lock.releaseLock()` with `this._lockService.releaseScriptLock(lock)`
- **Keep all other logic in MasterIndex unchanged**

### 5. Minimal MasterIndex updates

- Only change the two private methods: `_acquireScriptLock` and part of `_withScriptLock`
- All virtual locking logic stays in `MasterIndex`
- All coordination protocol stays in `MasterIndex`
- All save/load logic stays in `MasterIndex`

### 6. Update existing MasterIndex tests

- Inject mock `LockService` in existing tests
- Verify `LockService` methods called with correct parameters
- Ensure all existing functionality unchanged

### 7. Minimal documentation updates

- Brief note in `docs/developers/MasterIndex.md` about LockService injection
- Simple entry in `docs/developers/Infrastructure_Components.md`

### 8. Validation and cleanup

- Run existing test suite to ensure no regressions
- All MasterIndex functionality must work identically
- Push changes with `clasp push`

## Success Criteria

- Only Google Apps Script lock operations extracted
- All coordination logic remains in `MasterIndex`
- All existing tests pass unchanged
- Improved testability through dependency injection
- No functional changes to MasterIndex behaviour
