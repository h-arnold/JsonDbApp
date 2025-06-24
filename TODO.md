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
- [x] Promoted tests to green phase (6/11 passing, 54.5% pass rate).
- [ ] Fix remaining test failures and achieve 100% pass rate.

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

### CURRENT STATUS (9.1% pass rate - 1/11 tests passing)

- Constructor validation (1/1)
- Acquire operation lock (0/2)
- Token validation - no conflict case (0/2)
- Conflict resolution (0/2)
- Coordination (0/1)
- Update master index (0/1)
- Lock release/timeout (0/2)

**FAILING TESTS - SUMMARY:**

- All failing tests report: `Invalid argument: masterIndex - must be an object`.
- Root cause: Test suites instantiate `Collection` with an empty object `{}` for the `database` parameter, so `this._database._masterIndex` is undefined. This causes the `CollectionCoordinator` constructor to throw during validation.
- Action needed: Update test setup to provide a valid `MasterIndex` instance on the `database` mock, or refactor `Collection` to allow injection/mocking for tests.

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
