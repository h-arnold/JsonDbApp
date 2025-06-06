# Updated Class Diagrams for GAS DB

## Overview

This document contains updated class diagrams for the Google Apps Script Database (GAS DB) library, optimized for minimal Drive API usage and adherence to SOLID principles. The diagrams reflect the separation of concerns for Collection and FileService components in the MVP.

## Main Classes

### Database Class Diagram

```text
+------------------------------------------+
|                Database                  |
+------------------------------------------+
| - config: DatabaseConfig                 |
| - masterIndex: MasterIndex               | 
| - fileService: FileService               |
| - initialised: Boolean                   |
| - collections: Map<String, Collection>   |
| - indexFileId: String                    |
+------------------------------------------+
| + constructor(config: DatabaseConfig)    |
| + initialise(): void                     |
| + collection(name: String): Collection   |
| + createCollection(name: String): Collection |
| + listCollections(): Array<String>       |
| + dropCollection(name: String): Boolean  |
| + loadIndex(): Object                    |
| - _findExistingIndexFile(): String       |
| - _createIndexFile(): void               |
| - _loadIndexFile(): void                 |
| - _createCollectionObject(name: String, driveFileId: String): Collection |
+------------------------------------------+
```

### DatabaseConfig Class Diagram

```text
+------------------------------------------+
|             DatabaseConfig               |
+------------------------------------------+
| + rootFolderId: String                   |
| + autoCreateCollections: Boolean         |
| + lockTimeout: Number                    |
| + cacheEnabled: Boolean                  |
| + logLevel: String                       |
| + masterIndexKey: String                 |
+------------------------------------------+
| + constructor(config: Object)            |
| + clone(): DatabaseConfig                |
| + toObject(): Object                     |
| - _getDefaultRootFolder(): String        |
| - _validateConfig(): void                |
+------------------------------------------+
```

### Collection Class Diagram (Updated)

```text
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

```text
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

```text
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

```text
+-------------------------------------------------+
|                   FileService                   |
+-------------------------------------------------+
| - _fileOps: FileOperations                      |
| - _logger: GASDBLogger                          |
| - _cache: Map<String,Object>                    |
| - _maxCacheSize: Number                         |
| - _cacheEnabled: Boolean                        |
+-------------------------------------------------+
| + readFile(fileId): Object                      |
| + writeFile(fileId, data): void                 |
| + createFile(name, data, folderId): String      |
| + deleteFile(fileId): Boolean                   |
| + fileExists(fileId): Boolean                   |
| + getFileMetadata(fileId): Object               |
| + batchReadFiles(fileIds): Array<Object>        |
| + batchGetMetadata(fileIds): Array<Object>      |
| + clearCache(): void                            |
| + getCacheStats(): Object                       |
| + setCacheEnabled(enabled): void                |
| - _addToCache(fileId, content): void            |
+-------------------------------------------------+
```

### FileOperations Class Diagram (Updated)

```text
+-------------------------------------------------+
|                 FileOperations                  |
+-------------------------------------------------+
| - _logger: GASDBLogger                          |
| - _maxRetries: Number                           |
| - _retryDelayMs: Number                         |
+-------------------------------------------------+
| + readFile(fileId): Object                      |
| + writeFile(fileId, data): void                 |
| + createFile(name, data, folderId): String      |
| + deleteFile(fileId): Boolean                   |
| + fileExists(fileId): Boolean                   |
| + getFileMetadata(fileId): Object               |
| - _handleDriveApiError(error, op, fileId): void |
| - _retryOperation(fn, operationName): *         |
+-------------------------------------------------+
```

### QueryEngine Class Diagram

```text
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

```text
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

```text
+------------------------------------------+
|             IdGenerator                  |
+------------------------------------------+
| + generateUUID(): String                 |
| + generateFallbackUUID(): String         |
| + generateTimestampId(prefix): String    |
| + generateShortId(length): String        |
| + generateAlphanumericId(length): String |
| + generateNumericId(length): String      |
| + generateObjectId(): String             |
| + generateSequentialId(prefix): String   |
| + generateReadableId(): String           |
| + isValidUUID(id): Boolean               |
| + isValidObjectId(id): Boolean           |
| + getDefaultGenerator(): Function        |
| + createCustomGenerator(options): Function|
+------------------------------------------+
```

### LockService Class Diagram

```text
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

```text
+------------------------------------------+
|              GASDBLogger                 |
+------------------------------------------+
| + LOG_LEVELS: Object                     |
| + currentLevel: Number                   |
+------------------------------------------+
| + setLevel(level): void                  |
| + setLevelByName(levelName): void        |
| + getLevel(): Number                     |
| + getLevelName(): String                 |
| + formatMessage(level, message, context): String |
| + error(message, context): void          |
| + warn(message, context): void           |
| + info(message, context): void           |
| + debug(message, context): void          |
| + log(level, message, context): void     |
| + createComponentLogger(component): Object |
| + startOperation(operation, context): void |
| + endOperation(operation, duration, context): void |
| + timeOperation(operation, fn, context): * |
+------------------------------------------+
```

### ErrorHandler Class Diagram

```text
+------------------------------------------+
|             ErrorHandler                 |
+------------------------------------------+
| + ErrorTypes: Object                     |
+------------------------------------------+
| + createError(errorType, ...args): Error |
| + handleError(error, context, rethrow): void |
| + wrapFunction(fn, context): Function    |
| + validateRequired(value, name): void    |
| + validateType(value, expectedType, name): void |
| + validateNotEmpty(value, name): void    |
| + validateNotEmptyArray(value, name): void |
| + validateRange(value, min, max, name): void |
| + isErrorType(error, errorType): Boolean |
| + extractErrorInfo(error): Object        |
+------------------------------------------+
```

### GASDBError Class Diagram

```text
+------------------------------------------+
|              GASDBError                  |
+------------------------------------------+
| + message: String                        |
| + code: String                           |
| + context: Object                        |
| + timestamp: Date                        |
+------------------------------------------+
| + constructor(message, code, context): void |
| + toJSON(): Object                       |
+------------------------------------------+
```

### Specific Error Classes

```text
+------------------------------------------+
|        DocumentNotFoundError             |
|        DuplicateKeyError                 |
|        InvalidQueryError                 |
|        LockTimeoutError                  |
|        FileIOError                       |
|        ConflictError                     |
|        MasterIndexError                  |
|        CollectionNotFoundError           |
|        ConfigurationError                |
+------------------------------------------+
| All extend GASDBError                    |
| Each has specific constructor parameters |
+------------------------------------------+
```

### MasterIndex Class Diagram (New)

```text
+------------------------------------------+
|               MasterIndex                |
+------------------------------------------+
| - config: Object                         |
| - properties: GoogleAppsScript.Properties.Properties |
| - masterIndexKey: String                 |
| - lockTimeout: Number                    |
| - indexData: Object                      |
| - initialised: Boolean                   |
+------------------------------------------+
| + constructor(config: Object)            |
| # initialise(): void (Note: This seems to be missing from the provided MasterIndex.js, added based on common patterns) |
| + isInitialised(): Boolean               |
| + addCollection(name: String, metadata: Object): void |
| + save(): void                           |
| + getCollections(): Object               |
| + getCollection(name: String): Object    |
| + updateCollectionMetadata(name: String, updates: Object): void |
| + removeCollection(name: String): Boolean |
| + acquireLock(collectionName: String, operationId: String): Boolean |
| + isLocked(collectionName: String): Boolean |
| + releaseLock(collectionName: String, operationId: String): Boolean |
| # - _loadIndex(): void (Note: This seems to be missing from the provided MasterIndex.js, added based on common patterns) |
| # - _saveIndex(): void (Note: This seems to be missing from the provided MasterIndex.js, added based on common patterns) |
| # - _getLockKey(collectionName: String): String (Note: This seems to be missing from the provided MasterIndex.js, added based on common patterns) |
| # - _getTimestamp(): Number (Note: This seems to be missing from the provided MasterIndex.js, added based on common patterns) |
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
