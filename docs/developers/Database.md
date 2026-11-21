# Database Developer Documentation

- [Database Developer Documentation](#database-developer-documentation)
  - [Overview](#overview)
  - [Architecture \& MasterIndex Integration](#architecture--masterindex-integration)
    - [MasterIndex is the metadata authority](#masterindex-is-the-metadata-authority)
    - [Data Sources](#data-sources)
    - [Collection Access Protocol](#collection-access-protocol)
  - [Database Initialisation and Recovery Workflow](#database-initialisation-and-recovery-workflow)
    - [First-Time Setup](#first-time-setup)
    - [Normal Initialisation](#normal-initialisation)
    - [Disaster Recovery](#disaster-recovery)
    - [Why MasterIndex owns collection metadata](#why-masterindex-owns-collection-metadata)
  - [Constructor](#constructor)
  - [API Reference](#api-reference)
    - [Core Methods](#core-methods)
      - [`createDatabase()`](#createdatabase)
      - [`initialise()`](#initialise)
      - [`recoverDatabase(backupFileId)`](#recoverdatabasebackupfileid)
      - [`getCollection(name)`](#getcollectionname)
      - [`createCollection(name)`](#createcollectionname)
      - [`listCollections()`](#listcollections)
      - [`dropCollection(name)`](#dropcollectionname)
      - [`loadIndex()`](#loadindex)
      - [`backupIndexToDrive()`](#backupindextodrive)
    - [Private Methods](#private-methods)
      - [`_findExistingIndexFile()`](#_findexistingindexfile)
      - [`_createIndexFile()`](#_createindexfile)
      - [`ensureIndexFile()`](#ensureindexfile)
      - [`_resolveCollection(resolvedName, originalName)`](#_resolvecollectionresolvedname-originalname)
      - [`_buildCollectionMetadataPayload(name, fileId, documentCount = 0)`](#_buildcollectionmetadatapayloadname-fileid-documentcount--0)
      - [`_wrapMasterIndexError(operation, error, messagePrefix)`](#_wrapmasterindexerroroperation-error-messageprefix)
      - [`_createCollectionObject(name, driveFileId)`](#_createcollectionobjectname-drivefileid)
      - [`_normaliseIndexData(indexData)`](#_normaliseindexdataindexdata)
      - [`_assertIndexObject(indexData)`](#_assertindexobjectindexdata)
      - [`_ensureCollectionsMap(indexData)`](#_ensurecollectionsmapindexdata)
      - [`_ensureLastUpdated(indexData)`](#_ensurelastupdatedindexdata)
      - [`_validateCollectionName(name)`](#_validatecollectionnamename)
  - [Integration with MasterIndex](#integration-with-masterindex)
    - [Collection Lifecycle](#collection-lifecycle)
    - [Data Synchronisation](#data-synchronisation)
    - [Backup Strategy](#backup-strategy)
  - [Error Types](#error-types)

## Overview

The `Database` class is the main entry point for JsonDbApp operations, providing high-level database management and collection coordination. It serves as an orchestrator that delegates collection metadata management to `MasterIndex` while maintaining Drive-based index files for backup and migration purposes.

**Key Responsibilities:**

- Database creation, initialisation, and recovery
- Collection creation, access, and deletion
- MasterIndex as single source of truth for metadata
- Drive index file backup operations
- High-level database operations and error handling

**Dependencies:**

- `MasterIndex`: Single source of truth for collection metadata
- `FileService`: Drive API operations and caching
- `DatabaseConfig`: Configuration management
- `JDbLogger`: Logging and monitoring

## Architecture & MasterIndex Integration

### MasterIndex is the metadata authority

The Database class enforces MasterIndex as the single source of truth:

```text
Database (Orchestrator)
├── MasterIndex (Single source of truth - ScriptProperties)
├── Drive Index File (Backup only)
├── FileService (Drive operations)
└── Collections Map (In-memory cache)
```

### Data Sources

**Single Source of Truth - MasterIndex:**

- Fast access via ScriptProperties
- Authoritative for all collection metadata
- Virtual locking and conflict detection
- Cross-instance coordination
- Used for all normal operations

**Backup Only - Drive Index File:**

- Backup and durability
- Migration and recovery scenarios
- Explicit synchronisation via `backupIndexToDrive()`

Normal operations read collection metadata only from MasterIndex; the Drive index file serves backup, migration and explicit recovery. A missing or corrupted MasterIndex requires `createDatabase()` for fresh setup or `recoverDatabase()` for recovery.

### Collection Access Protocol

The `getCollection()` method validates the caller input, logs any sanitisation, and delegates to the shared `_resolveCollection(resolvedName, originalName)` helper for consistent caching and error messaging.

1. Public method sanitises and validates the name up front, logging when characters were stripped while keeping the unsanitised input for messaging
2. `_resolveCollection()` checks the in-memory collections cache using the sanitised key
3. If not cached, the helper queries MasterIndex (single source of truth)
4. When the collection is still missing, `_resolveCollection()` auto-creates if permitted, otherwise it raises an error that includes the caller’s original name

**Important:** `_resolveCollection()` ensures the caller sees the original name in error messages when auto-create is disabled, even if sanitisation adjusted the lookup key. The helper also short-circuits when the configuration forbids auto-creation

You can tune the behaviour by enabling `stripDisallowedCollectionNameCharacters` on `DatabaseConfig`. When enabled, the sanitised name is the one persisted in caches and the MasterIndex, yet `_resolveCollection()` keeps the unsanitised input for messaging parity so developers can reconcile errors with their original call site.

## Database Initialisation and Recovery Workflow

### First-Time Setup

Using the public API (recommended for Apps Script library consumers):

```javascript
const db = JsonDbApp.createAndInitialiseDatabase(config); // Creates MasterIndex + initialises
```

Or using the class directly (within this project):

```javascript
const db = new Database(config);
db.createDatabase();
db.initialise();
```

### Normal Initialisation

Using the public API:

```javascript
const db = JsonDbApp.loadDatabase(config); // initialises from existing MasterIndex
```

Or directly:

```javascript
const db = new Database(config);
db.initialise();
```

### Disaster Recovery

```javascript
const db = new Database(config);
db.recoverDatabase(backupFileId); // Restores from backup to MasterIndex
db.initialise(); // Loads from restored MasterIndex
```

### Why MasterIndex owns collection metadata

- **Single Source of Truth:** MasterIndex is the authoritative source, eliminating race conditions
- **Clear Separation:** Distinct operations for creation, initialisation, and recovery
- **Fail-Fast:** Explicit errors when MasterIndex is missing or corrupted
- **Simplified Operations:** No dual-source complexity in collection methods

## Constructor

Construction validates the configuration and wires the orchestrator's services; the parameter and error contract is on the [`Database` constructor](../../src/04_core/Database/99_Database.js).

- The configured `logLevel` is applied to `JDbLogger` through `setLevelByName()` before the component logger is created, so all subsequent output respects it.
- The configured `cacheEnabled` value is passed to `FileService` through `setCacheEnabled()` (the service default is `true`).
- `initialise()` must be called explicitly after construction.

## API Reference

Signatures, return values and error contracts for these methods are documented on the [`Database` class](../../src/04_core/Database/99_Database.js). The notes below cover only the cross-component behaviour that the class contract does not carry.

### Core Methods

#### `createDatabase()`

Creates a fresh MasterIndex in ScriptProperties for first-time setup. See [`createDatabase()`](../../src/04_core/Database/99_Database.js).

#### `initialise()`

Loads collection metadata from MasterIndex into memory. When `backupOnInitialise` is `true`, it also finds or creates the Drive index file and backs up the MasterIndex to it when collections are present. See [`initialise()`](../../src/04_core/Database/99_Database.js).

#### `recoverDatabase(backupFileId)`

Restores collection metadata from a named Drive backup file into a fresh MasterIndex. See [`recoverDatabase()`](../../src/04_core/Database/99_Database.js).

#### `getCollection(name)`

`getCollection()` is the public method for resolving a collection. It validates and sanitises the name, then delegates to `_resolveCollection()`; see [Collection Access Protocol](#collection-access-protocol) and [`getCollection()`](../../src/04_core/Database/99_Database.js).

#### `createCollection(name)`

Creates the Drive collection file, records the collection in MasterIndex and the in-memory cache, and updates the Drive index when `backupOnInitialise` is enabled. See [`createCollection()`](../../src/04_core/Database/99_Database.js).

#### `listCollections()`

Lists collection names from MasterIndex. See [`listCollections()`](../../src/04_core/Database/99_Database.js).

#### `dropCollection(name)`

Deletes the collection's Drive file and removes its entries from the in-memory cache and MasterIndex; the Drive index is updated when `backupOnInitialise` is enabled. See [`dropCollection()`](../../src/04_core/Database/99_Database.js).

#### `loadIndex()`

Reads and validates the Drive index file. See [`loadIndex()`](../../src/04_core/Database/99_Database.js).

**Validation & Repair:**

- `_normaliseIndexData()` ensures the parsed value is an object, applying default envelopes and surfacing `INVALID_FILE_FORMAT` errors when validation fails
- `_assertIndexObject()` rejects malformed payloads (including top-level arrays) using `ErrorHandler.ErrorTypes.INVALID_FILE_FORMAT`
- `_ensureCollectionsMap()` guarantees `collections` is a map, repairing missing entries and raising `INVALID_FILE_FORMAT` when an existing value has the wrong type
- `_ensureLastUpdated()` backfills timestamps when absent

These helpers are also used by index mutation utilities so that validation and repair logic remains centralised. `loadIndex()` calls `ensureIndexFile()` first, so the file is only created or touched when backups are enabled (`backupOnInitialise: true`) or when an explicit index operation needs it.

#### `backupIndexToDrive()`

Explicitly backs up MasterIndex data to the Drive index file. See [`backupIndexToDrive()`](../../src/04_core/Database/99_Database.js).

### Private Methods

#### `_findExistingIndexFile()`

Searches the configured root folder for an existing Drive index file. See [`_findExistingIndexFile()`](../../src/04_core/Database/03_DatabaseIndexOperations.js).

#### `_createIndexFile()`

Creates a new Drive index file with the initial empty payload and records its ID on the database. See [`_createIndexFile()`](../../src/04_core/Database/03_DatabaseIndexOperations.js).

#### `ensureIndexFile()`

Lazily locates or creates the Drive index file. It runs when `backupOnInitialise` is `true` during `initialise()` and before other Drive index operations, so backups-disabled paths avoid Drive writes. See [`ensureIndexFile()`](../../src/04_core/Database/99_Database.js).

#### `_resolveCollection(resolvedName, originalName)`

Centralises collection resolution for `getCollection()` after the public wrapper sanitises the input. See [Collection Access Protocol](#collection-access-protocol) and [`_resolveCollection()`](../../src/04_core/Database/02_DatabaseCollectionManagement.js).

#### `_buildCollectionMetadataPayload(name, fileId, documentCount = 0)`

Builds the shared collection metadata payload used by collection creation, index backups and backup restoration so those paths stay field-aligned. See [`_buildCollectionMetadataPayload()`](../../src/04_core/Database/99_Database.js).

#### `_wrapMasterIndexError(operation, error, messagePrefix)`

Provides consistent error wrapping for `createDatabase()`, `initialise()` and `recoverDatabase()`. See [`_wrapMasterIndexError()`](../../src/04_core/Database/01_DatabaseLifecycle.js).

#### `_createCollectionObject(name, driveFileId)`

Creates a `Collection` instance wired to this database and its `FileService`; metadata and documents load lazily on first access. See [`_createCollectionObject()`](../../src/04_core/Database/99_Database.js).

#### `_normaliseIndexData(indexData)`

Validates and repairs a parsed Drive index payload through the three helpers below, returning the same object reference. See [`_normaliseIndexData()`](../../src/04_core/Database/03_DatabaseIndexOperations.js).

#### `_assertIndexObject(indexData)`

Rejects index payloads that are not object maps — null, arrays and primitives — so Drive corruption surfaces immediately. See [`_assertIndexObject()`](../../src/04_core/Database/03_DatabaseIndexOperations.js).

#### `_ensureCollectionsMap(indexData)`

Repairs a missing `collections` map and rejects an existing value of the wrong type. See [`_ensureCollectionsMap()`](../../src/04_core/Database/03_DatabaseIndexOperations.js).

#### `_ensureLastUpdated(indexData)`

Backfills a missing `lastUpdated` timestamp while preserving existing values. See [`_ensureLastUpdated()`](../../src/04_core/Database/03_DatabaseIndexOperations.js).

#### `_validateCollectionName(name)`

Validates a collection name against the naming rules, stripping disallowed characters first when `stripDisallowedCollectionNameCharacters` is enabled; reserved names are checked after sanitisation. See [`_validateCollectionName()`](../../src/04_core/Database/99_Database.js).

For setup, collection management and error-handling walkthroughs, see [Examples.md](../Examples.md).

## Integration with MasterIndex

### Collection Lifecycle

```javascript
// Collection Creation Flow
db.createCollection('users');
// 1. Validate name
// 2. Create Drive file
// 3. Add to MasterIndex (primary)
// 4. Add to Drive index (backup)
// 5. Cache in memory
```

### Data Synchronisation

The Database class maintains consistency between data sources:

- **MasterIndex → Memory:** On initialisation and collection access
- **Backup → MasterIndex:** Explicit `recoverDatabase()` restores collection metadata from a named Drive backup file; see [`recoverDatabase(backupFileId)`](#recoverdatabasebackupfileid)
- **MasterIndex → Index File:** Via explicit `backupIndexToDrive()`

### Backup Strategy

`backupIndexToDrive()` is an explicit call; a backup is performed only when the caller invokes it.

## Error Types

- **Invalid Configuration:** Configuration validation failures
- **Collection Name Validation:** Invalid characters or reserved names
- **Collection Already Exists:** Duplicate collection creation
- **Collection Not Found:** Accessing non-existent collections
- **Index File Corruption:** JSON parsing or structure validation errors
- **Drive API Errors:** File operation failures
- **Initialisation Errors:** Database setup failures
