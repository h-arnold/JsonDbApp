# GAS DB Implementation Plan

## 📊 Implementation Progress Summary

**Overall Status: 5 of 5 core sections completed successfully**

| Section | Status | Progress | Tests | Pass Rate | Notes |
|---------|--------|----------|-------|-----------|--------|
| **Section 1** | ✅ **COMPLETE** | 100% | 16/16 | 100% | Project setup, utilities, test framework |
| **Section 2** | ✅ **COMPLETE** | 100% | 16/16 | 100% | ScriptProperties master index, locking |
| **Section 3** | ✅ **COMPLETE** | 100% | 36/36 | 100% | File service, Drive API integration |
| **Section 4** | ✅ **COMPLETE** | 100% | 18/18 | 100% | Database/Collection (refactored) |
| **Section 5** | ✅ **COMPLETE** | 100% | 61/61 | 100% | CollectionMetadata ✅, DocumentOperations ✅, Collection ✅ |
| **Section 6** | 🟡 **IN PROGRESS** | 67% | 52/75 | 69% | QueryEngine ✅, DocumentOperations RED ✅, Collection/Integration pending |
| **Sections 7-9** | ⏳ **PENDING** | 0% | - | - | Awaiting Section 6 completion |

**Total Tests Implemented:** 199 tests across 6 sections  
**Tests Passing:** 187/199 (94% of implemented tests - 12 RED phase tests failing as expected)  
**Section 6 Status:** 🟡 **QueryEngine Complete (40/40) - DocumentOperations RED Complete (12 tests) - API Enhancements Pending (23 tests)**

## Section 6: Query Engine and Document Filtering

### 🟢 **Status: DOCUMENTOPERATIONS ENHANCEMENT COMPLETE**

**DocumentOperations Enhancement Complete:**
- ✅ **QueryEngine Integration** - Full MongoDB-compatible query support in DocumentOperations
- ✅ **New Query Methods** - `findByQuery()`, `findMultipleByQuery()`, `countByQuery()` implemented
- ✅ **Comprehensive Validation** - Enhanced QueryEngine with depth-protected recursion safety
- ✅ **Error Handling** - Proper `InvalidArgumentError` vs `InvalidQueryError` distinction
- ✅ **100% Test Coverage** - All 12 DocumentOperations Enhancement tests passing
- ✅ **Performance Validated** - Sub-1000ms execution for complex queries on large datasets
- ✅ **Security Enhanced** - Depth-limited recursion protection against malicious queries

**QueryEngine Implementation Complete:**
- ✅ **QueryEngine Class** - Core document matching with MongoDB-compatible syntax
- ✅ **Field-based Queries** - Direct field matching with dot notation support
- ✅ **Comparison Operators** - `$eq`, `$gt`, `$lt` for strings, numbers, booleans, dates
- ✅ **Logical Operators** - `$and`, `$or` with proper array processing and nested conditions
- ✅ **Implicit AND** - Multi-field queries work correctly (e.g., `{age: 30, active: true}`)
- ✅ **Query Validation** - Proper error handling for unsupported operators and malformed queries
- ✅ **Nested Field Access** - Dot notation queries (e.g., `"profile.yearsOfService"`)
- ✅ **Error Handling** - Comprehensive validation and clear error messages

**QueryEngine Test Results:**
- **Total Tests:** 40 tests
- **Passing:** 40/40 (100% pass rate)
- **All Test Suites:** QueryEngine Basic (12/12), Comparison Operators (9/9), Logical Operators (8/8), Error Handling (5/5), Edge Cases (6/6)

**API Enhancements Progress:**
- ✅ **DocumentOperations Enhancement** - GREEN phase complete (12/12 tests passing, 100% success rate)
- ❌ **Collection API Enhancement** - Remove Section 5 limitations, support field-based queries
- ❌ **Integration Tests** - Verify end-to-end query functionality through Collection API

**Key Technical Achievements:**

1. **Logical Operator Recognition:** Fixed `_matchDocument` to handle `$and`/`$or` as operators, not field names
2. **Recursive Query Processing:** Properly handles nested logical conditions
3. **MongoDB Compatibility:** Follows MongoDB behavior for empty `$and` (match all) and empty `$or` (match none)
4. **Comprehensive Validation:** Supports malformed query detection with clear error messages
5. **Performance:** Efficient execution on large document sets (tested with 1000+ documents)

## Overview

This implementation plan outlines the development of the GAS DB MVP (Minimum Viable Product) using Test-Driven Development (TDD) principles. The plan divides the implementation into discrete, testable sections, each with specific objectives and test cases that must pass before progressing to the next section. So far, four core sections have been successfully completed.

The implementation will use Google Apps Script with clasp for testing, and assumes permissions to read and write to Google Drive files and folders. The plan focuses on delivering core functionality while ensuring code quality, maintainability, and adherence to the requirements specified in the PRD and Class Diagrams.

## ✅ Section 1: Project Setup and Basic Infrastructure (COMPLETED)

**Key Components Implemented:**

- `GASDBLogger.js` - Configurable logging with component-specific loggers
- `ErrorHandler.js` - Base `GASDBError` class and validation utilities  
- `IdGenerator.js` - UUID generation for document IDs and modification tokens
- Test Framework - `AssertionUtilities.js`, `TestRunner.js`, `TestFramework.js`
- Project setup - clasp configuration, `test-runner.sh` automation

**Tests:** 16/16 passing (100%)

## ✅ Section 2: ScriptProperties Master Index (COMPLETED)

**Key Components Implemented:**

- `MasterIndex.js` - Collection metadata management using `ScriptProperties`
- Virtual locking mechanism with `ScriptLock` integration
- Conflict detection and resolution for concurrent operations
- Fast metadata access without Drive API calls

**Architecture Impact:** `MasterIndex` serves as the authoritative source for collection metadata, significantly reducing Drive API calls for routine operations.

**Tests:** 16/16 passing (100%)

## ✅ Section 3: File Service and Drive Integration (COMPLETED)

**Key Components Implemented:**

- `FileOperations.js` - Direct Drive API interactions with retry logic and error handling
- `FileService.js` - Optimized interface with caching and circuit breaker patterns
- Full Google Drive API integration for database file storage
- Robust error handling for malformed JSON and data structure preservation

**Architecture Impact:** Provides reliable and optimized data persistence layer for all database operations.

**Tests:** 36/36 passing (100%)

## ✅ Section 4: Database and Collection Management (COMPLETED & REFACTORED)

**Key Components Implemented:**

- `DatabaseConfig.js` - Configuration validation and defaults
- `Database.js` - High-level database operations with delegation to `MasterIndex`

**Architecture Refactoring:** Post-completion refactoring shifted collection metadata management from `Database` to `MasterIndex` for performance optimization. `Database` now delegates collection operations (`createCollection()`, `listCollections()`, etc.) to `MasterIndex`, using Drive index files primarily for backup and migration.

**Benefits:**

- Faster operations due to minimized Drive API calls
- Single source of truth for collection data (`MasterIndex`)  
- Clear separation: `MasterIndex` for metadata, `Database` for high-level operations

**Tests:** 18/18 passing (100%)

## ✅ Section 5: Collection Components and Basic CRUD Operations (COMPLETED)

**Key Components Implemented:**

- `CollectionMetadata.js` - Document metadata management with timestamp tracking
- `DocumentOperations.js` - Document manipulation with ID-based CRUD operations  
- `Collection.js` - MongoDB-compatible API with Section 5 limitations

**MongoDB-Compatible API (Limited Implementation):**

- `insertOne(doc)` - Standard MongoDB signature and return format
- `findOne(filter)` - Supports `{}` (first document) and `{_id: "id"}` only
- `find(filter)` - Supports `{}` (all documents) only
- `updateOne(filter, update)` - Supports `{_id: "id"}` with document replacement
- `deleteOne(filter)` - Supports `{_id: "id"}` only
- `countDocuments(filter)` - Supports `{}` (count all) only

**Section 5 Limitations (Clear Error Messages):**

- Field-based queries: `"Field-based queries not yet implemented - requires Section 6 Query Engine"`
- Update operators: `"Update operators not yet implemented - requires Section 7 Update Engine"`
- Complex filters: `"Advanced queries not yet implemented - requires Section 6 Query Engine"`

**Deferred to Future Sections:**

- **Section 6:** Field-based queries (`{name: "John"}`), comparison operators (`$gt`, `$lt`), logical operators (`$and`, `$or`)
- **Section 7:** Update operators (`$set`, `$inc`, `$push`, `$pull`)

**Real Drive Integration:** All tests use actual Google Drive files with proper lifecycle management.

**Tests:** 61/61 passing (100%) - 19 CollectionMetadata + 22 DocumentOperations + 20 Collection

## Section 6: Query Engine and Document Filtering

### 🟡 **Status: GREEN PHASE COMPLETE (COMPARISON OPERATORS) - LOGICAL OPERATORS PENDING**

**Green Phase (Comparison Operators):** ✅ QueryEngine class implemented with comparison operators only  
**Next Phase:** Implement logical operators (`$and`, `$or`) to complete Section 6  
**Test Results:** 34/40 passing (85% pass rate - expected for comparison operators only)  

### Green Phase Summary (✅ COMPLETED - COMPARISON OPERATORS)

**Implementation Completed:**
- ✅ **QueryEngine Class** - Core document matching with MongoDB-compatible syntax
- ✅ **Field-based Queries** - Direct field matching with dot notation support
- ✅ **Comparison Operators** - `$eq`, `$gt`, `$lt` for strings, numbers, booleans, dates
- ✅ **Implicit AND** - Multi-field queries work correctly (e.g., `{age: 30, active: true}`)
- ✅ **Query Validation** - Proper error handling for unsupported operators
- ✅ **Nested Field Access** - Dot notation queries (e.g., `"profile.yearsOfService"`)

**Test Execution Results:**
- **Total Tests:** 40 tests
- **Passing:** 34/40 (85% pass rate)
- **Expected Failures:** 6 logical operator tests properly failing with "Unsupported operator" errors
- **Execution Time:** 135ms (excellent performance)

**Test Results Breakdown:**
- ✅ **QueryEngine Basic Functionality** (12/12) - 100% - Core functionality working
- ✅ **QueryEngine Comparison Operators** (9/9) - 100% - All comparison operators implemented
- ❌ **QueryEngine Logical Operators** (2/8) - 25% - Only implicit AND works, explicit `$and`/`$or` properly rejected
- ✅ **QueryEngine Error Handling** (5/5) - 100% - Validation correctly catching unsupported operators
- ✅ **QueryEngine Edge Cases** (6/6) - 100% - Including performance test with corrected data

### 🚨 **CRITICAL INVESTIGATION FINDINGS (2025-06-10)**

**Investigation Completed:** `quickTest.js` execution revealed fundamental implementation flaws in logical operator handling.

**Key Findings:**

1. **Validation Bug:** Even with `$and`/`$or` in `supportedOperators` array, validation still rejects them with "Unsupported operator" errors
2. **Execution Logic Flaw:** `_matchDocument` method treats ALL top-level keys as field names, including logical operators
3. **Test Logic Issue:** Original logical operator tests were incorrectly designed, checking wrong criteria

**Specific Problems Identified:**

- **Line 77-84 in QueryEngine.js:** `_matchDocument` treats `$and` as field name instead of logical operator
- **Query `{$and: [...]}` processed as:** Look for field named "$and" in document (returns `undefined`)
- **Result:** `undefined !== array` → query fails even when conditions should match

**Evidence from Investigation:**

```javascript
Processing field: "$and"
Field value from document: {} (undefined)
Query value: "[{\"active\":true},{\"age\":{\"$gt\":25}}]" (array)
Field matches: false
```

**Current Status:**

- ✅ **Implicit AND** works correctly (multi-field queries)
- ❌ **Explicit $and/$or** completely broken (treats operators as field names)
- ❌ **Validation** has bugs even with operators in supported list

### Remaining Work for Section 6 Completion

**PRIORITY 1: DocumentOperations Enhancement (RED-GREEN-REFACTOR)**

Implement QueryEngine integration in `DocumentOperations.js`:
- Add `findByQuery(query)` method with QueryEngine integration
- Add `findMultipleByQuery(query)` method for multiple document retrieval
- Add `countByQuery(query)` method for query-based counting
- Integrate QueryEngine validation and error handling
- Maintain existing ID-based methods for backwards compatibility

**PRIORITY 2: Collection API Enhancement (RED-GREEN-REFACTOR)**

Update `Collection.js` MongoDB-compatible methods:
- Remove Section 5 limitations from `find(filter)`, `findOne(filter)`, `updateOne(filter, update)`, `deleteOne(filter)`, `countDocuments(filter)`
- Add field-based query support through DocumentOperations integration
- Maintain backwards compatibility with existing `{_id: "id"}` and `{}` patterns
- Add comprehensive query validation with clear error messages
- Ensure proper delegation to DocumentOperations for all query operations

**PRIORITY 3: Integration Testing (RED-GREEN-REFACTOR)**

Comprehensive end-to-end testing:
- Test full query pipeline from Collection → DocumentOperations → QueryEngine
- Verify MongoDB compatibility across all Collection methods
- Test error propagation and validation
- Performance testing with realistic data sets

### Objectives

- Implement basic MongoDB-compatible query engine aligned with PRD section 4.3
- Enhance DocumentOperations and Collection methods to support required filter parameters
- Remove Section 5 limitations and provide essential query functionality
- Support field-based queries and simple nested field access

### Implementation Steps

1. **Query Engine Implementation** *(Core Component - SRP)*
   - Create QueryEngine class with essential document matching logic
   - Implement basic field access and value comparison utilities
   - Support simple MongoDB-compatible query validation
   - Apply Interface Segregation with focused methods
   - Ensure testability through dependency injection

2. **Basic Comparison Operators** *(As specified in PRD 4.3)*
   - Implement `$eq` operator (equality) - default when no operator specified
   - Implement `$gt` operator (greater than)
   - Implement `$lt` operator (less than)
   - Support common data types (string, number, boolean, Date)

3. **Simple Logical Operators** *(As specified in PRD 4.3)*
   - Implement `$and` operator (logical AND) - default for multiple fields
   - Implement `$or` operator (logical OR)
   - Support basic nested logical conditions

4. **DocumentOperations Enhancement**
   - Add `findByQuery(query)` method with QueryEngine integration
   - Add methods for querying with simplified comparison operators
   - Integrate QueryEngine for all filtering operations

5. **Collection API Enhancement**
   - Update MongoDB-compatible methods:
     - `find(filter)` - support basic query patterns
     - `findOne(filter)` - support field-based queries
     - `updateOne(filter, update)` - support field matching for filter
     - `deleteOne(filter)` - support field matching
     - `countDocuments(filter)` - support field matching
   - Remove "not yet implemented" error messages
   - Add basic query validation

6. **Test Data Preparation** *(COMPLETED)*
   - Created comprehensive test data in `MockQueryData.js`
   - Contains rich document structures with various data types
   - Includes user documents, product documents, and edge case documents
   - Supports testing of nested fields, arrays, and complex query patterns
   - Designed to validate all query functionality including comparison and logical operators

### Error Handling Strategy

- Create specialized `InvalidQueryError` for query issues
- Implement validation for query structure before execution
- Add clear error messages for unsupported operators

### Supported Query Patterns (Section 6 MVP)

**Field-based queries:**

- `{ name: "John" }` - exact field match
- `{ age: 25 }` - exact numeric match
- `{ "user.email": "john@example.com" }` - simple nested field access

**Basic comparison operators (PRD 4.3):**

- `{ field: { $eq: value } }` - equals
- `{ field: { $gt: value } }` - greater than
- `{ field: { $lt: value } }` - less than

**Simple logical operators (PRD 4.3):**

- `{ $and: [ {condition1}, {condition2} ] }` - logical AND
- `{ $or: [ {condition1}, {condition2} ] }` - logical OR
- `{ age: { $gt: 18 }, status: "active" }` - implicit AND (multiple fields)

### Test Cases

1. **Query Engine Tests** (12 test cases) - ✅ **COMPLETED**
   - Test basic document matching against simple query patterns
   - Test field access utilities (including basic nested fields)
   - Test query validation

2. **Comparison Operator Tests** (9 test cases) - ✅ **COMPLETED**
   - Test `$eq` with common data types
   - Test `$gt`/`$lt` with numbers and dates
   - Test direct field comparison (implicit $eq)

3. **Logical Operator Tests** (8 test cases) - ✅ **COMPLETED**
   - Test `$and` with multiple conditions
   - Test `$or` with multiple conditions
   - Test implicit AND behavior (multiple fields)

4. **Error Handling Tests** (5 test cases) - ✅ **COMPLETED**
   - Test malformed query validation
   - Test unsupported operator detection
   - Test comprehensive error messaging

5. **Edge Cases Tests** (6 test cases) - ✅ **COMPLETED**
   - Test performance with large document sets
   - Test boundary conditions and null handling

6. **DocumentOperations Enhancement Tests** (12 test cases) - ✅ **GREEN PHASE COMPLETE**
   - ✅ **Test Suite:** All 12 test cases implemented and passing (100% success rate)
   - ✅ **Core Methods:** `findByQuery()`, `findMultipleByQuery()`, and `countByQuery()` fully implemented
   - ✅ **Field-Based Queries:** Perfect support for `{name: "John Smith"}` exact match queries
   - ✅ **Comparison Operators:** Full `$eq`, `$gt`, `$lt` support with `{age: {$gt: 25}}` patterns
   - ✅ **Logical Operators:** Robust `$and`/`$or` queries with complex nested conditions
   - ✅ **Nested Fields:** Complete dot notation support for `{"profile.yearsOfService": 5}`
   - ✅ **Multiple Documents:** `findMultipleByQuery()` and `countByQuery()` working flawlessly
   - ✅ **QueryEngine Integration:** Seamless integration with comprehensive validation
   - ✅ **Error Handling:** Proper `InvalidArgumentError` vs `InvalidQueryError` distinction
   - ✅ **Validation Pipeline:** Enhanced QueryEngine with depth-protected recursion safety
   - ✅ **Edge Cases:** Empty results, large datasets (100+ docs), performance validated
   - ✅ **Backwards Compatibility:** All existing ID-based methods preserved and functional
   - ✅ **Architecture:** Clean separation - DocumentOperations delegates to QueryEngine
   - **Implementation Quality:** Single responsibility, fail-fast validation, comprehensive error handling
   - **Test Results:** 12/12 passing (100% - successful GREEN phase completion)
   - **Performance:** Sub-1000ms execution for complex queries on large datasets
   - **Security:** Depth-limited recursion protection against malicious deep queries
   - **Next Phase:** Collection API Enhancement to expose these capabilities

7. **Collection API Enhancement Tests** (15 test cases) - ❌ **PENDING**
   - Test `find(filter)` with field queries replacing "not yet implemented" errors
   - Test `find(filter)` with comparison operators: `{age: {$gt: 25}}`
   - Test `find(filter)` with logical operators: `{$and: [...]}`, `{$or: [...]}`
   - Test `findOne(filter)` with field-based queries instead of ID-only
   - Test `findOne(filter)` returning first match for multiple matches
   - Test `updateOne(filter, update)` with field matching for filter
   - Test `updateOne(filter, update)` with query-based document selection
   - Test `deleteOne(filter)` with field matching instead of ID-only
   - Test `deleteOne(filter)` with complex query filters
   - Test `countDocuments(filter)` with field matching instead of empty filter only
   - Test `countDocuments(filter)` accuracy with various query types
   - Test backwards compatibility with existing `{_id: "id"}` and `{}` patterns
   - Test error handling for invalid queries with clear error messages
   - Test query validation at Collection API level
   - Test end-to-end performance from Collection → DocumentOperations → QueryEngine

8. **Integration Tests** (8 test cases) - ❌ **PENDING**
   - Test complete query pipeline: Collection API → DocumentOperations → QueryEngine
   - Test error propagation through all layers
   - Test performance with realistic data volumes (1000+ documents)
   - Test concurrent query execution
   - Test memory management with complex nested queries
   - Test MongoDB compatibility verification across all query types
   - Test backwards compatibility with Section 5 patterns
   - Test robustness with malformed or edge case queries

### File Updates Required

**New Files:**

- `src/components/QueryEngine.js` - Core query evaluation component (minimal MVP version)
- `tests/unit/QueryEngineTest.js` - Testing for query functionality

**Enhanced Files:**

- `src/components/DocumentOperations.js` - Add query support, integrate QueryEngine
- `src/core/Collection.js` - Remove Section 5 limitations, delegate to DocumentOperations
- `tests/unit/DocumentOperationsTest.js` - Add query-based operation tests
- `tests/unit/CollectionTest.js` - Add query compatibility tests

### Implementation Sequence

1. Implement and test QueryEngine with core functionality
2. Add basic comparison operators with tests
3. Add simple logical operators with tests
4. Enhance DocumentOperations with QueryEngine integration
5. Update Collection API to remove limitations

### Completion Criteria

- All test cases pass (75 total: 40 QueryEngine ✅ + 12 DocumentOperations + 15 Collection API + 8 Integration)
- QueryEngine correctly evaluates document matches using basic MongoDB-compatible syntax ✅
- Basic operators work correctly with common data types ✅
- DocumentOperations integrates with QueryEngine and provides query-based methods
- Collection API provides essential MongoDB query compatibility as specified in PRD 4.3
- System follows SOLID principles with clear separation of concerns ✅
- All Section 5 limitations are removed from Collection methods
- End-to-end query pipeline functions correctly: Collection → DocumentOperations → QueryEngine
- Backwards compatibility maintained for existing ID-based and empty filter patterns
- Performance acceptable for realistic document volumes (1000+ documents)

### 🎯 **DOCUMENTOPERATIONS ENHANCEMENT COMPLETION SUMMARY**

**Achievement:** Successfully implemented comprehensive MongoDB-compatible query support in DocumentOperations with 100% test pass rate.

**Technical Implementation:**
- **New Methods Added:** `findByQuery()`, `findMultipleByQuery()`, `countByQuery()`
- **QueryEngine Integration:** Seamless delegation with proper error handling
- **Validation Strategy:** Enhanced QueryEngine with comprehensive input and structure validation
- **Error Architecture:** Clear distinction between `InvalidArgumentError` and `InvalidQueryError`
- **Security Features:** Depth-limited recursion protection (max depth: 10)
- **Performance:** Sub-1000ms execution for complex queries on 100+ document datasets

**Query Support Matrix:**
- ✅ **Field-Based:** `{name: "John"}`, `{age: 25}` - exact matching
- ✅ **Comparison:** `{age: {$gt: 25}}`, `{score: {$lt: 90}}` - range queries  
- ✅ **Logical:** `{$and: [...]}`, `{$or: [...]}` - compound conditions
- ✅ **Nested Fields:** `{"profile.yearsOfService": 5}` - dot notation
- ✅ **Implicit AND:** `{age: 30, active: true}` - multiple field matching
- ✅ **Edge Cases:** Empty queries, null values, large datasets, malformed queries

**Test Results:**
- **Total Tests:** 52 tests across DocumentOperations (12) + QueryEngine (40)
- **Pass Rate:** 52/52 (100%) - Complete GREEN phase success
- **Test Categories:** Constructor validation, CRUD operations, query methods, error handling
- **Performance Tests:** Validated with 100+ document datasets under 1000ms execution
- **Error Validation:** Comprehensive coverage of argument validation and query structure validation

**Architecture Quality:**
- **Single Responsibility:** DocumentOperations focuses on document retrieval, QueryEngine handles query logic
- **Fail-Fast Design:** Basic argument validation before complex query processing
- **Clean Delegation:** No redundant validation - QueryEngine is authoritative for query validation
- **Backwards Compatibility:** All existing ID-based methods unchanged and fully functional

**Security Enhancements:**
- **Recursive Depth Protection:** Prevents stack overflow from deep query nesting
- **Input Sanitization:** Comprehensive validation of query structure and operators
- **Error Message Safety:** Clear error messages without exposing internal structure

**Next Phase:** Collection API Enhancement to expose these query capabilities through Collection methods (`find()`, `findOne()`, `updateOne()`, `deleteOne()`, `countDocuments()`).

### Future Enhancements (Post-MVP)

- Additional comparison operators ($lte, $gte, $ne)
- Advanced query optimization
- Array query operators
- Comprehensive edge case handling
- Performance benchmarking

## Section 7: Update Engine and Document Modification

### Objectives

- Implement basic update engine with MongoDB-compatible operators
- Add advanced update capabilities to DocumentOperations (beyond simple replacement)
- Enhance Collection API to support MongoDB-style update operations
- Support field modification and removal operators
- Complete MongoDB-compatible update functionality

### Implementation Steps

1. **Update Engine Implementation**
   - Create UpdateEngine class with document modification logic
   - Implement field access and modification utilities
   - Support nested object field updates (e.g., "user.address.city")
   - Create update validation and sanitization

2. **Field Modification Operators**
   - Implement `$set` operator (set field values)
   - Implement `$inc` operator (increment numeric values)
   - Implement `$mul` operator (multiply numeric values)
   - Implement `$min` operator (set minimum value)
   - Implement `$max` operator (set maximum value)
   - Support nested field updates and array element updates

3. **Field Removal Operators**
   - Implement `$unset` operator (remove fields)
   - Support nested field removal
   - Maintain document structure integrity
   - Handle array element removal

4. **Array Update Operators**
   - Implement `$push` operator (add elements to array)
   - Implement `$pull` operator (remove elements from array)
   - Implement `$addToSet` operator (add unique elements)
   - Support array position updates

5. **DocumentOperations Enhancement** *(Add advanced update capabilities)*
   - Add `updateDocumentByQuery(query, updateOperations)` - update using query + operators
   - Add `updateDocumentWithOperators(id, updateOperations)` - update using operators
   - Enhance existing `updateDocument(id, doc)` to support both replacement and operators
   - Integrate UpdateEngine for all complex update operations

6. **Collection API Enhancement** *(Complete MongoDB-style updates)*
   - Enhance `updateOne(idOrFilter, update)` to support update operators
   - Add `updateMany(filter, update)` for multiple document updates
   - Add `replaceOne(idOrFilter, doc)` for document replacement
   - Support both document replacement and operator-based updates

### Test Cases

1. **Update Engine Tests** (12 test cases)
   - Test basic document modification with operators
   - Test field access and modification utilities
   - Test update validation and error handling
   - Test nested field access and updates

2. **Field Modification Tests** (20 test cases)
   - Test `$set` with various data types (string, number, boolean, Date, object)
   - Test `$inc` with positive and negative increments
   - Test `$mul` with various multipliers
   - Test `$min`/`$max` with numbers and dates
   - Test nested field updates (e.g., "user.settings.theme")
   - Test array element updates

3. **Field Removal Tests** (8 test cases)
   - Test `$unset` operator with various field types
   - Test nested field removal
   - Test document structure integrity after removal
   - Test removal of non-existent fields

4. **Array Update Tests** (15 test cases)
   - Test `$push` with single and multiple values
   - Test `$pull` with various match conditions
   - Test `$addToSet` for unique value enforcement
   - Test array position updates
   - Test nested array operations

5. **DocumentOperations Update Tests** (10 test cases) *(Advanced update capabilities)*
   - Test `updateDocumentByQuery()` with various queries and updates
   - Test `updateDocumentWithOperators()` functionality
   - Test integration with UpdateEngine
   - Test validation of update operations

6. **Collection API Update Tests** (15 test cases) *(MongoDB-style updates)*
   - Test `updateOne()` with update operators
   - Test `updateMany()` for multiple documents
   - Test `replaceOne()` for document replacement
   - Test distinction between replacement and operator updates

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

- All test cases pass (80 total: 12 + 20 + 8 + 15 + 10 + 15)
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
