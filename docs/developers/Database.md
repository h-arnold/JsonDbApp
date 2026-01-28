# Database Developer Documentation

- [Database Developer Documentation](#database-developer-documentation)
  - [Overview](#overview)
  - [Architecture \& MasterIndex Integration](#architecture--masterindex-integration)
    - [Post-Refactoring Design](#post-refactoring-design)
    - [Primary vs Secondary Data Sources](#primary-vs-secondary-data-sources)
    - [Collection Access Protocol](#collection-access-protocol)
  - [Constructor](#constructor)
  - [API Reference](#api-reference)
    - [Core Methods](#core-methods)
      - [`initialise()`](#initialise)
      - [`collection(name)`](#collectionname)
      - [`createCollection(name)`](#createcollectionname)
      - [`listCollections()`](#listcollections)
      - [`dropCollection(name)`](#dropcollectionname)
      - [`loadIndex()`](#loadindex)
      - [`backupIndexToDrive()`](#backupindextodrive)
    - [Private Methods](#private-methods)
      - [`_findExistingIndexFile()`](#_findexistingindexfile)
      - [`_createIndexFile()`](#_createindexfile)
      - [`_loadIndexFile()`](#_loadindexfile)
      - [`_createCollectionObject(name, driveFileId)`](#_createcollectionobjectname-drivefileid)
      - [`_validateCollectionName(name)`](#_validatecollectionnamename)
  - [Usage Examples](#usage-examples)
    - [Basic Database Setup](#basic-database-setup)
    - [Collection Management](#collection-management)
    - [Index File Operations](#index-file-operations)
    - [Error Handling](#error-handling)
  - [Integration with MasterIndex](#integration-with-masterindex)
    - [Collection Lifecycle](#collection-lifecycle)
    - [Data Synchronization](#data-synchronization)
    - [Backup Strategy](#backup-strategy)
  - [Error Types](#error-types)
  - [Best Practices](#best-practices)

## Overview

The `Database` class is the main entry point for GAS DB operations, providing high-level database management and collection coordination. It serves as an orchestrator that delegates collection metadata management to `MasterIndex` while maintaining Drive-based index files for backup and migration purposes.

**Key Responsibilities:**

- Database creation, initialization, and recovery
- Collection creation, access, and deletion  
- MasterIndex as single source of truth for metadata
- Drive index file backup operations
- High-level database operations and error handling

**Dependencies:**

- `MasterIndex`: Single source of truth for collection metadata
- `FileService`: Drive API operations and caching
- `DatabaseConfig`: Configuration management
- `GASDBLogger`: Logging and monitoring

## Architecture & MasterIndex Integration

### Refactored Design (Single Source of Truth)

Following the initialization refactoring, the Database class now enforces MasterIndex as the single source of truth:

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
- Explicit synchronization via `backupIndexToDrive()`

### Collection Access Protocol

**UPDATED:** Simplified to use MasterIndex as single source of truth:

1. Check in-memory collections cache
2. Query MasterIndex (single source of truth)
3. Auto-create if enabled and collection doesn't exist

**Important:** No longer falls back to Drive index file.

You can tune the behaviour by enabling `stripDisallowedCollectionNameCharacters` on `DatabaseConfig`. When enabled, these characters are stripped from the requested name before validation, the cleaned name is logged when characters were removed, and the cleaned name is the one persisted in caches and the MasterIndex. The sanitised name still undergoes the reserved-name and empty-name checks so the system never exposes a forbidden value, it just removes the offending characters first.

## Database Initialization and Recovery Workflow

**NEW:** The Database class now enforces a clear separation between creation, initialization, and recovery:

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

### Normal Initialization

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
db.recoverDatabase(backupFileId);  // Restores from backup to MasterIndex
db.initialise();                   // Loads from restored MasterIndex
```

### Benefits of New Workflow

- **Single Source of Truth:** MasterIndex is the authoritative source, eliminating race conditions
- **Clear Separation:** Distinct operations for creation, initialization, and recovery
- **Fail-Fast:** Explicit errors when MasterIndex is missing or corrupted
- **Simplified Operations:** No dual-source complexity in collection methods

## Constructor

```javascript
constructor(config = {})
```

**Parameters:**

- `config` (Object|DatabaseConfig): Database configuration object or DatabaseConfig instance

**Behaviour:**

- Validates and normalizes configuration via DatabaseConfig
- initialises logging, file services, and MasterIndex
- Creates in-memory collections map
- Does NOT automatically initialise - call `initialise()` explicitly

**Example:**

```javascript
const db = new Database({
  rootFolderId: 'your-folder-id',
  autoCreateCollections: true,
  logLevel: 'DEBUG'
});
```

## API Reference

### Core Methods

#### `createDatabase()`

**NEW:** Creates a new database for first-time setup.

- **Returns:** `void`
- **Throws:** `Error` when MasterIndex already exists or creation fails
- **Use Cases:**
  - First-time database setup
  - Clean database creation for new projects

**Process:**

1. Check if MasterIndex already exists in ScriptProperties
2. If exists, throw error directing user to recovery process
3. Create fresh MasterIndex with empty collections
4. Persist to ScriptProperties

#### `initialise()`

**REFACTORED:** initialises the database from MasterIndex only (single source of truth).

- **Returns:** `void`
- **Throws:** `Error` when MasterIndex is missing, corrupted, or initialization fails
- **Side Effects:**
  - Loads collections from MasterIndex into memory
  - When `backupOnInitialise` is `true`, ensures a Drive-based index file exists for backups
  - When `backupOnInitialise` is `true`, backs up the MasterIndex to the Drive index file

**Process:**

1. Verify MasterIndex exists and is valid
2. Load existing collections from MasterIndex (single source of truth)
3. When `backupOnInitialise` is `true`, create or find the Drive-based index file used for backups
4. When `backupOnInitialise` is `true` and collections exist, back up the MasterIndex to the Drive index file
5. Populate in-memory collections cache

**Important:** No longer falls back to Drive index file. If MasterIndex is missing or corrupted, use `createDatabase()` for fresh setup or `recoverDatabase()` for recovery.

#### `recoverDatabase(backupFileId)`

**NEW:** Recovers database from a backup index file.

- **Parameters:**
  - `backupFileId` (String): Drive file ID of backup index file
- **Returns:** `Array<String>` - Names of recovered collections
- **Throws:** `Error` when recovery fails or backup file is invalid
- **Use Cases:**
  - Disaster recovery when MasterIndex is lost or corrupted
  - Migration from old backup files
  - Data restoration scenarios

**Process:**

1. Load and validate backup index file structure
2. Create fresh MasterIndex for recovery
3. Restore collections from backup to MasterIndex
4. Persist restored MasterIndex to ScriptProperties

#### `collection(name)`

**UPDATED:** Gets or creates a collection (MasterIndex only).

- **Parameters:**
  - `name` (String): Collection name
- **Returns:** `Object` - Collection object
- **Throws:** `Error` for invalid names or when collection doesn't exist and auto-create is disabled

**Access Priority:**

1. In-memory cache
2. MasterIndex (single source of truth)
3. Auto-create (if enabled)

**Important:** No longer falls back to Drive index file.

#### `createCollection(name)`

Explicitly creates a new collection.

- **Parameters:**
  - `name` (String): Collection name
- **Returns:** `Object` - Created collection object
- **Throws:** `Error` for invalid names or if collection already exists

**Process:**

1. Validate collection name
2. Check for existing collection in MasterIndex and memory
3. Create Drive file with initial collection data
4. Add to MasterIndex (primary)
5. Add to Drive index file (backup)
6. Add to in-memory cache

#### `listCollections()`

**UPDATED:** Lists all collection names from MasterIndex only.

- **Returns:** `Array<String>` - Collection names
- **Data Source:** MasterIndex (single source of truth)

**Important:** No longer falls back to Drive index file.

#### `dropCollection(name)`

**UPDATED:** Deletes a collection and its data (MasterIndex only).

- **Parameters:**
  - `name` (String): Collection name to delete
- **Returns:** `Boolean` - Success status
- **Throws:** `Error` for invalid collection names

**Process:**

1. Find collection in MasterIndex (single source of truth)
2. Delete collection Drive file
3. Remove from in-memory cache
4. Remove from MasterIndex
5. Remove from Drive index file (backup updates occur only when Drive backups are enabled)

**Important:** No longer falls back to Drive index file.

#### `loadIndex()`

Loads and validates Drive-based index file data.

- **Returns:** `Object` - Index file data with structure validation
- **Throws:** `Error` for corrupted files or when database not initialised

**Validation & Repair:**

- Validates JSON structure
- Repairs missing `collections` or `lastUpdated` properties
- Detects and reports corruption scenarios

Before reading the Drive index file, `loadIndex()` calls `ensureIndexFile()` so the file is only created or touched when backups are enabled (`backupOnInitialise: true`) or when an explicit index operation needs it.

#### `backupIndexToDrive()`

Explicitly backs up MasterIndex data to Drive-based index file.

- **Returns:** `Boolean` - Success status
- **Use Cases:**
  - Periodic backups
  - Before major operations
  - Data migration scenarios

### Private Methods

#### `_findExistingIndexFile()`

Searches root folder for existing database index files.

- **Returns:** `String|null` - File ID if found
- **Search Pattern:** Files containing 'database_index' and ending with '.json'

#### `_createIndexFile()`

Creates a new Drive-based index file with initial structure.

- **Side Effects:** Sets `this.indexFileId`
- **Initial Structure:** Empty collections, timestamps, version

#### `ensureIndexFile()`

Lazily locates or creates the Drive-based index file. This helper is invoked when `backupOnInitialise` is `true` during `initialise()` and before any other Drive index operations so unnecessary Drive writes are avoided when backups are disabled.

#### `_loadIndexFile()`

Loads index file and synchronizes with MasterIndex.

- **Side Effects:**
  - Populates in-memory collections
  - Syncs missing collections to MasterIndex

#### `_createCollectionObject(name, driveFileId)`

Creates a minimal collection object (placeholder for full Collection class).

- **Parameters:**
  - `name` (String): Collection name
  - `driveFileId` (String): Drive file ID
- **Returns:** `Object` - Collection object
- **Note:** Currently returns minimal object; will integrate with full Collection class in Section 5

#### `_validateCollectionName(name)`

Validates collection name according to GAS DB rules.

- **Parameters:**
  - `name` (String): Name to validate
- **Throws:** `Error` for invalid names
- **Rules:**
  - Must be non-empty string
  - No invalid filesystem characters (`[\/\\:*?"<>|]`). When `stripDisallowedCollectionNameCharacters` is enabled on the configuration, the characters are removed before the checks below, and any modification is logged for diagnostics.
  - Not reserved names (index, master, system, admin). The reserved-name check is applied after sanitisation so `index/` will still be rejected even though the slash is removed.

## Usage Examples

### Basic Database Setup

```javascript
const config = new DatabaseConfig({
  rootFolderId: 'your-drive-folder-id',
  autoCreateCollections: true,
  logLevel: 'INFO'
});

const db = new Database(config);
await db.initialise();

console.log('Available collections:', db.listCollections());
```

### Collection Management

```javascript
// Create collection explicitly
const users = db.createCollection('users');

// Get existing collection (or auto-create if enabled)
const posts = db.collection('posts');

// List all collections
const allCollections = db.listCollections();
console.log('Collections:', allCollections);

// Drop collection
const success = db.dropCollection('temp_collection');
```

### Index File Operations

```javascript
// Load index file data
try {
  const indexData = db.loadIndex();
  console.log('Index contains:', Object.keys(indexData.collections));
} catch (error) {
  console.error('Index file corrupted:', error.message);
}

// Backup MasterIndex to Drive
const backupSuccess = db.backupIndexToDrive();
if (backupSuccess) {
  console.log('Backup completed successfully');
}
```

### Error Handling

```javascript
try {
  const collection = db.collection('invalid/name');
} catch (error) {
  if (error.message.includes('invalid characters')) {
    console.error('Collection name validation failed');
  }
}

// Handle initialization errors
try {
  db.initialise();
} catch (error) {
  console.error('Database initialization failed:', error.message);
  // Implement recovery logic
}
```

## Integration with MasterIndex

### Collection Lifecycle

```javascript
// Collection Creation Flow
db.createCollection('users')
// 1. Validate name
// 2. Create Drive file
// 3. Add to MasterIndex (primary)
// 4. Add to Drive index (backup)
// 5. Cache in memory
```

### Data Synchronization

The Database class maintains consistency between data sources:

- **MasterIndex → Memory:** On initialization and collection access
- **Index File → MasterIndex:** When collections found only in index file
- **MasterIndex → Index File:** Via explicit `backupIndexToDrive()`

### Backup Strategy

```javascript
// Periodic backup pattern
setInterval(() => {
  if (db.backupIndexToDrive()) {
    console.log('Periodic backup completed');
  }
}, 30 * 60 * 1000); // Every 30 minutes
```

## Error Types

- **Invalid Configuration:** Configuration validation failures
- **Collection Name Validation:** Invalid characters or reserved names
- **Collection Already Exists:** Duplicate collection creation
- **Collection Not Found:** Accessing non-existent collections
- **Index File Corruption:** JSON parsing or structure validation errors
- **Drive API Errors:** File operation failures
- **Initialization Errors:** Database setup failures

## Best Practices

1. **Always initialise explicitly:** Call `initialise()` after constructor
2. **Handle collection name validation:** Use try-catch for collection operations
3. **Implement periodic backups:** Use `backupIndexToDrive()` regularly
4. **Monitor index file health:** Check for corruption and implement recovery
5. **Use proper error handling:** Different error types require different recovery strategies
6. **Leverage auto-create judiciously:** Enable for development, consider disabling for production
7. **Cache collection references:** Store collection objects to avoid repeated lookups
8. **Clean up properly:** Use `dropCollection()` to remove unused collections
