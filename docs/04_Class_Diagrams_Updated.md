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
| - _name: String                          |
| - _driveFileId: String                   |
| - _database: Database                    |
| - _fileService: FileService              |
| - _logger: GASDBLogger                   |
| - _loaded: Boolean                       |
| - _dirty: Boolean                        |
| - _documents: Object                     |
| - _collectionMetadata: CollectionMetadata|
| - _documentOperations: DocumentOperations|
+------------------------------------------+
| + constructor(name, driveFileId, database, fileService) |
| + insertOne(doc: Object): Object         |
| + findOne(filter: Object): Object|null   |
| + find(filter: Object): Array<Object>    |
| + updateOne(filter: Object, update: Object): Object |
| + deleteOne(filter: Object): Object      |
| + countDocuments(filter: Object): Number |
| + getName(): String                      |
| + getMetadata(): Object                  |
| + isDirty(): Boolean                     |
| + save(): void                           |
| - _ensureLoaded(): void                  |
| - _loadData(): void                      |
| - _saveData(): void                      |
| - _markDirty(): void                     |
| - _updateMetadata(changes: Object): void |
| - _validateFilter(filter: Object, operation: String): void |
+------------------------------------------+
```

### DocumentOperations Class Diagram (New)

```text
+------------------------------------------+
|          DocumentOperations              |
+------------------------------------------+
| - _collection: Collection                |
| - _logger: GASDBLogger                   |
+------------------------------------------+
| + constructor(collection: Collection)    |
| + insertDocument(doc: Object): Object    |
| + findDocumentById(id: String): Object|null|
| + findAllDocuments(): Array<Object>      |
| + updateDocument(id: String, updateData: Object): Object |
| + deleteDocument(id: String): Object     |
| + countDocuments(): Number               |
| + documentExists(id: String): Boolean    |
| - _generateDocumentId(): String          |
| - _validateDocument(doc: Object): void   |
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
| + constructor(initialMetadata?: Object)  |
| + updateLastModified(): void             |
| + incrementDocumentCount(): void         |
| + decrementDocumentCount(): void         |
| + setDocumentCount(count: Number): void  |
| + toObject(): Object                     |
| + clone(): CollectionMetadata            |
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
