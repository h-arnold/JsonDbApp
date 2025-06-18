# LockService Extraction Implementation Plan (Revised)

## Overview

Extract only the Google Apps Script LockService operations from `MasterIndex` into a separate `LockService` wrapper to improve testability and separation of concerns. All coordination logic remains in `MasterIndex`.

## Scope Limitation

This refactor only extracts the low-level GAS lock operations. All virtual locking, coordination protocol, modification tokens, and conflict resolution remain in `MasterIndex` for Section 8 implementation.

## 🎯 Progress Status

### ✅ COMPLETED: TDD Red Phase (22 Tests)

- Comprehensive test suite created following TDD methodology
- All tests correctly fail for implementation reasons
- Perfect backwards compatibility verification
- Environment isolation and cleanup implemented
- Real environment integration tests included

### 🟡 IN PROGRESS: TDD Green Phase

- Ready to implement minimal `LockService` class
- Target: Make all 22 tests pass with minimal code

### ⏳ PENDING: TDD Refactor Phase

- Code optimization and cleanup after green phase

## Implementation Steps

### 1. ✅ COMPLETED: Define `LockService` wrapper class (via TDD)

- **Location**: `src/03_services/LockService.js`
- **Test Coverage**: Created comprehensive test suite first (TDD red phase)
- **Limited Responsibilities**:
  • Wrap `LockService.getScriptLock()` operations only
  • Handle `tryLock()` timeout logic
  • Provide `releaseLock()` wrapper
- **Simple API methods**:
  • `acquireScriptLock(timeout: number): GoogleAppsScript.Lock.Lock`
  • `releaseScriptLock(lock: GoogleAppsScript.Lock.Lock): void`
- Basic input validation only

### 2. ✅ COMPLETED: Write comprehensive unit tests for `LockService` (TDD)

- Created `tests/unit/LockService/` test suite structure:
  • `00_LockServiceConstructorTestSuite.js` - Constructor validation (2 tests)
  • `01_LockServiceOperationTestSuite.js` - Lock operations (6 tests)
  • `02_MasterIndexIntegrationTestSuite.js` - Dependency injection (6 tests)
  • `03_BackwardsCompatibilityTestSuite.js` - API compatibility (4 tests)
  • `04_RealEnvironmentIntegrationTestSuite.js` - Real GAS environment tests (4 tests)
  • `05_LockServiceOrchestrator.js` - Test coordination and environment management ✅ VERIFIED
- Mock GAS `LockService.getScriptLock()` for testing
- Comprehensive tests for:
  • Successful lock acquisition and release
  • Lock timeout errors and edge cases
  • Invalid timeout and null instance handling
  • MasterIndex dependency injection
  • Backwards compatibility verification
  • Real environment integration with live GAS services
- **Test Results**: 22 tests total, 3 passing (backwards compatibility), 19 failing (awaiting implementation) ✅ VERIFIED

### 3. 🟡 IN PROGRESS: Refactor `MasterIndex` constructor minimally

- Add optional parameter: `constructor(config = {}, lockService = null)`
- Default to `new LockService()` if not provided
- Store as `this._lockService`

### 4. 🟡 IN PROGRESS: Replace only GAS lock calls in MasterIndex

- Keep `_withScriptLock` method in `MasterIndex`
- Replace `LockService.getScriptLock()` calls with `this._lockService.acquireScriptLock()`
- Replace direct `lock.releaseLock()` with `this._lockService.releaseScriptLock(lock)`
- **Keep all other logic in MasterIndex unchanged**

### 5. ⏳ PENDING: Minimal MasterIndex updates

- Only change the two private methods: `_acquireScriptLock` and part of `_withScriptLock`
- All virtual locking logic stays in `MasterIndex`
- All coordination protocol stays in `MasterIndex`
- All save/load logic stays in `MasterIndex`

### 6. ⏳ PENDING: Update existing MasterIndex tests

- Inject mock `LockService` in existing tests
- Verify `LockService` methods called with correct parameters
- Ensure all existing functionality unchanged

### 7. ⏳ PENDING: Minimal documentation updates

- Brief note in `docs/developers/MasterIndex.md` about LockService injection
- Simple entry in `docs/developers/Infrastructure_Components.md`

### 8. ⏳ PENDING: Validation and cleanup

- Run existing test suite to ensure no regressions
- All MasterIndex functionality must work identically
- Push changes with `clasp push`

## Success Criteria

### ✅ COMPLETED Criteria

- **TDD Red Phase**: Comprehensive test suite with 22 tests (3 passing, 19 failing for correct reasons)
- **Backwards Compatibility**: All existing MasterIndex functionality verified as unchanged
- **Test Environment**: Proper isolation and cleanup implemented
- **Error Scenarios**: All edge cases and error conditions covered in tests
- **Real Environment Integration**: Live GAS service testing with proper setup/teardown

### 🎯 REMAINING Criteria

- Only Google Apps Script lock operations extracted
- All coordination logic remains in `MasterIndex`
- All existing tests pass unchanged (target: 22/22 tests passing)
- Improved testability through dependency injection
- No functional changes to MasterIndex behaviour

## 📊 Test Results Summary

**Current Status**: Perfect TDD Red Phase ✅ VERIFIED

- **Total Tests**: 22 ✅ CONFIRMED
- **Passing**: 3 (backwards compatibility) ✅ CONFIRMED  
- **Failing**: 19 (awaiting LockService implementation) ✅ CONFIRMED
- **Pass Rate**: 13.6% (expected for red phase) ✅ CONFIRMED

**Target After Green Phase**: 100% pass rate (22/22 tests)
