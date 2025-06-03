# GAS DB Infrastructure Components

- [GAS DB Infrastructure Components](#gas-db-infrastructure-components)
  - [Overview](#overview)
  - [Logger (GASDBLogger)](#logger-gasdblogger)
      - [Key Features](#key-features)
      - [Core Methods](#core-methods)
      - [Usage Examples](#usage-examples)
      - [Best Practices](#best-practices)
    - [ErrorHandler](#errorhandler)
      - [Error Type Hierarchy](#error-type-hierarchy)
      - [Error Management Methods](#error-management-methods)
      - [Validation Methods](#validation-methods)
      - [Usage Examples](#usage-examples-1)
      - [Best Practices](#best-practices-1)
    - [IdGenerator](#idgenerator)
      - [ID Generation Strategies](#id-generation-strategies)
      - [Validation Methods](#validation-methods-1)
      - [Custom Generator Creation](#custom-generator-creation)
      - [Usage Examples](#usage-examples-2)
      - [Best Practices](#best-practices-2)
  - [Integration Patterns](#integration-patterns)
    - [Component Integration](#component-integration)
    - [Standardized Error Flow](#standardized-error-flow)
  - [Configuration](#configuration)
    - [Logger Configuration](#logger-configuration)
    - [Error Handler Configuration](#error-handler-configuration)
    - [ID Generator Configuration](#id-generator-configuration)
  - [Performance Considerations](#performance-considerations)
  - [Migration and Versioning](#migration-and-versioning)
    - [Component Dependencies](#component-dependencies)
    - [Extension Points](#extension-points)

## Overview

The GAS DB infrastructure provides essential utilities for logging, error management, and ID generation. These components are designed specifically for Google Apps Script environments and support the core database functionality.

## Logger (GASDBLogger)

The `GASDBLogger` provides sophisticated logging capabilities with multiple levels, component-specific loggers, and performance tracking.

A comprehensive logging utility providing structured logging with multiple levels and context support for Google Apps Script environments.

#### Key Features

- **Four Log Levels:** ERROR (0), WARN (1), INFO (2), DEBUG (3)
- **Context Support:** Rich logging with JSON serializable context objects
- **Component Loggers:** Create specialized loggers for different components
- **Operation Timing:** Built-in performance monitoring capabilities
- **GAS Compatibility:** Works with console.log, console.warn, console.error

#### Core Methods

| Method | Description |
|--------|-------------|
| `setLevel(level)` | Set log level by number (0-3) |
| `setLevelByName(name)` | Set log level by name (ERROR/WARN/INFO/DEBUG) |
| `error(message, context)` | Log error message with optional context |
| `warn(message, context)` | Log warning message with optional context |
| `info(message, context)` | Log info message with optional context |
| `debug(message, context)` | Log debug message with optional context |
| `createComponentLogger(component)` | Create component-specific logger |
| `timeOperation(name, fn, context)` | Time and log operation execution |

#### Usage Examples

```javascript
// Basic logging
GASDBLogger.info('Database initialized successfully');
GASDBLogger.error('Failed to read file', { fileId: 'abc123', error: 'Permission denied' });

// Set log level
GASDBLogger.setLevelByName('DEBUG'); // Show all messages
GASDBLogger.setLevelByName('ERROR'); // Show only errors

// Component-specific logging
const dbLogger = GASDBLogger.createComponentLogger('Database');
dbLogger.info('Collection created', { name: 'users' });

// Operation timing
const result = GASDBLogger.timeOperation('loadCollection', () => {
  return loadCollectionFromDrive(collectionId);
}, { collectionId });
```

#### Best Practices

1. **Use appropriate log levels:**
   - ERROR: System failures, exceptions
   - WARN: Recoverable issues, deprecated usage
   - INFO: Important state changes, operation completion
   - DEBUG: Detailed execution flow, variable values

2. **Include context objects:**

   ```javascript
   this.logger.info('Collection created', {
     collectionName: name,
     fileId: fileId,
     documentCount: 0,
     timestamp: new Date()
   });
   ```

3. **Use component loggers:**

   ```javascript
   const logger = GASDBLogger.createComponentLogger('Collection');
   ```

---

### ErrorHandler

**Location:** `src/utils/ErrorHandler.js`

Provides standardized error handling with custom error types, validation utilities, and error context management.

#### Error Type Hierarchy

All errors extend the base `GASDBError` class and include:

- Error code for programmatic handling
- Context object for debugging information
- Timestamp for error tracking

| Error Class | Code | Usage |
|-------------|------|-------|
| `DocumentNotFoundError` | `DOCUMENT_NOT_FOUND` | Document queries that return no results |
| `DuplicateKeyError` | `DUPLICATE_KEY` | Unique constraint violations |
| `InvalidQueryError` | `INVALID_QUERY` | Malformed query syntax |
| `LockTimeoutError` | `LOCK_TIMEOUT` | Lock acquisition failures |
| `FileIOError` | `FILE_IO_ERROR` | Drive API operation failures |
| `ConflictError` | `CONFLICT_ERROR` | Modification token mismatches |
| `MasterIndexError` | `MASTER_INDEX_ERROR` | ScriptProperties access failures |
| `CollectionNotFoundError` | `COLLECTION_NOT_FOUND` | Missing collection references |
| `ConfigurationError` | `CONFIGURATION_ERROR` | Invalid configuration values |

#### Error Management Methods

| Method | Description |
|--------|-------------|
| `createError(errorType, ...args)` | Create new error of specified type |
| `handleError(error, context, rethrow)` | Handle error with logging and optional re-throw |
| `wrapFunction(fn, context)` | Wrap function with error handling |
| `isErrorType(error, errorType)` | Check if error is of specific type |
| `extractErrorInfo(error)` | Extract error information for logging |

#### Validation Methods

| Method | Description |
|--------|-------------|
| `validateRequired(value, name)` | Ensure value is not null/undefined |
| `validateType(value, type, name)` | Ensure value matches expected type |
| `validateNotEmpty(value, name)` | Ensure string is not empty |
| `validateNotEmptyArray(value, name)` | Ensure array has elements |
| `validateRange(value, min, max, name)` | Ensure number is within range |

#### Usage Examples

```javascript
// Create and throw specific errors
throw ErrorHandler.createError('DOCUMENT_NOT_FOUND', { _id: 'doc123' }, 'users');

// Handle errors with logging
try {
  performDatabaseOperation();
} catch (error) {
  ErrorHandler.handleError(error, 'Database.performOperation', true);
}

// Validation utilities
ErrorHandler.validateRequired(collectionName, 'collectionName');
ErrorHandler.validateType(query, 'object', 'query');
ErrorHandler.validateNotEmpty(documentId, 'documentId');

// Wrap functions with error handling
const safeFunction = ErrorHandler.wrapFunction(riskyOperation, 'RiskyOperation');
```

#### Best Practices

1. **Use specific error types:**

   ```javascript
   throw new DocumentNotFoundError(query, collectionName);
   ```

2. **Preserve error context:**

   ```javascript
   ErrorHandler.handleError(error, 'Collection.findOne', true);
   ```

3. **Validate inputs early:**

   ```javascript
   ErrorHandler.validateRequired(documentId, 'documentId');
   ErrorHandler.validateType(query, 'object', 'query');
   ```

---

### IdGenerator

**Location:** `src/utils/IdGenerator.js`

Provides multiple strategies for generating unique identifiers suitable for different use cases in the database system.

#### ID Generation Strategies

| Method | Output Example | Use Case |
|--------|----------------|----------|
| `generateUUID()` | `f47ac10b-58cc-4372-a567-0e02b2c3d479` | Default document IDs |
| `generateTimestampId(prefix)` | `token_1640995200000_123` | Time-ordered IDs, modification tokens |
| `generateShortId(length)` | `a1b2c3d4` | Compact identifiers |
| `generateAlphanumericId(length)` | `A1b2C3d4E5f6` | General purpose IDs |
| `generateNumericId(length)` | `1234567890` | Numeric-only IDs |
| `generateObjectId()` | `507f1f77bcf86cd799439011` | MongoDB compatibility |
| `generateSequentialId(prefix)` | `seq_1640995200000_000001` | Ordered sequences |
| `generateReadableId()` | `quick-cat-123` | Human-friendly IDs |

#### Validation Methods

| Method | Description |
|--------|-------------|
| `isValidUUID(id)` | Check if string is valid UUID format |
| `isValidObjectId(id)` | Check if string is valid ObjectId format |

#### Custom Generator Creation

```javascript
// Create custom generators for specific needs
const tokenGenerator = IdGenerator.createCustomGenerator({
  type: 'timestamp',
  prefix: 'token'
});

const shortCodeGenerator = IdGenerator.createCustomGenerator({
  type: 'alphanumeric',
  length: 8
});

const readableGenerator = IdGenerator.createCustomGenerator({
  type: 'readable'
});
```

#### Usage Examples

```javascript
// Generate document IDs
const documentId = IdGenerator.generateUUID();

// Generate modification tokens
const token = IdGenerator.generateTimestampId('token');

// Create custom generators
const customGenerator = IdGenerator.createCustomGenerator({
  type: 'alphanumeric',
  length: 16
});
const customId = customGenerator();

// Validate ID formats
if (IdGenerator.isValidUUID(documentId)) {
  processDocument(documentId);
}
```

#### Best Practices

1. **Use appropriate ID types:**
   - UUIDs for document IDs (default)
   - Timestamp IDs for modification tokens
   - ObjectIDs for MongoDB compatibility
   - Readable IDs for debugging and testing

2. **Validate ID formats:**

   ```javascript
   if (!IdGenerator.isValidUUID(documentId)) {
     throw new InvalidArgumentError('Invalid document ID format');
   }
   ```

## Integration Patterns

### Component Integration

All infrastructure components are designed to work together seamlessly:

```javascript
// Example: Database component using all utilities
class Database {
  constructor(config) {
    // Validate configuration
    ErrorHandler.validateRequired(config, 'config');
    ErrorHandler.validateType(config.rootFolderId, 'string', 'rootFolderId');
    
    // Set up logging
    this.logger = GASDBLogger.createComponentLogger('Database');
    this.logger.info('Initializing database', { config });
    
    // Generate instance ID
    this.instanceId = IdGenerator.generateUUID();
  }
  
  performOperation(operationName, operationFn) {
    return GASDBLogger.timeOperation(operationName, () => {
      try {
        return operationFn();
      } catch (error) {
        ErrorHandler.handleError(error, `Database.${operationName}`, true);
      }
    }, { instanceId: this.instanceId });
  }
}
```

### Standardized Error Flow

```javascript
// Standard error handling pattern across all components
class Collection {
  findOne(query) {
    try {
      ErrorHandler.validateRequired(query, 'query');
      ErrorHandler.validateType(query, 'object', 'query');
      
      const result = this._performFind(query);
      
      if (!result) {
        throw new DocumentNotFoundError(query, this.name);
      }
      
      return result;
      
    } catch (error) {
      ErrorHandler.handleError(error, 'Collection.findOne', true);
    }
  }
}
```

## Configuration

### Logger Configuration

```javascript
// Set global log level
GASDBLogger.setLevelByName('DEBUG'); // Development
GASDBLogger.setLevelByName('INFO');  // Production

// Component-specific configuration
const dbLogger = GASDBLogger.createComponentLogger('Database');
const collectionLogger = GASDBLogger.createComponentLogger('Collection');
```

### Error Handler Configuration

```javascript
// Error types are pre-configured in ErrorHandler.ErrorTypes
const errorType = ErrorHandler.ErrorTypes.DOCUMENT_NOT_FOUND;

// Custom error handling
const customErrorHandler = (error, context) => {
  ErrorHandler.handleError(error, context, false); // Don't re-throw
  // Custom recovery logic here
};
```

### ID Generator Configuration

```javascript
// Set up generators for different use cases
const documentIdGenerator = IdGenerator.getDefaultGenerator(); // UUID
const tokenGenerator = IdGenerator.createCustomGenerator({
  type: 'timestamp',
  prefix: 'token'
});
const debugIdGenerator = IdGenerator.createCustomGenerator({
  type: 'readable'
});
```

## Performance Considerations

1. **Logging:** Use appropriate log levels to avoid performance impact in production
2. **Error Handling:** Error context objects are JSON serialized, avoid large objects
3. **ID Generation:** UUID generation uses Google Apps Script utilities for optimal performance
4. **Validation:** Input validation is performed early to fail fast

## Migration and Versioning

All infrastructure components are designed to be stable and backwards compatible. Future versions will maintain API compatibility while potentially adding new features.

### Component Dependencies

- **GASDBLogger:** Self-contained, no dependencies
- **ErrorHandler:** Uses GASDBLogger for error logging
- **IdGenerator:** Self-contained, uses Google Apps Script Utilities when available

### Extension Points

These components can be extended for future functionality:

1. **Custom Log Destinations:** Extend GASDBLogger to support additional output targets
2. **Additional Error Types:** Add new error classes that extend GASDBError
3. **New ID Strategies:** Add additional generation methods to IdGenerator

---

*This infrastructure forms the foundation for all other GAS DB components and follows established patterns for reliability, maintainability, and performance in Google Apps Script environments.*
