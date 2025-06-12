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

The following has been completed:
- ✅ MasterIndex `save()` method uses `ObjectUtils.serialise(this._data)`
- ✅ MasterIndex `_loadFromScriptProperties()` method uses `ObjectUtils.deserialise(dataString)`
- ✅ Date preservation through save/load cycles is now automatic
- ✅ Consistent serialisation pattern with FileOperations established

**No further work needed for Phase 1** - proceed directly to Phase 2.

### Phase 2: ✅ RED COMPLETE - Extend CollectionMetadata (Red-Green-Refactor)

**STATUS**: ✅ **RED PHASE COMPLETED** - All failing tests implemented and pushed

#### ✅ Test 2.1: CollectionMetadata Constructor with All Fields

**✅ Red**: COMPLETED - Tests written expecting CollectionMetadata to accept name and fileId in constructor
- ✅ `should create metadata with name and fileId parameters` - Tests 3-parameter constructor
- ✅ `should create metadata with name only` - Tests 1-parameter constructor  
- ✅ `should throw error for invalid name type` - Validates string requirement
- ✅ `should throw error for empty name string` - Validates non-empty requirement
- ✅ `should throw error for invalid fileId type` - Validates string/null requirement

**Green**: NEXT - Add name and fileId parameters to CollectionMetadata constructor
**Refactor**: NEXT - Ensure validation and clean implementation

#### ✅ Test 2.2: CollectionMetadata Modification Token Management

**✅ Red**: COMPLETED - Tests written for modificationToken getter/setter with validation
- ✅ `should get and set modificationToken` - Tests basic getter/setter functionality
- ✅ `should include modificationToken in toObject output` - Tests serialisation
- ✅ `should throw error for invalid modificationToken type` - Validates string requirement
- ✅ `should throw error for empty modificationToken` - Validates non-empty requirement
- ✅ `should allow null modificationToken` - Tests null assignment
**Green**: NEXT - Implement modificationToken property with validation
**Refactor**: NEXT - Optimise implementation

#### ✅ Test 2.3: CollectionMetadata Lock Status Management

**✅ Red**: COMPLETED - Tests written for lockStatus getter/setter with validation
- ✅ `should get and set lockStatus` - Tests lockStatus object management
- ✅ `should include lockStatus in toObject output` - Tests serialisation
- ✅ `should throw error for invalid lockStatus type` - Validates object requirement
- ✅ `should validate lockStatus properties` - Validates internal structure
- ✅ `should allow null lockStatus` - Tests null assignment

**Green**: NEXT - Implement lockStatus property with validation
**Refactor**: NEXT - Clean up implementation

#### ✅ Test 2.4: CollectionMetadata Enhanced toObject() Method

**✅ Red**: COMPLETED - Tests written expecting toObject() to include all new fields
- ✅ `should include all fields in toObject output` - Tests complete serialisation
- ✅ Enhanced clone tests with new properties

**Green**: NEXT - Update toObject() method to include name, fileId, modificationToken, lockStatus
**Refactor**: NEXT - Ensure consistent output format

#### ✅ Test 2.5: CollectionMetadata Static Factory Methods

**✅ Red**: COMPLETED - Tests written for static factory methods (fromObject, create)
- ✅ `should create instance from object using fromObject factory` - Tests deserialisation factory
- ✅ `should create instance using create factory method` - Tests creation factory
- ✅ `should throw error for invalid object in fromObject` - Validates input
- ✅ `should throw error for missing required fields in fromObject` - Validates completeness

**Green**: NEXT - Implement static factory methods for creating instances
**Refactor**: NEXT - Optimise and ensure consistency

### Current Test Results Summary

**RED Phase Status**: ✅ COMPLETED
- **Total Tests**: 36 tests written
- **Expected Failures**: 19 tests failing (expected for RED phase)
- **Passing Tests**: 17 tests (existing functionality)
- **Pass Rate**: 47.2% (expected during RED phase)

**Key Failing Test Categories** (as expected):
- Constructor with name/fileId parameters (2 tests)
- Modification token management (5 tests) 
- Lock status management (5 tests)
- Enhanced serialisation (5 tests)
- Static factory methods (2 tests)

**Next Steps**: Proceed to GREEN phase implementation

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