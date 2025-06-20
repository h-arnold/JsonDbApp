# GAS DB Implementation Plan

## 📊 Imp| ***Total Tests Implemented:** 324 tests across 7 sections (301 unit + 23 integration)  
**Tests Passing:** 48/48 Collection tests (100% pass rat7. **✅ Collection API Enhancement** *(Complete MongoDB-style updates - COMPLETE)*
   - ✅ RED phase test cases created for all Collection API Update Tests  
   - ✅ GREEN phase implementation complete
   - ✅ Enhanced `updateOne(idOrFilter, update)` to support update operators
   - ✅ Added `updateMany(filter, update)` for multiple document updates
   - ✅ Added `replaceOne(idOrFilter, doc)` for document replacement
   - ✅ Added `deleteOne(filter)` for document deletion with QueryEngine support
   - ✅ Added `countDocuments(filter)` for document counting with QueryEngine support
   - ✅ Support both document replacement and operator-based updates
   - ✅ **All Methods Complete**: All Collection API methods now implemented
   - ✅ **Test Fixes**: Updated 2 legacy tests to reflect new updateOne operator support
   - 🟢 **Current Pass Rate**: 100% (48/48) - Full MongoDB-compatible Collection API achievedtion 7 Status:** ✅ **COMPLETE - All Collection API methods successfully implemented**

**Overall Status: 7 of 9 core sections completed successfully**

| Section | Status | Progress | Tests | Pass Rate | Notes |
|---------|--------|----------|-------|-----------|--------|
| **Section 1** | ✅ **COMPLETE** | 100% | 16/16 | 100% | Project setup, |
| **Section 2** | ✅ **COMPLETE** | 100% | 16/16 | 100% | ScriptProperties master index, locking |
| **Section 3** | ✅ **COMPLETE** | 100% | 36/36 | 100% | File service, Drive API integration |
| **Section 4** | ✅ **COMPLETE** | 100% | 18/18 | 100% | Database/Collection (refactored) |
| **Section 5** | ✅ **COMPLETE** | 100% | 61/61 | 100% | CollectionMetadata ✅, DocumentOperations ✅, Collection ✅ |
| **Section 6** | ✅ **COMPLETE** | 100% | 95/95 | 100% | QueryEngine ✅, DocumentOperations ✅, Collection ✅, Date serialization fix ✅, Integration Tests ✅ |
| **Section 7** | ✅ **COMPLETE** | 100% | 48/48 | 100% | UpdateEngine ✅, DocumentOperations ✅, Collection API ✅ Complete |
| **Sections 8-9** | ⏳ **PENDING** | 0% | - | - | Awaiting next implementation |

**Total Tests Implemented:** 324 tests across 7 sections (301 unit + 23 integration)  
**Tests Passing:** 48/48 Collection tests (100% pass rate)  
**Section 7 Status:** ✅ **COMPLETE - All Collection API methods successfully implemented**

##  **MILESTONE ACHIEVED: Section 7 - Collection API Update Tests (COMPLETE)**

**What We've Achieved:**

- ✅ **UpdateEngine Complete** - All 13 core test cases passing with MongoDB-compatible update operators
- ✅ **UpdateEngine Field Modification Tests Complete** - Additional 15 test cases passing, covering detailed scenarios
- ✅ **Clean Architecture** - Centralised validation methods with British English conventions
- ✅ **Robust Implementation** - `$set`, `$inc`, `$mul`, `$min`, `$max`, `$unset`, `$push`, `$pull`, `$addToSet` operators
- ✅ **Immutable Operations** - Original documents remain unmodified, returns new instances
- ✅ **DocumentOperations Enhancement Complete** - All 4 missing methods successfully implemented (32/32 tests passing)
- ✅ **QueryEngine Integration Issues Resolved** - All DocumentOperations Query Enhancement tests now pass (100% pass rate)
- ✅ **Collection API Enhancement Complete** - All methods implemented, including updateMany, replaceOne, deleteOne, and countDocuments
- ✅ **All Section 7 Tests Passing** - 48/48 tests now pass (100% pass rate)
- ✅ **Legacy Tests Updated** - All legacy updateOne tests now reflect new operator support

**Current Status:**

- ✅ **GREEN Phase Success** - All Collection API methods implemented and tested
- ✅ **All Tests Passing** - 100% pass rate for Section 7


## Section 6: Query Engine and Document Filtering

Summary of Section 6 achievements:

- QueryEngine provides MongoDB-compatible querying (field-based, comparison operators `$eq`, `$gt`, `$lt`, logical operators `$and`, `$or`, nested field access, and recursion safety).
- DocumentOperations integrates QueryEngine via `findByQuery()`, `findMultipleByQuery()`, and `countByQuery()`.
- Collection API (`find`, `findOne`, `updateOne`, `deleteOne`, `countDocuments`) enhanced to support field-based filters while preserving ID-based and empty-filter behaviours.
- Date serialization architecture refined: ObjectUtils handles deep cloning and Date preservation at I/O boundaries.
- Section 6 functionality fully validated through unit and integration tests.

### Additional Refactoring: MasterIndex and CollectionMetadata Pull Request

Following the completion of Section 6, a refactoring pull request was merged, introducing:

- MasterIndex now stores `CollectionMetadata` instances directly, with batched ScriptLock operations for performance.
- `CollectionMetadata` enhanced with multiple constructor signatures, parameter validation, `toJSON()`/`fromJSON()` support, and integration into ObjectUtils class registry.
- `ObjectUtils` extended with JSON reviver support, automatic class revival via registry, and Date object preservation.
- `FileService` optimised with improved caching, circuit-breaker patterns, and reduced unnecessary reloads.
- Consistency improvements: standardised British English (`initialise`), refined error handling, added minimum lock timeout.
- Breaking changes: deprecated `toObject()` aliases removed; `CollectionMetadata` constructor signatures updated.

## Section 7: Update Engine and Document Modification (Summary)

- All MongoDB-style update operators are fully implemented:
  - Field modifications: $set, $inc, $mul, $min, $max
  - Field removal: $unset
  - Array operations: $push, $pull, $addToSet
- DocumentOperations now provides advanced update methods:
  - updateDocumentWithOperators(id, updateOps)
  - updateDocumentByQuery(query, updateOps)
  - replaceDocument(id, doc) and replaceDocumentByQuery(query, doc)
- The Collection API supports:
  - updateOne(idOrFilter, update)
  - updateMany(filter, update)
  - replaceOne(idOrFilter, doc)
  - deleteOne(filter) and countDocuments(filter)
- Update flow:
  1. Retrieve the document via filter or ID.
  2. Apply update operators via UpdateEngine.
  3. Persist changes using FileService.
  4. Update the master index with MasterIndex.
  5. Log the update with GASDBLogger.
- All Section 7 tests pass, confirming a fully operational MongoDB-compatible update system.

## Section 8: Cross-Instance Coordination

> Note: Locking functionality has been refactored into `DbLockService` with full test coverage. Section 8 now focuses on integrating and orchestrating cross-instance coordination using the existing service.

### Objectives

- Integrate cross-instance coordination using the existing `DbLockService` through `MasterIndex`
- Test concurrent operations across multiple script instances leveraging `DbLockService` locks
- Ensure data consistency and conflict resolution in a multi-instance environment
- Verify Collection operations obtain and release locks correctly via `MasterIndex`

### Requirements Analysis

Based on the PRD and existing codebase, Section 8 focuses on leveraging the already extracted `DbLockService` to:

1. **Virtual Locking Protocol**: Use `DbLockService.acquireCollectionLock`/`releaseCollectionLock` via `MasterIndex`
2. **Conflict Detection**: Utilize modification tokens managed in `CollectionMetadata` and synchronized in `MasterIndex`
3. **Atomic Operations**: Wrap Collection CRUD calls in lock acquisition/release via `MasterIndex` delegation
4. **Retry Mechanisms**: Handle lock timeouts and conflicts using `DbLockService` timeouts and retry patterns
5. **Data Consistency**: Keep `CollectionMetadata` and Master Index in sync under concurrent modifications

### Implementation Steps

#### 1. Reuse `DbLockService` in Collection Coordination

**Current State**: Lock logic is fully implemented in `DbLockService` and delegated by `MasterIndex`
**Required Integration**:
- Ensure `DatabaseConfig` injects a `DbLockService` instance into `MasterIndex`
- Update `Collection._saveData()` to call `MasterIndex.acquireCollectionLock`/`releaseCollectionLock` around persistence

**Key Components**:
- Collection._acquireOperationLock(operationId)
- Collection._releaseOperationLock(operationId)
- Collection._detectConflict(expectedToken)
- Collection._resolveConflict(strategy)
- Collection._saveDataWithCoordination()

#### 2. Modification Protocol Implementation

**Lock Acquisition Pattern**:
```javascript
const operationId = IdGenerator.generateId();
if (!this._database._masterIndex.acquireLock(this._name, operationId)) {
  throw new LockTimeoutError('Collection', this._name);
}
try {
  // Perform operations
  this._validateModificationToken();
  // Apply changes
  this._updateMetadata();
  this._markDirty();
  this._saveData();
  this._updateMasterIndexMetadata();
} finally {
  this._database._masterIndex.releaseLock(this._name, operationId);
}
```

**Conflict Detection Pattern**:
```javascript
const currentToken = this._collectionMetadata.getModificationToken();
const hasConflict = this._database._masterIndex.hasConflict(this._name, currentToken);
if (hasConflict) {
  this._resolveConflict('RELOAD_AND_RETRY');
}
```

#### 3. Enhanced Error Handling

**New Error Types**:
- LockAcquisitionFailureError: When virtual lock cannot be acquired
- ModificationConflictError: When modification token conflicts detected
- ConcurrentAccessError: When multiple operations conflict
- CoordinationTimeoutError: When coordination operations timeout

#### 4. Retry and Recovery Mechanisms

**Retry Logic**:
- Lock acquisition: Exponential backoff with configurable max attempts
- Conflict resolution: Automatic reload and retry for read operations
- Timeout handling: Graceful degradation with user feedback

**Recovery Scenarios**:
- Expired locks: Automatic cleanup and retry
- Stale data: Reload from Drive and retry operation
- Partial failures: Rollback mechanisms where possible

### Test Cases

#### Test Suite 1: Virtual Locking Integration (15 tests)

**1.1 Lock Acquisition Tests (5 tests)**
- testCollectionAcquiresLockBeforeModification()
- testCollectionHandlesLockAcquisitionFailure()
- testCollectionReleasesLockAfterOperation()
- testCollectionReleasesLockOnError()
- testCollectionHandlesLockTimeout()

**1.2 Lock Coordination Tests (5 tests)**
- testMultipleCollectionInstancesLockCoordination()
- testLockExpirationAndCleanup()
- testLockOperationIdValidation()
- testLockStatusReflectedInMetadata()
- testLockPersistenceAcrossInstances()

**1.3 Lock Recovery Tests (5 tests)**
- testExpiredLockAutomaticCleanup()
- testLockRecoveryAfterScriptFailure()
- testConcurrentLockCleanupOperations()
- testLockValidationDuringOperations()
- testLockConsistencyAfterErrors()

#### Test Suite 2: Modification Token Management (12 tests)

**2.1 Token Generation and Validation (4 tests)**
- testModificationTokenGeneratedOnCollectionCreate()
- testModificationTokenUpdatedOnDataChange()
- testModificationTokenValidationBeforeSave()
- testModificationTokenFormatValidation()

**2.2 Conflict Detection (4 tests)**
- testConflictDetectionWithStaleToken()
- testConflictDetectionWithValidToken()
- testConflictDetectionAcrossInstances()
- testConflictDetectionWithExpiredToken()

**2.3 Token Persistence (4 tests)**
- testTokenPersistenceInMasterIndex()
- testTokenPersistenceInCollectionMetadata()
- testTokenSynchronisationBetweenSources()
- testTokenConsistencyAfterReload()

#### Test Suite 3: Concurrent Operation Handling (18 tests)

**3.1 Read Operation Concurrency (6 tests)**
- testConcurrentReadOperationsAllowed()
- testReadDuringWriteOperation()
- testReadOperationWithoutLocking()
- testConcurrentFindOperations()
- testConcurrentCountOperations()
- testConcurrentMetadataAccess()

**3.2 Write Operation Coordination (6 tests)**
- testConcurrentWriteOperationsPrevented()
- testWriteOperationBlocksOtherWrites()
- testInsertOperationRequiresLock()
- testUpdateOperationRequiresLock()
- testDeleteOperationRequiresLock()
- testReplaceOperationRequiresLock()

**3.3 Mixed Operation Scenarios (6 tests)**
- testReadDuringWriteOperationBlocking()
- testWriteAfterReadOperationCompletion()
- testConcurrentInsertOperationsHandling()
- testConcurrentUpdateSameDocument()
- testConcurrentDeleteSameDocument()
- testMixedOperationSequencing()

#### Test Suite 4: Data Consistency and Atomicity (15 tests)

**4.1 Atomic Operation Tests (5 tests)**
- testInsertOperationAtomicity()
- testUpdateOperationAtomicity()
- testDeleteOperationAtomicity()
- testBatchOperationAtomicity()
- testOperationRollbackOnFailure()

**4.2 Metadata Consistency (5 tests)**
- testCollectionMetadataConsistency()
- testMasterIndexMetadataSynchronisation()
- testDocumentCountConsistency()
- testTimestampConsistency()
- testLockStatusConsistency()

**4.3 Cross-Instance Consistency (5 tests)**
- testConsistencyBetweenCollectionInstances()
- testConsistencyAfterInstanceRestart()
- testConsistencyWithConcurrentModifications()
- testConsistencyAfterConflictResolution()
- testConsistencyWithPartialFailures()

#### Test Suite 5: Conflict Resolution (12 tests)

**5.1 Conflict Detection Scenarios (4 tests)**
- testConflictDetectionOnSave()
- testConflictDetectionOnMetadataUpdate()
- testConflictDetectionWithConcurrentWrites()
- testConflictDetectionWithExpiredData()

**5.2 Conflict Resolution Strategies (4 tests)**
- testLastWriteWinsResolution()
- testReloadAndRetryResolution()
- testManualConflictResolution()
- testConflictResolutionWithUserChoice()

**5.3 Recovery After Conflicts (4 tests)**
- testDataIntegrityAfterConflictResolution()
- testMetadataConsistencyAfterResolution()
- testOperationRetryAfterResolution()
- testConflictHistoryTracking()

#### Test Suite 6: Error Handling and Recovery (15 tests)

**6.1 Lock-Related Errors (5 tests)**
- testLockTimeoutErrorHandling()
- testLockAcquisitionFailureHandling()
- testLockReleaseFailureHandling()
- testExpiredLockErrorHandling()
- testInvalidOperationIdErrorHandling()

**6.2 Coordination Errors (5 tests)**
- testMasterIndexUnavailableError()
- testScriptPropertiesTimeoutError()
- testCoordinationProtocolError()
- testConflictResolutionError()
- testModificationTokenValidationError()

**6.3 Recovery Mechanisms (5 tests)**
- testAutomaticRetryMechanism()
- testGracefulDegradationHandling()
- testErrorRecoveryAfterTimeout()
- testDataReloadOnConflict()
- testOperationRollbackCapabilities()

#### Test Suite 7: Performance and Scalability (9 tests)

**7.1 Lock Performance (3 tests)**
- testLockAcquisitionPerformance()
- testLockContentionHandling()
- testLockOperationThroughput()

**7.2 Coordination Overhead (3 tests)**
- testCoordinationOverheadMeasurement()
- testMasterIndexOperationPerformance()
- testScriptPropertiesAccessOptimisation()

**7.3 Scalability Limits (3 tests)**
- testConcurrentInstancesLimit()
- testLockTimeoutScaling()
- testCoordinationPerformanceWithLoad()

### Implementation Requirements

#### Collection Class Enhancements

**New Methods**:
- _acquireOperationLock(operationId): boolean
- _releaseOperationLock(operationId): boolean
- _validateModificationToken(): boolean
- _detectConflict(): boolean
- _resolveConflict(strategy): void
- _saveDataWithCoordination(): void
- _reloadFromDrive(): void
- _updateMasterIndexMetadata(): void

**Modified Methods**:
- insertOne(): Add lock coordination
- find/findOne(): Consider read locks if needed
- updateOne/updateMany(): Add lock coordination
- deleteOne(): Add lock coordination
- replaceOne(): Add lock coordination
- save(): Use coordinated save method
- _saveData(): Add conflict detection

#### Configuration Options

**Database Configuration**:
- coordinationEnabled: boolean (default: true)
- lockTimeoutMs: number (default: 30000)
- retryAttempts: number (default: 3)
- retryDelayMs: number (default: 1000)
- conflictResolutionStrategy: string (default: 'LAST_WRITE_WINS')

#### Error Classes

**New Error Types**:
- LockAcquisitionFailureError
- ModificationConflictError  
- ConcurrentAccessError
- CoordinationTimeoutError
- ConflictResolutionError

### Completion Criteria

**Functional Requirements**:
- ✅ All 96 test cases pass (15+12+18+15+12+15+9)
- ✅ Virtual locking prevents data corruption
- ✅ Modification tokens detect conflicts correctly
- ✅ Atomic operations maintain data integrity
- ✅ Conflict resolution works reliably
- ✅ Error handling provides graceful degradation

**Performance Requirements**:
- Lock acquisition time < 500ms under normal conditions
- Coordination overhead < 10% for single-instance operations
- System handles up to 5 concurrent instances reliably
- Lock timeout cleanup occurs within 1 second of expiration

**Integration Requirements**:
- Full compatibility with existing Collection API
- Seamless integration with MasterIndex
- Backwards compatibility with non-coordinated mode
- Comprehensive error reporting and logging

**Documentation Requirements**:
- Updated Collection developer documentation
- Cross-instance coordination guide
- Troubleshooting guide for coordination issues
- Performance tuning recommendations

## Section 9: Integration and System Testing

### Objectives

- Verify all components work together
- Test end-to-end workflows
- Validate against requirements

### Implementation Steps

1. **Component Integration**
   - Ensure all classes work together
   - Verify proper dependency injection
   - Test class relationships

2. **Workflow Testing**
   - Test complete database workflows
   - Test error handling and recovery
   - Test performance under load

3. **Requirements Validation**
   - Verify all PRD requirements are met
   - Validate against class diagrams
   - Ensure MongoDB compatibility

### Test Cases

1. **Integration Tests**
   - Test Database with Collection components
   - Test Collection with QueryEngine and UpdateEngine
   - Test FileService components with all other components

2. **Workflow Tests**
   - Test complete CRUD workflow
   - Test error handling and recovery
   - Test performance with various data sizes

3. **Validation Tests**
   - Test MongoDB syntax compatibility
   - Test against PRD requirements
   - Test against class diagrams

### Completion Criteria

- All test cases pass
- All components work together seamlessly
- Complete workflows function as expected
- All requirements from the PRD are met

## Implementation Considerations

**Google Apps Script Constraints:**

- 6-minute execution limit, synchronous model, memory limitations, API quotas

**Performance Strategy:**

- Minimize Drive API calls via MasterIndex delegation
- Implement dirty checking and efficient data structures

**Error Handling:**

- Comprehensive error types with clear messages
- Cleanup mechanisms and retry logic where appropriate

## Conclusion

Sections 1-5 provide a solid MVP foundation using TDD methodology. The current architecture efficiently handles basic MongoDB-compatible operations while clearly documenting limitations that will be addressed in Sections 6-9. The delegation pattern and optimized file service ensure good performance within Google Apps Script constraints.

**Ready for Section 6:** Query Engine implementation to remove field-based query limitations
