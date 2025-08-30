# Updated Class Diagrams for GAS DB

## Overview

This document contains updated class diagrams for the Google Apps Script Database (GAS DB) library, optimised for minimal Drive API usage and adherence to SOLID principles. The diagrams reflect the separation of concerns for Collection and FileService components in the MVP.

## SOLID and DRY Principles Implementation

### Single Responsibility Principle (SRP)
Each class in the system has a clearly defined responsibility:
- **Collection**: API interface with MongoDB-compatible methods
- **DocumentOperations**: Document-level CRUD operations
- **CollectionMetadata**: Collection statistics and timestamp management
- **FileService**: File system interaction abstraction
- **QueryEngine**: Document filtering and query evaluation
- **UpdateEngine**: Document modification operations

### Open/Closed Principle (OCP)
- **QueryEngine**: Designed with operator pattern for extension without modification
- **UpdateEngine**: Structured to allow adding new update operators
- **ErrorHandler**: Error types system can be extended with new errors

### Liskov Substitution Principle (LSP)
- **Error hierarchy**: All specific errors extend GASDBError
- **Component interfaces**: Components rely on interface contracts, not implementations

### Interface Segregation Principle (ISP)
- **DocumentOperations**: Focused interface for document manipulation
- **FileService**: Clean interface separated from implementation details
- **CollectionMetadata**: Cohesive interface for metadata operations only

### Dependency Inversion Principle (DIP)
- **Dependency injection**: Components receive dependencies via constructor
- **Abstract dependencies**: Components depend on interfaces, not concrete implementations
- **Configuration objects**: Used to decouple configuration from implementation

### DRY (Don't Repeat Yourself)
- **Centralized error handling**: Common validation in ErrorHandler
- **Component separation**: Clear boundaries prevent duplicated functionality
- **IdGenerator**: Single source for all ID generation operations
- **Logger**: Unified logging implementation

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

### Collection Facade and Operations

The `Collection` class acts as a facade, delegating operations to specialized handler classes.

```text
+-------------------------------------------------         +----------------------------------+
|                   Collection (Facade)           |<>------>|    CollectionReadOperations    |
+-------------------------------------------------         +----------------------------------+
| - _name: String                                 |         | - _collection: Collection      |
| - _driveFileId: String                          |         +----------------------------------+
| - _database: Database                           |         | + findOne(filter): Object|null   |
| - _fileService: FileService                     |         | + find(filter): Array<Object>    |
| - _logger: GASDBLogger                          |         | + countDocuments(filter): Number |
| - _loaded: Boolean                              |         | + aggregate(pipeline): Array     |
| - _dirty: Boolean                               |         +----------------------------------+
| - _documents: Object                            |
| - _metadata: CollectionMetadata                 |         +----------------------------------+
| - _documentOperations: DocumentOperations       |<>------>|   CollectionWriteOperations    |
| - _coordinator: CollectionCoordinator           |         +----------------------------------+
| - _readOps: CollectionReadOperations            |         | - _collection: Collection      |
| - _writeOps: CollectionWriteOperations          |         +----------------------------------+
+-------------------------------------------------         | + insertOne(doc): Object         |
| + constructor(name, driveFileId, db, fs)        |         | + updateOne(filter, u): Object   |
|                                                 |         | + updateMany(filter, u): Object  |
| // Read Operations (Delegated to _readOps)      |         | + replaceOne(filter, d): Object  |
| + findOne(filter): Object|null                   |         | + deleteOne(filter): Object      |
| + find(filter): Array<Object>                    |         | + deleteMany(filter): Object     |
| + countDocuments(filter): Number                 |         +----------------------------------+
| + aggregate(pipeline): Array                     |
|                                                 |
| // Write Operations (Delegated to _writeOps)     |
| + insertOne(doc): Object                         |
| + updateOne(filter, update): Object              |
| + updateMany(filter, update): Object             |
| + replaceOne(filter, doc): Object                |
| + deleteOne(filter): Object                      |
| + deleteMany(filter): Object                     |
|                                                 |
| // Core Operations                               |
| + save(): void                                   |
| + getMetadata(): Object                          |
+-------------------------------------------------
```

### DocumentOperations Class Diagram (New)

```text
+------------------------------------------+
|          DocumentOperations              |
+------------------------------------------+
| - _collection: Collection                | ← DIP: Depends on Collection interface 
| - _logger: GASDBLogger                   |
| - _queryEngine: QueryEngine              |
| - _updateEngine: UpdateEngine            |
+------------------------------------------+
| + constructor(collection: Collection)    | ← DIP: Dependency injected
| + insertDocument(doc: Object): Object    | ← SRP: Document manipulation only
| + findDocumentById(id: String): Object|null|
| + findAllDocuments(): Array<Object>      | ← ISP: Focused document operations
| + updateDocument(id: String, updateData: Object): Object |
| + deleteDocument(id: String): Object     |
| + countDocuments(): Number               |
| + documentExists(id: String): Boolean    |
| + findByQuery(query: Object): Object|null|
| + findMultipleByQuery(query: Object): Array<Object>|
| + countByQuery(query: Object): Number    |
| + updateDocumentWithOperators(id: String, updateOps: Object): Object |
| + updateDocumentByQuery(query: Object, updateOps: Object): Number |
| + replaceDocument(id: String, doc: Object): Object |
| + replaceDocumentByQuery(query: Object, doc: Object): Number |
| - _generateDocumentId(): String          | ← DRY: Reusable ID generation
| - _validateDocument(doc: Object): void   | ← DRY: Centralized validation
| - _validateDocumentId(id: String): void  |
| - _validateDocumentIdInDocument(id: String, doc: Object): void |
| - _validateDocumentFields(doc: Object): void |
| - _checkDuplicateId(id: String): void    |
| - _validateQuery(query: Object): void    |
| - _validateUpdateOperators(updateOps: Object): void |
+------------------------------------------+
```

### CollectionMetadata Class Diagram (Updated)

```text
+----------------------------------------------------+
|                 CollectionMetadata                 |
+----------------------------------------------------+
| + name: String                                     |
| + fileId: String                                   |
| + created: Date                                    |
| + lastUpdated: Date                                |
| + documentCount: Number                            |
| + modificationToken: String | null                 |
| + lockStatus: Object | null                        |
+----------------------------------------------------+
| + constructor(name: String, fileId: String, initialMetadata?: Object) |
| + updateLastModified(): void                       |
| + touch(): void                                    |
| + incrementDocumentCount(): void                   |
| + decrementDocumentCount(): void                   |
| + setDocumentCount(count: Number): void            |
| + getModificationToken(): String | null            |
| + setModificationToken(token: String | null): void |
| + getLockStatus(): Object | null                   |
| + setLockStatus(lockStatus: Object | null): void   |
| + toJSON(): Object                                 |
| + clone(): CollectionMetadata                      |
| + static fromJSON(obj: Object): CollectionMetadata |
| + static create(name: String, fileId: String): CollectionMetadata |
+----------------------------------------------------+
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
| + executeQuery(docs, query): Array<Object> | ← SRP: Query processing only
| - evaluateComparison(doc, field, operator, value): Boolean | 
| - evaluateLogical(doc, operator, conditions): Boolean | ← OCP: Operators can be extended
| - evaluateElementOperator(doc, field, operator, value): Boolean |
+------------------------------------------+
```

### UpdateEngine Class Diagram

```text
+------------------------------------------+
|             UpdateEngine                 |
+------------------------------------------+
| + executeUpdate(doc, update): Object     | ← SRP: Update processing only
| - applySetOperator(doc, fields): void    |
| - applyUnsetOperator(doc, fields): void  | ← OCP: New operators can be added
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
| - _config: Object                        |
| - _logger: GASDBLogger                   |
| - _data: { version: Number, lastUpdated: String, collections: Object, locks: Object, modificationHistory: Object } |
+------------------------------------------+
| + constructor(config: Object)            |
| + isInitialised(): Boolean               |
| + addCollection(name: String, metadata: Object): Object |
| + save(): void                           |
| + getCollections(): Object               |
| + getCollection(name: String): Object    |
| + updateCollectionMetadata(name: String, updates: Object): Object |
| + removeCollection(name: String): Boolean|
| + acquireLock(collectionName: String, operationId: String): Boolean |
| + isLocked(collectionName: String): Boolean|
| + releaseLock(collectionName: String, operationId: String): Boolean |
| + cleanupExpiredLocks(): Boolean         |
| + generateModificationToken(): String    |
| + hasConflict(collectionName: String, expectedToken: String): Boolean |
| + resolveConflict(collectionName: String, newData: Object, strategy: String): { success: Boolean, data: Object, strategy: String } |
| + getModificationHistory(collectionName: String): Array<Object> |
| + validateModificationToken(token: String): Boolean |
| # _loadFromScriptProperties(): void       |
| # _removeLock(collectionName: String): void |
| # _addToModificationHistory(collectionName: String, operation: String, data: Object): void |
| # _internalCleanupExpiredLocks(): Boolean |
| # _acquireScriptLock(timeout: Number): Lock |
| # _withScriptLock(operation: Function, timeout: Number): * |
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
