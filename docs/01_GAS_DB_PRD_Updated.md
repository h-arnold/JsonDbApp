# Updated Simplified PRD for GAS DB (With ScriptProperties Master Index)

## Requirements Document

Requirements Document: Document Database Library for Google Apps Script

1. Overview

This library implements a simple, synchronous document-style database system in Google Apps Script with MongoDB-compatible syntax. It supports generic CRUD operations on named collections, persisted as individual JSON files in Google Drive, and will be accessed only via authenticated Apps Script libraries. The library ensures data consistency across multiple script instances through a ScriptProperties-based master index.

---

2. Objectives

- Provide a lightweight JSON-based document database system
- Allow structured data storage in collections, each stored in a separate Drive file
- Offer core CRUD functionality with basic MongoDB-compatible query support
- Enable safe, synchronous access using LockService
- Ensure data consistency across multiple script instances
- Facilitate future migration to MongoDB by maintaining API compatibility

---

3. Storage Architecture

3.1 Central Index File

A single index file stores metadata and Drive file IDs for all collections:

```json
{
  "collections": {
    "students": {
      "fileId": "1Abc123XyzDriveFileId",  // Actual Google Drive file ID
      "created": "2024-01-01T12:00:00Z",
      "lastUpdated": "2024-01-02T15:20:00Z",
      "documentCount": 42
    }
  }
}
```

3.2 Collection Files

Each collection is stored as a separate Drive file, identified by its Drive file ID:

```json
{
  "documents": {
    "doc_1": { ...document data... },
    "doc_2": { ...document data... }
  },
  "metadata": {
    "lastUpdated": "2024-01-02T15:20:00Z",
    "documentCount": 2
  }
}
```

3.3 ScriptProperties Master Index

A master index stored in ScriptProperties provides cross-instance coordination:

```json
// Key: "GASDB_MASTER_INDEX"
// Value (JSON string):
{
  "version": 1,
  "lastUpdated": "2024-01-01T12:00:00Z",
  "collections": {
    "students": {
      "fileId": "1Abc123XyzDriveFileId",
      "lastModified": "2024-01-01T12:00:00Z",
      "modificationToken": "20240101120000-abc123",
      "lockStatus": {
        "lockedBy": "user@example.com",
        "lockedAt": "2024-01-01T12:00:00Z",
        "expiresAt": "2024-01-01T12:01:00Z"
      }
    }
  }
}
```

---

4. Core API (Minimal Implementation)

4.1 Database Interface

```javascript
// initialise database
const db = new GASDB(config);

// Access or create collection
const collection = db.collection(name);

// List all collections
const collections = db.listCollections();

// Delete collection
const result = db.dropCollection(name);
```

4.2 Collection Interface

```javascript
// Find operations
const doc = collection.findOne({_id: id});
const docs = collection.find(query);
const count = collection.countDocuments(query);

// Write operations
const result = collection.insertOne(doc);
const updateResult = collection.updateOne(query, update);
const deleteResult = collection.deleteOne(query);
```

4.3 Basic Query Support

```javascript
// Basic comparison operators
{ field: { $eq: value } }     // Equals
{ field: { $gt: value } }     // Greater than
{ field: { $lt: value } }     // Less than

// Simple logical operators
{ $and: [ {condition1}, {condition2} ] }
{ $or: [ {condition1}, {condition2} ] }
```

4.4 Basic Update Support

```javascript
// Field update operators
{ $set: { field1: value1, field2: value2 } }
{ $unset: { field1: "", field2: "" } }
```

---

5. Memory and Consistency Management

5.1 In-Memory Collection Handling

- Collections are loaded into memory on first access
- Collections remain in memory throughout script execution
- Changes are written back to Drive only when necessary
- No reliance on CacheService for collection data

5.2 Cross-Instance Coordination

- ScriptProperties stores a master index of all collections
- Each collection has a modification token for conflict detection
- Virtual locking mechanism prevents concurrent modifications
- Conflicts are detected before writing back to Drive

5.3 Modification Protocol

```
When modifying a collection:
1. Acquire virtual lock in master index
2. Verify modification token matches what was read initially
3. If mismatch, reload collection and retry operation
4. Make modifications to in-memory collection
5. Generate new modification token
6. Update collection in Drive
7. Update master index with new metadata
8. Release virtual lock
```

---

6. Technical Implementation

6.1 ID Management

6.1.1 Collection IDs

- Use Google Drive file IDs for collection identification
- Store these IDs in both the central index file and ScriptProperties master index

6.1.2 Document IDs

- Generate document IDs using Utilities.getUuid() or timestamp-based IDs
- All documents will have an "_id" field as the primary identifier

6.2 Concurrency Control

- Use ScriptProperties for cross-instance coordination
- Implement virtual locking mechanism with timeout and expiration
- Use modification tokens for conflict detection
- Provide automatic conflict resolution through retry mechanism

6.3 Component Separation

6.3.1 Collection Component Separation

- Separate document operations from metadata management
- DocumentOperations component handles CRUD operations
- CollectionMetadata component manages collection statistics and metadata
- Collection class orchestrates these components while maintaining a simple API

6.3.2 File Service Component Separation

- Separate file operations from service coordination
- FileOperations component handles direct Drive API interactions with retry logic
- FileService class coordinates file operations while providing a unified interface
- Optimizes Drive API calls through intelligent batching and error handling

---

6.4 Infrastructure Components

6.4.1 Logging and Monitoring

- **GASDBLogger**: Provides standardized logging across all components
  - Four log levels: ERROR, WARN, INFO, DEBUG
  - Component-specific loggers for debugging
  - Operation timing for performance monitoring
  - Context-rich logging with JSON serialization

6.4.2 Error Management

- **ErrorHandler**: Centralizes error handling and validation
  - Standardized error types extending GASDBError base class
  - Error context preservation for debugging
  - Validation utilities for input checking
  - Comprehensive error information extraction

6.4.3 Unique Identifier Generation

- **IdGenerator**: Provides multiple ID generation strategies
  - UUID generation using Google Apps Script utilities
  - Timestamp-based IDs with collision avoidance
  - MongoDB-compatible ObjectId generation
  - Human-readable IDs for debugging
  - Format validation for different ID types

---

7. Error Handling

The library will throw standardized errors for common scenarios:

- Document not found
- Duplicate key
- Invalid query syntax
- Lock acquisition timeout
- File I/O errors
- Conflict detection
- Master index access failures

---

8. Configuration

```javascript
const db = new GASDB({
  rootFolderId: "optional-folder-id", // If not provided, creates in root Drive
  autoCreateCollections: true, // Default: true
  lockTimeout: 30000, // Default: 30 seconds
  masterIndexKey: "GASDB_MASTER_INDEX" // Default: "GASDB_MASTER_INDEX"
});
```

---

9. Constraints and Limitations

- 6-minute maximum execution time (Apps Script limitation)
- 50MB maximum file size (Drive limitation)
- 500KB total storage for ScriptProperties
- 9KB maximum size per property value
- Synchronous execution model only
- Limited query capabilities in initial version

---

10. Future Enhancements

See separate Future Functionality Roadmap document for planned enhancements, including:

- Advanced query and update operators
- Batch operations
- Performance optimizations
- Schema validation
- Collection chunking for large datasets
- Further component decomposition for advanced separation of concerns
