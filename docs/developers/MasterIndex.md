# MasterIndex Developer Documentation

- [MasterIndex Developer Documentation](#masterindex-developer-documentation)
  - [Overview](#overview)
  - [Internal Helper Components](#internal-helper-components)
    - [MasterIndexMetadataNormaliser](#masterindexmetadatanormaliser)
    - [MasterIndexLockManager Helper Methods ⭐ NEW in v0.0.5](#masterindexlockmanager-helper-methods--new-in-v005)
      - [`_setAndPersistLockStatus(collectionName, collection, lockStatus)`](#_setandpersistlockstatuscollectionname-collection-lockstatus)
    - [MasterIndexConflictResolver Helper Methods ⭐ NEW in v0.0.5](#masterindexconflictresolver-helper-methods--new-in-v005)
      - [`_applyMetadataUpdates(collectionMetadata, updates)`](#_applymetadataupdatescollectionmetadata-updates)
  - [Core Workflow](#core-workflow)
    - [Collection Access Protocol](#collection-access-protocol)
    - [Virtual Locking](#virtual-locking)
    - [Data Structure](#data-structure)
  - [Constructor](#constructor)
  - [API Reference](#api-reference)
    - [Core Methods](#core-methods)
      - [`addCollection(name, metadata)`](#addcollectionname-metadata)
      - [`getCollection(name)` / `getCollections()`](#getcollectionname--getcollections)
      - [`updateCollectionMetadata(name, updates)`](#updatecollectionmetadataname-updates)
      - [`removeCollection(name)`](#removecollectionname)
      - [`getCollections()`](#getcollections)
    - [Locking Methods](#locking-methods)
      - [`acquireLock(collectionName, operationId)`](#acquirelockcollectionname-operationid)
      - [`releaseLock(collectionName, operationId)`](#releaselockcollectionname-operationid)
      - [`isLocked(collectionName)`](#islockedcollectionname)
      - [`cleanupExpiredLocks()`](#cleanupexpiredlocks)
    - [Conflict Management](#conflict-management)
      - [`hasConflict(collectionName, expectedToken)`](#hasconflictcollectionname-expectedtoken)
      - [`resolveConflict(collectionName, newData, strategy)`](#resolveconflictcollectionname-newdata-strategy)
      - [`generateModificationToken()`](#generatemodificationtoken)
      - [`validateModificationToken(token)`](#validatemodificationtokentoken)
  - [Usage Examples](#usage-examples)
    - [Basic Operations](#basic-operations)
    - [Locking Pattern](#locking-pattern)
    - [Conflict Resolution](#conflict-resolution)
  - [Integration with Database Class](#integration-with-database-class)
    - [Collection Lifecycle Integration](#collection-lifecycle-integration)
    - [Data Synchronisation](#data-synchronisation)
    - [Locking Coordination](#locking-coordination)
  - [Error Types](#error-types)
  - [Best Practices](#best-practices)

## Overview

The `MasterIndex` class manages cross-instance coordination for GAS DB using ScriptProperties. It provides virtual locking, conflict detection, and collection metadata management. Following the Section 4 refactoring, `MasterIndex` serves as the **primary source of truth** for collection metadata, with the `Database` class delegating all collection management operations to it.

**Key Responsibilities:**

- Cross-instance coordination via ScriptProperties
- Virtual locking for collection access
- Conflict detection using modification tokens
- Collection metadata management (primary source of truth)
- Integration with Database class for collection lifecycle management

**Storage:** ScriptProperties with key `GASDB_MASTER_INDEX`

**Integration with Database Class:**
The `Database` class delegates collection operations to `MasterIndex`:

- Collection creation, access, and deletion
- Collection listing and metadata retrieval
- Backup synchronisation to Drive-based index files

## Internal Helper Components

### MasterIndexMetadataNormaliser

**Location:** [src/04_core/MasterIndex/01_MasterIndexMetadataNormaliser.js](../../src/04_core/MasterIndex/01_MasterIndexMetadataNormaliser.js)

Encapsulates the transformation of incoming metadata into `CollectionMetadata` instances. The normaliser clamps timestamps, clones lock status payloads, and ensures modification tokens are generated when missing. This keeps `_addCollectionInternal` and bulk operations lean while guaranteeing consistent metadata regardless of input type (plain object or existing `CollectionMetadata`).

### MasterIndexLockManager Helper Methods ⭐ NEW in v0.0.5

**Location:** [src/04_core/MasterIndex/02_MasterIndexLockManager.js](../../src/04_core/MasterIndex/02_MasterIndexLockManager.js)

**Added in:** MI2 refactoring

#### `_setAndPersistLockStatus(collectionName, collection, lockStatus)`

Centralized helper for setting and persisting lock status with guaranteed ordering.

- **Parameters:**
  - `collectionName` (String): Name of collection to update
  - `collection` (CollectionMetadata): Collection metadata object
  - `lockStatus` (Object|null): Lock status to apply
- **Behaviour:**
  1. Sets lock status on collection metadata
  2. Persists to MasterIndex via `_updateCollectionMetadataInternal()`
- **Usage:** Used by `acquireCollectionLock()`, `releaseCollectionLock()`, `cleanupExpiredLocks()`
- **Benefits:** Single source of truth for lock persistence, guaranteed update ordering

### MasterIndexConflictResolver Helper Methods ⭐ NEW in v0.0.5

**Location:** [src/04_core/MasterIndex/04_MasterIndexConflictResolver.js](../../src/04_core/MasterIndex/04_MasterIndexConflictResolver.js)

**Added in:** MI1 refactoring

#### `_applyMetadataUpdates(collectionMetadata, updates)`

Centralized helper for applying metadata field updates during conflict resolution.

- **Parameters:**
  - `collectionMetadata` (CollectionMetadata): Metadata object to update
  - `updates` (Object): Map of field names to values
- **Behaviour:**
  - Iterates through update keys
  - Applies known fields (`documentCount`, `lockStatus`) via setter methods
  - Ignores unknown fields
- **Usage:** Used by `_applyLastWriteWins()` for conflict resolution
- **Benefits:** Single source of truth for metadata updates, consistent update semantics, easier to extend

## Core Workflow

### Collection Access Protocol

Database class collection access follows this protocol when delegating to MasterIndex:

```javascript
// 1. Database.getCollection() or Database.createCollection() delegates to MasterIndex
// 2. Acquire virtual lock for thread safety
const acquired = masterIndex.acquireLock('users', operationId);

// 3. Check for conflicts (if updating existing collection)
const hasConflict = masterIndex.hasConflict('users', expectedToken);

// 4. Perform operations (Database coordinates with Drive operations)
// 5. Update metadata with new modification token
masterIndex.updateCollectionMetadata('users', updates);

// 6. Release lock
masterIndex.releaseLock('users', operationId);
```

### Virtual Locking

Prevents concurrent modifications across script instances:

- Locks expire automatically (default: 30 seconds)
- Operation ID required for lock acquisition/release
- Expired locks are cleaned up automatically

### Data Structure

```javascript
{
  version: Number,
  lastUpdated: String,
  collections: {
    [collectionName]: {
      name: String,
      fileId: String | null,
      created: String,
      lastModified: String,
      documentCount: Number,
      modificationToken: String,
      lockStatus: null | { lockedBy: String, lockedAt: String, expiresAt: String }
    }
  },
  locks: {
    [collectionName]: { lockedBy: String, lockedAt: String, expiresAt: String }
  }
}
```

## Constructor

```javascript
class MasterIndex {
  constructor(config = {}) {
    // ...
  }
}
```

**Parameters:**

- `config.masterIndexKey` (String): ScriptProperties key (default: 'GASDB_MASTER_INDEX')
- `config.lockTimeout` (Number): Lock timeout in ms (default: 30000)
- `config.version` (Number): Master index version (default: 1)

**Behaviour:** Creates configuration, initialises data structure, loads from ScriptProperties if available.

## API Reference

### Core Methods

#### `addCollection(name, metadata)`

Adds collection to master index. Called by `Database.createCollection()` during collection creation.

- `name` (String): Collection name
- `metadata` (Object): Collection metadata (fileId, documentCount, etc.)
- **Returns:** Collection data object
- **Throws:** `CONFIGURATION_ERROR` for invalid name
- **Database Integration:** Primary method used by Database class to register new collections

#### `getCollection(name)` / `getCollections()`

Retrieves collection metadata. Used by `Database.getCollection()` and `Database.listCollections()` to access collection information.

- **Returns:** Collection object or collections map
- **Database Integration:** Called by Database class methods to check for existing collections before creation or access

#### `updateCollectionMetadata(name, updates)`

Updates collection metadata with new modification token.

- `updates` (Object): Metadata changes
- **Returns:** Updated collection data

#### `removeCollection(name)`

Removes a collection from the master index. Called by `Database.dropCollection()` during collection deletion.

- `name` (String): Collection name to remove
- **Returns:** Boolean - `true` if the collection was removed, `false` otherwise
- **Database Integration:** Used by Database class to remove collections from the primary metadata store

#### `getCollections()`

Retrieves all collections in the master index.

- **Returns:** Object - map of collection metadata

### Locking Methods

#### `acquireLock(collectionName, operationId)`

Acquires virtual lock for collection. Used by Database class before performing collection operations.

- **Returns:** `true` if successful, `false` if already locked
- **Database Integration:** Called by Database methods during collection creation, modification, and deletion

#### `releaseLock(collectionName, operationId)`

Releases virtual lock (must match operation ID).

#### `isLocked(collectionName)`

Checks if collection is currently locked.

#### `cleanupExpiredLocks()`

Removes expired locks.

### Conflict Management

#### `hasConflict(collectionName, expectedToken)`

Checks if collection was modified since token was generated.

#### `resolveConflict(collectionName, newData, strategy)`

Resolves conflicts using specified strategy ('LAST_WRITE_WINS').

#### `generateModificationToken()`

Creates unique modification token.

#### `validateModificationToken(token)`

Validates token format (timestamp-randomstring).

## Usage Examples

### Basic Operations

```javascript
// Typically called via Database class, not directly
const masterIndex = new MasterIndex();

// Database.createCollection() triggers this workflow:
const collection = masterIndex.addCollection('users', {
  fileId: 'abc123',
  documentCount: 0
});

// Database.getCollection() and Database.listCollections() use:
const users = masterIndex.getCollection('users');

// Collection operations trigger metadata updates:
masterIndex.updateCollectionMetadata('users', {
  documentCount: 5
});
```

### Locking Pattern

```javascript
const operationId = 'op_' + Date.now();

if (masterIndex.acquireLock('users', operationId)) {
  try {
    // Perform operations
    masterIndex.updateCollectionMetadata('users', updates);
  } finally {
    masterIndex.releaseLock('users', operationId);
  }
}
```

### Conflict Resolution

```javascript
const expectedToken = 'previously-read-token';

if (masterIndex.hasConflict('users', expectedToken)) {
  const resolution = masterIndex.resolveConflict('users', newData, 'LAST_WRITE_WINS');
} else {
  masterIndex.updateCollectionMetadata('users', newData);
}
```

## Integration with Database Class

The `MasterIndex` serves as the primary source of truth for collection metadata, working closely with the `Database` class in the following ways:

### Collection Lifecycle Integration

**Creation Flow:**

1. `Database.createCollection()` validates collection name
2. Database creates Drive file for collection data
3. Database calls `MasterIndex.addCollection()` to register metadata
4. Database updates Drive-based index file as backup
5. Database caches collection object in memory

**Access Flow:**

1. `Database.getCollection()` checks in-memory cache first
2. If not cached, Database calls `MasterIndex.getCollection()`
3. If not in MasterIndex, Database falls back to Drive index file
4. Auto-creation triggers if enabled and collection doesn't exist

**Deletion Flow:**

1. `Database.dropCollection()` removes from memory cache
2. Database calls `MasterIndex.removeCollection()` to update metadata
3. Database deletes Drive file and updates index file

### Data Synchronisation

The Database class maintains consistency between MasterIndex and Drive-based storage:

- **Primary Operations:** MasterIndex handles all metadata operations
- **Backup Operations:** Database synchronises to Drive index file via `backupIndexToDrive()`
- **Recovery Operations:** Database can restore from Drive index to MasterIndex if needed

### Locking Coordination

Database class uses MasterIndex locking for thread safety:

```javascript
// Example from Database.createCollection()
const operationId = 'create_' + Date.now();
if (this._masterIndex.acquireLock(name, operationId)) {
  try {
    // Perform Drive operations
    const driveFileId = this._fileService.createFile(fileName, data, folderId);
    // Update MasterIndex
    this._masterIndex.addCollection(name, { fileId: driveFileId });
  } finally {
    this._masterIndex.releaseLock(name, operationId);
  }
}
```

## Error Types

- **`CONFIGURATION_ERROR`**: Invalid parameters
- **`COLLECTION_NOT_FOUND`**: Collection doesn't exist
- **`LOCK_TIMEOUT`**: Failed to acquire ScriptLock
- **`MASTER_INDEX_ERROR`**: General operation failures

## Best Practices

1. **Always release locks** in finally blocks
2. **Use appropriate timeouts** for lock operations
3. **Handle lock acquisition failures** with retry logic
4. **Validate modification tokens** before updates
5. **Clean up expired locks** periodically
