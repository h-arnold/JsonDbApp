# MasterIndex CollectionMetadata Refactoring Plan

## Overview

Refactor `MasterIndex` to use `CollectionMetadata` class instead of manually managing metadata fields as plain JSON objects. This will eliminate code duplication, centralise metadata responsibility, and leverage existing validation in `CollectionMetadata`.

## Current State Analysis

### MasterIndex Currently Manages

- `name` - Collection name
- `fileId` - Google Drive file ID
- `created` - Creation timestamp
- `lastModified` - Last modification timestamp
- `documentCount` - Number of documents
- `modificationToken` - Token for conflict detection
- `lockStatus` - Lock state information

### CollectionMetadata Currently Manages

- `created` - Creation timestamp
- `lastUpdated` - Last update timestamp (equivalent to lastModified)
- `documentCount` - Number of documents

### Gap Analysis

CollectionMetadata needs these additional fields:

- `name` - Collection identifier
- `fileId` - Google Drive file reference
- `modificationToken` - Conflict detection token
- `lockStatus` - Locking state

## TDD Implementation Plan

### Phase 1: ✅ COMPLETED - ObjectUtils Integration for MasterIndex Serialisation 

**STATUS**: ✅ **ALREADY IMPLEMENTED** - MasterIndex now uses `ObjectUtils.serialise()` and `ObjectUtils.deserialise()` methods

### Phase 2: ✅ COMPLETED - Extend CollectionMetadata (Red-Green-Refactor)

**STATUS**: ✅ **COMPLETED** - All functionality implemented, 100% test pass rate achieved, ready for Phase 3

### Phase 3: 🚧 NEXT - Update MasterIndex to Use CollectionMetadata (Red-Green-Refactor)

**STATUS**: 🚧 **READY TO BEGIN** - CollectionMetadata extension complete, MasterIndex integration next

### Phase 2: ✅ GREEN COMPLETE - Extend CollectionMetadata (Red-Green-Refactor)

**STATUS**: ✅ **GREEN PHASE COMPLETED** - All functionality implemented, 100% test pass rate achieved

#### ✅ Test 2.1: CollectionMetadata Constructor with All Fields

**✅ Red**: COMPLETED - Tests written expecting CollectionMetadata to accept name and fileId in constructor
**✅ Green**: COMPLETED - Added name and fileId parameters to CollectionMetadata constructor
**✅ Refactor**: COMPLETED - Ensured validation and clean implementation with backward compatibility

**Implementation Details**:
- ✅ Constructor now supports both `new CollectionMetadata(name, fileId, initialMetadata)` and legacy `new CollectionMetadata(initialMetadata)` signatures
- ✅ Full validation for name (non-empty string) and fileId (string or null)
- ✅ Backward compatibility maintained for existing code

#### ✅ Test 2.2: CollectionMetadata Modification Token Management

**✅ Red**: COMPLETED - Tests written for modificationToken getter/setter with validation
**✅ Green**: COMPLETED - Implemented modificationToken property with validation
**✅ Refactor**: COMPLETED - Optimised implementation with proper validation

**Implementation Details**:
- ✅ `getModificationToken()` and `setModificationToken()` methods implemented
- ✅ Validation: non-empty string or null
- ✅ Included in constructor, toObject(), and clone() methods

#### ✅ Test 2.3: CollectionMetadata Lock Status Management

**✅ Red**: COMPLETED - Tests written for lockStatus getter/setter with validation
**✅ Green**: COMPLETED - Implemented lockStatus property with validation
**✅ Refactor**: COMPLETED - Clean implementation with comprehensive validation

**Implementation Details**:
- ✅ `getLockStatus()` and `setLockStatus()` methods implemented
- ✅ Comprehensive validation for lock status object structure (isLocked, lockedBy, lockedAt, lockTimeout)
- ✅ Deep copy support in toObject() and clone() methods
- ✅ Private `_validateLockStatus()` helper method

#### ✅ Test 2.4: CollectionMetadata Enhanced toObject() Method

**✅ Red**: COMPLETED - Tests written expecting toObject() to include all new fields
**✅ Green**: COMPLETED - Updated toObject() method to include all fields
**✅ Refactor**: COMPLETED - Ensured consistent output format

**Implementation Details**:
- ✅ toObject() now includes: name, fileId, modificationToken, lockStatus
- ✅ Proper deep copying for Date objects and lock status
- ✅ Conditional inclusion of name/fileId when not null

#### ✅ Test 2.5: CollectionMetadata Static Factory Methods

**✅ Red**: COMPLETED - Tests written for static factory methods (fromObject, create)
**✅ Green**: COMPLETED - Implemented static factory methods
**✅ Refactor**: COMPLETED - Optimised and ensured consistency

**Implementation Details**:
- ✅ `static fromObject(obj)` - Creates instance from plain object with validation
- ✅ `static create(name, fileId)` - Factory method for new instances
- ✅ Proper validation and error handling

### Final Test Results Summary

**GREEN Phase Status**: ✅ **COMPLETED WITH 100% SUCCESS**
- **Total Tests**: 36 tests
- **Total Test Suites**: 4 suites
- **Passing Tests**: 36 tests (100%)
- **Failing Tests**: 0 tests (0%)
- **Pass Rate**: 100.0%

**Test Suite Breakdown**:
- ✅ **CollectionMetadata Constructor**: 7/7 passed (100.0%)
- ✅ **CollectionMetadata Update Operations**: 17/17 passed (100.0%)
- ✅ **CollectionMetadata Serialisation**: 8/8 passed (100.0%)
- ✅ **CollectionMetadata Edge Cases**: 4/4 passed (100.0%)

**Key Implementation Achievements**:
- ✅ Constructor with name/fileId parameters (7 tests passing)
- ✅ Modification token management (5 tests passing)
- ✅ Lock status management (5 tests passing)
- ✅ Enhanced serialisation (8 tests passing)
- ✅ Static factory methods (2 tests passing)
- ✅ Edge cases and validation (4 tests passing)
- ✅ Backward compatibility maintained (3 tests passing)

**Bug Fixes Applied**:
- ✅ Fixed test timestamp independence issue with `Utilities.sleep(1)` 
- ✅ Fixed test summary reporting bug (totalSuites and failedTests now show correct values)

**Next Steps**: ✅ **READY FOR PHASE 3** - MasterIndex Integration

### Phase 3: Update MasterIndex to Use CollectionMetadata (Red-Green-Refactor)

#### Test 3.1: MasterIndex Uses CollectionMetadata Instances

**Red**: Update MasterIndexTest to expect CollectionMetadata instances instead of plain objects
**Green**: Modify MasterIndex methods to create and use CollectionMetadata instances
**Refactor**: Remove duplicated metadata logic

#### Test 3.2: MasterIndex addCollection with CollectionMetadata

**Red**: Write tests expecting addCollection to work with CollectionMetadata
**Green**: Update addCollection to create CollectionMetadata instance
**Refactor**: Simplify and clean implementation

#### Test 3.3: MasterIndex updateCollectionMetadata with CollectionMetadata

**Red**: Write tests for updateCollectionMetadata using CollectionMetadata methods
**Green**: Refactor updateCollectionMetadata to use CollectionMetadata instance methods
**Refactor**: Remove manual field manipulation

#### Test 3.4: MasterIndex removeCollection with CollectionMetadata

**Red**: Ensure removeCollection tests work with CollectionMetadata
**Green**: Update removeCollection if needed
**Refactor**: Clean implementation

#### Test 3.5: MasterIndex getCollectionMetadata Returns CollectionMetadata

**Red**: Write tests expecting getCollectionMetadata to return CollectionMetadata instance
**Green**: Update getCollectionMetadata to return CollectionMetadata instance
**Refactor**: Ensure consistent API

### Phase 4: Integration and Cleanup (Red-Green-Refactor)

#### Test 4.1: MasterIndex Internal Storage Format

**Red**: Write tests to ensure internal storage still works correctly with ObjectUtils
**Green**: Ensure proper serialisation/deserialisation of CollectionMetadata with Date preservation
**Refactor**: Optimise storage format

#### Test 4.2: Backward Compatibility

**Red**: Write tests to ensure existing functionality still works
**Green**: Implement any necessary compatibility layers
**Refactor**: Remove unnecessary compatibility code

#### Test 4.3: End-to-End Integration

**Red**: Write integration tests with Collection and Database classes
**Green**: Ensure all components work together with consistent ObjectUtils usage
**Refactor**: Final cleanup and optimisation

## Detailed Implementation Steps

### Step 1: ✅ COMPLETED - ObjectUtils Integration in MasterIndex

**STATUS**: ✅ **ALREADY IMPLEMENTED**

Both `MasterIndex` and `FileOperations` now use the centralised `ObjectUtils.serialise()` and `ObjectUtils.deserialise()` methods:

```javascript
// MasterIndex.save() - CURRENT IMPLEMENTATION
save() {
  try {
    this._data.lastUpdated = new Date().toISOString();
    const dataString = ObjectUtils.serialise(this._data);
    PropertiesService.getScriptProperties().setProperty(this._config.masterIndexKey, dataString);
  } catch (error) {
    throw new ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR('save', error.message);
  }
}

// MasterIndex._loadFromScriptProperties() - CURRENT IMPLEMENTATION
_loadFromScriptProperties() {
  try {
    const dataString = PropertiesService.getScriptProperties().getProperty(this._config.masterIndexKey);
    if (dataString) {
      const loadedData = ObjectUtils.deserialise(dataString);
      this._data = {
        ...this._data,
        ...loadedData
      };
    }
  } catch (error) {
    throw new ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR('load', error.message);
  }
}
```

**Benefits Achieved**:
- ✅ Date objects automatically preserved through serialisation cycles
- ✅ Centralised serialisation logic in ObjectUtils
- ✅ Consistent pattern with FileOperations
- ✅ Eliminated duplicate JSON handling code

### Step 2: Extend CollectionMetadata Class

```javascript
class CollectionMetadata {
  constructor(name = null, fileId = null, initialMetadata = {}) {
    // Validate and set all properties
    // Include: name, fileId, created, lastUpdated, documentCount, modificationToken, lockStatus
    this.name = name;
    this.fileId = fileId;
    // ... existing metadata properties
    this.modificationToken = initialMetadata.modificationToken || null;
    this.lockStatus = initialMetadata.lockStatus || null;
  }
  
  // New getters/setters for:
  // - name (with validation)
  // - fileId (with validation)  
  // - modificationToken (with validation)
  // - lockStatus (with validation)
  
  // Enhanced methods:
  // - toObject() - include all fields
  // - static fromObject(obj) - create from plain object with Date conversion
  // - static create(name, fileId) - factory method
}
```

### Step 3: Refactor MasterIndex Methods

```javascript
class MasterIndex {
  addCollection(name, fileId, metadata = {}) {
    const collectionMetadata = CollectionMetadata.create(name, fileId, metadata);
    // Store using toObject() - dates automatically preserved via ObjectUtils
    this._data.collections[name] = collectionMetadata.toObject();
  }
  
  getCollectionMetadata(name) {
    const data = this._data.collections[name];
    if (!data) return null;
    
    // Dates are already converted by ObjectUtils during load
    return CollectionMetadata.fromObject(data);
  }
  
  updateCollectionMetadata(name, updates) {
    const metadata = this.getCollectionMetadata(name);
    if (!metadata) {
      throw new ErrorHandler.ErrorTypes.COLLECTION_NOT_FOUND(name);
    }
    
    // Apply updates using CollectionMetadata methods
    // Store back using toObject()
    this._data.collections[name] = metadata.toObject();
  }
}
```

### Step 4: ObjectUtils Extensions (if needed)

**Current ObjectUtils capabilities are sufficient** - no extensions needed:

- `deepClone()` - already handles Date preservation
- `convertDateStringsToObjects()` - already handles ISO string conversion  
- `_isISODateString()` - already validates ISO format

**Pattern consistency**: MasterIndex will follow the same pattern as FileOperations:

1. **Save**: `JSON.stringify()` converts Dates to ISO strings automatically
2. **Load**: `JSON.parse()` + `ObjectUtils.convertDateStringsToObjects()` restores Dates

### Step 5: Enhanced Error Handling

**No new error types needed** - existing errors will work:

- `MasterIndexError` for serialisation failures
- `InvalidArgumentError` for CollectionMetadata validation
- `CollectionNotFoundError` for missing collections

### ObjectUtils Serialisation Integration Summary

### ✅ COMPLETED - Key Architectural Benefit Achieved

The centralised serialisation approach is **already implemented**. Both `MasterIndex` and `FileOperations` now use `ObjectUtils.serialise()` and `ObjectUtils.deserialise()` methods, ensuring **consistent Date handling across the entire codebase**:

- ✅ **FileOperations**: Uses ObjectUtils for Drive file serialisation/deserialisation
- ✅ **MasterIndex**: Uses ObjectUtils for ScriptProperties serialisation/deserialisation  
- ✅ **DocumentOperations**: Uses ObjectUtils.deepClone() for in-memory operations

### Current Implementation Status

#### ✅ MasterIndex.save() Method - IMPLEMENTED
```javascript
const dataString = ObjectUtils.serialise(this._data); // Dates auto-convert to ISO
```

#### ✅ MasterIndex._loadFromScriptProperties() Method - IMPLEMENTED
```javascript
const loadedData = ObjectUtils.deserialise(dataString); // Automatically converts ISO strings back to Date objects
this._data = { ...this._data, ...loadedData };
```

### ✅ Pattern Consistency Achieved

**Identical serialisation patterns** now exist across all storage boundaries:

1. ✅ **Drive Files** (FileOperations): `ObjectUtils.serialise()` → Drive → `ObjectUtils.deserialise()`
2. ✅ **ScriptProperties** (MasterIndex): `ObjectUtils.serialise()` → ScriptProperties → `ObjectUtils.deserialise()`

### ✅ ObjectUtils Capabilities - Complete and Sufficient

Current ObjectUtils provides all required functionality:

- ✅ `serialise()` - JSON.stringify with automatic Date preservation
- ✅ `deserialise()` - JSON.parse + automatic Date restoration
- ✅ `deepClone()` - Date-preserving deep cloning
- ✅ `convertDateStringsToObjects()` - ISO string to Date conversion  
- ✅ `_isISODateString()` - ISO format validation

### ✅ Benefits Achieved

1. ✅ **Date serialisation consistency** across all storage mechanisms
2. ✅ **Centralised serialisation responsibility** in ObjectUtils
3. ✅ **Architectural consistency** maintained
4. ✅ **Zero breaking changes** - existing functionality preserved
5. ✅ **Foundation ready** for CollectionMetadata refactor

## Testing Strategy

### Unit Tests Priority

1. CollectionMetadata extended functionality
2. MasterIndex with CollectionMetadata integration
3. Edge cases and error conditions
4. Backward compatibility

### Integration Tests

1. MasterIndex + CollectionMetadata working together
2. Collection class using updated MasterIndex
3. Database operations with new metadata handling

## Success Criteria

1. All existing tests pass
2. No functionality regression
3. Code duplication eliminated
4. Metadata validation centralised in CollectionMetadata
5. DRY principles adhered to
6. Maintainable, clean code structure

## Risk Mitigation

1. **Backward Compatibility**: Ensure existing stored metadata can be read
2. **Data Migration**: Handle existing collections gracefully
3. **Performance**: Ensure no performance degradation
4. **Testing Coverage**: Maintain high test coverage throughout refactoring

## Implementation Timeline

1. **Phase 1**: ✅ **COMPLETED** - ObjectUtils Integration for MasterIndex Serialisation 
2. **Phase 2**: ✅ **RED COMPLETED** - Extend CollectionMetadata (TDD cycles 2.1-2.5)
3. **Phase 3**: **NEXT** - Refactor MasterIndex to use CollectionMetadata (TDD cycles 3.1-3.5)  
4. **Phase 4**: **PENDING** - Integration and cleanup (TDD cycles 4.1-4.3)

**Current Status**: Phase 2 RED complete. Ready to proceed with Phase 2 GREEN - implementing CollectionMetadata extensions.

Each remaining phase follows strict Red-Green-Refactor cycles with comprehensive testing.

## Important Notes

### ✅ Serialisation Consolidation Complete

The ObjectUtils serialisation consolidation has been **successfully implemented**:

- ✅ **MasterIndex** now uses `ObjectUtils.serialise()` and `ObjectUtils.deserialise()`
- ✅ **FileOperations** uses the same centralised serialisation methods
- ✅ **Consistent Date handling** across all storage boundaries
- ✅ **Code duplication eliminated** - all JSON logic centralised in ObjectUtils

### Ready for CollectionMetadata Integration

With the serialisation foundation complete, the refactor can now focus on:

1. **Phase 2**: Extending CollectionMetadata with additional fields
2. **Phase 3**: Integrating CollectionMetadata into MasterIndex  
3. **Phase 4**: Final integration and cleanup

**Key Advantage**: The consistent serialisation approach means CollectionMetadata instances will automatically have proper Date handling when stored/retrieved through MasterIndex, with no additional serialisation logic required.

## 🎉 Phase 2 Completion Summary

### What Was Accomplished

**GREEN Phase Implementation** successfully completed for CollectionMetadata extension:

#### ✅ Major Features Implemented
1. **Multi-signature Constructor**: Supports both new `(name, fileId, metadata)` and legacy `(metadata)` signatures
2. **Modification Token Management**: Full getter/setter with validation  
3. **Lock Status Management**: Complete object validation and management
4. **Enhanced Serialisation**: toObject() includes all properties with proper deep copying
5. **Static Factory Methods**: fromObject() and create() for flexible instantiation
6. **Backward Compatibility**: Existing code continues to work unchanged

#### ✅ Technical Achievements
- **100% Test Pass Rate**: 36/36 tests passing across 4 test suites
- **Comprehensive Validation**: Input validation for all new properties
- **Date Preservation**: Automatic Date handling through ObjectUtils integration
- **Type Safety**: Robust type checking and error reporting
- **Memory Management**: Proper deep copying prevents reference issues

#### ✅ Quality Metrics
- **Test Coverage**: All new functionality covered by comprehensive tests
- **Error Handling**: Proper InvalidArgumentError exceptions with descriptive messages  
- **Documentation**: Full JSDoc coverage for all new methods and properties
- **Code Quality**: Clean, maintainable implementation following SOLID principles

### Next Phase Ready

✅ **Phase 3 Prerequisites Met**:
- CollectionMetadata class fully extended with all required MasterIndex fields
- All tests passing with robust validation
- Backward compatibility maintained
- ObjectUtils integration provides consistent serialisation
- Static factory methods enable flexible instantiation patterns

**Phase 3 Objective**: Integrate extended CollectionMetadata into MasterIndex to eliminate code duplication and centralise metadata responsibility.

**Estimated Phase 3 Scope**: Update MasterIndex methods to use CollectionMetadata instances instead of manual JSON object manipulation, maintaining all existing functionality while leveraging the new validation and management capabilities.

## Implementation Timeline

- ✅ **Phase 1**: ObjectUtils Integration (Already Complete)
- ✅ **Phase 2**: CollectionMetadata Extension (Completed - 100% Success)  
- 🚧 **Phase 3**: MasterIndex Integration (Ready to Begin)
- 📋 **Phase 4**: Integration Testing and Cleanup (Pending Phase 3)