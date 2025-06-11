# Collection Components Developer Guide

This document explains the role, API surface and usage patterns for the Collection, CollectionMetadata, and DocumentOperations classes in GAS-DB. These three classes work together to provide MongoDB-compatible collection operations with Google Drive persistence.

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
      - [updateLastModified(): void](#updatelastmodified-void)
      - [incrementDocumentCount(): void](#incrementdocumentcount-void)
      - [decrementDocumentCount(): void](#decrementdocumentcount-void)
      - [setDocumentCount(count: number): void](#setdocumentcountcount-number-void)
      - [toObject(): Object](#toobject-object)
      - [clone(): CollectionMetadata](#clone-collectionmetadata)
  - [DocumentOperations](#documentoperations)
    - [Purpose](#purpose-2)
    - [Constructor](#constructor-2)
    - [Public Methods](#public-methods-2)
      - [insertDocument(doc: Object): Object](#insertdocumentdoc-object-object)
      - [findDocumentById(id: string): Object|null](#finddocumentbyidid-string-objectnull)
      - [findAllDocuments(): Array](#findalldocuments-array)
      - [updateDocument(id: string, updateData: Object): Object](#updatedocumentid-string-updatedata-object-object)
      - [deleteDocument(id: string): Object](#deletedocumentid-string-object)
      - [countDocuments(): number](#countdocuments-number)
      - [documentExists(id: string): boolean](#documentexistsid-string-boolean)
    - [Document Validation](#document-validation)
    - [ID Generation](#id-generation)
  - [Usage Patterns](#usage-patterns)
    - [Basic CRUD Operations](#basic-crud-operations)
    - [Metadata Tracking](#metadata-tracking)
    - [Error Handling](#error-handling)
    - [Manual Persistence](#manual-persistence)
  - [Integration with Other Components](#integration-with-other-components)
    - [FileService Integration](#fileservice-integration)
    - [Database Integration](#database-integration)
    - [Error Handling Integration](#error-handling-integration)
  - [Performance Considerations](#performance-considerations)
    - [Lazy Loading](#lazy-loading-1)
    - [Dirty Tracking](#dirty-tracking)
    - [Memory Management](#memory-management)
    - [Caching Strategy](#caching-strategy)
  - [Future Enhancements](#future-enhancements)
    - [Section 6: Query Engine](#section-6-query-engine)
    - [Section 7: Update Engine](#section-7-update-engine)


---

## Overview

The Collection Components form the core of GAS-DB's document storage system:

- **Collection**: The main interface providing MongoDB-compatible CRUD operations
- **CollectionMetadata**: Manages collection metadata (timestamps, document counts)
- **DocumentOperations**: Handles low-level document manipulation

### Architecture

```
Collection (High-level MongoDB API)
├── CollectionMetadata (Metadata management)
└── DocumentOperations (Document CRUD operations)
```

### Current Limitations (Section 5)

These components currently have limited query support:

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
new Collection(name, driveFileId, database, fileService)
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
  - `filter`: Query filter (Section 5: `{}` or `{_id: "id"}` only)
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

// Unsupported filter (throws error)
try {
  collection.findOne({ name: 'Alice' }); // Not supported in Section 5
} catch (error) {
  console.error('Unsupported:', error.message);
}
```

#### find(filter?: Object): Array

Find multiple documents matching the filter.

- **Parameters**
  - `filter`: Query filter (Section 5: `{}` only)
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

allDocs.forEach(doc => {
  console.log('Document ID:', doc._id);
});

// Empty collection returns empty array
const emptyResults = emptyCollection.find({});
console.log('Empty results:', emptyResults); // []
```

#### updateOne(filter: Object, update: Object): Object

Update a single document matching the filter.

- **Parameters**
  - `filter`: Query filter (Section 5: `{_id: "id"}` only)
  - `update`: Document replacement (no operators in Section 5)
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
    _id: 'user123', // ID preserved automatically
    name: 'Robert',
    email: 'robert@example.com',
    age: 31,
    lastUpdated: new Date()
  }
);

console.log('Modified count:', updateResult.modifiedCount); // 1

// Non-existent document
const noMatch = collection.updateOne(
  { _id: 'nonexistent' },
  { name: 'Nobody' }
);
console.log('No match:', noMatch.modifiedCount); // 0

// Unsupported update operators (throws error)
try {
  collection.updateOne(
    { _id: 'user123' },
    { $set: { age: 32 } } // Not supported in Section 5
  );
} catch (error) {
  console.error('Unsupported operator:', error.message);
}
```

#### deleteOne(filter: Object): Object

Delete a single document matching the filter.

- **Parameters**
  - `filter`: Query filter (Section 5: `{_id: "id"}` only)
- **Returns**
  - `{deletedCount: number, acknowledged: boolean}`
- **Throws**
  - `InvalidArgumentError` for invalid filter structure
  - `OperationError` for unsupported filters

**Example:**

```javascript
// Delete by ID
const deleteResult = collection.deleteOne({ _id: 'user123' });
console.log('Deleted count:', deleteResult.deletedCount); // 1

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
  - `filter`: Query filter (Section 5: `{}` only)
- **Returns**
  - Number of matching documents
- **Throws**
  - `InvalidArgumentError` for invalid filter structure
  - `OperationError` for unsupported filters

**Example:**

```javascript
// Count all documents
const totalCount = collection.countDocuments({});
console.log('Total documents:', totalCount);

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

CollectionMetadata manages collection metadata as plain objects with methods for timestamp tracking and document count management.

### Constructor

```js
new CollectionMetadata(initialMetadata?: Object)
```

- **initialMetadata** (optional): Initial metadata object
  - `created`: Creation timestamp (Date)
  - `lastUpdated`: Last update timestamp (Date)
  - `documentCount`: Document count (integer ≥ 0)

**Throws**: `InvalidArgumentError` for invalid metadata

**Example:**

```javascript
// Create with defaults
const metadata1 = new CollectionMetadata();
console.log('Default count:', metadata1.documentCount); // 0

// Create with initial values
const metadata2 = new CollectionMetadata({
  created: new Date('2023-01-01'),
  lastUpdated: new Date('2023-06-15'),
  documentCount: 42
});

// Invalid values throw errors
try {
  new CollectionMetadata({ documentCount: -1 });
} catch (error) {
  console.error('Invalid count:', error.message);
}
```

### Public Methods

#### updateLastModified(): void

Update the lastUpdated timestamp to current time.

```javascript
const metadata = new CollectionMetadata();
const oldTime = metadata.lastUpdated;

// Wait a moment...
setTimeout(() => {
  metadata.updateLastModified();
  console.log('Updated:', metadata.lastUpdated > oldTime); // true
}, 10);
```

#### incrementDocumentCount(): void

Increment document count by 1 and update lastModified.

```javascript
const metadata = new CollectionMetadata();
console.log('Initial count:', metadata.documentCount); // 0

metadata.incrementDocumentCount();
console.log('After increment:', metadata.documentCount); // 1
```

#### decrementDocumentCount(): void

Decrement document count by 1 and update lastModified.

- **Throws**: `InvalidArgumentError` if count would go below zero

```javascript
const metadata = new CollectionMetadata({ documentCount: 5 });

metadata.decrementDocumentCount();
console.log('After decrement:', metadata.documentCount); // 4

// Cannot go below zero
try {
  const empty = new CollectionMetadata({ documentCount: 0 });
  empty.decrementDocumentCount(); // Throws error
} catch (error) {
  console.error('Cannot decrement:', error.message);
}
```

#### setDocumentCount(count: number): void

Set document count to specific value and update lastModified.

- **Parameters**
  - `count`: New document count (integer ≥ 0)
- **Throws**: `InvalidArgumentError` for invalid values

```javascript
const metadata = new CollectionMetadata();

metadata.setDocumentCount(100);
console.log('Set count:', metadata.documentCount); // 100

// Invalid values throw errors
try {
  metadata.setDocumentCount(-5); // Throws error
} catch (error) {
  console.error('Invalid count:', error.message);
}
```

#### toObject(): Object

Return metadata as plain object with Date copies.

- **Returns**: `{created: Date, lastUpdated: Date, documentCount: number}`

```javascript
const metadata = new CollectionMetadata({ documentCount: 10 });
const obj = metadata.toObject();

console.log('Plain object:', obj);
// { created: Date, lastUpdated: Date, documentCount: 10 }

// Dates are independent copies
obj.created.setFullYear(2000);
console.log('Original unchanged:', metadata.created.getFullYear() !== 2000);
```

#### clone(): CollectionMetadata

Create independent clone of metadata.

```javascript
const original = new CollectionMetadata({ documentCount: 5 });
const copy = original.clone();

copy.incrementDocumentCount();
console.log('Original unchanged:', original.documentCount); // 5
console.log('Copy changed:', copy.documentCount); // 6
```

---

## DocumentOperations

### Purpose

DocumentOperations handles low-level document CRUD operations on collections stored as plain objects. It provides ID-based document manipulation with validation and error handling.

### Constructor

```js
new DocumentOperations(collection)
```

- **collection**: Collection reference for document storage
  - Must have `_documents` property (object)
  - Must have `_markDirty()` method
  - Must have `_updateMetadata()` method

**Throws**: `InvalidArgumentError` for invalid collection

**Example:**

```javascript
// Usually created by Collection class internally
const docOps = new DocumentOperations(collectionInstance);
```

### Public Methods

#### insertDocument(doc: Object): Object

Insert a document with automatic or provided ID.

- **Parameters**
  - `doc`: Document object to insert
- **Returns**
  - Inserted document with `_id`
- **Throws**
  - `InvalidArgumentError` for invalid documents
  - `ConflictError` for duplicate IDs

**Example:**

```javascript
const docOps = new DocumentOperations(collection);

// Insert with auto-generated ID
const doc1 = docOps.insertDocument({
  name: 'Alice',
  email: 'alice@example.com'
});
console.log('Generated ID:', doc1._id);

// Insert with specific ID
const doc2 = docOps.insertDocument({
  _id: 'custom123',
  name: 'Bob'
});
console.log('Custom ID:', doc2._id); // 'custom123'
```

#### findDocumentById(id: string): Object|null

Find document by ID.

- **Parameters**
  - `id`: Document ID to find (non-empty string)
- **Returns**
  - Document copy or `null` if not found
- **Throws**
  - `InvalidArgumentError` for invalid ID

**Example:**

```javascript
const docOps = new DocumentOperations(collection);

const found = docOps.findDocumentById('custom123');
if (found) {
  console.log('Found document:', found.name);
  // Modifying returned object doesn't affect original
  found.name = 'Modified';
} else {
  console.log('Document not found');
}
```

#### findAllDocuments(): Array

Find all documents in collection.

- **Returns**
  - Array of document copies

**Example:**

```javascript
const docOps = new DocumentOperations(collection);

const allDocs = docOps.findAllDocuments();
console.log('Total documents:', allDocs.length);

allDocs.forEach(doc => {
  console.log('ID:', doc._id, 'Name:', doc.name);
});
```

#### updateDocument(id: string, updateData: Object): Object

Update document by ID using document replacement.

- **Parameters**
  - `id`: Document ID to update (non-empty string)
  - `updateData`: Data to merge with existing document
- **Returns**
  - `{acknowledged: boolean, modifiedCount: number}`
- **Throws**
  - `InvalidArgumentError` for invalid parameters

**Example:**

```javascript
const docOps = new DocumentOperations(collection);

// Update existing document
const result = docOps.updateDocument('custom123', {
  name: 'Robert',
  age: 30,
  lastModified: new Date()
});
console.log('Modified:', result.modifiedCount); // 1

// Non-existent document
const noMatch = docOps.updateDocument('missing', { name: 'Ghost' });
console.log('No match:', noMatch.modifiedCount); // 0
```

#### deleteDocument(id: string): Object

Delete document by ID.

- **Parameters**
  - `id`: Document ID to delete (non-empty string)
- **Returns**
  - `{acknowledged: boolean, deletedCount: number}`
- **Throws**
  - `InvalidArgumentError` for invalid ID

**Example:**

```javascript
const docOps = new DocumentOperations(collection);

const result = docOps.deleteDocument('custom123');
console.log('Deleted:', result.deletedCount); // 1

// Document no longer exists
const gone = docOps.findDocumentById('custom123');
console.log('Document gone:', gone); // null
```

#### countDocuments(): number

Count total documents in collection.

```javascript
const docOps = new DocumentOperations(collection);

const count = docOps.countDocuments();
console.log('Document count:', count);
```

#### documentExists(id: string): boolean

Check if document exists by ID.

- **Parameters**
  - `id`: Document ID to check (non-empty string)
- **Returns**
  - `true` if document exists, `false` otherwise
- **Throws**
  - `InvalidArgumentError` for invalid ID

**Example:**

```javascript
const docOps = new DocumentOperations(collection);

const exists = docOps.documentExists('custom123');
if (exists) {
  console.log('Document exists');
} else {
  console.log('Document not found');
}
```

### Document Validation

DocumentOperations validates documents before insertion/updates:

```javascript
// Valid documents
const valid1 = { name: 'Alice', age: 30 };
const valid2 = { _id: 'custom', data: { nested: true } };

// Invalid documents (throw InvalidArgumentError)
const invalid1 = null; // Must be object
const invalid2 = []; // Must be object, not array
const invalid3 = { __reserved: 'value' }; // Field names cannot start with __
const invalid4 = { _id: '' }; // ID must be non-empty string if provided
```

### ID Generation

When no `_id` is provided, DocumentOperations generates unique UUIDs:

```javascript
const doc1 = docOps.insertDocument({ name: 'Test1' });
const doc2 = docOps.insertDocument({ name: 'Test2' });

console.log('Unique IDs:', doc1._id !== doc2._id); // true
console.log('UUID format:', /^[0-9a-f-]{36}$/.test(doc1._id)); // true
```

---

## Usage Patterns

### Basic CRUD Operations

```javascript
// Get collection from database
const users = database.collection('users');

// Create
const newUser = users.insertOne({
  name: 'Alice',
  email: 'alice@example.com',
  createdAt: new Date()
});

// Read
const user = users.findOne({ _id: newUser.insertedId });
const allUsers = users.find({});

// Update (document replacement in Section 5)
users.updateOne(
  { _id: newUser.insertedId },
  { ...user, name: 'Alice Smith', updatedAt: new Date() }
);

// Delete
users.deleteOne({ _id: newUser.insertedId });

// Count
const totalUsers = users.countDocuments({});
```

### Metadata Tracking

```javascript
const users = database.collection('users');

// Check collection state
const metadata = users.getMetadata();
console.log('Collection created:', metadata.created);
console.log('Last updated:', metadata.lastUpdated);
console.log('Document count:', metadata.documentCount);

// Monitor changes
console.log('Has unsaved changes:', users.isDirty());
```

### Error Handling

```javascript
const users = database.collection('users');

try {
  // Attempt unsupported query
  users.find({ name: 'Alice' });
} catch (error) {
  if (error instanceof OperationError) {
    console.log('Query not supported:', error.message);
    // Fallback to supported operations
    const allUsers = users.find({});
    const alice = allUsers.find(user => user.name === 'Alice');
  }
}

try {
  // Attempt duplicate ID insertion
  users.insertOne({ _id: 'duplicate', name: 'User1' });
  users.insertOne({ _id: 'duplicate', name: 'User2' });
} catch (error) {
  if (error instanceof ConflictError) {
    console.log('ID already exists:', error.message);
  }
}
```

### Manual Persistence

```javascript
const users = database.collection('users');

// Make multiple changes
users.insertOne({ name: 'User1' });
users.insertOne({ name: 'User2' });
users.insertOne({ name: 'User3' });

// Check dirty state
console.log('Has changes:', users.isDirty()); // true

// Force save (usually automatic)
users.save();
console.log('Changes saved:', !users.isDirty()); // true
```

---

## Integration with Other Components

### FileService Integration

Collection relies on FileService for Drive persistence:

```javascript
// Collection uses FileService internally
const data = fileService.readFile(driveFileId); // Returns parsed object with Dates
fileService.writeFile(driveFileId, collectionData); // Accepts object, handles JSON
```

**Note**: JSON serialisation and Date conversion are handled automatically by the underlying FileOperations layer, not by Collection or FileService directly.

### Database Integration

Database manages collection instances:

```javascript
// Database creates and caches collections
const users = database.collection('users'); // Creates Collection instance
const sameUsers = database.collection('users'); // Returns cached instance
```

### Error Handling Integration

All classes use standardised GAS-DB error types:

```javascript
// Common error types across components
InvalidArgumentError // Parameter validation
ConflictError        // Duplicate IDs
OperationError       // Unsupported operations
FileIOError         // Drive access failures
```

---

## Performance Considerations

### Lazy Loading

- Collections load from Drive only when first accessed
- Subsequent operations use in-memory data
- Reduces unnecessary Drive API calls

### Dirty Tracking

- Changes are tracked with `_dirty` flag
- Only dirty collections are saved to Drive
- Prevents unnecessary write operations

### Memory Management

- Document operations return copies to prevent external modification
- Original documents remain protected in collection state
- Metadata objects are cloned when returned

### Caching Strategy

- Collections cache loaded data until manually saved
- FileService provides additional caching layer
- Reduces Drive API usage and improves performance

---

## Future Enhancements

### Section 6: Query Engine

Advanced query capabilities will be added:

```javascript
// Future query support
users.find({ age: { $gte: 18 } });
users.find({ name: /^A/ });
users.find({ 'address.city': 'London' });
```

### Section 7: Update Engine

Update operators will be supported:

```javascript
// Future update operators
users.updateOne({ _id: 'user123' }, {
  $set: { age: 31 },
  $inc: { loginCount: 1 },
  $push: { tags: 'active' }
});
```

These enhancements will maintain backward compatibility with current Section 5 implementations.
