# ObjectUtils Serialization Implementation Plan

## Overview

Refactor serialization logic from `FileOperations` and planned `MasterIndex` changes to centralized `serialise` and `deserialise` methods in `ObjectUtils`. This eliminates code duplication, centralises serialization responsibility, and provides consistent Date handling across all components.

## Current State Analysis

### Current Serialization Patterns

**FileOperations** (existing):
- **Write**: `JSON.stringify(data, null, 2)` - Dates auto-convert to ISO strings
- **Read**: `JSON.parse(content)` + `ObjectUtils.convertDateStringsToObjects(parsedContent)`

**MasterIndex** (planned refactoring):
- **Save**: `JSON.stringify(this._data)` - Dates auto-convert to ISO strings  
- **Load**: `JSON.parse(dataString)` + `ObjectUtils.convertDateStringsToObjects(loadedData)`

### Identified Duplication

Both components implement identical serialization logic:
1. Use `JSON.stringify()` for serialization (automatic Date → ISO string conversion)
2. Use `JSON.parse()` + `ObjectUtils.convertDateStringsToObjects()` for deserialization

## Proposed Solution

### New ObjectUtils Methods

```javascript
/**
 * Serialise an object to JSON string with proper Date handling
 * @param {*} obj - Object to serialise
 * @returns {string} JSON string with Dates converted to ISO strings
 */
static serialise(obj) {
  return JSON.stringify(obj, null, 2);
}

/**
 * Deserialise JSON string to object with Date restoration
 * @param {string} jsonString - JSON string to deserialise
 * @returns {*} Object with ISO date strings converted back to Date objects
 * @throws {InvalidArgumentError} When jsonString is invalid JSON
 */
static deserialise(jsonString) {
  if (typeof jsonString !== 'string') {
    throw new InvalidArgumentError('jsonString must be a string');
  }
  
  const parsed = JSON.parse(jsonString);
  return ObjectUtils.convertDateStringsToObjects(parsed);
}
```

## TDD Implementation Plan

### Phase 1: Add ObjectUtils Serialization Methods (Red-Green-Refactor)

#### Test 1.1: ObjectUtils Serialise Method

**Red**: Write test expecting `ObjectUtils.serialise()` to convert objects to JSON strings
- Test with simple objects
- Test with nested objects containing Dates
- Test with arrays containing Dates
- Test with null/undefined values

**Green**: Implement `ObjectUtils.serialise()` method
**Refactor**: Optimise implementation and ensure proper formatting

#### Test 1.2: ObjectUtils Deserialise Method

**Red**: Write test expecting `ObjectUtils.deserialise()` to restore objects with Dates
- Test JSON string parsing
- Test Date restoration from ISO strings
- Test nested object Date restoration
- Test array Date restoration
- Test invalid JSON error handling

**Green**: Implement `ObjectUtils.deserialise()` method
**Refactor**: Ensure robust error handling and validation

#### Test 1.3: ObjectUtils Round-trip Serialization

**Red**: Write tests for complete serialise → deserialise cycles
- Test Date preservation through round-trips
- Test complex nested structures
- Test edge cases (empty objects, arrays, etc.)

**Green**: Ensure both methods work together correctly
**Refactor**: Optimise for consistency and performance

### Phase 2: Refactor FileOperations to Use ObjectUtils (Red-Green-Refactor)

#### Test 2.1: FileOperations writeFile with ObjectUtils.serialise

**Red**: Update FileOperationsTest to expect usage of `ObjectUtils.serialise()`
- Mock ObjectUtils.serialise calls
- Verify correct data passed to serialise method
- Ensure existing functionality preserved

**Green**: Refactor `FileOperations.writeFile()` to use `ObjectUtils.serialise()`
**Refactor**: Clean up implementation and remove duplicated JSON logic

#### Test 2.2: FileOperations readFile with ObjectUtils.deserialise

**Red**: Update FileOperationsTest to expect usage of `ObjectUtils.deserialise()`
- Mock ObjectUtils.deserialise calls
- Verify correct JSON string passed to deserialise method
- Ensure Date restoration still works correctly

**Green**: Refactor `FileOperations.readFile()` to use `ObjectUtils.deserialise()`
**Refactor**: Simplify implementation and improve error handling

#### Test 2.3: FileOperations createFile with ObjectUtils.serialise

**Red**: Update tests for `createFile()` method
- Ensure ObjectUtils.serialise is used for initial data serialization

**Green**: Refactor `FileOperations.createFile()` to use `ObjectUtils.serialise()`
**Refactor**: Maintain consistency across all file operations

### Phase 3: Update MasterIndex to Use ObjectUtils (Red-Green-Refactor)

#### Test 3.1: MasterIndex save with ObjectUtils.serialise

**Red**: Write tests expecting MasterIndex.save() to use `ObjectUtils.serialise()`
- Test serialization of master index data
- Test Date preservation in metadata
- Test error handling during serialization

**Green**: Implement MasterIndex.save() using `ObjectUtils.serialise()`
**Refactor**: Ensure clean implementation

#### Test 3.2: MasterIndex load with ObjectUtils.deserialise

**Red**: Write tests expecting MasterIndex._loadFromScriptProperties() to use `ObjectUtils.deserialise()`
- Test deserialization of stored data
- Test Date restoration from ScriptProperties
- Test backward compatibility with existing data

**Green**: Implement MasterIndex._loadFromScriptProperties() using `ObjectUtils.deserialise()`
**Refactor**: Optimise loading logic

### Phase 4: Integration and Validation (Red-Green-Refactor)

#### Test 4.1: End-to-End Date Preservation

**Red**: Write integration tests verifying Date preservation across all storage boundaries
- Test FileOperations → Drive → FileOperations date cycles
- Test MasterIndex → ScriptProperties → MasterIndex date cycles
- Test complex objects with nested dates

**Green**: Ensure all components work together with consistent date handling
**Refactor**: Address any integration issues

#### Test 4.2: Error Handling Consistency

**Red**: Write tests for consistent error handling across all serialization points
- Test invalid JSON handling
- Test malformed date strings
- Test serialization failures

**Green**: Implement robust error handling
**Refactor**: Ensure consistent error types and messages

#### Test 4.3: Performance and Backward Compatibility

**Red**: Write tests to ensure no performance regression and backward compatibility
- Test with existing data formats
- Test performance with large objects
- Test memory usage

**Green**: Optimise implementation if needed
**Refactor**: Final cleanup and optimisation

## Detailed Test Cases

### ObjectUtilsTest.js - New Test Cases

```javascript
// Test file: tests/unit/UtilityTests/ObjectUtilsTest.js

function testObjectUtilsSerialiseBasicObject() {
  // Test serialisation of simple objects
}

function testObjectUtilsSerialiseWithDates() {
  // Test serialisation preserves Date objects as ISO strings
}

function testObjectUtilsSerialiseNestedStructures() {
  // Test serialisation of complex nested objects and arrays
}

function testObjectUtilsSerialiseEdgeCases() {
  // Test null, undefined, empty objects, circular references (if handled)
}

function testObjectUtilsDeserialiseBasicJSON() {
  // Test deserialisation of simple JSON strings
}

function testObjectUtilsDeserialiseWithDateRestoration() {
  // Test ISO string to Date object conversion
}

function testObjectUtilsDeserialiseNestedStructures() {
  // Test deserialisation of complex nested structures
}

function testObjectUtilsDeserialiseInvalidJSON() {
  // Test error handling for malformed JSON
}

function testObjectUtilsRoundTripSerialization() {
  // Test complete serialise → deserialise cycles preserve data integrity
}

function testObjectUtilsDatePreservationThroughRoundTrip() {
  // Test Date objects survive complete round-trip
}
```

### FileOperationsTest.js - Updated Test Cases

```javascript
// Test file: tests/unit/FileOperationsTest.js

function testFileOperationsWriteFileUsesObjectUtilsSerialise() {
  // Verify writeFile calls ObjectUtils.serialise()
  // Mock ObjectUtils.serialise and verify call
}

function testFileOperationsReadFileUsesObjectUtilsDeserialise() {
  // Verify readFile calls ObjectUtils.deserialise()  
  // Mock ObjectUtils.deserialise and verify call
}

function testFileOperationsCreateFileUsesObjectUtilsSerialise() {
  // Verify createFile calls ObjectUtils.serialise()
  // Ensure consistent serialisation across file operations
}

function testFileOperationsDatePreservationThroughFileOperations() {
  // Integration test: write object with dates, read back, verify dates preserved
}
```

### MasterIndexTest.js - Updated Test Cases

```javascript
// Test file: tests/unit/MasterIndexTest.js

function testMasterIndexSaveUsesObjectUtilsSerialise() {
  // Verify save() method calls ObjectUtils.serialise()
  // Mock ObjectUtils.serialise and verify call with correct data
}

function testMasterIndexLoadUsesObjectUtilsDeserialise() {
  // Verify _loadFromScriptProperties() calls ObjectUtils.deserialise()
  // Mock ObjectUtils.deserialise and verify call
}

function testMasterIndexDatePreservationThroughSaveLoad() {
  // Integration test: save metadata with dates, load back, verify dates preserved
}

function testMasterIndexBackwardCompatibilityWithExistingData() {
  // Test loading data saved with old serialisation method
}
```

## Implementation Steps

### Step 1: Extend ObjectUtils Class

**File**: `src/utils/ObjectUtils.js`

Add two new static methods:
- `serialise(obj)` - Wrapper around JSON.stringify with consistent formatting
- `deserialise(jsonString)` - JSON.parse + convertDateStringsToObjects with error handling

### Step 2: Refactor FileOperations Methods

**File**: `src/components/FileOperations.js`

**Methods to update**:
- `writeFile(fileId, data)` - Replace `JSON.stringify(data, null, 2)` with `ObjectUtils.serialise(data)`
- `readFile(fileId)` - Replace `JSON.parse(content)` + `ObjectUtils.convertDateStringsToObjects(parsedContent)` with `ObjectUtils.deserialise(content)`
- `createFile(fileName, data, folderId)` - Replace `JSON.stringify(data, null, 2)` with `ObjectUtils.serialise(data)`

### Step 3: Update MasterIndex Methods

**File**: `src/core/MasterIndex.js`

**Methods to update**:
- `save()` - Replace `JSON.stringify(this._data)` with `ObjectUtils.serialise(this._data)`
- `_loadFromScriptProperties()` - Replace `JSON.parse(dataString)` + `ObjectUtils.convertDateStringsToObjects(loadedData)` with `ObjectUtils.deserialise(dataString)`

### Step 4: Update Test Files

**Files to update**:
- `tests/unit/UtilityTests/ObjectUtilsTest.js` - Add new test functions
- `tests/unit/FileOperationsTest.js` - Update existing tests to verify ObjectUtils usage
- `tests/unit/MasterIndexTest.js` - Update existing tests to verify ObjectUtils usage

## Error Handling Strategy

### New Error Scenarios

1. **ObjectUtils.deserialise() with invalid JSON**
   - Throw `InvalidArgumentError` with descriptive message
   - Include original JSON parse error details

2. **ObjectUtils.serialise() with circular references**
   - Let JSON.stringify throw natural error
   - Consider adding circular reference detection if needed

3. **Maintaining existing error types**
   - FileOperations continues to throw `InvalidFileFormatError` for malformed files
   - MasterIndex continues to throw `MasterIndexError` for serialisation failures

### Error Propagation

- **ObjectUtils errors** bubble up to calling components
- **Component-specific errors** maintain their current types and messages
- **Consistent error handling** across all serialisation boundaries

## Benefits Achieved

### Architectural Benefits

1. **Single Responsibility** - ObjectUtils becomes the authoritative serialisation component
2. **DRY Compliance** - Eliminates code duplication across FileOperations and MasterIndex
3. **Consistency** - All components use identical Date handling approach
4. **Maintainability** - Serialisation changes only require updates in one location
5. **Testability** - Serialisation logic can be tested in isolation
6. **Future-proofing** - New components can easily adopt consistent serialisation

### Technical Benefits

1. **Date Integrity** - Guaranteed Date preservation across all storage boundaries
2. **Performance** - Centralised optimisation opportunities
3. **Error Handling** - Consistent error behaviour across all serialisation points
4. **Code Quality** - Cleaner, more focused component responsibilities

## Risk Mitigation

### Backward Compatibility

- **Existing data** continues to work with new deserialisation logic
- **API compatibility** maintained - no breaking changes to public interfaces
- **Gradual migration** possible if needed

### Testing Strategy

- **Unit tests** for isolated ObjectUtils functionality
- **Integration tests** for component interactions
- **Regression tests** to ensure existing functionality preserved
- **Performance tests** to verify no degradation

### Rollback Plan

- **Branch-based development** allows easy rollback
- **Incremental changes** reduce risk of widespread issues
- **Comprehensive testing** before integration

## Success Criteria

1. ✅ All existing tests continue to pass
2. ✅ New ObjectUtils methods fully tested and functional
3. ✅ FileOperations uses ObjectUtils for all serialisation
4. ✅ MasterIndex uses ObjectUtils for all serialisation
5. ✅ Date preservation works consistently across all components
6. ✅ No performance regression
7. ✅ Code duplication eliminated
8. ✅ Error handling remains robust and consistent
9. ✅ Documentation updated to reflect new architecture
10. ✅ Integration tests verify end-to-end functionality

## Future Considerations

### Potential Extensions

1. **Custom serialisation options** - Formatting preferences, compression
2. **Versioning support** - Schema evolution handling
3. **Type preservation** - Beyond Date objects (RegExp, custom classes)
4. **Performance optimisation** - Streaming, partial serialisation

### Architecture Evolution

This refactoring establishes ObjectUtils as the central serialisation authority, providing a foundation for future enhancements to data handling and storage optimisation across the entire GAS-DB system.
