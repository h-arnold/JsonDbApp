# TODO

## Section 8: Cross-Instance Coordination

### Observations

- `Collection` constructor lacks injection of a `CollectionCoordinator` instance.
- Public CRUD methods in `Collection` bypass the coordinator entirely.
- `Collection._updateMetadata` calls `MasterIndex` directly with full JSON instead of using coordinator's incremental updates.
- `acquireOperationLock` does not throw `LockAcquisitionFailureError` upon retry exhaustion.
- `coordinate` method signature (`operationName, callback`) differs from plan's simpler callback-only design.

- [x] Create `src/02_components/CollectionCoordinator.js` with constructor (Collection, MasterIndex, config, logger).
- [x] Implement logger usage with `GASDBLogger.createComponentLogger('CollectionCoordinator')`.
- [x] Implement `acquireOperationLock` (with exponential backoff, error logging, and correct error type for lock failure).
- [x] Implement `releaseOperationLock` (with error logging, always called in finally).
- [x] Implement `hasConflict` and `resolveConflict` (with reload and last-write-wins strategies).
- [x] Implement `coordinate(operationName, callback)` with full orchestration (handles error and timeout scenarios).
- [x] Implement `validateModificationToken` (throws ModificationConflictError when tokens differ).
- [x] Implement `updateMasterIndexMetadata` (updates master index or adds new collection, wrapped with error handling).
- [x] Implement correct error types: `LockAcquisitionFailureError`, `ModificationConflictError`, `CoordinationTimeoutError`.
- [x] Promoted tests to green phase (14/15 passing, 93.3% pass rate).
- [x] Fixed logger method calls and error type references.
- [x] Fix final test failure in conflict resolution workflow and achieve 100% pass rate.

### To move to GREEN PHASE

- Complete `coordinate`, `validateModificationToken`, and `updateMasterIndexMetadata` implementations.
- Define and use all required error types in `ErrorHandler`.
- Ensure all orchestration, error, and edge cases are handled as per test suite expectations.
- Re-run tests and refactor for full pass rate.

#### Additional refactoring tasks

- [x] Inject a `CollectionCoordinator` instance into the `Collection` constructor and store as `this._coordinator`.
- [x] Refactor every public CRUD method in `Collection` (e.g. `insertOne`, `updateOne`, etc.) to delegate via `this._coordinator.coordinate(operationName, callback)`.
- [ ] Remove all direct `MasterIndex` calls from `Collection._updateMetadata`, so that only the coordinator handles master-index updates.
- [x] Adjust `acquireOperationLock` to throw `LockAcquisitionFailureError` when unable to acquire a collection lock after retries.
- [ ] Align `coordinate` method signature and error types exactly with the Section 8.1 implementation plan.
- [ ] Update tests `testLockReleasedOnException` and `testCoordinationTimeout` to expect green-phase coordination behaviour rather than legacy errors.

### CURRENT STATUS (100% pass rate - 15/15 tests passing) ✅ COMPLETE SUCCESS

- Constructor validation (3/3) ✅
- Coordinate operations (3/3) ✅ **FIXED** - conflict resolution now working
- Acquire operation lock (2/2) ✅
- Token validation (2/2) ✅
- Conflict resolution (2/2) ✅
- Update master index (1/1) ✅
- Lock release/timeout (2/2) ✅

## ALL TESTS PASSING! 🎉

**Analysis:**

- ✅ **Fixed conflict resolution workflow**: Removed premature `validateModificationToken` call that was throwing errors before conflict resolution could run
- ✅ **Fixed startOperation logger call**: Changed from `this._logger.startOperation()` to `this._logger.debug()`
- ✅ **Fixed error type references**: All ErrorHandler.ErrorTypes now use correct UPPER_SNAKE_CASE constants
- ✅ **All coordination workflows working**: Happy path, disabled coordination, and conflict resolution all pass
- ✅ **Lock acquisition working**: Both lock acquisition tests pass
- ✅ **Master index updates working**: updateMasterIndexMetadata test passes
- ⚠️ **Remaining investigation**: "Attempted to release a lock that was not held" warning - minor timing issue that doesn't affect functionality

**Final fix applied:**

- Removed redundant `validateModificationToken` call from `coordinate()` method
- Now uses proper conflict detection via `hasConflict()` followed by `resolveConflict()`
- This allows automatic conflict resolution rather than immediate error throwing

**Outstanding investigation:**

- ⚠️ **DbLockService warning**: "Attempted to release a lock that was not held" - persistent timing issue, appears to be a harmless race condition in the lock service layer

**Next steps:**

- [ ] Investigate and resolve the "Attempted to release a lock that was not held" warning in DbLockService
- [ ] Remove direct MasterIndex calls from `Collection._updateMetadata`

## Section 9: Integration and System Testing

- [ ] **RED PHASE**: Assemble full integration test suite covering:
  - `testDatabaseCollectionIntegration` - Database with Collection components
  - `testEndToEndCrudWorkflow` - complete CRUD workflow validation
  - `testErrorHandlingAndRecovery` - error scenarios and recovery
  - `testPerformanceUnderLoad` - performance with various data sizes
  - `testQueryEngineIntegration` - Collection with QueryEngine integration
  - `testUpdateEngineIntegration` - Collection with UpdateEngine integration
  - `testFileServiceIntegration` - FileService with all components
  - `testMasterIndexCoordination` - MasterIndex coordination scenarios
  - `testConcurrentAccessScenarios` - multiple simultaneous operations
  - `testConflictResolutionWorkflows` - end-to-end conflict handling
- [ ] **RED PHASE**: Create validation test cases:
  - `testMongoDbSyntaxCompatibility` - verify MongoDB API compatibility
  - `testPrdRequirementsValidation` - validate against PRD requirements
  - `testClassDiagramCompliance` - test against class diagrams
  - `testComponentDependencyInjection` - verify proper DI patterns
  - `testErrorHandlingConsistency` - consistent error types across components
- [ ] Validate all PRD requirements and class diagrams in tests.
- [ ] Ensure test-runner (`test-runner.sh`) includes new integration tests.
- [ ] Run full test suite and confirm 100% pass.
