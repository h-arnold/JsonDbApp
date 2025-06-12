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

### Phase 1: Extend CollectionMetadata (Red-Green-Refactor)

#### Test 1.1: CollectionMetadata Constructor with All Fields

**Red**: Write test expecting CollectionMetadata to accept name and fileId in constructor
**Green**: Add name and fileId parameters to CollectionMetadata constructor
**Refactor**: Ensure validation and clean implementation

#### Test 1.2: CollectionMetadata Modification Token Management

**Red**: Write tests for modificationToken getter/setter with validation
**Green**: Implement modificationToken property with validation
**Refactor**: Optimise implementation

#### Test 1.3: CollectionMetadata Lock Status Management

**Red**: Write tests for lockStatus getter/setter with validation
**Green**: Implement lockStatus property with validation
**Refactor**: Clean up implementation

#### Test 1.4: CollectionMetadata Enhanced toObject() Method

**Red**: Write tests expecting toObject() to include all new fields
**Green**: Update toObject() method to include name, fileId, modificationToken, lockStatus
**Refactor**: Ensure consistent output format

#### Test 1.5: CollectionMetadata Static Factory Methods

**Red**: Write tests for static factory methods (fromObject, create)
**Green**: Implement static factory methods for creating instances
**Refactor**: Optimise and ensure consistency

### Phase 2: Update MasterIndex to Use CollectionMetadata (Red-Green-Refactor)

#### Test 2.1: MasterIndex Uses CollectionMetadata Instances

**Red**: Update MasterIndexTest to expect CollectionMetadata instances instead of plain objects
**Green**: Modify MasterIndex methods to create and use CollectionMetadata instances
**Refactor**: Remove duplicated metadata logic

#### Test 2.2: MasterIndex addCollection with CollectionMetadata

**Red**: Write tests expecting addCollection to work with CollectionMetadata
**Green**: Update addCollection to create CollectionMetadata instance
**Refactor**: Simplify and clean implementation

#### Test 2.3: MasterIndex updateCollectionMetadata with CollectionMetadata

**Red**: Write tests for updateCollectionMetadata using CollectionMetadata methods
**Green**: Refactor updateCollectionMetadata to use CollectionMetadata instance methods
**Refactor**: Remove manual field manipulation

#### Test 2.4: MasterIndex removeCollection with CollectionMetadata

**Red**: Ensure removeCollection tests work with CollectionMetadata
**Green**: Update removeCollection if needed
**Refactor**: Clean implementation

#### Test 2.5: MasterIndex getCollectionMetadata Returns CollectionMetadata

**Red**: Write tests expecting getCollectionMetadata to return CollectionMetadata instance
**Green**: Update getCollectionMetadata to return CollectionMetadata instance
**Refactor**: Ensure consistent API

### Phase 3: Integration and Cleanup (Red-Green-Refactor)

#### Test 3.1: MasterIndex Internal Storage Format

**Red**: Write tests to ensure internal storage still works correctly
**Green**: Ensure proper serialisation/deserialisation of CollectionMetadata
**Refactor**: Optimise storage format

#### Test 3.2: Backward Compatibility

**Red**: Write tests to ensure existing functionality still works
**Green**: Implement any necessary compatibility layers
**Refactor**: Remove unnecessary compatibility code

#### Test 3.3: End-to-End Integration

**Red**: Write integration tests with Collection and Database classes
**Green**: Ensure all components work together
**Refactor**: Final cleanup and optimisation

## Detailed Implementation Steps

### Step 1: Extend CollectionMetadata Class

```javascript
class CollectionMetadata {
  constructor(name = null, fileId = null, documentCount = 0) {
    // Validate and set all properties
    // Include: name, fileId, created, lastUpdated, documentCount, modificationToken, lockStatus
  }
  
  // New getters/setters for:
  // - name (with validation)
  // - fileId (with validation)  
  // - modificationToken (with validation)
  // - lockStatus (with validation)
  
  // Enhanced methods:
  // - toObject() - include all fields
  // - static fromObject(obj) - create from plain object
  // - static create(name, fileId) - factory method
}
```

### Step 2: Refactor MasterIndex Methods

```javascript
class MasterIndex {
  addCollection(name, fileId) {
    const metadata = CollectionMetadata.create(name, fileId);
    // Store metadata using toObject()
  }
  
  getCollectionMetadata(name) {
    const data = this._getStoredData(name);
    return CollectionMetadata.fromObject(data);
  }
  
  updateCollectionMetadata(name, updates) {
    const metadata = this.getCollectionMetadata(name);
    // Use CollectionMetadata methods to update
    // Store using toObject()
  }
}
```

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

1. **Phase 1**: Extend CollectionMetadata (TDD cycles 1.1-1.5)
2. **Phase 2**: Refactor MasterIndex (TDD cycles 2.1-2.5)  
3. **Phase 3**: Integration and cleanup (TDD cycles 3.1-3.3)

Each phase follows strict Red-Green-Refactor cycles with comprehensive testing.
