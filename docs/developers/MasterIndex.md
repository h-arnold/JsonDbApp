# MasterIndex Developer Documentation

## Overview

The `MasterIndex` class manages cross-instance coordination for GAS DB using ScriptProperties. It provides virtual locking, conflict detection, and collection metadata management.

**Key Responsibilities:**
- Cross-instance coordination via ScriptProperties
- Virtual locking for collection access
- Conflict detection using modification tokens
- Collection metadata management

**Storage:** ScriptProperties with key `GASDB_MASTER_INDEX`

## Core Workflow

### Collection Access Protocol

```javascript
// 1. Acquire virtual lock
const acquired = masterIndex.acquireLock('users', operationId);

// 2. Check for conflicts
const hasConflict = masterIndex.hasConflict('users', expectedToken);

// 3. Perform operations (if no conflicts)
// 4. Update metadata with new modification token
masterIndex.updateCollectionMetadata('users', updates);

// 5. Release lock
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
  version: 1,
  lastUpdated: "2024-01-01T12:00:00Z",
  collections: {
    "collectionName": {
      name: "collectionName",
      fileId: "driveFileId",
      lastModified: "2024-01-01T12:00:00Z",
      modificationToken: "timestamp-randomstring",
      lockStatus: null | { lockedBy, lockedAt, expiresAt }
    }
  },
  locks: { /* collection locks */ },
  modificationHistory: { /* change tracking */ }
}
```

## Constructor

```javascript
constructor(config = {})
```

**Parameters:**
- `config.masterIndexKey` (String): ScriptProperties key (default: 'GASDB_MASTER_INDEX')
- `config.lockTimeout` (Number): Lock timeout in ms (default: 30000)
- `config.version` (Number): Master index version (default: 1)

**Behaviour:** Creates configuration, initialises data structure, loads from ScriptProperties if available.

## API Reference

### Core Methods

#### `addCollection(name, metadata)`
Adds collection to master index.
- `name` (String): Collection name
- `metadata` (Object): Collection metadata (fileId, documentCount, etc.)
- **Returns:** Collection data object
- **Throws:** `CONFIGURATION_ERROR` for invalid name

#### `getCollection(name)` / `getCollections()`
Retrieves collection metadata.
- **Returns:** Collection object or collections map

#### `updateCollectionMetadata(name, updates)`
Updates collection metadata with new modification token.
- `updates` (Object): Metadata changes
- **Returns:** Updated collection data

### Locking Methods

#### `acquireLock(collectionName, operationId)`
Acquires virtual lock for collection.
- **Returns:** `true` if successful, `false` if already locked

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
const masterIndex = new MasterIndex();

// Add collection
const collection = masterIndex.addCollection('users', {
  fileId: 'abc123',
  documentCount: 0
});

// Get collection
const users = masterIndex.getCollection('users');

// Update metadata
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
  const resolution = masterIndex.resolveConflict('users', 
    newData, 'LAST_WRITE_WINS');
} else {
  masterIndex.updateCollectionMetadata('users', newData);
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
