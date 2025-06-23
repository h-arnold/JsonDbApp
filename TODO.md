# TODO

## Section 8: Cross-Instance Coordination

- [x] Create `src/02_components/CollectionCoordinator.js` with constructor (Collection, MasterIndex, config, logger).
- [x] Implement logger usage with `GASDBLogger.createComponentLogger('CollectionCoordinator')`.
- [x] Implement `acquireOperationLock` (with exponential backoff, error logging, and correct error type for lock failure).
- [x] Implement `releaseOperationLock` (with error logging, always called in finally).
- [x] Implement `hasConflict` and `resolveConflict` (with reload and last-write-wins strategies).
- [ ] Implement `coordinate(operationName, callback)` with full orchestration (currently partial, needs to handle all error and timeout scenarios, and call validateModificationToken).
- [ ] Implement `validateModificationToken` (stubbed, not yet implemented; required for token validation and conflict error throwing).
- [ ] Implement `updateMasterIndexMetadata` (stubbed, not yet implemented; required for metadata update test).
- [x] Implement correct error types: `LockAcquisitionFailureError`, `ModificationConflictError`, `CoordinationTimeoutError` (currently missing or not referenced correctly).
- [ ] Ensure lock release on exception and coordination timeout handling are robust and tested.
- [ ] Refactor as needed for test coverage and green phase.

### To move to GREEN PHASE:
- Complete `coordinate`, `validateModificationToken`, and `updateMasterIndexMetadata` implementations.
- Define and use all required error types in `ErrorHandler`.
- Ensure all orchestration, error, and edge cases are handled as per test suite expectations.
- Re-run tests and refactor for full pass rate.

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
