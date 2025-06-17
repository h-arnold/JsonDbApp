\
# 1. GAS DB Infrastructure Components

- [1. GAS DB Infrastructure Components](#1-gas-db-infrastructure-components)
  - [1.1. Overview](#11-overview)
  - [1.2. Logger (GASDBLogger)](#12-logger-gasdblogger)
    - [1.2.0.1. Key Features](#1201-key-features)
    - [1.2.0.2. Core Methods](#1202-core-methods)
    - [1.2.0.3. Usage Examples](#1203-usage-examples)
    - [1.2.0.4. Best Practices](#1204-best-practices)
    - [1.2.1. ErrorHandler](#121-errorhandler)
      - [1.2.1.1. Error Type Hierarchy](#1211-error-type-hierarchy)
      - [1.2.1.2. Error Management Methods](#1212-error-management-methods)
      - [1.2.1.3. Usage Examples](#1213-usage-examples)
      - [1.2.1.4. Best Practices](#1214-best-practices)
    - [1.2.2. IdGenerator](#122-idgenerator)
      - [1.2.2.1. ID Generation Strategies](#1221-id-generation-strategies)
      - [1.2.2.2. Validation Methods](#1222-validation-methods)
      - [1.2.2.3. Custom Generator Creation](#1223-custom-generator-creation)
      - [1.2.2.4. Usage Examples](#1224-usage-examples)
      - [1.2.2.5. Best Practices](#1225-best-practices)
    - [1.2.3. ObjectUtils](#123-objectutils)
      - [1.2.3.1. Core Methods](#1231-core-methods)
      - [1.2.3.2. Deep Cloning](#1232-deep-cloning)
      - [1.2.3.3. Date String Conversion](#1233-date-string-conversion)
      - [1.2.3.4. Usage Examples](#1234-usage-examples)
      - [1.2.3.5. Best Practices](#1235-best-practices)
    - [1.2.4. Validate](#124-validate)
      - [1.2.4.1. Core Methods](#1241-core-methods)
      - [1.2.4.2. Usage Examples](#1242-usage-examples)
      - [1.2.4.3. Best Practices](#1243-best-practices)
  - [1.3. Integration Patterns](#13-integration-patterns)
    - [1.3.1. Component Integration](#131-component-integration)
    - [1.3.2. Standardized Error Flow](#132-standardized-error-flow)
  - [1.4. Configuration](#14-configuration)
    - [1.4.1. Logger Configuration](#141-logger-configuration)
    - [1.4.2. Error Handler Configuration](#142-error-handler-configuration)
    - [1.4.3. ID Generator Configuration](#143-id-generator-configuration)
    - [1.4.4. ObjectUtils Configuration](#144-objectutils-configuration)
  - [1.5. Performance Considerations](#15-performance-considerations)
  - [1.6. Migration and Versioning](#16-migration-and-versioning)
    - [1.6.1. Component Dependencies](#161-component-dependencies)
    - [1.6.2. Extension Points](#162-extension-points)

## 1.1. Overview

The GAS DB infrastructure provides essential utilities for logging, error management, ID generation, and object manipulation. These components are designed specifically for Google Apps Script environments and support the core database functionality.

## 1.2. Logger (GASDBLogger)

The `GASDBLogger` provides sophisticated logging capabilities with multiple levels, component-specific loggers, and performance tracking.

A comprehensive logging utility providing structured logging with multiple levels and context support for Google Apps Script environments.

### 1.2.0.1. Key Features

- **Four Log Levels:** ERROR (0), WARN (1), INFO (2), DEBUG (3)
- **Context Support:** Rich logging with JSON serializable context objects
- **Component Loggers:** Create specialized loggers for different components
- **Operation Timing:** Built-in performance monitoring capabilities
- **GAS Compatibility:** Works with console.log, console.warn, console.error

### 1.2.0.2. Core Methods

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

### 1.2.0.3. Usage Examples

```javascript
// Basic logging
GASDBLogger.info('Database initialised successfully');
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

### 1.2.0.4. Best Practices

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

### 1.2.1. ErrorHandler

**Location:** `src/01_utils/ErrorHandler.js`

Provides standardized error handling with custom error types, validation utilities, and error context management.

#### 1.2.1.1. Error Type Hierarchy

All errors extend the base `GASDBError` class and include:

- Error code for programmatic handling
- Context object for debugging information
- Timestamp for error tracking

| Error Class             | Code                    | Usage                                                                 |
|-------------------------|-------------------------|-----------------------------------------------------------------------|
| `DocumentNotFoundError` | `DOCUMENT_NOT_FOUND`    | Document queries that return no results                               |
| `DuplicateKeyError`     | `DUPLICATE_KEY`         | Unique constraint violations                                          |
| `InvalidQueryError`     | `INVALID_QUERY`         | Malformed query syntax                                                |
| `LockTimeoutError`      | `LOCK_TIMEOUT`          | Lock acquisition failures                                             |
| `FileIOError`           | `FILE_IO_ERROR`         | Drive API operation failures                                          |
| `ConflictError`         | `CONFLICT_ERROR`        | Modification token mismatches                                         |
| `MasterIndexError`      | `MASTER_INDEX_ERROR`    | ScriptProperties access failures                                      |
| `CollectionNotFoundError`| `COLLECTION_NOT_FOUND` | Missing collection references                                         |
| `ConfigurationError`    | `CONFIGURATION_ERROR`   | Invalid configuration values                                          |
| `FileNotFoundError`     | `FILE_NOT_FOUND`        | Specific file not found on Drive                                      |
| `PermissionDeniedError` | `PERMISSION_DENIED`     | Lack of permission for a file operation                             |
| `QuotaExceededError`    | `QUOTA_EXCEEDED`        | Google Drive API quota limits reached                                 |
| `InvalidFileFormatError`| `INVALID_FILE_FORMAT`   | File content does not match expected format (e.g., not valid JSON)    |
| `InvalidArgumentError`  | `INVALID_ARGUMENT`      | Incorrect or missing function arguments (also used by Validate class) |
| `OperationError`        | `OPERATION_ERROR`       | General failure during an operation not covered by other error types  |

#### 1.2.1.2. Error Management Methods

| Method                          | Description                                                                 |
|---------------------------------|-----------------------------------------------------------------------------|
| `createError(errorType, ...args)` | Create new error of specified type                                          |
| `handleError(error, context, rethrow)` | Handle error with logging and optional re-throw                             |
| `wrapFunction(fn, context)`     | Wrap function with error handling                                           |
| `isErrorType(error, errorType)` | Check if error is of specific type                                          |
| `extractErrorInfo(error)`       | Extract error information for logging                                       |
| `detectDoubleParsing(data, parseError, context)` | Detects and throws a specific error if data is already a parsed object. |

#### 1.2.1.3. Usage Examples

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

#### 1.2.1.4. Best Practices

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

### 1.2.2. IdGenerator

**Location:** `src/utils/IdGenerator.js`

Provides multiple strategies for generating unique identifiers suitable for different use cases in the database system.

#### 1.2.2.1. ID Generation Strategies

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

#### 1.2.2.2. Validation Methods

| Method | Description |
|--------|-------------|
| `isValidUUID(id)` | Check if string is valid UUID format |
| `isValidObjectId(id)` | Check if string is valid ObjectId format |

#### 1.2.2.3. Custom Generator Creation

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

#### 1.2.2.4. Usage Examples

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

#### 1.2.2.5. Best Practices

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

---

### 1.2.3. ObjectUtils

**Location:** `src/utils/ObjectUtils.js`

Provides utilities for object manipulation with Date preservation, essential for handling complex data structures and maintaining Date object integrity during JSON serialisation operations.

#### 1.2.3.1. Core Methods

| Method | Description |
|--------|-------------|
| `deepClone(obj)` | Create deep copy preserving Date instances and object structure |
| `convertDateStringsToObjects(obj)` | Convert ISO date strings to Date objects recursively |

#### 1.2.3.2. Deep Cloning

The `deepClone` method creates independent copies of complex objects while preserving:

- **Date Objects:** Maintains Date instances with accurate time values
- **Nested Structures:** Handles deeply nested objects and arrays
- **Independence:** Ensures modifications to cloned objects don't affect originals
- **Type Preservation:** Maintains primitive types and object references

**Supported Data Types:**

- Primitives: `null`, `undefined`, `string`, `number`, `boolean`
- Complex Types: `Date`, `Array`, `Object`
- Nested Structures: Unlimited depth for objects and arrays


#### 1.2.3.3. Date String Conversion

The `convertDateStringsToObjects` method provides intelligent conversion of ISO date strings:

- **ISO Detection:** Identifies valid ISO 8601 format strings (`YYYY-MM-DDTHH:mm:ss.sssZ`)
- **Selective Conversion:** Only converts valid ISO strings, leaves others unchanged
- **In-Place Modification:** Modifies original object structure
- **Recursive Processing:** Handles nested objects and arrays

**ISO Date Format Requirements:**

- Complete date-time format: `2023-06-15T10:30:00.000Z`
- Timezone indicator: Must end with `Z`
- Optional milliseconds: Supports both `.sssZ` and `Z` endings
- Valid date values: Validates month, day, hour, minute, second ranges


#### 1.2.3.4. Usage Examples

```javascript
// Deep cloning with Date preservation
const originalDoc = {
  _id: 'doc123',
  created: new Date('2023-06-15T10:30:00.000Z'),
  user: {
    name: 'John Doe',
    profile: {
      lastLogin: new Date('2024-06-11T10:00:00.000Z'),
      preferences: ['theme-dark', 'lang-en']
    }
  },
  tags: ['important', 'archived']
};

const clonedDoc = ObjectUtils.deepClone(originalDoc);
// clonedDoc is completely independent with Date objects preserved

// Converting date strings from JSON parsing
const jsonData = {
  event: {
    startTime: '2023-06-15T10:30:00.000Z', // Will be converted to Date
    endTime: '2023-06-15 12:30:00',        // Will remain string (invalid ISO)
    participants: [
      {
        joined: '2023-06-15T10:35:00.000Z', // Will be converted to Date
        name: 'Alice'                       // Will remain string
      }
    ]
  }
};

ObjectUtils.convertDateStringsToObjects(jsonData);
// jsonData.event.startTime is now a Date object
// jsonData.event.participants[0].joined is now a Date object

// Working with FileOperations integration
const documentData = {
  metadata: { created: new Date(), version: 1 },
  content: { title: 'Document', lastModified: new Date() }
};

// Before saving to Drive (preserves Dates through JSON)
fileOps.writeFile(fileId, documentData);

// After reading from Drive (converts ISO strings back to Dates)
const loadedData = fileOps.readFile(fileId);
// loadedData now has proper Date objects restored
```

#### 1.2.3.5. Best Practices

1. **Use deepClone for object independence:**

   ```javascript
   // Create independent copy before modifications
   const workingCopy = ObjectUtils.deepClone(originalDocument);
   workingCopy.user.name = 'Updated Name'; // Original remains unchanged
   ```

2. **Apply date conversion after JSON operations:**

   ```javascript
   // After parsing JSON or reading from Drive
   const parsedData = JSON.parse(jsonString);
   ObjectUtils.convertDateStringsToObjects(parsedData);
   ```

3. **Handle FileOperations integration:**

   ```javascript
   // Reading data with automatic date conversion
   const rawData = fileOps.readFile(fileId);
   // Date strings automatically converted by FileOperations using ObjectUtils
   ```

4. **Validate data integrity:**

   ```javascript
   // Verify Date objects after conversion
   if (document.created instanceof Date) {
     // Safe to use Date methods
     const age = Date.now() - document.created.getTime();
   }
   ```

5. **Performance considerations:**

   ```javascript
   // Clone only when necessary for independence
   const backup = ObjectUtils.deepClone(criticalData);
   
   // Use direct references for read-only operations
   const readOnlyView = criticalData; // No cloning needed
   ```

---

### 1.2.4. Validate

**Location:** `src/01_utils/Validation.js`

Provides a collection of static methods for common data validation tasks, ensuring consistency and reducing boilerplate code. All validation methods throw `ErrorHandler.ErrorTypes.INVALID_ARGUMENT` upon failure, providing the parameter name and a descriptive reason.

#### 1.2.4.1. Core Methods

| Method | Description |
|--------|-------------|
| `required(value, paramName)` | Ensures `value` is not `null` or `undefined`. |
| `type(value, expectedType, paramName)` | Validates that `value` is of the `expectedType` (e.g., 'string', 'number', 'object'). |
| `nonEmptyString(value, paramName)` | Checks if `value` is a string and is not empty or composed only of whitespace. |
| `string(value, paramName)` | Checks if `value` is a string. Allows empty strings. |
| `object(value, paramName, allowEmpty = true)` | Validates if `value` is an object (and not an array or `null`). If `allowEmpty` is `false`, an empty object will also fail validation. |
| `boolean(value, paramName)` | Ensures `value` is a boolean (`true` or `false`). |
| `array(value, paramName)` | Validates if `value` is an array. |
| `nonEmptyArray(value, paramName)` | Ensures `value` is an array containing at least one element. |
| `number(value, paramName)` | Checks if `value` is a number (and not `NaN`). |
| `integer(value, paramName)` | Validates if `value` is an integer. |
| `positiveNumber(value, paramName)` | Ensures `value` is a number strictly greater than zero. |
| `nonNegativeNumber(value, paramName)` | Ensures `value` is a number greater than or equal to zero. |
| `range(value, min, max, paramName)` | Checks if a numeric `value` falls within the inclusive range defined by `min` and `max`. |
| `func(value, paramName)` | Validates if `value` is a function. |
| `enum(value, allowedValues, paramName)` | Ensures `value` is present in the `allowedValues` array. |
| `objectProperties(obj, requiredProps, paramName)` | Checks if the object `obj` possesses all property names listed in the `requiredProps` array. |
| `pattern(value, pattern, paramName, description)` | Validates if a string `value` matches the provided `RegExp` `pattern`. The `description` is used in the error message. |
| `optional(value, validationFn, paramName)` | If `value` is not `null` or `undefined`, applies the `validationFn` to it. Otherwise, passes. |
| `all(validators, value, paramName)` | Ensures `value` successfully passes all validation functions provided in the `validators` array. Each function in `validators` should accept `(value, paramName)`. |
| `any(validators, value, paramName)` | Ensures `value` successfully passes at least one validation function from the `validators` array. Each function in `validators` should accept `(value, paramName)`. |
| `validateObject(value, paramName)` | Validates if `value` is a "plain" object (i.e., created by `{}` or `new Object()`, not an array, `null`, or an instance of `Date`). |
| `isPlainObject(value)` | A helper method that returns `true` if `value` is a plain object, `false` otherwise. Not typically used for direct validation throwing errors but can be used for conditional logic. |
| `validateUpdateObject(update, paramName, options = {})` | Validates the structure of a MongoDB-style update object. `options` can include: `allowMixed` (boolean, default `false`), `requireOperators` (boolean, default `false`), `forbidOperators` (boolean, default `false`). |

#### 1.2.4.2. Usage Examples

```javascript
// Ensuring a parameter is provided
Validate.required(userId, 'userId');

// Type checking
Validate.type(config, 'object', 'config');
Validate.nonEmptyString(collectionName, 'collectionName');
Validate.number(count, 'count');

// Number constraints
Validate.positiveNumber(limit, 'limit');
Validate.range(age, 0, 120, 'age');

// Object and array validation
Validate.object(settings, 'settings');
Validate.nonEmptyArray(tags, 'tags');
Validate.objectProperties(userProfile, ['username', 'email'], 'userProfile');

// Enum validation
Validate.enum(status, ['active', 'inactive', 'pending'], 'status');

// Pattern matching for a string
Validate.pattern(email, /\\S+@\\S+\\.\\S+/, 'email', 'a valid email address format');

// Optional field validation
// 'description' can be null/undefined, but if it exists, it must be a string.
Validate.optional(description, Validate.string, 'description');

// Combining multiple validations for a single field
Validate.all([
  (val, name) => Validate.string(val, name), // Must be a string
  (val, name) => Validate.nonEmptyString(val, name), // Must not be empty
  (val, name) => Validate.pattern(val, /^[a-zA-Z0-9_]{3,16}$/, name, '3-16 alphanumeric characters or underscores') // Must match pattern
], username, 'username');

// Validating update objects (e.g., for database operations)
try {
  Validate.validateUpdateObject({ $set: { name: 'New Name' }, status: 'active' }, 'updatePayload'); // Fails by default (mixed)
} catch (e) {
  // console.error(e.message); // "updatePayload cannot mix update operators with document fields"
}
Validate.validateUpdateObject({ $set: { name: 'New Name' }, status: 'active' }, 'updatePayload', { allowMixed: true }); // Passes
Validate.validateUpdateObject({ name: 'New Name' }, 'updatePayload', { forbidOperators: true }); // Passes
Validate.validateUpdateObject({ $inc: { score: 1 } }, 'updatePayload', { requireOperators: true }); // Passes
```

#### 1.2.4.3. Best Practices

1. **Early and Often:** Apply validation at the entry points of your functions and methods to catch errors early and prevent invalid data from propagating.
2. **Clear Parameter Names:** Use descriptive `paramName` arguments, as they are included in error messages, aiding debugging.
3. **Leverage `Validate.optional`:** For fields that are not mandatory but must conform to a type or rule if present.
4. **Compose with `Validate.all` and `Validate.any`:** For complex validation scenarios involving multiple conditions on a single piece of data.
5. **Specific Over Generic:** Prefer specific validators like `nonEmptyString` or `positiveNumber` over more generic ones like `string` or `number` when applicable, to provide more precise validation.
6. **Understand Plain Objects:** When using `validateObject` or `isPlainObject`, be aware that it specifically checks for objects that are not arrays or instances of other complex types like `Date`.
7. **Update Object Validation:** Use `validateUpdateObject` when dealing with MongoDB-style update operations to ensure structural correctness.

---

## 1.3. Integration Patterns

### 1.3.1. Component Integration

All infrastructure components are designed to work together seamlessly:

```javascript
// Example: Database component using all utilities
class Database {
  constructor(config) {
    // Validate configuration
    ValidationUtils.validateRequired(config, 'config');
    ValidationUtils.validateType(config.rootFolderId, 'string', 'rootFolderId');
    
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
  
  cloneDocumentSafely(document) {
    // Use ObjectUtils for safe document cloning with Date preservation
    return ObjectUtils.deepClone(document);
  }
  
  processFileData(fileData) {
    // Convert ISO date strings from JSON to Date objects
    ObjectUtils.convertDateStringsToObjects(fileData);
    return fileData;
  }
}
```

### 1.3.2. Standardized Error Flow

```javascript
// Standard error handling pattern across all components
class Collection {
  findOne(query) {
    try {
      ValidationUtils.validateRequired(query, 'query');
      ValidationUtils.validateType(query, 'object', 'query');
      
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

## 1.4. Configuration

### 1.4.1. Logger Configuration

```javascript
// Set global log level
GASDBLogger.setLevelByName('DEBUG'); // Development
GASDBLogger.setLevelByName('INFO');  // Production

// Component-specific configuration
const dbLogger = GASDBLogger.createComponentLogger('Database');
const collectionLogger = GASDBLogger.createComponentLogger('Collection');
```

### 1.4.2. Error Handler Configuration

```javascript
// Error types are pre-configured in ErrorHandler.ErrorTypes
const errorType = ErrorHandler.ErrorTypes.DOCUMENT_NOT_FOUND;

// Custom error handling
const customErrorHandler = (error, context) => {
  ErrorHandler.handleError(error, context, false); // Don't re-throw
  // Custom recovery logic here
};
```

### 1.4.3. ID Generator Configuration

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

### 1.4.4. ObjectUtils Configuration

```javascript
// ObjectUtils is stateless and requires no configuration
// Methods are called directly on the class

// Example integration with FileOperations
class FileOperations {
  readFile(fileId) {
    const rawData = this._readFromDrive(fileId);
    const parsedData = JSON.parse(rawData);
    
    // Automatically convert ISO date strings to Date objects
    ObjectUtils.convertDateStringsToObjects(parsedData);
    return parsedData;
  }
  
  writeFile(fileId, data) {
    // Create independent copy to avoid modifying original
    const dataToWrite = ObjectUtils.deepClone(data);
    const jsonString = JSON.stringify(dataToWrite);
    return this._writeToDrive(fileId, jsonString);
  }
}
```

## 1.5. Performance Considerations

1. **Logging:** Use appropriate log levels to avoid performance impact in production
2. **Error Handling:** Error context objects are JSON serialized, avoid large objects
3. **ID Generation:** UUID generation uses Google Apps Script utilities for optimal performance
4. **Validation:** Input validation is performed early to fail fast
5. **ObjectUtils:** Deep cloning and date conversion have performance implications for large objects
   - Use `deepClone` judiciously for large nested structures
   - `convertDateStringsToObjects` modifies objects in-place for efficiency
   - Consider object size and nesting depth when using these utilities

## 1.6. Migration and Versioning

All infrastructure components are designed to be stable and backwards compatible. Future versions will maintain API compatibility while potentially adding new features.

### 1.6.1. Component Dependencies

- **GASDBLogger:** Self-contained, no dependencies
- **ErrorHandler:** Uses GASDBLogger for error logging
- **IdGenerator:** Self-contained, uses Google Apps Script Utilities when available
- **ObjectUtils:** Self-contained, no dependencies

### 1.6.2. Extension Points

These components can be extended for future functionality:

1. **Custom Log Destinations:** Extend GASDBLogger to support additional output targets
2. **Additional Error Types:** Add new error classes that extend GASDBError
3. **New ID Strategies:** Add additional generation methods to IdGenerator
4. **Object Manipulation:** Add additional utility methods to ObjectUtils for specialized data handling

---

*This infrastructure forms the foundation for all other GAS DB components and follows established patterns for reliability, maintainability, and performance in Google Apps Script environments. The combination of logging (GASDBLogger), error management (ErrorHandler), ID generation (IdGenerator), and object manipulation (ObjectUtils) provides a comprehensive utility layer that supports sophisticated database operations while maintaining data integrity and system stability.*
