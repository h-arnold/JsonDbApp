# LockService Extraction Implementation Plan (Revised)

## Overview

Extract **all locking functionality** from `MasterIndex` into a comprehensive `LockService` class to improve testabil**Current Status**: Perfect TDD Red Phase ✅ COMPLETED

- **Total Tests**: 28 (22 existing + 6 moved from MasterIndex) ✅ CONFIRMED
- **Passing**: 4 (backwards compatibility) ✅ CONFIRMED  
- **Failing**: 24 (awaiting comprehensive LockService implementation) ✅ CONFIRMED
- **Pass Rate**: 14.3% (expected for red phase) ✅ CONFIRMED

**Target After Green Phase**: 100% pass rate (28/28 tests)aration of concerns, and prevent collection overwrites during concurrent operations.

## Scope Expansion

This refactor extracts **both** locking systems:

1. **Script Locking**: Low-level Google Apps Script LockService operations
2. **Collection Locking**: Application-level per-collection locks with timeout management

This ensures collections cannot be overwritten while operations are in progress.

## 🎯 Progress Status

### ✅ COMPLETED: TDD Red Phase (28 Tests)

- Comprehensive test suite created following TDD methodology
- All tests correctly fail for implementation reasons
- Perfect backwards compatibility verification
- Environment isolation and cleanup implemented
- Real environment integration tests included
- **Test migration completed**: 6 tests successfully moved from MasterIndex to LockService
- **Test execution verified**: All 28 tests properly executing in correct order

### 🟡 IN PROGRESS: TDD Green Phase

- Ready to implement minimal `LockService` class
- Target: Make all 22 tests pass with minimal code

### ⏳ PENDING: TDD Refactor Phase

- Code optimization and cleanup after green phase

## Implementation Steps

### 1. ✅ COMPLETED: Define `LockService` class with comprehensive locking (via TDD)

- **Location**: `src/03_services/LockService.js`
- **Test Coverage**: Expand existing test suite for both locking systems
- **Test Migration**: ✅ COMPLETED - All 6 tests moved from MasterIndex to LockService
- **Comprehensive Responsibilities**:
  • **Script Locking**: Wrap `LockService.getScriptLock()` operations
  • **Collection Locking**: Manage per-collection locks with timeouts
  • **Lock Storage**: Maintain collection lock registry
  • **Cleanup Operations**: Handle expired lock cleanup
  • **Ownership Validation**: Verify operation ID for lock release

- **Enhanced API methods**:
  • **Script Locking**:
  - `acquireScriptLock(timeout: number): GoogleAppsScript.Lock.Lock`
  - `releaseScriptLock(lock: GoogleAppsScript.Lock.Lock): void`
  • **Collection Locking**:
  - `acquireCollectionLock(collectionName: string, operationId: string, timeout?: number): boolean`
  - `releaseCollectionLock(collectionName: string, operationId: string): boolean`
  - `isCollectionLocked(collectionName: string): boolean`
  - `cleanupExpiredCollectionLocks(): boolean`
  - `removeCollectionLock(collectionName: string): void`

- Comprehensive input validation and error handling

### 2. ✅ COMPLETED: Write unit tests for existing lock functionality (TDD)

- **Test structure** `tests/unit/LockService/`:
  • `00_LockServiceConstructorTestSuite.js` - Constructor validation (2 tests)
  • `01_LockServiceOperationTestSuite.js` - Script lock operations (6 tests)
  • `02_LockServiceCollectionOperationTestSuite.js` - Collection lock operations moved from MasterIndex (5 tests)
  • `03_MasterIndexIntegrationTestSuite.js` - Dependency injection + integration (7 tests)
  • `04_BackwardsCompatibilityTestSuite.js` - API compatibility (4 tests)
  • `05_RealEnvironmentIntegrationTestSuite.js` - Real GAS environment tests (4 tests)
  • `06_LockServiceOrchestrator.js` - Test coordination and environment management

- **✅ Test Migration Completed**:
  • 5 collection lock tests moved from `createVirtualLockingTestSuite()`
  • 1 integration test moved from `createMasterIndexIntegrationTestSuite()`
  • All tests properly executing in LockService test suite
  • MasterIndex tests cleaned up and updated

- **Test Results Verified**: 28 total tests, 4 passing (backwards compatibility), 24 failing (awaiting implementation)

### 3. 🟡 IN PROGRESS: Refactor `MasterIndex` constructor for comprehensive dependency injection

- Add optional parameter: `constructor(config = {}, lockService = null)`
- Default to `new LockService(config)` if not provided
- Store as `this._lockService`
- Pass lock timeout and storage configuration to LockService

### 4. 🟡 IN PROGRESS: Replace all lock operations in MasterIndex

**Script Lock Replacements**:

- Replace `LockService.getScriptLock()` calls with `this._lockService.acquireScriptLock()`
- Replace direct `lock.releaseLock()` with `this._lockService.releaseScriptLock(lock)`
- Update `_withScriptLock` method to use LockService

**Collection Lock Replacements**:

- Replace `acquireLock()` method to delegate to `this._lockService.acquireCollectionLock()`
- Replace `releaseLock()` method to delegate to `this._lockService.releaseCollectionLock()`
- Replace `isLocked()` method to delegate to `this._lockService.isCollectionLocked()`
- Replace `cleanupExpiredLocks()` to delegate to `this._lockService.cleanupExpiredCollectionLocks()`
- Remove `_internalCleanupExpiredLocks()` and `_removeLock()` methods
- Remove collection lock storage from `this._data.locks`

### 5. ⏳ PENDING: Comprehensive MasterIndex refactoring

**Data Structure Changes**:

- Remove `locks: {}` from `this._data` structure
- Remove lock synchronisation logic from `getCollection()`
- Remove collection lock handling from collection metadata updates

**Method Removals**:

- Remove all collection lock methods: `acquireLock()`, `releaseLock()`, `isLocked()`, `cleanupExpiredLocks()`
- Remove private helpers: `_internalCleanupExpiredLocks()`, `_removeLock()`
- Remove script lock methods: `_acquireScriptLock()`, `_withScriptLock()`

**Method Updates**:

- Update all public methods to use `this._lockService.executeWithScriptLock()` wrapper
- Remove lock cleanup calls from `removeCollection()`
- Simplify `addCollection()` and `updateCollectionMetadata()` logic

### 6. ✅ COMPLETED: Update existing MasterIndex tests comprehensively

- **✅ Removed moved collection lock tests** from MasterIndexTest.js (6 tests moved to LockService)
- **✅ Updated test runners** to remove virtual locking test suite registration  
- **✅ Updated test execution** to exclude moved tests
- **✅ MasterIndex test count** reduced from 24 to 18 tests (focused on core functionality)
- **⏳ PENDING**: Update remaining tests to use injected LockService for any lock operations
- **⏳ PENDING**: Inject mock `LockService` with both script and collection lock capabilities
- **⏳ PENDING**: Verify both script and collection lock methods called with correct parameters
- **⏳ PENDING**: Update tests to reflect simplified MasterIndex without direct lock storage
- **⏳ PENDING**: Add tests for LockService dependency injection
- **⏳ PENDING**: Ensure all existing functionality works through LockService delegation

### 7. ⏳ PENDING: Comprehensive documentation updates

- Update `docs/developers/MasterIndex.md` to reflect LockService delegation
- Add comprehensive `docs/developers/LockService.md` documenting both locking systems
- Update `docs/developers/Infrastructure_Components.md` with LockService details
- Document collection locking protocols and collection protection mechanisms

### 8. ⏳ PENDING: Validation and cleanup

- Run existing test suite to ensure no regressions
- All MasterIndex functionality must work identically
- Push changes with `clasp push`

## Success Criteria

### ✅ COMPLETED Criteria

- **TDD Red Phase**: Comprehensive test suite with 28 tests (4 passing, 24 failing for correct reasons)
- **Test Migration**: All 6 tests successfully moved from MasterIndex to LockService
- **Test Execution**: All 28 tests properly executing in correct order
- **Backwards Compatibility**: All existing MasterIndex functionality verified as unchanged
- **Test Environment**: Proper isolation and cleanup implemented
- **Error Scenarios**: All edge cases and error conditions covered in tests
- **Real Environment Integration**: Live GAS service testing with proper setup/teardown

### 🎯 REMAINING Criteria

- Both Google Apps Script and collection locking operations extracted
- Collection locking prevents collection overwrites during concurrent operations
- All coordination logic elegantly separated into LockService
- All existing tests pass unchanged (target: 28/28 tests passing)
- Comprehensive collection locking prevents collection overwrites during operations
- Both script and collection locking extracted from MasterIndex
- No functional changes to MasterIndex behaviour despite architectural improvements

## 📊 Test Results Summary

**Current Status**: Perfect TDD Red Phase ✅ COMPLETED

- **Total Tests**: 28 ✅ CONFIRMED
- **Passing**: 4 (backwards compatibility) ✅ CONFIRMED  
- **Failing**: 24 (awaiting comprehensive LockService implementation) ✅ CONFIRMED
- **Pass Rate**: 14.3% (expected for red phase) ✅ CONFIRMED

**Target After Green Phase**: 100% pass rate (28/28 tests)

## 📋 Test Migration Plan

### ✅ COMPLETED: Tests Successfully Moved FROM MasterIndex TO LockService

**From `createVirtualLockingTestSuite()` (5 tests):**

1. `should acquire lock for collection successfully`
2. `should prevent multiple locks on same collection`
3. `should release lock correctly`
4. `should handle lock timeout correctly`
5. `should persist locks to ScriptProperties`

**From `createMasterIndexIntegrationTestSuite()` (1 test):**

1. `should coordinate CollectionMetadata with locking mechanism`

### ✅ COMPLETED: Tests Remaining in MasterIndex (Updated)

**From `createMasterIndexFunctionalityTestSuite()` (11 tests):**

- All collection CRUD tests (add, get, update, remove)
- Collection metadata management tests  
- Persistence tests for collection data

**From `createConflictDetectionTestSuite()` (5 tests):**

- All modification token and conflict resolution tests

**From `createMasterIndexIntegrationTestSuite()` (2 remaining tests):**

- `should maintain CollectionMetadata integrity during conflict resolution`
- `should handle CollectionMetadata in complete operation lifecycle with persistence`

### ⏳ PENDING: Tests Requiring Updates in MasterIndex

**Integration tests will be updated to:**

- Mock LockService dependency injection
- Verify delegation to LockService methods
- Test coordination through LockService rather than direct lock calls

**✅ COMPLETED Test Redistribution:**

- **LockService**: 28 tests (22 original + 6 moved from MasterIndex)
- **MasterIndex**: 18 tests (original 24 - 6 moved)
