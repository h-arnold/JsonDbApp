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

### Phase 1: ObjectUtils Integration for MasterIndex Serialisation (Red-Green-Refactor)

#### Test 1.1: MasterIndex Date Preservation Through Save/Load Cycles

**Red**: Write test expecting Date objects to survive MasterIndex save/load cycles
**Green**: Update MasterIndex `save()` and `_loadFromScriptProperties()` to use ObjectUtils
**Refactor**: Ensure consistent date handling pattern with FileOperations

#### Test 1.2: MasterIndex ObjectUtils Integration Pattern

**Red**: Write tests verifying ObjectUtils usage in MasterIndex follows FileOperations pattern
**Green**: Implement ObjectUtils integration in both save and load methods
**Refactor**: Consolidate serialisation approach across codebase

### Phase 2: Extend CollectionMetadata (Red-Green-Refactor)

#### Test 2.1: CollectionMetadata Constructor with All Fields

**Red**: Write test expecting CollectionMetadata to accept name and fileId in constructor
**Green**: Add name and fileId parameters to CollectionMetadata constructor
**Refactor**: Ensure validation and clean implementation

#### Test 2.2: CollectionMetadata Modification Token Management

**Red**: Write tests for modificationToken getter/setter with validation
**Green**: Implement modificationToken property with validation
**Refactor**: Optimise implementation

#### Test 2.3: CollectionMetadata Lock Status Management

**Red**: Write tests for lockStatus getter/setter with validation
**Green**: Implement lockStatus property with validation
**Refactor**: Clean up implementation

#### Test 2.4: CollectionMetadata Enhanced toObject() Method

**Red**: Write tests expecting toObject() to include all new fields
**Green**: Update toObject() method to include name, fileId, modificationToken, lockStatus
**Refactor**: Ensure consistent output format

#### Test 2.5: CollectionMetadata Static Factory Methods

**Red**: Write tests for static factory methods (fromObject, create)
**Green**: Implement static factory methods for creating instances
**Refactor**: Optimise and ensure consistency

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

### Step 1: Integrate ObjectUtils into MasterIndex

```javascript
class MasterIndex {
  save() {
    try {
      this._data.lastUpdated = new Date().toISOString();
      const dataString = JSON.stringify(this._data);
      PropertiesService.getScriptProperties().setProperty(this._config.masterIndexKey, dataString);
    } catch (error) {
      throw new ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR('save', error.message);
    }
  }
  
  _loadFromScriptProperties() {
    try {
      const dataString = PropertiesService.getScriptProperties().getProperty(this._config.masterIndexKey);
      if (dataString) {
        const loadedData = JSON.parse(dataString);
        // Convert ISO date strings back to Date objects (following FileOperations pattern)
        ObjectUtils.convertDateStringsToObjects(loadedData);
        
        this._data = {
          ...this._data,
          ...loadedData
        };
      }
    } catch (error) {
      throw new ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR('load', error.message);
    }
  }
}
```

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

## ObjectUtils Integration Summary

### Key Architectural Benefit

Using `ObjectUtils` for MasterIndex serialisation **consolidates all serialisation logic** to a single utility class, ensuring consistent Date handling across the entire codebase:

- **FileOperations**: Already uses ObjectUtils for Drive file serialisation/deserialisation
- **MasterIndex**: Will use ObjectUtils for ScriptProperties serialisation/deserialisation  
- **DocumentOperations**: Already uses ObjectUtils.deepClone() for in-memory operations

### Specific Changes Required

#### MasterIndex.save() Method

```javascript
// BEFORE (loses Date objects):
const dataString = JSON.stringify(this._data);

// AFTER (preserves Dates as ISO strings):
const dataString = JSON.stringify(this._data); // Same - Dates auto-convert to ISO
```

#### MasterIndex._loadFromScriptProperties() Method

```javascript
// BEFORE (dates remain as ISO strings):
const loadedData = JSON.parse(dataString);
this._data = { ...this._data, ...loadedData };

// AFTER (converts ISO strings back to Date objects):
const loadedData = JSON.parse(dataString);
ObjectUtils.convertDateStringsToObjects(loadedData); // Key addition
this._data = { ...this._data, ...loadedData };
```

### Pattern Consistency

This creates **identical serialisation patterns** across all storage boundaries:

1. **Drive Files** (FileOperations): `JSON.stringify()` → Drive → `JSON.parse()` + `ObjectUtils.convertDateStringsToObjects()`
2. **ScriptProperties** (MasterIndex): `JSON.stringify()` → ScriptProperties → `JSON.parse()` + `ObjectUtils.convertDateStringsToObjects()`

### No ObjectUtils Extensions Needed

Current ObjectUtils capabilities are **complete and sufficient**:

- ✅ `deepClone()` - Date-preserving deep cloning
- ✅ `convertDateStringsToObjects()` - ISO string to Date conversion  
- ✅ `_isISODateString()` - ISO format validation

### Benefits Achieved

1. **Eliminates Date serialisation bugs** in MasterIndex save/load cycles
2. **Centralises serialisation responsibility** in ObjectUtils
3. **Maintains architectural consistency** with existing FileOperations pattern
4. **Zero breaking changes** - existing functionality preserved
5. **Foundation for CollectionMetadata refactor** - dates properly handled

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

1. **Phase 1**: ObjectUtils Integration for MasterIndex Serialisation (TDD cycles 1.1-1.2)
2. **Phase 2**: Extend CollectionMetadata (TDD cycles 2.1-2.5)
3. **Phase 3**: Refactor MasterIndex to use CollectionMetadata (TDD cycles 3.1-3.5)  
4. **Phase 4**: Integration and cleanup (TDD cycles 4.1-4.3)

Each phase follows strict Red-Green-Refactor cycles with comprehensive testing.
