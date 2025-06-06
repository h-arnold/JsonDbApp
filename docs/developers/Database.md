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

- Database initialization and setup
- Collection creation, access, and deletion
- Coordination between MasterIndex and Drive-based index files
- High-level database operations and error handling

**Dependencies:**

- `MasterIndex`: Primary source of truth for collection metadata
- `FileService`: Drive API operations and caching
- `DatabaseConfig`: Configuration management
- `GASDBLogger`: Logging and monitoring

## Architecture & MasterIndex Integration

### Post-Refactoring Design

Following Section 4's completion and refactoring, the Database class now follows a clear separation of concerns:

```text
Database (Orchestrator)
├── MasterIndex (Primary metadata source - ScriptProperties)
├── Drive Index File (Secondary backup source)
├── FileService (Drive operations)
└── Collections Map (In-memory cache)
```

### Primary vs Secondary Data Sources

**Primary Source - MasterIndex:**

- Fast access via ScriptProperties
- Authoritative for collection metadata
- Virtual locking and conflict detection
- Cross-instance coordination

**Secondary Source - Drive Index File:**

- Backup and durability
- Migration and recovery scenarios
- Explicit synchronization via `backupIndexToDrive()`

### Collection Access Protocol

1. Check in-memory collections cache
2. Query MasterIndex (primary source)
3. Fall back to Drive index file if necessary
4. Auto-create if enabled and collection doesn't exist

## Constructor

```javascript
constructor(config = {})
```

**Parameters:**

- `config` (Object|DatabaseConfig): Database configuration object or DatabaseConfig instance

**Behaviour:**

- Validates and normalizes configuration via DatabaseConfig
- Initializes logging, file services, and MasterIndex
- Creates in-memory collections map
- Does NOT automatically initialize - call `initialise()` explicitly

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

#### `initialise()`

Initializes the database, loading existing collections and creating/finding index files.

- **Returns:** `void`
- **Throws:** `Error` when initialization fails
- **Side Effects:**
  - Loads collections from MasterIndex into memory
  - Creates or finds Drive-based index file
  - Synchronizes data between MasterIndex and index file

**Process:**

1. Load existing collections from MasterIndex (primary source)
2. Find or create Drive-based index file
3. Synchronize any collections found only in index file to MasterIndex
4. Populate in-memory collections cache

#### `collection(name)`

Gets or creates a collection (if auto-create is enabled).

- **Parameters:**
  - `name` (String): Collection name
- **Returns:** `Object` - Collection object
- **Throws:** `Error` for invalid names or when collection doesn't exist and auto-create is disabled

**Access Priority:**

1. In-memory cache
2. MasterIndex (primary)
3. Drive index file (fallback)
4. Auto-create (if enabled)

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

Lists all collection names.

- **Returns:** `Array<String>` - Collection names
- **Data Source Priority:**
  1. MasterIndex (primary)
  2. Drive index file (with sync to MasterIndex)

#### `dropCollection(name)`

Deletes a collection and its data.

- **Parameters:**
  - `name` (String): Collection name to delete
- **Returns:** `Boolean` - Success status
- **Throws:** `Error` for invalid collection names

**Process:**

1. Find collection in MasterIndex or Drive index
2. Delete collection Drive file
3. Remove from in-memory cache
4. Remove from MasterIndex
5. Remove from Drive index file

#### `loadIndex()`

Loads and validates Drive-based index file data.

- **Returns:** `Object` - Index file data with structure validation
- **Throws:** `Error` for corrupted files or when database not initialized

**Validation & Repair:**

- Validates JSON structure
- Repairs missing `collections` or `lastUpdated` properties
- Detects and reports corruption scenarios

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
  - No invalid filesystem characters
  - Not reserved names (index, master, system, admin)

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

1. **Always initialize explicitly:** Call `initialise()` after constructor
2. **Handle collection name validation:** Use try-catch for collection operations
3. **Implement periodic backups:** Use `backupIndexToDrive()` regularly
4. **Monitor index file health:** Check for corruption and implement recovery
5. **Use proper error handling:** Different error types require different recovery strategies
6. **Leverage auto-create judiciously:** Enable for development, consider disabling for production
7. **Cache collection references:** Store collection objects to avoid repeated lookups
8. **Clean up properly:** Use `dropCollection()` to remove unused collections