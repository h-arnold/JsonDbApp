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

##  **MILESTONE ACHIEVED: Section 7 - Collection API Update Tests (COMPLETE)**ion 7** | ✅ **COMPLETE** | 100% | 48/48 | 100% | UpdateEngine ✅, DocumentOperations ✅, Collection API ✅ Complete |ementation Progress Summary

**Overall Status: 7 of 9 core sections completed successfully**

| Section | Status | Progress | Tests | Pass Rate | Notes |
|---------|--------|----------|-------|-----------|--------|
| **Section 1** | ✅ **COMPLETE** | 100% | 16/16 | 100% | Project setup, u7. **Collection API Update Tests** (12 cases) - **🔴 RED PHASE COMPLETE**

    **✅ RED PHASE WORKING CORRECTLY - Tests Now Properly Fail:**
    - ✅ testCollectionUpdateOneById (existing - passing)
    - ✅ testCollectionUpdateOneByFilter (existing - passing)  
    - 🔴 testCollectionUpdateManyReturnsModifiedCount (FAILING: TypeError - updateMany not implemented)
    - 🔴 testCollectionReplaceOneById (FAILING: TypeError - replaceOne not implemented)
    - 🔴 testCollectionReplaceOneByFilter (FAILING: TypeError - replaceOne not implemented)
    - ✅ testCollectionUpdateReturnsModifiedCount (covered by existing tests)
    - 🔴 testCollectionReplaceCorrectDocument (FAILING: TypeError - replaceOne not implemented)
    - ✅ testCollectionUpdateWithNoMatches (existing as testCollectionUpdateOneNoMatch)
    - ✅ testCollectionUpdateWithMultipleOperators (CORRECT - should pass: tests existing OperationError behavior)
    - ✅ testCollectionErrorPropagation (FIXED - enhanced Validate.object with allowEmpty parameter)
    - ✅ testCollectionLockingDuringUpdate (NEW - placeholder passing)
    - ✅ testCollectionUpdateLogging (NEW - placeholder passing)

    **✅ RED PHASE SUCCESSFUL:**
    - **Pass Rate**: 68.8% (11/16 passed) - down from 97.9%
    - **4 Proper TypeError Failures**: updateMany and replaceOne methods correctly fail
    - **Enhanced ValidationUtils**: Added allowEmpty parameter to Validate.object method
    - **Ready for GREEN Phase**: Clear failures indicate exactly what needs to be implemented

    **Next Steps:**
    - 🟢 Implement Collection.updateMany(filter, update) method
    - 🟢 Implement Collection.replaceOne(filter, doc) method
    - 🟢 Enhance updateOne to support update operators ($set, $inc, etc.)test framework |
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

**Next Steps for Section 7:**

- 🔵 **REFACTOR Phase** - Optimise and clean up implementation

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

## Section 7: Update Engine and Document Modification

### ✅ **MOSTLY COMPLETE - UpdateEngine & DocumentOperations Complete, Minor Query Issues**

**Implementation Summary:**
- ✅ UpdateEngine class fully implemented with core MongoDB-compatible operators
- ✅ 46/46 UpdateEngine test cases passing (100% pass rate)
- ✅ DocumentOperations enhancement complete with all 4 new methods implemented
- ✅ 32/32 DocumentOperations tests passing (100% pass rate)
- ✅ All QueryEngine integration tests passing (100% pass rate)
- ⏳ Collection API enhancement pending

### Achievements

**Core Update Operators Implemented:**
- ✅ **`$set`** - Sets field values with deep path creation (`a.b.c` notation)
- ✅ **`$inc`** - Increments numeric values (positive and negative)
- ✅ **`$mul`** - Multiplies numeric values
- ✅ **`$min`** - Sets minimum values (only if new value is smaller)
- ✅ **`$max`** - Sets maximum values (only if new value is larger)
- ✅ **`$unset`** - Removes fields (simple and nested paths)
- ✅ **`$push`** - Adds elements to arrays
- ✅ **`$pull`** - Removes matching elements from arrays
- ✅ **`$addToSet`** - Adds unique elements to arrays (no duplicates)

**Architecture Features:**
- ✅ **Immutable Operations** - Original documents remain unmodified
- ✅ **Deep Path Support** - Automatic nested object creation
- ✅ **Centralised Validation** - Clean, reusable validation methods
- ✅ **Robust Error Handling** - Consistent error patterns and messages
- ✅ **Performance Optimised** - Efficient field access and modification

### Implementation Steps Completed

1. **✅ Update Engine Implementation**
   - UpdateEngine class with document modification logic
   - Field access and modification utilities (`_getFieldValue`, `_setFieldValue`)
   - Nested object field updates with automatic path creation
   - Comprehensive validation and sanitisation

2. **✅ Field Modification Operators**
   - `$set` operator with deep path creation
   - `$inc` operator with numeric validation
   - `$mul` operator with numeric validation  
   - `$min` operator with comparison logic
   - `$max` operator with comparison logic
   - Full nested field update support

3. **✅ Field Removal Operators**
   - `$unset` operator for field removal
   - Nested field removal support (`_unsetFieldValue`)
   - Document structure integrity maintained

4. **✅ Array Update Operators**
   - `$push` operator for array element addition
   - `$pull` operator for array element removal (with deep equality)
   - `$addToSet` operator for unique element addition
   - Array creation when field doesn't exist

5. **✅ Validation Architecture**
   - `_validateApplyOperatorsInputs()` for main method validation
   - `_validateNumericValue()` for arithmetic operations
   - `_validateOperationsNotEmpty()` for operation object validation
   - Consistent error handling with descriptive messages

3. **✅ Field Removal Operators**
   - ✅ `$unset` operator for field removal
   - ✅ Nested field removal support (`_unsetFieldValue`)
   - ✅ Document structure integrity maintained

4. **✅ Array Update Operators**
   - ✅ `$push` operator for array element addition
   - ✅ `$pull` operator for array element removal (with deep equality)
   - ✅ `$addToSet` operator for unique element addition
   - ✅ Array creation when field doesn't exist

5. **✅ Validation Architecture**
   - ✅ `_validateApplyOperatorsInputs()` for main method validation
   - ✅ `_validateNumericValue()` for arithmetic operations
   - ✅ `_validateOperationsNotEmpty()` for operation object validation
   - ✅ Consistent error handling with descriptive messages

6. **✅ DocumentOperations Enhancement** *(Add advanced update capabilities - RED & GREEN phase complete)*
   - ✅ All tests created and implemented for `updateDocumentByQuery(query, updateOperations)`, `updateDocumentWithOperators(id, updateOperations)`, `replaceDocument(id, doc)`, `replaceDocumentByQuery(query, doc)`
   - ✅ All DocumentOperations Query Enhancement and integration tests now pass (100% pass rate)
   - ✅ UpdateEngine fully integrated for all complex update operations

7. **✅ Collection API Enhancement** *(Complete MongoDB-style updates - COMPLETE)*
   - ✅ RED phase test cases created for all Collection API Update Tests  
   - ✅ GREEN phase implementation complete
   - ✅ Enhanced `updateOne(idOrFilter, update)` to support update operators
   - ✅ Added `updateMany(filter, update)` for multiple document updates
   - ✅ Added `replaceOne(idOrFilter, doc)` for document replacement
   - ✅ Support both document replacement and operator-based updates
   - ✅ `deleteOne()` and `countDocuments()` methods implemented
   - ✅ All legacy and new tests updated for new behaviour
   - ✅ **All tests now pass (100% pass rate)**

### Integration and API Enhancements

- Dependency Injection:
  - `DocumentOperations` constructor accepts `UpdateEngine` and `FileService`.
  - `Collection` constructor injects `DocumentOperations`, `MasterIndex` and `FileOperations`.

- Update Flow:
  1. **Retrieve**: `Collection.updateOne()` normalises `filterOrId` and delegates to `DocumentOperations`.
  2. **Fetch Document**: `DocumentOperations.loadDocumentById(id)` loads the current document.
  3. **Apply Operators**: Document passed to `UpdateEngine.applyOperators(document, updateOps)`.
  4. **Persist Changes**: Modified document serialized via `ObjectUtils.serialise()` and saved through `FileService.saveDocument(collectionName, updatedDocument)`.
  5. **MasterIndex Update**: On successful save, `MasterIndex.markCollectionUpdated(collectionName)`.
  6. **Logging**: `GASDBLogger.info()` records the update event with details.

- API Method Signatures:
  - In `src/components/DocumentOperations.js`:

    ```js
    /**
     * Apply update operators to a document by ID
     * @param {string} id - Document identifier
     * @param {Object} updateOps - MongoDB-style update operators
     * @throws {InvalidQueryError} If operators are invalid
     */
    updateDocumentWithOperators(id, updateOps)

    /**
     * Update documents matching a query using operators
     * @param {Object} query - Filter criteria
     * @param {Object} updateOps - MongoDB-style update operators
     * @returns {number} Number of documents updated
     */
    updateDocumentByQuery(query, updateOps)
    ```

  - In `src/core/Collection.js`:

    ```js
    /**
     * Update a single document by ID or filter
     * @param {string|Object} filterOrId - Document ID or filter criteria
     * @param {Object} update - Operators or replacement document
     */
    updateOne(filterOrId, update)

    /**
     * Update multiple documents matching a filter
     * @param {Object} filter - Filter criteria
     * @param {Object} update - MongoDB-style update operators
     * @returns {number} Number of documents updated
     */
    updateMany(filter, update)

    /**
     * Replace a single document by ID or filter
     * @param {string|Object} filterOrId - Document ID or filter criteria
     * @param {Object} doc - Replacement document
     */
    replaceOne(filterOrId, doc)
    ```

- Error Handling:
  - Invalid or malformed update operators throw `InvalidQueryError` (`INVALID_QUERY`).
  - Save conflicts or lock acquisition failures throw `LockTimeoutError` (`LOCK_TIMEOUT`).

### Test Cases

1.  **UpdateEngine Tests** (13 cases) - **✅ COMPLETE** 
    *(13/13 passing - 100% pass rate)*
    - ✅ testUpdateEngineSetStringField
    - ✅ testUpdateEngineSetCreatesDeepPath
    - ✅ testUpdateEngineIncPositive
    - ✅ testUpdateEngineIncNegative
    - ✅ testUpdateEngineMulNumber
    - ✅ testUpdateEngineMinNumeric
    - ✅ testUpdateEngineMaxValue
    - ✅ testUpdateEngineUnsetSimpleField
    - ✅ testUpdateEngineUnsetNestedField
    - ✅ testUpdateEnginePushArrayValue
    - ✅ testUpdateEnginePullArrayValue
    - ✅ testUpdateEngineAddToSetUnique
    - ✅ testUpdateEngineInvalidOperatorThrows

2.  **Field Modification Tests** (16 cases) - **✅ COMPLETE**
    *(16/16 passing - 100% pass rate)*
    - ✅ testSetVariousDataTypes
    - ✅ testSetOnNonExistentTopLevelField
    - ✅ testIncOnNonNumericThrows
    - ✅ testMulOnNonNumericThrows
    - ✅ testMinOnNonComparableThrows
    - ✅ testMaxOnNonComparableThrows
    - ✅ testMultipleOperatorsInSingleUpdate
    - ✅ testSetCanChangeFieldType
    - ✅ testNumericOperatorsPreserveNumericType
    - ✅ testSetNullAndUndefinedBehaviour
    - ✅ testIncExtremeValues
    - ✅ testMinOnEqualValueNoChange
    - ✅ testMaxOnEqualValueNoChange
    - ✅ testEmptyUpdateObjectThrows
    - ✅ testUpdateObjectWithNoDollarOperatorsThrows
    - ✅ testNestedFieldUpdateDeepPath *(covered by testUpdateEngineSetCreatesDeepPath)*

3.  **Field Removal Tests** (6 cases) - **✅ COMPLETE**
    *(6/6 passing - 100% pass rate)*
    - ✅ testUnsetSimpleField
    - ✅ testUnsetNestedField
    - ✅ testUnsetNonExistentFieldNoError
    - ✅ testUnsetArrayElementByIndex
    - ✅ testUnsetDeepNestedPath
    - ✅ testDocumentStructureAfterUnset

5.  **Array Update Tests** (12 cases) - **✅ COMPLETE (12/12 PASSING)**
    *(100% pass rate - 46/46 UpdateEngine tests passing)*

    **✅ PASSING (12 cases):**
    - ✅ testPushSingleValue
    - ✅ testPullByValueEquality
    - ✅ testAddToSetUniqueOnly
    - ✅ testPushNestedArray
    - ✅ testPullNestedArray
    - ✅ testPushMultipleValues
    - ✅ testAddToSetMultipleUnique
    - ✅ testAddToSetDuplicatesIgnored
    - ✅ testArrayPositionSpecifier
    - ✅ testPushOnNonArrayThrows
    - ✅ testPullOnNonArrayThrows
    - ✅ testAddToSetOnNonArrayThrows
    
    **UpdateEngine Implementation Gaps:** None

6.  **DocumentOperations Update Tests** (11 cases) - **✅ COMPLETE** 
    *(11/11 passing - 100% pass rate - GREEN phase successful)*

    **✅ PASSING (11 cases - all functionality implemented):**
    - ✅ testUpdateExistingDocumentById (existing functionality)
    - ✅ testReturnErrorResultWhenUpdatingNonExistentDocument (existing functionality) 
    - ✅ testThrowErrorWhenUpdatingWithInvalidParameters (existing functionality)
    - ✅ testUpdateDocumentWithOperatorsById (`updateDocumentWithOperators` ✅ implemented)
    - ✅ testUpdateDocumentByQuerySingleMatch (`updateDocumentByQuery` ✅ implemented)
    - ✅ testUpdateDocumentByQueryMultipleMatches (`updateDocumentByQuery` ✅ implemented)
    - ✅ testUpdateDocumentByQueryNoMatchesThrows (`updateDocumentByQuery` ✅ implemented)
    - ✅ testReplaceDocumentById (`replaceDocument` ✅ implemented)
    - ✅ testReplaceDocumentByQuery (`replaceDocumentByQuery` ✅ implemented)
    - ✅ testDocumentOperationsIntegrationWithUpdateEngine (`updateDocumentWithOperators` ✅ implemented)
    - ✅ testUpdateDocumentInvalidOperators (`updateDocumentWithOperators` ✅ implemented)

    **✅ GREEN Phase Complete:** All 4 missing methods successfully implemented in DocumentOperations class

7. **Collection API Update Tests** (12 cases) - **✅ ALL TESTS PASSING & IMPLEMENTED**

    **🟢 ALL TESTS PASSING:**
    - ✅ testCollectionUpdateOneById (existing - passing)
    - ✅ testCollectionUpdateOneByFilter (existing - passing)
    - ✅ testCollectionUpdateManyReturnsModifiedCount (implemented & passing)
    - ✅ testCollectionReplaceOneById (implemented & passing)
    - ✅ testCollectionReplaceOneByFilter (implemented & passing)
    - ✅ testCollectionUpdateReturnsModifiedCount (covered by existing tests)
    - ✅ testCollectionReplaceCorrectDocument (implemented & passing)
    - ✅ testCollectionUpdateWithNoMatches (existing as testCollectionUpdateOneNoMatch)
    - ✅ testCollectionUpdateWithMultipleOperators (CORRECT - passing: tests existing OperationError behaviour)
    - ✅ testCollectionErrorPropagation (implemented & passing)
    - ✅ testCollectionLockingDuringUpdate (implemented & passing)
    - ✅ testCollectionUpdateLogging (implemented & passing)

    **STATUS:**
    - All RED phase tests converted to GREEN: all methods implemented, all tests pass
    - Full MongoDB-style update/replace API achieved
    - No outstanding TypeError or negative test failures

    **Summary:**
    - 🟢 All Collection API update methods implemented and tested
    - 🟢 100% pass rate for Collection API update tests
    - 🟢 No further action required for this section

### File Updates Required

**New Files:**

- `src/components/UpdateEngine.js`
- `tests/unit/UpdateEngineTest.js`

**Enhanced Files:**

- `src/components/DocumentOperations.js` - Add advanced update methods
- `src/core/Collection.js` - Enhance update API methods
- `tests/unit/DocumentOperationsTest.js` - Add update operation tests
- `tests/unit/CollectionTest.js` - Add advanced update tests

### Completion Criteria

- All test cases pass
- Update engine can modify documents using MongoDB-style operators
- Field modification works with various data types and nested structures
- Field removal maintains document integrity
- Array operations work correctly with various data scenarios
- DocumentOperations supports all advanced update methods
- Collection API provides full MongoDB-compatible update functionality
- UpdateEngine integrates seamlessly with existing components


## Section 8: Cross-Instance Coordination

### Objectives

- Implement cross-instance coordination
- Test concurrent operations
- Ensure data consistency

### Implementation Steps

1. **Coordination Implementation**
   - Integrate MasterIndex with Collection operations
   - Implement lock acquisition before modifications
   - Implement conflict detection during saves

2. **Concurrent Operation Handling**
   - Implement retry mechanism
   - Handle lock timeouts
   - Resolve conflicts

3. **Data Consistency**
   - Ensure atomic operations
   - Maintain collection metadata
   - Synchronize master index

### Test Cases

1. **Coordination Tests**
   - Test lock acquisition during operations
   - Test lock release after operations
   - Test modification token updates

2. **Concurrent Operation Tests**
   - Test simultaneous read operations
   - Test simultaneous write operations
   - Test read-during-write operations

3. **Data Consistency Tests**
   - Test operation atomicity
   - Test metadata consistency
   - Test recovery from failures

### Completion Criteria

- All test cases pass
- Cross-instance coordination prevents data corruption
- Concurrent operations are handled safely
- Data consistency is maintained across instances

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
