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
| **Section 8** | ✅ **COMPLETE** | 100% | 15/15 | 100% | Cross-instance coordination and locking refactor complete |
| **Section 9** | ⏳ **PENDING** | 0% | - | - | Awaiting Section 8 completion |

**Total Tests Implemented:** 339 tests across 7+ sections (316 unit + 23 integration)  
**Tests Passing:** 61/63 Collection tests (96.8% pass rate)  
**Section 8 Status:** 🔴 **RED PHASE - Collection Lock Integration test suite created**

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

## Section 8: Cross-Instance Coordination - COMPLETE

> Note: Locking functionality has been refactored. `DbLockService` now handles only script-level locks and `MasterIndex` manages collection-level locks via metadata, ensuring atomic, persistent cross-instance coordination.

### 8.1 Collection API Coordination

Wrap each Collection CRUD operation in a coordinated lock sequence:

1. Generate a unique `operationId` (via `IdGenerator`).
2. Call `_acquireOperationLock(operationId)` (delegating to `MasterIndex.acquireCollectionLock`).
3. Within `try`:
   - Detect stale data: call `_validateModificationToken()` on `CollectionMetadata`, then `hasConflict()` and `resolveConflict()` if needed.
   - Perform the core operation (`insertOne`, `updateOne`, `deleteOne`, `replaceOne`, etc.) via `DocumentOperations` and `FileService`.
   - Update collection metadata (document count, modification token) and call `_updateMasterIndexMetadata()`.
4. In `finally`, call `_releaseOperationLock(operationId)` (delegating to `MasterIndex.releaseCollectionLock`).

Example pattern in `updateOne`:

```javascript
_acquireOperationLock(opId);
try {
  if (this._detectConflict()) this._resolveConflict('RELOAD_AND_RETRY');
  const result = this._performUpdate(filter, updateOps);
  this._saveDataWithCoordination();
  return result;
} finally {
  this._releaseOperationLock(opId);
}
```

### 8.2 New Error Types

Define custom error classes for coordination failures:

- `LockAcquisitionFailureError` when `acquireCollectionLock` returns false
- `LockTimeoutError` when script-level lock times out
- `ModificationConflictError` on stale token detection
- `ConcurrentAccessError` when conflicting operations overlap
- `CoordinationTimeoutError` for overall coordination delays
- `ConflictResolutionError` if reload-and-retry fails

### 8.3 Retry and Recovery Mechanisms

Implement configurable retry with exponential backoff:

- `retryAttempts` (default 3)
- `retryDelayMs` (default 1000)

On `LockAcquisitionFailureError`:

```javascript
for (let attempt = 1; attempt <= retryAttempts; attempt++) {
  if (acquireOperationLock(opId)) break;
  Utilities.sleep(retryDelayMs * Math.pow(2, attempt - 1));
}
if (!isCollectionLocked(name)) {
  throw new LockAcquisitionFailureError(name);
}
```

On conflict in core operation, use `resolveConflict('RELOAD_AND_RETRY')`, then retry once.

### 8.4 Collection Class Enhancements

Add the following private methods on `Collection`:

- `_acquireOperationLock(operationId): boolean`
- `_releaseOperationLock(operationId): boolean`
- `_validateModificationToken(): void` (throws `ModificationConflictError`)
- `_detectConflict(): boolean`
- `_resolveConflict(strategy): void`
- `_saveDataWithCoordination(): void` (calls FileService + updates metadata)
- `_reloadFromDrive(): void` (in conflict recovery)
- `_updateMasterIndexMetadata(): void`

Modify public methods to call these helpers in the correct sequence.

### 8.5 Configuration Options

Expose in `DatabaseConfig` or constructor:

```js
coordinationEnabled: boolean (default: true)
lockTimeoutMs: number     (default: 30000)
retryAttempts: number     (default: 3)
retryDelayMs: number      (default: 1000)
conflictResolutionStrategy: 'LAST_WRITE_WINS' | 'RELOAD_AND_RETRY'
```

---

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
