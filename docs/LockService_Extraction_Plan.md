# LockService Extraction Implementation Plan

## Overview
Extract only the Google Apps Script LockService operations from `MasterIndex` into a separate `LockService` wrapper to improve testability and separation of concerns. All coordination logic remains in `MasterIndex`.

## Scope Limitation
This refactor only extracts the low-level GAS lock operations. All virtual locking, coordination protocol, modification tokens, and conflict resolution remain in `MasterIndex` for Section 8 implementation.

## Implementation Steps

### 1. Define `LockService` interface and class
- **Location**: `src/03_services/LockService.js`
- **Responsibilities**:
  • Acquire/release Google Apps Script locks via `LockService.getScriptLock()`
  • Retry/timeout logic
  • Wrap low-level lock operations (`acquire`, `release`, `tryLock`)
- **Public API methods**:
  • `acquireLock(key: string, timeout: number): LockInstance`
  • `releaseLock(lock: LockInstance): void`
- Write JSDoc and validate inputs with `ErrorHandler`

### 2. Write unit tests for `LockService` (TDD)
- Create `tests/unit/services/LockServiceTest.js`
- Mock Apps Script `LockService` via `createMockLockService`
- Tests for:
  • Successful lock acquisition and release
  • Lock timeout error
  • Invalid arguments

### 3. Refactor `MasterIndex` constructor to accept `lockService`
- Change signature: `constructor(config = {}, lockService = new LockService())`
- Store `this._lockService` instead of calling `LockService.getScriptLock()` directly

### 4. Move Private Helper Methods
- Extract `_acquireScriptLock` and `_withScriptLock` logic into `LockService`
- In `MasterIndex`, replace calls to `_acquireScriptLock`/`_withScriptLock` with calls to `this._lockService.acquireLock` and wrapping operations manually:
  ```javascript
  const lock = this._lockService.acquireLock(this._config.masterIndexKey, timeout);
  try {
    // operation
  } finally {
    this._lockService.releaseLock(lock);
  }
  ```

### 5. Update `MasterIndex` methods
- Remove private methods `_acquireScriptLock` and `_withScriptLock`
- Refactor all methods using script lock (`addCollection`, `updateCollectionMetadata`, etc.) to use the injected `lockService`
- Ensure `save()` remains in `MasterIndex`

### 6. Update and add tests for `MasterIndex`
- Modify `tests/unit/MasterIndexTest.js` to inject a mock `LockService`
- Verify that lockService methods are called appropriately
- Add tests for failure paths (e.g. lock timeout)

### 7. Update documentation
- Add a section in `docs/developers/MasterIndex.md` describing dependency injection of `LockService`
- Document `LockService` in `docs/developers/Infrastructure_Components.md`

### 8. Refactor cleanup and CI integration
- Run `test-runner.sh` to ensure all tests pass
- Refactor any duplicated code, ensure SOLID compliance
- Push changes with `clasp push` once tests green

## Success Criteria
- Clean separation of lock management from `MasterIndex`
- All existing functionality preserved
- Improved testability through dependency injection
- SOLID principles compliance
- All tests passing
