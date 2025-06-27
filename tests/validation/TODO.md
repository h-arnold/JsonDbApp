# Validation Testing TODO

## Overview

This document outlines comprehensive end-to-end validation tests needed to ensure JsonDbApp's query and update operators behave consistently with MongoDB. These tests should use the full database functionality including Collection, MasterIndex, and file persistence.

## Test Infrastructure Required

- [x] ValidationMockData.js - Comprehensive test datasets
- [x] ValidationTestEnvironment.js - Setup/teardown with actual Drive files
- [ ] ValidationTestRunner.js - Orchestrates all validation tests
- [ ] ValidationAssertions.js - MongoDB-specific assertion helpers

---

## Query Operator Validation Tests

### Comparison Operators

#### $eq (Equality)
- [ ] **Basic equality matching**
  - String, number, boolean, null, undefined
  - Date object equality (exact timestamp matching)
  - Array equality (order and content)
  - Nested object equality
- [ ] **Edge cases**
  - Empty string vs null vs undefined
  - Zero vs false vs null
  - Array with single element vs scalar value
  - Case sensitivity for strings
- [ ] **Nested field equality**
  - Dot notation field access (`"contact.email"`)
  - Deep nesting (`"preferences.settings.notifications.email.enabled"`)
  - Non-existent nested paths

#### $gt (Greater Than)
- [ ] **Numeric comparisons**
  - Integer vs integer
  - Float vs float
  - Integer vs float (mixed)
  - Negative numbers
  - Zero boundary cases
- [ ] **Date comparisons**
  - Date vs Date objects
  - Chronological ordering
  - Same date, different times
- [ ] **String comparisons**
  - Lexicographical ordering
  - Case sensitivity
  - Unicode character support
- [ ] **Type mixing errors**
  - Number vs string
  - Date vs number
  - Boolean vs number
- [ ] **Null/undefined handling**
  - Null vs number
  - Undefined vs number
  - Missing field vs number

#### $lt (Less Than)
- [ ] **All scenarios from $gt but inverted**
- [ ] **Boundary testing**
  - Minimum/maximum safe integers
  - Floating point precision
  - Date range limits

### Logical Operators

#### $and
- [ ] **Basic conjunction**
  - Two field conditions
  - Multiple field conditions (3+)
  - Mix of comparison operators
- [ ] **Nested $and operations**
  - $and within $and
  - Combined with other logical operators
- [ ] **Edge cases**
  - Empty $and array
  - Single condition in $and
  - $and with contradictory conditions

#### $or
- [ ] **Basic disjunction**
  - Two field conditions
  - Multiple field conditions (3+)
  - Mix of comparison operators
- [ ] **Nested $or operations**
  - $or within $or
  - Combined with other logical operators
- [ ] **Edge cases**
  - Empty $or array
  - Single condition in $or
  - $or with duplicate conditions

#### Combined Logical Operations
- [ ] **$and + $or combinations**
  - $and containing $or clauses
  - $or containing $and clauses
  - Complex nested logical trees
- [ ] **Implicit AND with explicit operators**
  - Field conditions + $and
  - Field conditions + $or
  - Multiple fields + multiple logical operators

### Field Existence and Type Operators (If supported)
- [ ] **$exists** (check if implemented)
  - Field exists (any value including null)
  - Field does not exist
  - Nested field existence
- [ ] **$type** (check if implemented)
  - Type matching for primitives
  - Array vs object distinction
  - Date vs object distinction

### Array Operators (If supported)
- [ ] **$in** (check if implemented)
  - Value in array of possibilities
  - Array field containing any of specified values
  - Nested field arrays
- [ ] **$nin** (check if implemented)
  - Value not in array of possibilities
- [ ] **$all** (check if implemented)
  - Array field contains all specified values
- [ ] **$size** (check if implemented)
  - Array length matching

---

## Update Operator Validation Tests

### Field Update Operators

#### $set
- [ ] **Basic field setting**
  - Overwrite existing values (all types)
  - Create new fields
  - Set nested fields (dot notation)
  - Set deeply nested fields
- [ ] **Type changes**
  - String to number
  - Number to array
  - Object to primitive
  - Null to non-null
- [ ] **Object creation**
  - Create nested object structure via dot notation
  - Partial object updates
  - Mixed existing/new nested fields
- [ ] **Edge cases**
  - Setting _id field
  - Setting to undefined vs null
  - Empty string vs null assignment

#### $unset
- [ ] **Basic field removal**
  - Remove top-level fields
  - Remove nested fields (dot notation)
  - Remove array elements (if supported)
- [ ] **Object structure preservation**
  - Remove field leaves parent object
  - Remove all fields leaves empty object
  - Remove nested field maintains object hierarchy
- [ ] **Edge cases**
  - Unset non-existent field
  - Unset _id field
  - Unset field in non-existent parent object

### Numeric Update Operators

#### $inc
- [ ] **Basic incrementation**
  - Positive increments
  - Negative increments (decrement)
  - Zero increment (no-op)
  - Fractional increments
- [ ] **Field creation**
  - Increment non-existent field (creates with increment value)
  - Increment in non-existent nested object
- [ ] **Type validation**
  - Increment non-numeric field (should error)
  - Non-numeric increment value (should error)
- [ ] **Boundary testing**
  - Large number increments
  - Floating point precision
  - Integer overflow scenarios

#### $mul
- [ ] **Basic multiplication**
  - Positive multipliers
  - Negative multipliers
  - Zero multiplier (sets to 0)
  - Fractional multipliers
- [ ] **Field creation**
  - Multiply non-existent field (creates as 0)
- [ ] **Type validation**
  - Multiply non-numeric field (should error)
  - Non-numeric multiplier (should error)

#### $min
- [ ] **Value comparison and replacement**
  - Replace when new value is smaller
  - No change when current value is smaller
  - Equal values (no change)
  - Mix of integer/float comparisons
- [ ] **Field creation**
  - Min on non-existent field (creates with min value)
- [ ] **Type handling**
  - Date comparisons
  - String comparisons (lexicographical)
  - Type mismatch handling
- [ ] **Edge cases**
  - Null vs number comparisons
  - Undefined field handling

#### $max
- [ ] **All scenarios from $min but inverted**
- [ ] **Boundary testing**
  - Maximum safe integer values
  - Date range maximums

### Array Update Operators

#### $push
- [ ] **Basic array appending**
  - Single value to existing array
  - Multiple values with $each
  - Object values to array
  - Nested array structures
- [ ] **Array creation**
  - Push to non-existent field (creates array)
  - Push to nested non-existent field
- [ ] **Type validation**
  - Push to non-array field (should error)
- [ ] **$each modifier**
  - Push multiple values at once
  - Push empty array with $each
  - Push array of objects
- [ ] **Additional modifiers (if supported)**
  - $position for insertion at specific index
  - $sort for sorting after push
  - $slice for limiting array size

#### $pull
- [ ] **Basic value removal**
  - Remove specific values from array
  - Remove objects matching criteria
  - Remove all occurrences of value
- [ ] **Query-based removal**
  - Remove objects matching nested conditions
  - Complex query criteria for removal
- [ ] **Edge cases**
  - Pull from non-array field
  - Pull non-existent value
  - Pull from empty array

#### $addToSet
- [ ] **Unique value addition**
  - Add value not in array
  - Attempt to add existing value (no change)
  - Add objects (uniqueness by full object comparison)
- [ ] **$each modifier**
  - Add multiple unique values
  - Mix of new and existing values
- [ ] **Type validation**
  - AddToSet on non-array field (should error)
  - Array creation when field doesn't exist

---

## Cross-Operator Integration Tests

### Query + Update Combinations
- [ ] **findOneAndUpdate scenarios**
  - Query matches single document, update succeeds
  - Query matches multiple documents, update first only
  - Query matches no documents, no update occurs
  - Complex query with complex update

### Multiple Operator Updates
- [ ] **Combined update operations**
  - $set + $inc in single update
  - $set + $push in single update
  - $inc + $push + $unset in single update
  - Conflicting operations on same field (should error)

### Nested Field Operations
- [ ] **Deep nesting validation**
  - Query and update on same nested field
  - Query on one nested field, update another
  - Create and query nested structure in same operation

---

## Error Handling and Edge Cases

### Invalid Query Scenarios
- [ ] **Malformed queries**
  - Empty query object behaviour
  - Invalid operator names
  - Invalid operator syntax
  - Circular reference in query
- [ ] **Type errors**
  - Invalid comparison types
  - Null/undefined in comparisons
  - Invalid logical operator arrays

### Invalid Update Scenarios
- [ ] **Malformed updates**
  - Empty update object
  - Invalid operator names
  - Conflicting field updates
  - Invalid dot notation paths
- [ ] **Type errors**
  - Non-numeric values for numeric operators
  - Non-array values for array operators
  - Invalid $each syntax

### Database Integrity
- [ ] **Concurrent operation simulation**
  - Multiple queries during update
  - Update during iteration
  - File lock behaviour validation
- [ ] **Persistence validation**
  - Data survives database restart
  - Index consistency after operations
  - File corruption recovery

---

## Performance and Scalability Tests

### Large Dataset Operations
- [ ] **Query performance**
  - Linear scan performance on large collections
  - Complex query performance
  - Nested field query performance

### Memory Usage
- [ ] **Memory efficiency**
  - Large document updates
  - Large result set queries
  - Deep nesting memory impact

---

## MongoDB Compatibility Verification

### Reference Implementation Tests
- [ ] **Side-by-side comparison**
  - Run identical operations on MongoDB
  - Compare results for exactness
  - Document any intentional differences

### Edge Case Verification
- [ ] **MongoDB edge case behaviour**
  - Verify null/undefined handling matches MongoDB
  - Verify type coercion behaviour
  - Verify error message consistency

---

## Test Implementation Strategy

### Test Organization
- [ ] **Create test suites by operator**
  - One file per operator with comprehensive scenarios
  - Integration test suite for cross-operator scenarios
  - Error handling test suite

### Test Data Strategy
- [ ] **Expand ValidationMockData.js**
  - Add operator-specific test datasets
  - Add boundary condition datasets
  - Add malformed data for error testing

### Assertion Helpers
- [ ] **MongoDB-compatible assertions**
  - Deep equality assertions
  - Array order-sensitive comparisons
  - Date precision handling
  - Error type and message validation

### Test Runner Integration
- [ ] **Integrate with existing test framework**
  - Use TestFramework.js infrastructure
  - Consistent error reporting
  - Performance measurement integration

---

## Documentation and Reporting

### Test Coverage Reports
- [ ] **Operator coverage matrix**
  - Track which operators have comprehensive tests
  - Identify untested combinations
  - Document intentional omissions

### MongoDB Compatibility Report
- [ ] **Compatibility documentation**
  - Document exact MongoDB version targeted
  - List supported operators and limitations
  - Provide migration guide for unsupported features

---

## Priority Implementation Order

1. **High Priority** - Core functionality that must work correctly
   - $eq, $gt, $lt query operators
   - $set, $inc, $unset update operators
   - Basic $and, $or logical operators

2. **Medium Priority** - Important for common use cases
   - Array operators ($push, $pull, $addToSet)
   - Numeric operators ($mul, $min, $max)
   - Complex logical operator combinations

3. **Low Priority** - Advanced features and edge cases
   - Performance stress tests
   - Memory usage validation
   - Deep nesting scenarios

This comprehensive test suite will ensure JsonDbApp provides reliable, MongoDB-compatible behaviour before the first release.
