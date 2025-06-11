# FileOperations & FileService Developer Guide

This document explains the role, API surface and usage patterns for the FileOperations and FileService classes in GAS-DB.

---

## FileOperations

### Purpose

FileOperations is a low-level component that interacts directly with the DriveApp API.  

- Provides reliable read/write/create/delete operations.  
- Handles retries with exponential backoff.  
- Translates Drive errors into GAS-DB-specific error types.  
- **JSON serialisation boundary**: Performs JSON parsing only on read operations and JSON.stringify only on write operations.  
- **Date handling**: Automatically converts ISO date strings to Date objects after parsing.  
- **Double-parsing protection**: Detects and prevents attempts to parse already-parsed objects.

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

Read and parse JSON content. **Performs JSON.parse() internally and returns a parsed JavaScript object**.

- **Parameters**  
  - `fileId`: Drive file ID.  
- **Returns**  
  - **Parsed JavaScript object** (not a JSON string).  
- **Throws**  
  - `InvalidArgumentError` if `fileId` missing.  
  - `FileNotFoundError`, `PermissionDeniedError`, `InvalidFileFormatError`, `FileIOError`.

**Key Points:**
- JSON parsing occurs at the file boundary only
- ISO date strings are automatically converted to Date objects
- Double-parsing is detected and prevented with helpful error messages

**Example:**

```javascript
const fileOps = new FileOperations();

try {
  const data = fileOps.readFile('1a2b3c4d5e6f7g8h9i0j');
  console.log('File content:', data);
  // Expected output: { collection: 'users', documents: [...], metadata: {...} }
  
  // ❌ DON'T do this - data is already parsed:
  // const parsed = JSON.parse(data); // This will fail with helpful error!
  
  // ✅ DO this - use the object directly:
  console.log('Collection name:', data.collection);
  
  // Date objects are automatically converted from ISO strings
  if (data.metadata && data.metadata.created instanceof Date) {
    console.log('Created:', data.metadata.created.toLocaleDateString());
  }
  
} catch (error) {
  if (error instanceof FileNotFoundError) {
    console.log('File does not exist');
  } else if (error instanceof InvalidFileFormatError) {
    console.log('File contains invalid JSON');
  }
  throw error;
}
}
```

#### writeFile(fileId: string, data: Object): void

Overwrite existing file content. **Performs JSON.stringify() internally on the provided object**.

- **Parameters**  
  - `fileId`: Drive file ID.  
  - `data`: JavaScript object to serialise as JSON.  
- **Throws**  
  - `InvalidArgumentError`, `FileNotFoundError`, `PermissionDeniedError`, `FileIOError`.

**Key Points:**
- JSON serialisation occurs at the file boundary only  
- Pass JavaScript objects directly, not JSON strings
- Date objects are preserved during serialisation

**Example:**

```javascript
const fileOps = new FileOperations();
const updatedData = {
  collection: 'users',
  metadata: {
    version: 2,
    updated: new Date() // Date object will be serialised to ISO string
  },
  documents: [
    { _id: 'user1', name: 'John Doe', email: 'john@example.com' },
    { _id: 'user2', name: 'Jane Smith', email: 'jane@example.com' }
  ]
};

try {
  // ✅ DO this - pass the object directly:
  fileOps.writeFile('1a2b3c4d5e6f7g8h9i0j', updatedData);
  
  // ❌ DON'T do this - don't stringify beforehand:
  // fileOps.writeFile('1a2b3c4d5e6f7g8h9i0j', JSON.stringify(updatedData));
  
  console.log('File updated successfully');
} catch (error) {
  console.error('Failed to write file:', error.message);
  throw error;
}
```

#### createFile(fileName: string, data: Object, folderId?: string): string

Create new JSON file. **Performs JSON.stringify() internally on the provided object**.

- **Parameters**  
  - `fileName`: name of the file.  
  - `data`: JavaScript object to serialise as initial content.  
  - `folderId` (optional): parent folder ID; defaults to root.  
- **Returns**  
  - New Drive file ID.  
- **Throws**  
  - `InvalidArgumentError`, `PermissionDeniedError`, `FileIOError`.

**Key Points:**
- JSON serialisation occurs at the file boundary only  
- Pass JavaScript objects directly, not JSON strings
- Date objects are automatically serialised to ISO strings

**Example:**

```javascript
const fileOps = new FileOperations();
const initialData = {
  collection: 'products',
  metadata: {
    version: 1,
    created: new Date(), // Will be serialised to ISO string
    updated: new Date()
  },
  documents: []
};

try {
  // ✅ DO this - pass the object directly:
  const fileId = fileOps.createFile('products.json', initialData);
  console.log('Created file with ID:', fileId);

  // Create in specific folder
  const folderFileId = fileOps.createFile('users.json', initialData, 'folder123');
  console.log('Created file in folder with ID:', folderFileId);
  
  // ❌ DON'T do this - don't stringify beforehand:
  // const fileId = fileOps.createFile('products.json', JSON.stringify(initialData));
  
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

- `_handleDriveApiError(error, operation, fileId)`: maps Drive errors to GAS-DB errors, called only for Drive API failures.  
- `_retryOperation(fn, operationName)`: retries transient failures with exponential backoff, excludes non-retryable errors.

**Implementation Note:** Drive API errors and JSON parsing errors are handled separately to ensure appropriate error classification and retry behaviour.

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

Returns parsed JavaScript object, using cache if enabled.

- **Parameters**  
  - `fileId`: Drive file ID.  
- **Returns**  
  - **Parsed JavaScript object** (not a JSON string - already parsed by underlying FileOperations).  
- **Throws**  
  - Same as underlying `readFile`.

**Key Points:**
- Object is already parsed by FileOperations.readFile()
- Cache stores parsed objects, not JSON strings
- Date objects are preserved in cache

**Example:**

```javascript
const fileService = new FileService(fileOps, logger);

// First read hits Drive API and performs JSON.parse()
const data1 = fileService.readFile('1a2b3c4d5e6f7g8h9i0j');
console.log('First read:', data1);

// ❌ DON'T do this - data1 is already a parsed object:
// const parsed = JSON.parse(data1); // This will fail with helpful error!

// ✅ DO this - use the object directly:
console.log('Collection name:', data1.collection);

// Second read may use cache (still returns parsed object)
const data2 = fileService.readFile('1a2b3c4d5e6f7g8h9i0j');
console.log('Second read (cached):', data2);

// Both results are identical objects
console.log('Data identical:', JSON.stringify(data1) === JSON.stringify(data2));

// Date objects are preserved
if (data1.metadata && data1.metadata.created instanceof Date) {
  console.log('Date object preserved:', data1.metadata.created.toISOString());
}
```

#### writeFile(fileId: string, data: Object): void

Writes JavaScript object and updates cache.

- **Parameters**  
  - `fileId`: Drive file ID to write to.  
  - `data`: JavaScript object to write (will be JSON.stringify'd by FileOperations).  
- **Throws**  
  - Underlying write exceptions.

**Key Points:**
- FileOperations.writeFile() handles JSON.stringify() internally
- Cache is updated with the provided object
- Pass objects directly, not JSON strings

**Example:**

```javascript
const fileService = new FileService(fileOps, logger);
const updatedData = {
  collection: 'users',
  metadata: {
    version: 3,
    updated: new Date() // Date object will be serialised automatically
  },
  documents: [
    { _id: 'user1', name: 'John Updated', email: 'john.new@example.com' }
  ]
};

// ✅ DO this - pass the object directly:
fileService.writeFile('1a2b3c4d5e6f7g8h9i0j', updatedData);

// Subsequent reads will return updated data from cache
const readBack = fileService.readFile('1a2b3c4d5e6f7g8h9i0j');
console.log('Updated data:', readBack.documents[0].name); // 'John Updated'

// ❌ DON'T do this - don't stringify beforehand:
// fileService.writeFile('1a2b3c4d5e6f7g8h9i0j', JSON.stringify(updatedData));
```

#### createFile(fileName: string, data: Object, folderId?: string): string

Creates file and caches the JavaScript object.

- **Parameters**  
  - `fileName`: name of the file.  
  - `data`: JavaScript object for initial content.  
  - `folderId` (optional): parent folder ID.  
- **Returns**  
  - New file ID.

**Key Points:**
- FileOperations.createFile() handles JSON.stringify() internally
- Created object is immediately cached as a JavaScript object
- Pass objects directly, not JSON strings

**Example:**

```javascript
const fileService = new FileService(fileOps, logger);
const newCollectionData = {
  collection: 'orders',
  metadata: {
    version: 1,
    created: new Date(), // Date will be serialised to ISO string in file
    updated: new Date()
  },
  documents: []
};

// ✅ DO this - pass the object directly:
const newFileId = fileService.createFile('orders.json', newCollectionData);
console.log('Created file ID:', newFileId);

// File is automatically cached as JavaScript object, immediate reads are fast
const cachedData = fileService.readFile(newFileId);
console.log('Immediately readable:', cachedData.collection); // 'orders'

// Date objects are preserved in cache
console.log('Date preserved:', cachedData.metadata.created instanceof Date);
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
    created: new Date(), // Date object will be serialised to ISO string
    updated: new Date(),
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
  createdAt: new Date() // Date object preserved
});

collectionData.metadata.documentCount = collectionData.documents.length;
collectionData.metadata.updated = new Date(); // Update with new Date object

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

## Architecture Notes

### JSON Serialisation Boundary Design

The current implementation enforces a clear architectural principle: **JSON serialisation occurs only at file boundaries**.

- **FileOperations.readFile()**: Raw Drive content → JSON.parse() → Date conversion → JavaScript object
- **FileOperations.writeFile()/createFile()**: JavaScript object → JSON.stringify() → Drive storage
- **FileService cache**: Stores JavaScript objects, not JSON strings
- **All other components**: Work exclusively with JavaScript objects

### Error Handling Separation

Drive API errors and JSON parsing errors are handled separately:

- **Drive API errors**: Caught and mapped to specific GAS-DB error types (FileNotFoundError, PermissionDeniedError, etc.)
- **JSON parsing errors**: Handled with double-parsing detection and clear error messages
- **Retry logic**: Only retries transient errors, excludes parsing and permission errors

### Performance Optimisations

- **Date conversion**: Performed once at file boundary using `ObjectUtils.convertDateStringsToObjects()`
- **Exponential backoff**: Prevents API quota exhaustion during transient failures
- **Cache efficiency**: FileService stores parsed objects to avoid repeated JSON operations
- **Selective retries**: Non-retryable errors (parsing, permissions) fail fast

### Implementation Benefits

1. **Type safety**: Components work with strongly-typed JavaScript objects
2. **Performance**: Eliminates redundant JSON operations
3. **Debugging**: Clear error messages for common serialisation mistakes
4. **Consistency**: Uniform object handling across all components
5. **Maintainability**: Single point of JSON handling reduces complexity

## Notes

- **Retries**: FileOperations retries transient I/O errors up to `_maxRetries` times.

## ⚠️ Important: JSON Serialisation Architecture

**FileOperations and FileService enforce clear JSON serialisation boundaries:**

### JSON Processing Flow

1. **On Read**: FileOperations.readFile() calls `JSON.parse()` and returns JavaScript objects
2. **Date Conversion**: ISO date strings are automatically converted to Date objects using `ObjectUtils.convertDateStringsToObjects()`
3. **On Write**: FileOperations.writeFile()/createFile() call `JSON.stringify()` internally
4. **Cache Storage**: FileService stores parsed JavaScript objects, not JSON strings

### Common Mistakes to Avoid

```javascript
// ❌ WRONG - This will cause "Unexpected token 'o'" or similar errors:
const fileContent = fileService.readFile(fileId);
const data = JSON.parse(fileContent); // fileContent is already an object!

// ❌ WRONG - Don't stringify before writing:
const data = { collection: 'users', documents: [] };
fileService.writeFile(fileId, JSON.stringify(data)); // writeFile does this internally!

// ✅ CORRECT - Use objects directly:
const data = fileService.readFile(fileId); // Returns JavaScript object
console.log(data.collection); // Access properties directly

const newData = { collection: 'users', documents: [] };
fileService.writeFile(fileId, newData); // Pass object, not string
```

### Automatic Double-Parsing Detection

The system automatically detects double-parsing attempts and provides helpful error messages via `ErrorHandler.detectDoubleParsing()`:

```javascript
// If you accidentally do this:
const data = fileService.readFile(fileId);
const parsed = JSON.parse(data); // This will throw a helpful OperationError

// The error message will include:
// "Attempted to JSON.parse() an already-parsed object in FileOperations.readFile. 
//  FileOperations and FileService return parsed JavaScript objects, not JSON strings.
//  Use the returned object directly instead of calling JSON.parse() on it.
//  Common fix: Change 'JSON.parse(fileService.readFile(id))' to 'fileService.readFile(id)'"
```

### Date Handling

```javascript
// When writing:
const data = {
  collection: 'users',
  metadata: {
    created: new Date(), // Date object
    updated: new Date()
  }
};
fileService.writeFile(fileId, data); // Dates serialised to ISO strings

// When reading back:
const readData = fileService.readFile(fileId);
console.log(readData.metadata.created instanceof Date); // true - converted back to Date object
```

### Migration from String-Based Code

If you have existing code that expects JSON strings:

```javascript
// Old pattern (no longer needed):
const rawString = file.getBlob().getDataAsString();
const data = JSON.parse(rawString);

// New pattern (recommended):
const data = fileOps.readFile(fileId); // Returns parsed object directly

// If you specifically need a JSON string:
const data = fileOps.readFile(fileId);
const jsonString = JSON.stringify(data); // Manual conversion when needed
```  

- **Cache**: FileService cache follows simple LRU; size capped at `_maxCacheSize`.  
- **Errors**: All methods throw consistent GAS-DB error types for easy catch blocks.
- **Performance**: Use FileService for frequent operations; use FileOperations for direct control.
- **Memory**: Cache is cleared when FileService is disabled or when capacity is exceeded.
