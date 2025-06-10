# FileOperations & FileService Developer Guide

This document explains the role, API surface and usage patterns for the FileOperations and FileService classes in GAS-DB.

---

## FileOperations

### Purpose

FileOperations is a low-level component that interacts directly with the DriveApp API.  

- Provides reliable read/write/create/delete operations.  
- Handles retries with exponential backoff.  
- Translates Drive errors into GAS-DB-specific error types.

### Constructor

```js
new FileOperations(logger?: GASDBLogger)
```

- `logger` (optional): component‐scoped logger; if omitted, a default is created.

**Example:**

```javascript
// Create with default logger
const fileOps = new FileOperations();

// Create with custom logger
const logger = GASDBLogger.createComponentLogger('MyComponent');
const fileOps = new FileOperations(logger);
```

### Public Methods

#### readFile(fileId: string): Object

Read and parse JSON content.

- **Parameters**  
  - `fileId`: Drive file ID.  
- **Returns**  
  - **Parsed JSON object** (not a string - already parsed).  
- **Throws**  
  - `InvalidArgumentError` if `fileId` missing.  
  - `FileNotFoundError`, `PermissionDeniedError`, `InvalidFileFormatError`, `FileIOError`.

**Example:**

```javascript
const fileOps = new FileOperations();

try {
  const data = fileOps.readFile('1a2b3c4d5e6f7g8h9i0j');
  console.log('File content:', data);
  // Expected output: { collection: 'users', documents: [...], metadata: {...} }
  
  // ❌ DON'T do this - data is already parsed:
  // const parsed = JSON.parse(data); // This will fail!
  
  // ✅ DO this - use the object directly:
  console.log('Collection name:', data.collection);
  
} catch (error) {
  if (error instanceof FileNotFoundError) {
    console.log('File does not exist');
  } else if (error instanceof InvalidFileFormatError) {
    console.log('File contains invalid JSON');
  }
  throw error;
}
```

#### writeFile(fileId: string, data: Object): void

Overwrite existing file content.

- **Parameters**  
  - `fileId`: Drive file ID.  
  - `data`: JSON‐serialisable object.  
- **Throws**  
  - `InvalidArgumentError`, `FileNotFoundError`, `PermissionDeniedError`, `FileIOError`.

**Example:**

```javascript
const fileOps = new FileOperations();
const updatedData = {
  collection: 'users',
  metadata: {
    version: 2,
    updated: new Date().toISOString()
  },
  documents: [
    { _id: 'user1', name: 'John Doe', email: 'john@example.com' },
    { _id: 'user2', name: 'Jane Smith', email: 'jane@example.com' }
  ]
};

try {
  fileOps.writeFile('1a2b3c4d5e6f7g8h9i0j', updatedData);
  console.log('File updated successfully');
} catch (error) {
  console.error('Failed to write file:', error.message);
  throw error;
}
```

#### createFile(fileName: string, data: Object, folderId?: string): string

Create new JSON file.

- **Parameters**  
  - `fileName`: name of the file.  
  - `data`: initial object to serialize.  
  - `folderId` (optional): parent folder ID; defaults to root.  
- **Returns**  
  - New Drive file ID.  
- **Throws**  
  - `InvalidArgumentError`, `PermissionDeniedError`, `FileIOError`.

**Example:**

```javascript
const fileOps = new FileOperations();
const initialData = {
  collection: 'products',
  metadata: {
    version: 1,
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  },
  documents: []
};

try {
  // Create in root folder
  const fileId = fileOps.createFile('products.json', initialData);
  console.log('Created file with ID:', fileId);

  // Create in specific folder
  const folderFileId = fileOps.createFile('users.json', initialData, 'folder123');
  console.log('Created file in folder with ID:', folderFileId);
} catch (error) {
  console.error('Failed to create file:', error.message);
  throw error;
}
```

#### deleteFile(fileId: string): boolean

Soft-delete via trash.

- **Parameters**  
  - `fileId`: Drive file ID.  
- **Returns**  
  - `true` when trashed.  
- **Throws**  
  - `InvalidArgumentError`, `FileNotFoundError`, `PermissionDeniedError`, `FileIOError`.

**Example:**

```javascript
const fileOps = new FileOperations();

try {
  const success = fileOps.deleteFile('1a2b3c4d5e6f7g8h9i0j');
  if (success) {
    console.log('File moved to trash successfully');
  }
} catch (error) {
  if (error instanceof FileNotFoundError) {
    console.log('File already deleted or does not exist');
  } else {
    console.error('Failed to delete file:', error.message);
    throw error;
  }
}
```

#### fileExists(fileId: string): boolean

Check existence & not trashed.

- **Parameters**  
  - `fileId`: Drive file ID.  
- **Returns**  
  - `true` if accessible, else `false`.

**Example:**

```javascript
const fileOps = new FileOperations();

const exists = fileOps.fileExists('1a2b3c4d5e6f7g8h9i0j');
if (exists) {
  console.log('File exists and is accessible');
  const data = fileOps.readFile('1a2b3c4d5e6f7g8h9i0j');
  // Process file...
} else {
  console.log('File does not exist or is trashed');
  // Handle missing file...
}
```

#### getFileMetadata(fileId: string): Object

Fetch file metadata.

- **Parameters**  
  - `fileId`: Drive file ID.  
- **Returns**  
  - `{ id, name, size, modifiedTime, createdTime, mimeType }`.
- **Throws**  
  - `InvalidArgumentError`, `FileNotFoundError`, `PermissionDeniedError`, `FileIOError`.

**Example:**

```javascript
const fileOps = new FileOperations();

try {
  const metadata = fileOps.getFileMetadata('1a2b3c4d5e6f7g8h9i0j');
  console.log('File metadata:', {
    id: metadata.id,
    name: metadata.name,
    size: metadata.size + ' bytes',
    lastModified: metadata.modifiedTime,
    created: metadata.createdTime,
    type: metadata.mimeType
  });
  
  // Check if file was modified recently
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (metadata.modifiedTime > oneDayAgo) {
    console.log('File was modified within the last 24 hours');
  }
} catch (error) {
  console.error('Failed to get metadata:', error.message);
}
```

### Private Methods

- `_handleDriveApiError(error, operation, fileId)`: maps Drive errors to GAS-DB errors.  
- `_retryOperation(fn, operationName)`: retries transient failures with exponential backoff.

---

## FileService

### Purpose

FileService is a high-level façade over FileOperations.  

- Adds in-memory LRU cache for reads.  
- Provides batch operations and cache controls.  
- Preserves consistency between cache and Drive.

### Constructor

```js
new FileService(fileOps: FileOperations, logger: GASDBLogger)
```

- **Throws** `ConfigurationError` if missing dependencies.

**Example:**

```javascript
const logger = GASDBLogger.createComponentLogger('MyApp');
const fileOps = new FileOperations(logger);
const fileService = new FileService(fileOps, logger);
```

### Public Methods

#### readFile(fileId: string): Object

Returns JSON, using cache if enabled.

- **Parameters**  
  - `fileId`: Drive file ID.  
- **Returns**  
  - **Parsed JSON object** (not a string - already parsed by underlying FileOperations).  
- **Throws**  
  - Same as underlying `readFile`.

**Example:**

```javascript
const fileService = new FileService(fileOps, logger);

// First read hits Drive API
const data1 = fileService.readFile('1a2b3c4d5e6f7g8h9i0j');
console.log('First read:', data1);

// ❌ DON'T do this - data1 is already a parsed object:
// const parsed = JSON.parse(data1); // This will fail!

// ✅ DO this - use the object directly:
console.log('Collection name:', data1.collection);

// Second read may use cache
const data2 = fileService.readFile('1a2b3c4d5e6f7g8h9i0j');
console.log('Second read (cached):', data2);

// Both results are identical
console.log('Data identical:', JSON.stringify(data1) === JSON.stringify(data2));
```

#### writeFile(fileId: string, data: Object): void

Writes and updates cache.

- **Parameters**  
  - `fileId`, `data`.  
- **Throws**  
  - Underlying write exceptions.

**Example:**

```javascript
const fileService = new FileService(fileOps, logger);
const updatedData = {
  collection: 'users',
  metadata: {
    version: 3,
    updated: new Date().toISOString()
  },
  documents: [
    { _id: 'user1', name: 'John Updated', email: 'john.new@example.com' }
  ]
};

fileService.writeFile('1a2b3c4d5e6f7g8h9i0j', updatedData);

// Subsequent reads will return updated data from cache
const readBack = fileService.readFile('1a2b3c4d5e6f7g8h9i0j');
console.log('Updated data:', readBack.documents[0].name); // 'John Updated'
```

#### createFile(fileName: string, data: Object, folderId?: string): string

Creates file and caches.

- **Returns**  
  - New file ID.

**Example:**

```javascript
const fileService = new FileService(fileOps, logger);
const newCollectionData = {
  collection: 'orders',
  metadata: {
    version: 1,
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  },
  documents: []
};

const newFileId = fileService.createFile('orders.json', newCollectionData);
console.log('Created file ID:', newFileId);

// File is automatically cached, immediate reads are fast
const cachedData = fileService.readFile(newFileId);
console.log('Immediately readable:', cachedData.collection); // 'orders'
```

#### deleteFile(fileId: string): boolean

Deletes file and clears cache entry.

- **Returns**  
  - `true` if successful.

**Example:**

```javascript
const fileService = new FileService(fileOps, logger);

// File might be cached
const exists = fileService.fileExists('1a2b3c4d5e6f7g8h9i0j');
if (exists) {
  const success = fileService.deleteFile('1a2b3c4d5e6f7g8h9i0j');
  console.log('Delete successful:', success);
  
  // Cache entry is automatically cleared
  const stillExists = fileService.fileExists('1a2b3c4d5e6f7g8h9i0j');
  console.log('Still exists:', stillExists); // false
}
```

#### fileExists(fileId: string): boolean

Checks cache first, then Drive.

**Example:**

```javascript
const fileService = new FileService(fileOps, logger);

// Check multiple files efficiently
const fileIds = ['file1', 'file2', 'file3'];
const existingFiles = fileIds.filter(id => fileService.fileExists(id));
console.log('Existing files:', existingFiles);

// Cached files return immediately
const cachedExists = fileService.fileExists('recently-read-file-id');
```

#### getFileMetadata(fileId: string): Object

Proxy to `FileOperations.getFileMetadata`.

**Example:**

```javascript
const fileService = new FileService(fileOps, logger);

const metadata = fileService.getFileMetadata('1a2b3c4d5e6f7g8h9i0j');
console.log(`File: ${metadata.name} (${metadata.size} bytes)`);
console.log(`Last modified: ${metadata.modifiedTime}`);
```

#### batchReadFiles(fileIds: string[]): Object[]

Read multiple files; returns `null` for failures. Logs warnings.

**Example:**

```javascript
const fileService = new FileService(fileOps, logger);
const fileIds = ['file1', 'file2', 'invalid-id', 'file4'];

const results = fileService.batchReadFiles(fileIds);
console.log('Batch results:', results.length); // 4

// Process successful reads
results.forEach((result, index) => {
  if (result !== null) {
    console.log(`File ${fileIds[index]}:`, result.collection);
  } else {
    console.log(`File ${fileIds[index]} failed to read`);
  }
});

// Filter out failed reads
const successfulReads = results.filter(result => result !== null);
console.log('Successful reads:', successfulReads.length);
```

#### batchGetMetadata(fileIds: string[]): Object[]

Fetch metadata in batch with same error handling.

**Example:**

```javascript
const fileService = new FileService(fileOps, logger);
const fileIds = ['file1', 'file2', 'file3'];

const metadataList = fileService.batchGetMetadata(fileIds);

// Calculate total size of all files
const totalSize = metadataList
  .filter(meta => meta !== null)
  .reduce((sum, meta) => sum + meta.size, 0);

console.log(`Total size: ${totalSize} bytes`);

// Find most recently modified file
const mostRecent = metadataList
  .filter(meta => meta !== null)
  .reduce((latest, meta) => 
    !latest || meta.modifiedTime > latest.modifiedTime ? meta : latest
  );

console.log('Most recent file:', mostRecent.name);
```

#### clearCache(): void

Empty the in-memory cache.

**Example:**

```javascript
const fileService = new FileService(fileOps, logger);

// Check cache status
const statsBefore = fileService.getCacheStats();
console.log('Cache before:', statsBefore); // { size: 5, maxSize: 50, enabled: true }

// Clear cache
fileService.clearCache();

const statsAfter = fileService.getCacheStats();
console.log('Cache after:', statsAfter); // { size: 0, maxSize: 50, enabled: true }
```

#### getCacheStats(): { size, maxSize, enabled }

Inspect cache state.

**Example:**

```javascript
const fileService = new FileService(fileOps, logger);

// Read some files to populate cache
fileService.readFile('file1');
fileService.readFile('file2');

const stats = fileService.getCacheStats();
console.log(`Cache: ${stats.size}/${stats.maxSize} entries`);
console.log(`Cache enabled: ${stats.enabled}`);

// Monitor cache efficiency
if (stats.size === stats.maxSize) {
  console.log('Cache is full - oldest entries will be evicted');
}
```

#### setCacheEnabled(enabled: boolean): void

Enable or disable caching. Disabling clears existing cache.

**Example:**

```javascript
const fileService = new FileService(fileOps, logger);

// Disable caching for sensitive operations
fileService.setCacheEnabled(false);
const data = fileService.readFile('sensitive-file'); // Always fresh from Drive

// Re-enable caching
fileService.setCacheEnabled(true);
const cachedData = fileService.readFile('frequent-file'); // Will be cached

// Check cache status
const stats = fileService.getCacheStats();
console.log('Caching enabled:', stats.enabled);
```

### Private Methods

- `_addToCache(fileId: string, content: Object): void`  
  Adds entry with LRU eviction when capacity exceeded.

---

## Usage Examples

### Basic File Operations

```javascript
const logger = GASDBLogger.createComponentLogger('MyApp');
const fileOps = new FileOperations(logger);
const fileService = new FileService(fileOps, logger);

// Read a file
const data = fileService.readFile('abc123');

// Write back modified data
data.updated = new Date().toISOString();
fileService.writeFile('abc123', data);

// Batch operations
const multiple = fileService.batchReadFiles(['id1','id2','bad-id']);
```

### Collection Management Example

```javascript
const logger = GASDBLogger.createComponentLogger('Database');
const fileOps = new FileOperations(logger);
const fileService = new FileService(fileOps, logger);

// Create a new collection
const collectionData = {
  collection: 'users',
  metadata: {
    version: 1,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    documentCount: 0
  },
  documents: []
};

const collectionFileId = fileService.createFile('users.json', collectionData);

// Add documents to collection
collectionData.documents.push({
  _id: 'user1',
  name: 'John Doe',
  email: 'john@example.com',
  createdAt: new Date().toISOString()
});

collectionData.metadata.documentCount = collectionData.documents.length;
collectionData.metadata.updated = new Date().toISOString();

fileService.writeFile(collectionFileId, collectionData);
```

### Error Handling Pattern

```javascript
const fileService = new FileService(fileOps, logger);

async function safeFileOperation(fileId, operation) {
  try {
    return await operation(fileId);
  } catch (error) {
    if (error instanceof FileNotFoundError) {
      console.log(`File ${fileId} not found`);
      return null;
    } else if (error instanceof PermissionDeniedError) {
      console.log(`Access denied to file ${fileId}`);
      throw error; // Re-throw permission errors
    } else if (error instanceof QuotaExceededError) {
      console.log('Drive quota exceeded, retrying later...');
      // Implement backoff strategy
      setTimeout(() => safeFileOperation(fileId, operation), 5000);
    } else {
      console.error('Unexpected error:', error);
      throw error;
    }
  }
}

// Usage
const data = await safeFileOperation('file123', (id) => fileService.readFile(id));
```

## Notes

- **Retries**: FileOperations retries transient I/O errors up to `_maxRetries` times.

## ⚠️ Important: JSON Parsing Behaviour

**Both FileOperations and FileService automatically parse JSON** and return JavaScript objects, not strings.

### Common Mistake to Avoid

```javascript
// ❌ WRONG - This will cause "object Object is not valid JSON" errors:
const fileContent = fileService.readFile(fileId);
const data = JSON.parse(fileContent); // fileContent is already an object!

// ✅ CORRECT - Use the parsed object directly:
const data = fileService.readFile(fileId); // data is already a JavaScript object
console.log(data.collection); // Access properties directly
```

### Why This Happens

1. **FileOperations.readFile()** calls `JSON.parse()` internally and returns the parsed object
2. **FileService.readFile()** passes through the already-parsed object from FileOperations  
3. **Collection and other components** should use the object directly, not parse it again

### Automatic Detection

The system now automatically detects double-parsing attempts and provides helpful error messages:

```javascript
// If you accidentally do this:
const data = fileService.readFile(fileId);
const parsed = JSON.parse(data); // This will throw a helpful OperationError

// The error message will include:
// "Attempted to JSON.parse() an already-parsed object in [context]. 
//  FileOperations and FileService return parsed JavaScript objects, not JSON strings.
//  Use the returned object directly instead of calling JSON.parse() on it.
//  Common fix: Change "JSON.parse(fileService.readFile(id))" to "fileService.readFile(id)""
```

This detection is provided by `ErrorHandler.detectDoubleParsing()` and can be used by any component.

### Migration Note

If you have existing code that expects JSON strings, you can use:

```javascript
// If you need the raw JSON string for some reason:
const fileOps = new FileOperations();
const rawString = JSON.stringify(fileOps.readFile(fileId));

// But typically, just use the object directly:
const data = fileOps.readFile(fileId);
```  

- **Cache**: FileService cache follows simple LRU; size capped at `_maxCacheSize`.  
- **Errors**: All methods throw consistent GAS-DB error types for easy catch blocks.
- **Performance**: Use FileService for frequent operations; use FileOperations for direct control.
- **Memory**: Cache is cleared when FileService is disabled or when capacity is exceeded.
