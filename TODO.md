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
- [ ] Fix final test failure in conflict resolution workflow and achieve 100% pass rate.

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

### CURRENT STATUS (93.3% pass rate - 14/15 tests passing) ✅ OUTSTANDING PROGRESS

- Constructor validation (3/3) ✅
- Coordinate operations (2/3) ✅ **MAJOR IMPROVEMENT** - happy path now works, only conflict resolution failing
- Acquire operation lock (2/2) ✅ **FIXED**
- Token validation (2/2) ✅
- Conflict resolution (2/2) ✅
- Update master index (1/1) ✅ **FIXED**
- Lock release/timeout (2/2) ✅

**REMAINING FAILING TESTS (Only 1 left!):**

- `testCoordinateWithConflictResolution`: conflict resolution workflow still failing

**Analysis:**

- ✅ **Fixed startOperation logger call**: Changed from `this._logger.startOperation()` to `this._logger.debug()`
- ✅ **Fixed error type references**: All ErrorHandler.ErrorTypes now use correct UPPER_SNAKE_CASE constants
- ✅ **Happy path coordination working**: `testCoordinateHappyPath` now passes successfully
- ✅ **Lock acquisition working**: Both lock acquisition tests pass
- ✅ **Master index updates working**: updateMasterIndexMetadata test passes
- ⚠️ **DbLockService warning**: "Attempted to release a lock that was not held" - persistent timing issue
- 🔍 **Remaining issue**: Conflict resolution workflow in `coordinate()` method

**Root cause analysis:**

- Lock is being acquired successfully (logs show "Collection lock acquired")
- Conflict detection is working (logs show "Modification conflict detected")
- Issue appears to be in the conflict resolution workflow specifically
- The `ModificationConflictError` is being thrown as expected, but test expects resolution to succeed

**Recent fixes:**

- Fixed `this._logger.startOperation()` → `this._logger.debug()` (component logger doesn't have startOperation)
- Fixed `ErrorHandler.ErrorTypes.ModificationConflictError` → `ErrorHandler.ErrorTypes.MODIFICATION_CONFLICT`
- Fixed `ErrorHandler.ErrorTypes.MasterIndexError` → `ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR`

**Next investigation needed:**

- Review the conflict resolution logic in `coordinate()` method
- Check if `resolveConflict()` is being called properly after conflict detection
- Verify that the test expects automatic conflict resolution rather than error throwing
- Analyze the specific test case `testCoordinateWithConflictResolution` expectations

**Next steps:**

- Remove direct MasterIndex calls from `Collection._updateMetadata`.
- Update test mocks to provide a valid `masterIndex` for `CollectionCoordinator`.
- Re-run tests after fixing test setup.

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

- [ ] Refactor `resolveConflict` in `CollectionCoordinator` to support retry-after-resolution and integrate with MasterIndex's `LAST_WRITE_WINS` strategy.
- [ ] Update `MasterIndex.resolveConflict` to ensure correct application of the 'LAST_WRITE_WINS' strategy and synchronise with coordinator logic.
- [ ] Ensure all conflict resolution strategies are consistently handled across both `CollectionCoordinator` and `MasterIndex`.
