# Updated Class Diagrams for GAS DB

## Overview

This document contains updated class diagrams for the Google Apps Script Database (GAS DB) library, optimized for minimal Drive API usage and adherence to SOLID principles. The diagrams reflect the separation of concerns for Collection and FileService components in the MVP.

## Main Classes

### Database Class Diagram

```
+------------------------------------------+
|                Database                  |
+------------------------------------------+
| - indexFileId: String                    |
| - collections: Map<String, Collection>   |
| - config: DatabaseConfig                 |
+------------------------------------------+
| + initialize(): void                     |
| + collection(name): Collection           |
| + createCollection(name): Collection     |
| + listCollections(): Array<String>       |
| + dropCollection(name): Boolean          |
| - loadIndex(): void                      |
| - saveIndex(): void                      |
| - getCachedCollection(name): Collection  |
+------------------------------------------+
```

### DatabaseConfig Class Diagram

```
+------------------------------------------+
|             DatabaseConfig               |
+------------------------------------------+
| + rootFolderId: String                   |
| + autoCreateCollections: Boolean         |
| + lockTimeout: Number                    |
| + cacheEnabled: Boolean                  |
| + logLevel: String                       |
+------------------------------------------+
```

### Collection Class Diagram (Updated)

```
+------------------------------------------+
|               Collection                 |
+------------------------------------------+
| - name: String                           |
| - driveFileId: String                    |
| - db: Database                           |
| - docOps: DocumentOperations             |
| - metadata: CollectionMetadata           |
| - isDirty: Boolean                       |
| - isLoaded: Boolean                      |
+------------------------------------------+
| + findOne(query): Object                 |
| + find(query): Array<Object>             |
| + insertOne(doc): Object                 |
| + insertMany(docs): Array<Object>        |
| + updateOne(query, update): Object       |
| + updateMany(query, update): Object      |
| + deleteOne(query): Object               |
| + deleteMany(query): Object              |
| + countDocuments(query): Number          |
| - loadData(): void                       |
| - saveData(): void                       |
| - acquireLock(): Lock                    |
| - releaseLock(lock): void                |
| - markDirty(): void                      |
| - ensureLoaded(): void                   |
+------------------------------------------+
```

### DocumentOperations Class Diagram (New)

```
+------------------------------------------+
|          DocumentOperations              |
+------------------------------------------+
| - collection: Collection                 |
| - queryEngine: QueryEngine               |
| - updateEngine: UpdateEngine             |
+------------------------------------------+
| + findDocument(query): Object            |
| + findDocuments(query): Array<Object>    |
| + insertDocument(doc): Object            |
| + updateDocument(query, update): Object  |
| + deleteDocument(query): Object          |
| + countMatchingDocuments(query): Number  |
+------------------------------------------+
```

### CollectionMetadata Class Diagram (Updated)

```
+------------------------------------------+
|          CollectionMetadata              |
+------------------------------------------+
| + created: Date                          |
| + lastUpdated: Date                      |
| + documentCount: Number                  |
+------------------------------------------+
| + updateLastModified(): void             |
| + incrementDocumentCount(): void         |
| + decrementDocumentCount(): void         |
| + setDocumentCount(count): void          |
+------------------------------------------+
```

### FileService Class Diagram (Updated)

```
+------------------------------------------+
|              FileService                 |
+------------------------------------------+
| - fileOps: FileOperations                |
| - fileCache: FileCache                   |
+------------------------------------------+
| + readFile(fileId): Object               |
| + writeFile(fileId, data): void          |
| + createFile(name, data, folderId): String|
| + deleteFile(fileId): Boolean            |
| + getCachedFile(fileId): Object          |
| + invalidateCache(fileId): void          |
+------------------------------------------+
```

### FileOperations Class Diagram (New)

```
+------------------------------------------+
|            FileOperations                |
+------------------------------------------+
| - logger: GASDBLogger                    |
+------------------------------------------+
| + readFile(fileId): Object               |
| + writeFile(fileId, data): void          |
| + createFile(name, data, folderId): String|
| + deleteFile(fileId): Boolean            |
+------------------------------------------+
```

### FileCache Class Diagram (New)

```
+------------------------------------------+
|              FileCache                   |
+------------------------------------------+
| - cache: Map<String, Object>             |
| - dirtyFlags: Map<String, Boolean>       |
+------------------------------------------+
| + getFile(fileId): Object                |
| + setFile(fileId, data): void            |
| + invalidate(fileId): void               |
| + isDirty(fileId): Boolean               |
| + markDirty(fileId): void                |
| + clearDirty(fileId): void               |
+------------------------------------------+
```

### QueryEngine Class Diagram

```
+------------------------------------------+
|             QueryEngine                  |
+------------------------------------------+
| + executeQuery(docs, query): Array<Object> |
| - evaluateComparison(doc, field, operator, value): Boolean |
| - evaluateLogical(doc, operator, conditions): Boolean |
| - evaluateElementOperator(doc, field, operator, value): Boolean |
+------------------------------------------+
```

### UpdateEngine Class Diagram

```
+------------------------------------------+
|             UpdateEngine                 |
+------------------------------------------+
| + executeUpdate(doc, update): Object     |
| - applySetOperator(doc, fields): void    |
| - applyUnsetOperator(doc, fields): void  |
| - applyIncOperator(doc, fields): void    |
| - applyRenameOperator(doc, fields): void |
| - applyArrayOperators(doc, operator, field, value): void |
+------------------------------------------+
```

### IdGenerator Class Diagram

```
+------------------------------------------+
|             IdGenerator                  |
+------------------------------------------+
| + generate(): String                     |
| - generateTimestampBased(): String       |
+------------------------------------------+
```

### LockService Class Diagram

```
+------------------------------------------+
|             LockService                  |
+------------------------------------------+
| - locks: Map<String, Lock>               |
+------------------------------------------+
| + acquireLock(resource, timeout): Lock   |
| + releaseLock(lock): void                |
| + isLocked(resource): Boolean            |
+------------------------------------------+
```

### GASDBLogger Class Diagram

```
+------------------------------------------+
|              GASDBLogger                 |
+------------------------------------------+
| - logLevel: String                       |
| - apiCallCounter: Map<String, Number>    |
+------------------------------------------+
| + error(message, data): void             |
| + warn(message, data): void              |
| + info(message, data): void              |
| + debug(message, data): void             |
| + incrementApiCall(type): void           |
| + getApiCallStats(): Object              |
+------------------------------------------+
```

### ErrorHandler Class Diagram

```
+------------------------------------------+
|             ErrorHandler                 |
+------------------------------------------+
| + throwDocumentNotFound(id): void        |
| + throwDuplicateKey(id): void            |
| + throwInvalidQuery(details): void       |
| + throwLockTimeout(): void               |
| + throwFileIOError(details): void        |
| + throwQuotaExceeded(details): void      |
+------------------------------------------+
```

## Updated Class Relationships

```
                   +-------------+
                   |  Database   |
                   +-------------+
                          |
                          | uses
                          v
              +-------------------------+
              |      DatabaseConfig     |
              +-------------------------+
                          |
                          | configures
                          v
                   +-------------+
                   | Collection  |<-------------------+
                   +-------------+                    |
                        |   |                         |
                        |   | contains                |
                        |   v                         |
                        | +-----------------+         |
                        | |CollectionMetadata|        |
                        | +-----------------+         |
                        |                             |
                        | contains                    |
                        v                             |
              +--------------------+                  |
              | DocumentOperations |                  |
              +--------------------+                  |
                        |                             |
                        | uses                        |
                        v                             |
      +------------------+  +------------------+      |
      |   QueryEngine    |  |   UpdateEngine   |      |
      +------------------+  +------------------+      |
                 \                  |                 |
                  \                 |                 |
                   \                |                 |
                    \               |                 |
                     v              v                 |
                +---------------------------+         |
                |       ErrorHandler        |         |
                +---------------------------+         |
                           |                          |
                           | uses                     |
                           v                          |
      +------------------+  +------------------+      |
      |   IdGenerator    |  |   LockService    |      |
      +------------------+  +------------------+      |
                 \                  |                 |
                  \                 |                 |
                   \                |                 |
                    \               |                 |
                     v              v                 |
                +---------------------------+         |
                |        FileService        |---------+
                +---------------------------+
                        |       |
                        |       | contains
                        |       v
                        |  +-----------+
                        |  | FileCache |
                        |  +-----------+
                        |
                        | contains
                        v
                  +-------------+
                  |FileOperations|
                  +-------------+
                        |
                        | uses
                        v
                +---------------------------+
                |        GASDBLogger        |
                +---------------------------+
```

## Updated Sequence Diagrams

### Document Operation Sequence (Updated)

```
Client                Collection           DocumentOperations      FileService
  |                        |                      |                    |
  | find(query)            |                      |                    |
  |----------------------->|                      |                    |
  |                        | ensureLoaded()       |                    |
  |                        |--------------------->|                    |
  |                        |                      |                    |
  |                        | findDocuments(query) |                    |
  |                        |--------------------->|                    |
  |                        |                      |                    |
  |                        |                      | executeQuery()     |
  |                        |                      |------------------->|
  |                        |                      |                    |
  |<-----------------------|                      |                    |
  | matching documents     |                      |                    |
  |                        |                      |                    |
```

### File Operation Sequence (Updated)

```
Collection            FileService           FileOperations         FileCache
  |                        |                      |                    |
  | loadData()             |                      |                    |
  |----------------------->|                      |                    |
  |                        | getCachedFile()      |                    |
  |                        |--------------------->|                    |
  |                        |                      |                    |
  |                        |                      |                    |
  |                        |                      | getFile()          |
  |                        |                      |------------------->|
  |                        |                      |                    |
  |                        |                      | [if not in cache]  |
  |                        |                      | readFile()         |
  |                        |                      |------------------->|
  |                        |                      |                    |
  |                        |                      | setFile()          |
  |                        |                      |------------------->|
  |                        |                      |                    |
  |<-----------------------|                      |                    |
  | file data              |                      |                    |
  |                        |                      |                    |
```

## Drive API Optimization Details

### FileService Caching

The FileService now explicitly separates file operations from caching:
- FileOperations handles direct Drive API calls
- FileCache manages in-memory storage of file content
- FileService orchestrates these components

### Collection Component Separation

The Collection class now delegates responsibilities:
- DocumentOperations handles CRUD operations on documents
- CollectionMetadata manages collection statistics and metadata
- Collection orchestrates these components while maintaining a simple API

This separation improves:
- Code maintainability through focused components
- Testability by allowing component mocking
- Future extensibility without major refactoring

### Batch Operations

The system continues to support batch operations to minimize Drive API calls:
- insertMany() performs a single write for multiple documents
- updateMany() performs a single write after multiple updates
- deleteMany() performs a single write after multiple deletions

### Metadata Management

Metadata management is now more explicitly handled:
- CollectionMetadata provides methods for metadata manipulation
- Collection coordinates metadata updates with document operations
- Periodic synchronization ensures index metadata stays current
