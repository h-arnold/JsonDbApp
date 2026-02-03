# Collection Components Developer Guide

This document explains the role, API surface and usage patterns for the Collection, CollectionMetadata, and DocumentOperations classes in JsonDbApp. These three classes work together to provide MongoDB-compatible collection operations with Google Drive persistence.

- [Collection Components Developer Guide](#collection-components-developer-guide)
  - [Overview](#overview)
    - [Architecture](#architecture)
    - [Current Limitations (Section 5)](#current-limitations-section-5)
  - [Collection](#collection)
    - [Purpose](#purpose)
    - [Constructor](#constructor)
    - [Public Methods](#public-methods)
      - [insertOne(doc: Object): Object](#insertonedoc-object-object)
      - [findOne(filter?: Object): Object|null](#findonefilter-object-objectnull)
      - [find(filter?: Object): Array](#findfilter-object-array)
      - [updateOne(filter: Object, update: Object): Object](#updateonefilter-object-update-object-object)
      - [updateMany(filter: Object, update: Object): Object](#updatemanyfilter-object-update-object-object)
      - [replaceOne(filter: Object, replacement: Object): Object](#replaceonefilter-object-replacement-object-object)
      - [deleteOne(filter: Object): Object](#deleteonefilter-object-object)
      - [countDocuments(filter?: Object): number](#countdocumentsfilter-object-number)
      - [getName(): string](#getname-string)
      - [getMetadata(): Object](#getmetadata-object)
      - [isDirty(): boolean](#isdirty-boolean)
      - [save(): void](#save-void)
    - [Lazy Loading](#lazy-loading)
  - [CollectionMetadata](#collectionmetadata)
    - [Purpose](#purpose-1)
    - [Constructor](#constructor-1)
    - [Public Methods](#public-methods-1)
      - [`updateLastModified(): void`](#updatelastmodified-void)
      - [`touch(): void`](#touch-void)
      - [`incrementDocumentCount(): void`](#incrementdocumentcount-void)
      - [`decrementDocumentCount(): void`](#decrementdocumentcount-void)
      - [`setDocumentCount(count: number): void`](#setdocumentcountcount-number-void)
      - [`getModificationToken(): string | null`](#getmodificationtoken-string--null)
      - [`setModificationToken(token: string | null): void`](#setmodificationtokentoken-string--null-void)
      - [`getLockStatus(): Object | null`](#getlockstatus-object--null)
      - [`setLockStatus(lockStatus: Object | null): void`](#setlockstatuslockstatus-object--null-void)
      - [`toJSON(): Object`](#tojson-object)
      - [`clone(): CollectionMetadata`](#clone-collectionmetadata)
    - [Static Methods](#static-methods)
      - [`static fromJSON(obj: Object): CollectionMetadata`](#static-fromjsonobj-object-collectionmetadata)
      - [`static create(name: string, fileId: string): CollectionMetadata`](#static-createname-string-fileid-string-collectionmetadata)
  - [DocumentOperations](#documentoperations)
    - [Purpose](#purpose-2)
    - [Constructor](#constructor-2)
    - [Public Methods](#public-methods-2)
      - [insertDocument(doc: Object): Object](#insertdocumentdoc-object-object)
      - [findDocumentById(id: string): Object|null](#finddocumentbyidid-string-objectnull)
      - [findAllDocuments(): Array\<Object\>](#findalldocuments-arrayobject)
      - [updateDocument(id: string, updateData: Object): Object](#updatedocumentid-string-updatedata-object-object)
      - [deleteDocument(id: string): Object](#deletedocumentid-string-object)
      - [countDocuments(): number](#countdocuments-number)
      - [documentExists(id: string): boolean](#documentexistsid-string-boolean)
      - [findByQuery(query: Object): Object|null](#findbyqueryquery-object-objectnull)
      - [findMultipleByQuery(query: Object): Array\<Object\>](#findmultiplebyqueryquery-object-arrayobject)
      - [countByQuery(query: Object): number](#countbyqueryquery-object-number)
      - [updateDocumentWithOperators(id: string, updateOps: Object): Object](#updatedocumentwithoperatorsid-string-updateops-object-object)
      - [updateDocumentByQuery(query: Object, updateOps: Object): number](#updatedocumentbyqueryquery-object-updateops-object-number)
      - [replaceDocument(id: string, doc: Object): Object](#replacedocumentid-string-doc-object-object)
      - [replaceDocumentByQuery(query: Object, doc: Object): number](#replacedocumentbyqueryquery-object-doc-object-number)
    - [Private Methods](#private-methods)

---

## Overview

The Collection Components form the core of JsonDbApp's document storage system:

- **Collection**: The main interface providing MongoDB-compatible CRUD operations
- **CollectionMetadata**: Manages collection metadata (timestamps, document counts)
- **DocumentOperations**: Handles low-level document manipulation

### Architecture

```mermaid
graph TD
    Collection[Collection (High-level MongoDB API)] --> CollectionMetadata[CollectionMetadata (Metadata management)]
    Collection --> DocumentOperations[DocumentOperations (Document CRUD operations)]
    DocumentOperations --> QueryEngine[QueryEngine (Query processing)]
    DocumentOperations --> UpdateEngine[UpdateEngine (Update operation processing)]
```

### Current Limitations (Section 5)

This section describes the capabilities as of Section 5. The `Collection` class has since been enhanced. Refer to the method descriptions below for current capabilities.

- **findOne()**: Only supports `{}` (empty) and `{_id: "id"}` filters
- **find()**: Only supports `{}` (empty) filters
- **updateOne()**: Only supports `{_id: "id"}` filters, document replacement only (no operators)
- **deleteOne()**: Only supports `{_id: "id"}` filters
- **countDocuments()**: Only supports `{}` (empty) filters

Advanced query capabilities will be added in Section 6 (Query Engine) and Section 7 (Update Engine).

---

## Collection

### Purpose

Collection provides the primary interface for document operations, mimicking MongoDB's collection API whilst managing persistence to Google Drive.

Key responsibilities:

- MongoDB-compatible CRUD operations
- Lazy loading from Google Drive
- Dirty tracking and persistence
- Integration with CollectionMetadata and DocumentOperations
- Clear error messages for unsupported features

### Constructor

```js
new Collection(name, driveFileId, database, fileService);
```

- **name**: Collection name (non-empty string)
- **driveFileId**: Google Drive file ID for persistence
- **database**: Database instance reference
- **fileService**: FileService for Drive operations

**Throws**: `InvalidArgumentError` for invalid parameters

**Example:**

```javascript
// Typically created by Database class, not directly
const collection = new Collection(
  'users',
  '1a2b3c4d5e6f7g8h9i0j',
  databaseInstance,
  fileServiceInstance
);
```

### Public Methods

#### insertOne(doc: Object): Object

Insert a single document with automatic ID generation.

- **Parameters**
  - `doc`: Document object to insert
- **Returns**
  - `{insertedId: string, acknowledged: boolean}`
- **Throws**
  - `InvalidArgumentError` for invalid documents
  - `ConflictError` for duplicate IDs

**Example:**

```javascript
// Insert with auto-generated ID
const result1 = collection.insertOne({
  name: 'Alice',
  email: 'alice@example.com',
  age: 30
});
console.log('Generated ID:', result1.insertedId);

// Insert with specific ID
const result2 = collection.insertOne({
  _id: 'user123',
  name: 'Bob',
  email: 'bob@example.com'
});
console.log('Custom ID:', result2.insertedId); // 'user123'

// Error: duplicate ID
try {
  collection.insertOne({ _id: 'user123', name: 'Charlie' });
} catch (error) {
  console.error('Conflict:', error.message);
}
```

#### findOne(filter?: Object): Object|null

Find a single document matching the filter.

- **Parameters**
  - `filter`: Query filter (supports field-based queries, `{_id: "id"}` and empty `{}` filters)
- **Returns**
  - Document object or `null` if not found
- **Throws**
  - `InvalidArgumentError` for invalid filter structure
  - `OperationError` for unsupported filters

**Example:**

```javascript
// Find first document (empty filter)
const firstDoc = collection.findOne({});
console.log('First document:', firstDoc);

// Find by ID
const userDoc = collection.findOne({ _id: 'user123' });
if (userDoc) {
  console.log('Found user:', userDoc.name);
} else {
  console.log('User not found');
}

// Find by field
const aliceDoc = collection.findOne({ name: 'Alice' });
if (aliceDoc) {
  console.log('Found Alice by name:', aliceDoc.email);
}

// Unsupported filter (throws error)
try {
  collection.findOne({ age: { $gt: 25 } }); // Complex operators may not be supported depending on QueryEngine
} catch (error) {
  console.error('Unsupported:', error.message);
}
```

#### find(filter?: Object): Array

Find multiple documents matching the filter.

- **Parameters**
  - `filter`: Query filter (supports field-based queries and empty `{}` filter)
- **Returns**
  - Array of document objects
- **Throws**
  - `InvalidArgumentError` for invalid filter structure
  - `OperationError` for unsupported filters

**Example:**

```javascript
// Find all documents
const allDocs = collection.find({});
console.log('Total documents:', allDocs.length);

allDocs.forEach((doc) => {
  console.log('Document ID:', doc._id);
});

// Find by field
const usersOver25 = collection.find({ age: { $gt: 25 } }); // Example, assuming QueryEngine supports $gt
console.log('Users over 25:', usersOver25.length);

// Empty collection returns empty array
const emptyResults = emptyCollection.find({});
console.log('Empty results:', emptyResults); // []
```

#### updateOne(filter: Object, update: Object): Object

Update a single document matching the filter.

- **Parameters**
  - `filter`: Query filter (supports field-based queries and `{_id: "id"}` filters)
  - `update`: Document replacement or update operators (e.g. `{$set: {field: value}}`)
- **Returns**
  - `{matchedCount: number, modifiedCount: number, acknowledged: boolean}`
- **Throws**
  - `InvalidArgumentError` for invalid parameters (filter or update)
  - `OperationError` for unsupported filters or update operators

**Example:**

```javascript
// Update by ID (document replacement)
const updateResult = collection.updateOne(
  { _id: 'user123' },
  {
    // _id: 'user123', // ID is preserved automatically if not specified in replacement
    name: 'Robert',
    email: 'robert@example.com',
    age: 31,
    lastUpdated: new Date()
  }
);

console.log('Modified count (replacement):', updateResult.modifiedCount); // 1

// Update by field using $set operator
const setResult = collection.updateOne({ email: 'robert@example.com' }, { $set: { age: 32 } });
console.log('Modified count ($set):', setResult.modifiedCount); // 1

// Non-existent document
const noMatch = collection.updateOne({ _id: 'nonexistent' }, { name: 'Nobody' });
console.log('No match:', noMatch.modifiedCount); // 0

// Unsupported update operators (throws error)
try {
  collection.updateOne(
    { _id: 'user123' },
    { $inc: { age: 1 } } // Assuming $inc is supported by UpdateEngine
  );
} catch (error) {
  console.error('Unsupported operator or error during update:', error.message);
}
```

#### updateMany(filter: Object, update: Object): Object

Update multiple documents matching a filter.

- **Parameters**
  - `filter`: Query filter criteria (supports field-based queries and empty `{}` filter)
  - `update`: Update operators (e.g. `{$set: {field: value}}`)
- **Returns**
  - `{matchedCount: number, modifiedCount: number, acknowledged: boolean}`
- **Throws**
  - `InvalidArgumentError` for invalid parameters
  - `OperationError` if update operators are invalid or an error occurs

**Example:**

```javascript
// Add a 'status' field to all documents
const updateManyResult = collection.updateMany(
  {}, // Empty filter matches all documents
  { $set: { status: 'active' } }
);
console.log('Matched:', updateManyResult.matchedCount, 'Modified:', updateManyResult.modifiedCount);

// Update status for users older than 30
const updateAdultsResult = collection.updateMany(
  { age: { $gt: 30 } }, // Assuming QueryEngine supports $gt
  { $set: { status: 'senior' } }
);
console.log('Adults updated:', updateAdultsResult.modifiedCount);
```

#### replaceOne(filter: Object, replacement: Object): Object

Replace a single document matching the filter.

- **Parameters**
  - `filter`: Query filter (supports field-based queries and `{_id: "id"}` filters)
  - `replacement`: The new document. Cannot contain update operators. `_id` if present must match original or be omitted.
- **Returns**
  - `{matchedCount: number, modifiedCount: number, acknowledged: boolean}`
- **Throws**
  - `InvalidArgumentError` for invalid parameters or if replacement contains update operators.

**Example:**

```javascript
// Replace document by ID
const replaceResult = collection.replaceOne(
  { _id: 'user123' },
  { name: 'Bobby Tables', email: 'bobby@example.com', age: 25 } // _id will be preserved
);
console.log('Replaced count:', replaceResult.modifiedCount); // 1

// Attempt to replace with update operators (will throw error)
try {
  collection.replaceOne({ _id: 'user123' }, { $set: { name: 'Not Allowed' } });
} catch (error) {
  console.error('Error:', error.message); // Should indicate $set is not allowed
}
```

#### deleteOne(filter: Object): Object

Delete a single document matching the filter.

- **Parameters**
  - `filter`: Query filter (supports field-based queries and `{_id: "id"}` filters)
- **Returns**

  `{deletedCount: number, acknowledged: boolean}`

- **Throws**
  - `InvalidArgumentError` for invalid filter structure
  - `OperationError` for unsupported filters

**Example:**

```javascript
// Delete by ID
const deleteResult = collection.deleteOne({ _id: 'user123' });
console.log('Deleted count by ID:', deleteResult.deletedCount); // 1

// Delete by field
const deleteByEmailResult = collection.deleteOne({ email: 'alice@example.com' });
console.log('Deleted count by email:', deleteByEmailResult.deletedCount); // 1

// Non-existent document
const noDelete = collection.deleteOne({ _id: 'nonexistent' });
console.log('Nothing deleted:', noDelete.deletedCount); // 0

// Document no longer exists
const gone = collection.findOne({ _id: 'user123' });
console.log('Document gone:', gone); // null
```

#### countDocuments(filter?: Object): number

Count documents matching the filter.

- **Parameters**
  - `filter`: Query filter (supports field-based queries and empty `{}` filter)
- **Returns**

  Number of matching documents

- **Throws**
  - `InvalidArgumentError` for invalid filter structure
  - `OperationError` for unsupported filters

**Example:**

```javascript
// Count all documents
const totalCount = collection.countDocuments({});
console.log('Total documents:', totalCount);

// Count documents matching a filter
const countOver30 = collection.countDocuments({ age: { $gt: 30 } }); // Assuming QueryEngine supports $gt
console.log('Documents with age > 30:', countOver30);

// Empty collection
const emptyCount = emptyCollection.countDocuments();
console.log('Empty count:', emptyCount); // 0

// Verify count matches find() results
const allDocs = collection.find({});
console.log('Count matches:', totalCount === allDocs.length); // true
```

#### getName(): string

Get the collection name.

```javascript
const name = collection.getName();
console.log('Collection name:', name); // 'users'
```

#### getMetadata(): Object

Get collection metadata.

- **Returns**
  - `{created: Date, lastUpdated: Date, documentCount: number}`

```javascript
const metadata = collection.getMetadata();
console.log('Created:', metadata.created);
console.log('Last updated:', metadata.lastUpdated);
console.log('Document count:', metadata.documentCount);
```

#### isDirty(): boolean

Check if collection has unsaved changes.

```javascript
console.log('Has changes:', collection.isDirty()); // false

collection.insertOne({ name: 'Test' });
console.log('Has changes:', collection.isDirty()); // true

collection.save();
console.log('Has changes:', collection.isDirty()); // false
```

#### save(): void

Force save collection to Drive.

- **Throws**: `OperationError` if save fails

```javascript
// Manual save (usually automatic)
try {
  collection.save();
  console.log('Collection saved');
} catch (error) {
  console.error('Save failed:', error.message);
}
```

### Lazy Loading

Collections use lazy loading for performance:

```javascript
const collection = new Collection(...); // No Drive access yet

const metadata = collection.getMetadata(); // Triggers loading
const docs = collection.find({}); // Already loaded, no Drive access
```

---

## CollectionMetadata

### Purpose

`CollectionMetadata` manages essential information about a collection. This includes its identity (name and file ID), timestamps for creation and updates, the number of documents it contains, a token for managing concurrent modifications, and its current lock status. It ensures that metadata is always in a valid state and provides methods for its manipulation and serialisation.

### Constructor

```javascript
new CollectionMetadata(name: string, fileId: string, initialMetadata?: Object)
```

or (legacy support)

```javascript
new CollectionMetadata(initialMetadata: Object)
```

- **name** (string): The name of the collection. This is a required field.
- **fileId** (string): The Google Drive file ID where the collection data is stored. This is a required field.
- **initialMetadata** (optional Object): An object containing initial values for metadata properties.
  - `created`: Creation timestamp (Date). Defaults to the current time.
  - `lastUpdated`: Last update timestamp (Date). Defaults to the current time.
  - `documentCount`: Document count (integer ≥ 0). Defaults to 0.
  - `modificationToken`: A string token for optimistic locking, or `null`. Defaults to `null`.
  - `lockStatus`: An object detailing the lock state, or `null`. Defaults to `null`.
    - `isLocked`: (boolean) Whether the collection is locked.
    - `lockedBy`: (string|null) Identifier of the process/user holding the lock.
    - `lockedAt`: (number|null) Timestamp (epoch milliseconds) when the lock was acquired.
    - `lockTimeout`: (number|null) Duration in milliseconds for which the lock is valid.

**Throws**: `InvalidArgumentError` for invalid or missing `name`, `fileId`, or other metadata values.

**Example:**

```javascript
// Create with name, fileId, and defaults for other properties
const metadata1 = new CollectionMetadata('users', 'fileId123');
console.log('Collection Name:', metadata1.name); // 'users'
console.log('File ID:', metadata1.fileId); // 'fileId123'
console.log('Default count:', metadata1.documentCount); // 0

// Create with name, fileId, and specific initial values
const metadata2 = new CollectionMetadata('products', 'fileId456', {
  created: new Date('2023-01-01'),
  lastUpdated: new Date('2023-06-15'),
  documentCount: 42,
  modificationToken: 'initialToken123',
  lockStatus: { isLocked: false, lockedBy: null, lockedAt: null, lockTimeout: null }
});
console.log('Product count:', metadata2.documentCount); // 42
console.log('Modification Token:', metadata2.getModificationToken()); // 'initialToken123'

// Invalid values throw errors
try {
  new CollectionMetadata('', 'fileId789'); // Empty name
} catch (error) {
  console.error('Invalid name:', error.message);
}

try {
  new CollectionMetadata('orders', null); // Missing fileId
} catch (error) {
  console.error('Invalid fileId:', error.message);
}

try {
  new CollectionMetadata('inventory', 'fileIdABC', { documentCount: -1 });
} catch (error) {
  console.error('Invalid count:', error.message);
}
```

### Public Methods

#### `updateLastModified(): void`

Updates the `lastUpdated` timestamp to the current time.

```javascript
const metadata = new CollectionMetadata('logs', 'logFileId');
const oldTime = metadata.lastUpdated;

// Wait a moment...
setTimeout(() => {
  metadata.updateLastModified();
  console.log('Updated:', metadata.lastUpdated > oldTime); // true
}, 10);
```

#### `touch(): void`

Alias for `updateLastModified()`. Updates the `lastUpdated` timestamp to the current time. This is typically used to signify that the collection metadata has been accessed or "touched" without necessarily changing other data like document count.

```javascript
const metadata = new CollectionMetadata('cache', 'cacheFileId');
const oldTime = metadata.lastUpdated;
metadata.touch();
console.log('Touched, lastUpdated changed:', metadata.lastUpdated > oldTime); // true (assuming a slight delay)
```

#### `incrementDocumentCount(): void`

Increments the `documentCount` by 1 and updates the `lastUpdated` timestamp.

```javascript
const metadata = new CollectionMetadata('tasks', 'tasksFileId');
console.log('Initial count:', metadata.documentCount); // 0

metadata.incrementDocumentCount();
console.log('After increment:', metadata.documentCount); // 1
```

#### `decrementDocumentCount(): void`

Decrements the `documentCount` by 1 and updates the `lastUpdated` timestamp.

- **Throws**: `InvalidArgumentError` if `documentCount` would go below zero.

```javascript
const metadata = new CollectionMetadata('items', 'itemsFileId', { documentCount: 5 });

metadata.decrementDocumentCount();
console.log('After decrement:', metadata.documentCount); // 4

// Cannot go below zero
try {
  const emptyMetadata = new CollectionMetadata('empty', 'emptyFileId', { documentCount: 0 });
  emptyMetadata.decrementDocumentCount(); // Throws error
} catch (error) {
  console.error('Cannot decrement:', error.message);
}
```

#### `setDocumentCount(count: number): void`

Sets the `documentCount` to a specific value and updates the `lastUpdated` timestamp.

- **Parameters**:
  - `count`: The new document count (must be an integer ≥ 0).
- **Throws**: `InvalidArgumentError` for invalid `count` values (e.g., negative, not an integer).

```javascript
const metadata = new CollectionMetadata('notes', 'notesFileId');

metadata.setDocumentCount(100);
console.log('Set count:', metadata.documentCount); // 100

// Invalid values throw errors
try {
  metadata.setDocumentCount(-5); // Throws error
} catch (error) {
  console.error('Invalid count for setDocumentCount:', error.message);
}
```

#### `getModificationToken(): string | null`

Returns the current `modificationToken`. This token can be used for optimistic concurrency control.

```javascript
const metadata = new CollectionMetadata('configs', 'configsFileId', { modificationToken: 'v1' });
console.log(metadata.getModificationToken()); // 'v1'
```

#### `setModificationToken(token: string | null): void`

Sets the `modificationToken`.

- **Parameters**:
  - `token`: The new modification token (string or `null`). Must be a non-empty string if not `null`.
- **Throws**: `InvalidArgumentError` for invalid token values.

```javascript
const metadata = new CollectionMetadata('settings', 'settingsFileId');
metadata.setModificationToken('v2-alpha');
console.log(metadata.getModificationToken()); // 'v2-alpha'

metadata.setModificationToken(null);
console.log(metadata.getModificationToken()); // null

try {
  metadata.setModificationToken(''); // Empty string
} catch (error) {
  console.error('Invalid token:', error.message);
}
```

#### `getLockStatus(): Object | null`

Returns the current `lockStatus` object or `null` if no lock information is set.
The `lockStatus` object has the shape: `{ isLocked: boolean, lockedBy: string|null, lockedAt: number|null, lockTimeout: number|null }`.

```javascript
const lockInfo = {
  isLocked: true,
  lockedBy: 'process-1',
  lockedAt: Date.now(),
  lockTimeout: 30000
};
const metadata = new CollectionMetadata('jobs', 'jobsFileId', { lockStatus: lockInfo });
console.log(metadata.getLockStatus()); // { isLocked: true, ... }
```

#### `setLockStatus(lockStatus: Object | null): void`

Sets the `lockStatus`.

- **Parameters**:
  - `lockStatus`: The new lock status object or `null`. If an object, it must conform to the required structure and types.
- **Throws**: `InvalidArgumentError` for invalid `lockStatus` object structure or values.

```javascript
const metadata = new CollectionMetadata('queue', 'queueFileId');
const newLock = {
  isLocked: true,
  lockedBy: 'worker-bee',
  lockedAt: Date.now(),
  lockTimeout: 60000
};
metadata.setLockStatus(newLock);
console.log(metadata.getLockStatus()); // { isLocked: true, lockedBy: 'worker-bee', ... }

metadata.setLockStatus(null);
console.log(metadata.getLockStatus()); // null

try {
  metadata.setLockStatus({ isLocked: 'yes' }); // Invalid type for isLocked
} catch (error) {
  console.error('Invalid lock status:', error.message);
}
```

#### `toJSON(): Object`

Returns the metadata as a plain JavaScript object, suitable for `JSON.stringify()`. This method includes a `__type` property for potential deserialisation and ensures all date properties are new `Date` instances.

- **Returns**: A plain object with all metadata properties:
  `{ __type: 'CollectionMetadata', name: string, fileId: string, created: Date, lastUpdated: Date, documentCount: number, modificationToken: string|null, lockStatus: Object|null }`

```javascript
const metadata = new CollectionMetadata('dataEntries', 'dataFileId1', {
  documentCount: 10,
  modificationToken: 'token-xyz'
});
const obj = metadata.toJSON();

console.log('Plain object:', obj);
/*
{
  __type: 'CollectionMetadata',
  name: 'dataEntries',
  fileId: 'dataFileId1',
  created: Date, // (a new Date instance)
  lastUpdated: Date, // (a new Date instance)
  documentCount: 10,
  modificationToken: 'token-xyz',
  lockStatus: null
}
*/

// Dates are independent copies
const originalCreationYear = metadata.created.getFullYear();
obj.created.setFullYear(2000);
console.log(
  'Original created year unchanged:',
  metadata.created.getFullYear() === originalCreationYear
); // true
```

#### `clone(): CollectionMetadata`

Creates and returns a new `CollectionMetadata` instance that is an independent, deep copy of the original.

```javascript
const original = new CollectionMetadata('source', 'sourceFile', { documentCount: 5 });
const copy = original.clone();

copy.incrementDocumentCount();
console.log('Original unchanged:', original.documentCount); // 5
console.log('Copy changed:', copy.documentCount); // 6

// Ensure deep copy of nested objects like lockStatus if present
const lock = { isLocked: true, lockedBy: 'test', lockedAt: Date.now(), lockTimeout: 1000 };
const originalWithLock = new CollectionMetadata('lockedColl', 'lockFile', { lockStatus: lock });
const copyWithLock = originalWithLock.clone();
copyWithLock.getLockStatus().isLocked = false;

console.log('Original lock status unchanged:', originalWithLock.getLockStatus().isLocked); // true
console.log('Copy lock status changed:', copyWithLock.getLockStatus().isLocked); // false
```

### Static Methods

#### `static fromJSON(obj: Object): CollectionMetadata`

Creates a `CollectionMetadata` instance from a plain JavaScript object (typically one produced by `toJSON()`).

- **Parameters**:
  - `obj`: A plain object containing metadata properties.
- **Returns**: A new `CollectionMetadata` instance.
- **Throws**: `InvalidArgumentError` if the input object is invalid or missing required properties.

```javascript
const plainObject = {
  name: 'deserialisedCollection',
  fileId: 'deserialisedFileId',
  created: new Date('2022-01-01T10:00:00Z').toISOString(), // Dates can be ISO strings or Date objects
  lastUpdated: new Date('2022-01-02T11:00:00Z'),
  documentCount: 15,
  modificationToken: 'tokenFromObject',
  lockStatus: null
};

// Note: For fromJSON to correctly parse date strings, they should be in a format
// that the Date constructor can parse, or be actual Date objects.
// The constructor of CollectionMetadata handles new Date(value) for date fields.

const metadataInstance = CollectionMetadata.fromJSON(plainObject);
console.log('Instance name:', metadataInstance.name); // 'deserialisedCollection'
console.log('Instance document count:', metadataInstance.documentCount); // 15
console.log('Instance modification token:', metadataInstance.getModificationToken()); // 'tokenFromObject'
```

#### `static create(name: string, fileId: string): CollectionMetadata`

A static factory method to create a new `CollectionMetadata` instance with the specified `name` and `fileId`, and default values for other properties.

- **Parameters**:
  - `name`: The collection name.
  - `fileId`: The Google Drive file ID.
- **Returns**: A new `CollectionMetadata` instance.
- **Throws**: `InvalidArgumentError` if `name` or `fileId` are invalid.

```javascript
const newMetadata = CollectionMetadata.create('newCollection', 'newFileIdXYZ');
console.log('Created name:', newMetadata.name); // 'newCollection'
console.log('Created fileId:', newMetadata.fileId); // 'newFileIdXYZ'
console.log('Created doc count:', newMetadata.documentCount); // 0
```

---

## DocumentOperations

### Purpose

`DocumentOperations` is a low-level component responsible for the direct manipulation of documents within a collection's in-memory representation. It provides the core Create, Read, Update, and Delete (CRUD) functionalities that are utilised by the higher-level `Collection` class. `DocumentOperations` itself does not interact with the file system or manage metadata; its focus is solely on operating on the JavaScript objects that represent documents.

It works in conjunction with:

- **Collection**: The `Collection` class instantiates and uses `DocumentOperations` to perform actions on its `_documents` object.
- **QueryEngine**: For `findByQuery`, `findMultipleByQuery`, and `countByQuery` methods, `DocumentOperations` delegates the filtering logic to the `QueryEngine`.
- **UpdateEngine**: For `updateDocumentWithOperators` and `updateDocumentByQuery` methods, `DocumentOperations` uses the `UpdateEngine` to apply complex update operations.

### Constructor

```javascript
new DocumentOperations(collection);
```

- **collection**: A reference to the `Collection` instance. This provides `DocumentOperations` access to the actual documents array (`collection._documents`) and methods to update metadata (`collection._updateMetadata()`) and mark the collection as dirty (`collection._markDirty()`).

**Throws**: `InvalidArgumentError` if the `collection` parameter is not a valid `Collection` instance (though this is typically ensured by the `Collection` class itself).

**Example:**

```javascript
// Typically created by the Collection class, not directly
// Assuming 'this' is an instance of the Collection class
this._documentOperations = new DocumentOperations(this);
```

### Public Methods

#### insertDocument(doc: Object): Object

Inserts a single document into the collection's internal `_documents` object. If the document does not have an `_id` field, one is generated.

- **Parameters**
  - `doc`: The document object to insert.
- **Returns**
  - The inserted document, including its `_id`.
- **Throws**
  - `ErrorHandler.ErrorTypes.INVALID_ARGUMENT`: If the document is invalid (e.g., `null`, not an object, or contains invalid field names).
  - `ErrorHandler.ErrorTypes.CONFLICT_ERROR`: If a document with the same `_id` already exists.

**Example:**

```javascript
// Assuming docOps is an instance of DocumentOperations
const newDoc = docOps.insertDocument({ name: 'Alice', age: 30 });
console.log('Inserted document ID:', newDoc._id);

try {
  docOps.insertDocument({ _id: newDoc._id, name: 'Bob' });
} catch (e) {
  console.error(e.message); // Conflict error
}
```

#### findDocumentById(id: string): Object|null

Retrieves a document by its `_id`.

- **Parameters**
  - `id`: The `_id` of the document to find.
- **Returns**
  - The found document object, or `null` if no document with that `_id` exists.
- **Throws**
  - `ErrorHandler.ErrorTypes.INVALID_ARGUMENT`: If the `id` is invalid (e.g., not a string or empty).

**Example:**

```javascript
const user = docOps.findDocumentById('some-unique-id');
if (user) {
  console.log('Found user:', user.name);
} else {
  console.log('User not found.');
}
```

#### findAllDocuments(): Array&lt;Object&gt;

Retrieves all documents currently held in the collection's `_documents` object.

- **Returns**
  - An array of all document objects. Returns an empty array if the collection is empty.

**Example:**

```javascript
const allUsers = docOps.findAllDocuments();
console.log(`There are ${allUsers.length} users.`);
```

#### updateDocument(id: string, updateData: Object): Object

Replaces the entire document identified by `id` with `updateData`. This is a full replacement, not a partial update. The `_id` in `updateData` must match the `id` parameter if provided, or `updateData` should not contain an `_id` (in which case the original `_id` is preserved).

- **Parameters**
  - `id`: The `_id` of the document to update.
  - `updateData`: The new document data.
- **Returns**
  - An object `{ acknowledged: boolean, modifiedCount: number }`. `modifiedCount` is 1 if the document was found and updated, 0 otherwise.
- **Throws**
  - `ErrorHandler.ErrorTypes.INVALID_ARGUMENT`: If `id` or `updateData` is invalid, or if `updateData._id` is present and does not match `id`.
  - `ErrorHandler.ErrorTypes.DOCUMENT_NOT_FOUND`: If no document with the given `id` exists. (Note: current implementation returns `modifiedCount: 0` instead of throwing)

**Example:**

```javascript
const result = docOps.updateDocument('some-unique-id', { name: 'Alice Smith', age: 31 });
if (result.modifiedCount > 0) {
  console.log('Document updated.');
} else {
  console.log('Document not found or not modified.');
}
```

#### deleteDocument(id: string): Object

Deletes a document by its `_id`.

- **Parameters**
  - `id`: The `_id` of the document to delete.
- **Returns**
  - An object `{ acknowledged: boolean, deletedCount: number }`. `deletedCount` is 1 if the document was found and deleted, 0 otherwise.
- **Throws**
  - `ErrorHandler.ErrorTypes.INVALID_ARGUMENT`: If the `id` is invalid.

**Example:**

```javascript
const result = docOps.deleteDocument('some-unique-id');
if (result.deletedCount > 0) {
  console.log('Document deleted.');
} else {
  console.log('Document not found.');
}
```

#### countDocuments(): number

Counts the total number of documents in the collection.

- **Returns**
  - The total number of documents.

**Example:**

```javascript
const count = docOps.countDocuments();
console.log(`Total documents: ${count}`);
```

#### documentExists(id: string): boolean

Checks if a document with the given `_id` exists.

- **Parameters**
  - `id`: The `_id` to check.
- **Returns**
  - `true` if a document with the `_id` exists, `false` otherwise.
- **Throws**
  - `ErrorHandler.ErrorTypes.INVALID_ARGUMENT`: If the `id` is invalid.

**Example:**

```javascript
if (docOps.documentExists('some-unique-id')) {
  console.log('Document exists.');
}
```

#### findByQuery(query: Object): Object|null

Finds the first document that matches the given query. Delegates to `QueryEngine`.

- **Parameters**
  - `query`: A MongoDB-compatible query object.
- **Returns**
  - The first matching document, or `null` if no documents match.
- **Throws**
  - `ErrorHandler.ErrorTypes.INVALID_ARGUMENT`: If the query is invalid.
  - `ErrorHandler.ErrorTypes.INVALID_QUERY`: If the query contains invalid operators (as determined by `QueryEngine`).

**Example:**

```javascript
const user = docOps.findByQuery({ age: { $gt: 30 } });
if (user) {
  console.log('Found user older than 30:', user.name);
}
```

#### findMultipleByQuery(query: Object): Array&lt;Object&gt;

Finds all documents that match the given query. Delegates to `QueryEngine`.

- **Parameters**
  - `query`: A MongoDB-compatible query object.
- **Returns**
  - An array of matching documents. Returns an empty array if no documents match.
- **Throws**
  - `ErrorHandler.ErrorTypes.INVALID_ARGUMENT`: If the query is invalid.
  - `ErrorHandler.ErrorTypes.INVALID_QUERY`: If the query contains invalid operators.

**Example:**

```javascript
const admins = docOps.findMultipleByQuery({ role: 'admin' });
admins.forEach((admin) => console.log(admin.name));
```

#### countByQuery(query: Object): number

Counts documents that match the given query. Delegates to `QueryEngine`.

- **Parameters**
  - `query`: A MongoDB-compatible query object.
- **Returns**
  - The number of matching documents.
- **Throws**
  - `ErrorHandler.ErrorTypes.INVALID_ARGUMENT`: If the query is invalid.
  - `ErrorHandler.ErrorTypes.INVALID_QUERY`: If the query contains invalid operators.

**Example:**

```javascript
const activeUserCount = docOps.countByQuery({ status: 'active' });
console.log(`Number of active users: ${activeUserCount}`);
```

#### updateDocumentWithOperators(id: string, updateOps: Object): Object

Updates a single document identified by `id` using MongoDB-style update operators (e.g., `$set`, `$inc`). Delegates to `UpdateEngine`.

- **Parameters**
  - `id`: The `_id` of the document to update.
  - `updateOps`: An object containing update operator instructions.
- **Returns**
  - An object `{ acknowledged: boolean, modifiedCount: number }`.
- **Throws**
  - `ErrorHandler.ErrorTypes.INVALID_ARGUMENT`: If `id` or `updateOps` are invalid.
  - `ErrorHandler.ErrorTypes.DOCUMENT_NOT_FOUND`: If no document with the given `id` exists.
  - `ErrorHandler.ErrorTypes.INVALID_QUERY`: If `updateOps` are invalid (as determined by `UpdateEngine`).

**Example:**

```javascript
const result = docOps.updateDocumentWithOperators('some-unique-id', {
  $set: { status: 'inactive' },
  $inc: { loginAttempts: 1 }
});
if (result.modifiedCount > 0) {
  console.log('Document updated with operators.');
}
```

#### updateDocumentByQuery(query: Object, updateOps: Object): number

Updates all documents matching the `query` using MongoDB-style update operators. Delegates to `QueryEngine` for finding documents and `UpdateEngine` for applying updates.

- **Parameters**
  - `query`: The filter criteria to select documents for update.
  - `updateOps`: The update operator instructions.
- **Returns**
  - The number of documents modified.
- **Throws**
  - `ErrorHandler.ErrorTypes.INVALID_ARGUMENT`: If `query` or `updateOps` are invalid.
  - `ErrorHandler.ErrorTypes.INVALID_QUERY`: If `updateOps` are invalid.
    (Note: `DOCUMENT_NOT_FOUND` is listed in JSDoc but typically results in 0 modified documents rather than an error for "update many" type operations).

**Example:**

```javascript
const updatedCount = docOps.updateDocumentByQuery(
  { department: 'Sales' },
  { $set: { onQuota: true } }
);
console.log(`${updatedCount} sales documents updated.`);
```

#### replaceDocument(id: string, doc: Object): Object

Replaces a single document identified by `id` with the new `doc`. The `_id` in `doc` must match `id` or be omitted.

- **Parameters**
  - `id`: The `_id` of the document to replace.
  - `doc`: The replacement document.
- **Returns**
  - An object `{ acknowledged: boolean, modifiedCount: number }`.
- **Throws**
  - `ErrorHandler.ErrorTypes.INVALID_ARGUMENT`: If `id` or `doc` is invalid, or if `doc._id` is present and mismatches `id`.
  - `ErrorHandler.ErrorTypes.DOCUMENT_NOT_FOUND`: If no document with the given `id` exists.

**Example:**

```javascript
const result = docOps.replaceDocument('some-unique-id', { name: 'New Name', value: 'New Value' });
if (result.modifiedCount > 0) {
  console.log('Document replaced.');
}
```

#### replaceDocumentByQuery(query: Object, doc: Object): number

Replaces the first document matching the `query` with the new `doc`. Note: MongoDB's `replaceOne` is more aligned with `replaceDocument`. This method's name might be slightly misleading if it replaces multiple, but the current implementation seems to target one. If it's intended to replace multiple, the return type and logic would differ. Assuming it replaces one based on typical `replace` semantics.

- **Parameters**
  - `query`: The filter criteria to select the document for replacement.
  - `doc`: The replacement document.
- **Returns**
  - The number of documents replaced (0 or 1).
- **Throws**
  - `ErrorHandler.ErrorTypes.INVALID_ARGUMENT`: If `query` or `doc` is invalid.

**Example:**

```javascript
const replacedCount = docOps.replaceDocumentByQuery(
  { status: 'pending' },
  { status: 'approved', approvedBy: 'admin' }
);
console.log(`${replacedCount} document(s) replaced.`);
```

### Private Methods

`DocumentOperations` also includes several private helper methods for validation and ID generation:

- `_generateDocumentId()`: Generates a unique ID for new documents.
- `_validateDocument(doc)`: Validates the overall document structure and content.
- `_validateDocumentId(id)`: Validates a standalone document ID.
- `_validateDocumentIdInDocument(id, doc)`: Validates an `_id` field within a document.
- `_validateDocumentFields(doc)`: Validates field names within a document.
- `_checkDuplicateId(id)`: Ensures an `_id` is not already in use before insertion.
- `_validateQuery(query)`: Basic validation for query objects.
- `_validateUpdateOperators(updateOps)`: Basic validation for update operator objects.

These private methods ensure data integrity and consistent error handling within the component.

---
