# DatabaseConfig Developer Documentation

- [DatabaseConfig Developer Documentation](#databaseconfig-developer-documentation)
  - [Overview](#overview)
  - [Configuration Properties](#configuration-properties)
    - [Core Properties](#core-properties)
    - [Optional Properties](#optional-properties)
  - [Constructor](#constructor)
  - [API Reference](#api-reference)
    - [Public Methods](#public-methods)
      - [`clone()`](#clone)
  - [`toJSON()`](#tojson)
  - [`fromJSON(obj)`](#fromjsonobj)
    - [Private Methods](#private-methods)
      - [`_getDefaultRootFolder()`](#_getdefaultrootfolder)
      - [`_validateConfig()`](#_validateconfig)
  - [Validation Rules](#validation-rules)
    - [Property Validation](#property-validation)
    - [Error Scenarios](#error-scenarios)
  - [Usage Examples](#usage-examples)
    - [Basic Configuration](#basic-configuration)
    - [Development vs Production](#development-vs-production)
    - [Configuration Cloning](#configuration-cloning)
    - [Configuration Serialization](#configuration-serialization)
  - [Integration with Database](#integration-with-database)
  - [Component-Level Configuration](#component-level-configuration)
    - [QueryEngine Configuration](#queryengine-configuration)
  - [Best Practices](#best-practices)

## Overview

The `DatabaseConfig` class manages database configuration settings with validation and defaults. It provides a standardized configuration object for Database instances, ensuring all settings are validated and properly formatted before use.

**Key Responsibilities:**

- Configuration validation and normalization
- Default value management
- Type checking and constraint enforcement
- Configuration cloning and serialization

**Design Principles:**

- Fail-fast validation in constructor
- Immutable configuration after creation
- Clear error messages for invalid settings
- Sensible defaults for all properties

## Configuration Properties

### Core Properties

| Property         | Type   | Default              | Description                           |
| ---------------- | ------ | -------------------- | ------------------------------------- |
| `rootFolderId`   | String | Drive root folder    | Root Drive folder for database files  |
| `masterIndexKey` | String | 'GASDB_MASTER_INDEX' | ScriptProperties key for master index |

### Optional Properties

| Property                                  | Type     | Default                            | Description                                                                                                                                                                                                                                        |
| ----------------------------------------- | -------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `autoCreateCollections`                   | Boolean  | `true`                             | Auto-create collections when accessed                                                                                                                                                                                                              |
| `lockTimeout`                             | Number   | `30000`                            | Lock timeout in milliseconds                                                                                                                                                                                                                       |
| `retryAttempts`                           | Number   | `3`                                | Lock acquisition retry attempts                                                                                                                                                                                                                    |
| `retryDelayMs`                            | Number   | `1000`                             | Delay between lock retries                                                                                                                                                                                                                         |
| `lockRetryBackoffBase`                    | Number   | `2`                                | Exponential backoff base for lock retries                                                                                                                                                                                                          |
| `cacheEnabled`                            | Boolean  | `true`                             | Enable file caching                                                                                                                                                                                                                                |
| `logLevel`                                | String   | 'INFO'                             | Log level (DEBUG, INFO, WARN, ERROR)                                                                                                                                                                                                               |
| `fileRetryAttempts`                       | Number   | `3`                                | File operation retry attempts                                                                                                                                                                                                                      |
| `fileRetryDelayMs`                        | Number   | `1000`                             | Delay between file retries                                                                                                                                                                                                                         |
| `fileRetryBackoffBase`                    | Number   | `2`                                | Exponential backoff base for file retries                                                                                                                                                                                                          |
| `queryEngineMaxNestedDepth`               | Number   | `10`                               | Maximum allowed query nesting depth                                                                                                                                                                                                                |
| `queryEngineSupportedOperators`           | String[] | `['$eq','$gt','$lt','$and','$or']` | Operators permitted by the QueryEngine                                                                                                                                                                                                             |
| `queryEngineLogicalOperators`             | String[] | `['$and','$or']`                   | Logical operators recognised by the QueryEngine                                                                                                                                                                                                    |
| `backupOnInitialise`                      | Boolean  | `false`                            | If true, `Database.initialise()` will create/find the Drive index file and back up the MasterIndex immediately. If false, the backup index is created lazily on first write (e.g. creating/dropping a collection) or when `loadIndex()` is called. |
| `stripDisallowedCollectionNameCharacters` | Boolean  | `false`                            | When enabled, invalid characters are stripped from collection names before validation so integrations that cannot guarantee clean inputs can still rely on strict reserved-name and empty-name checks.                                             |

## Constructor

```javascript
constructor((config = {}));
```

**Parameters:**

- `config` (Object): Configuration options object

**Behaviour:**

- Sets default values for all properties
- Validates all configuration parameters
- Throws errors immediately for invalid settings
- Automatically determines root folder if not provided

**Example:**

```javascript
const config = new DatabaseConfig({
  rootFolderId: 'your-folder-id',
  autoCreateCollections: false,
  logLevel: 'DEBUG'
});
```

## API Reference

### Public Methods

#### `clone()`

Creates a deep copy of the configuration.

- **Returns:** `DatabaseConfig` - New configuration instance
- **Use Cases:**
  - Creating modified configurations
  - Immutable configuration management
  - Testing with variations

#### `toJSON()`

Converts configuration to a serialisable plain object with a `__type` tag.

- **Returns:** `Object` - Plain object suitable for JSON serialisation
- **Use Cases:**
  - Serialisation
  - Debugging and logging
  - Configuration comparison

#### `fromJSON(obj)`

Creates a `DatabaseConfig` from an object produced by `toJSON()`.

- **Parameters:** `obj` (`Object`) - A deserialised config object containing `__type: 'DatabaseConfig'`
- **Returns:** `DatabaseConfig`
- **Throws:** `InvalidArgumentError` if the object is not a valid `DatabaseConfig` serialisation

### Private Methods

#### `_getDefaultRootFolder()`

Determines the default root folder ID.

- **Returns:** `String` - Drive root folder ID
- **Throws:** `Error` if unable to access Drive
- **Behaviour:** Uses `DriveApp.getRootFolder().getId()`

#### `_validateConfig()`

Validates all configuration properties according to rules.

- **Throws:** `Error` for any validation failure
- **Validation Order:**
  1. Type checking
  2. Range validation
  3. Format validation
  4. Constraint checking

## Validation Rules

### Property Validation

**lockTimeout:**

- Must be a non-negative number
- Recommended range: 5000-60000ms
- Zero means no timeout (use with caution)

**retryAttempts / retryDelayMs / lockRetryBackoffBase:**

- `retryAttempts` must be a positive integer
- `retryDelayMs` must be a non-negative number
- `lockRetryBackoffBase` must be a positive number

**logLevel:**

- Must be one of: 'DEBUG', 'INFO', 'WARN', 'ERROR'
- Case-sensitive validation
- Affects logging verbosity across the system

**rootFolderId:**

- Must be a valid string if provided
- Auto-detected if not specified
- Should correspond to accessible Drive folder
- Default root folder lookups are cached after first access to avoid repeated Drive API calls

**Boolean Properties:**

- `autoCreateCollections`: Must be true or false
- `cacheEnabled`: Must be true or false
- Type coercion not performed
- `stripDisallowedCollectionNameCharacters`: Must be true or false; default `false` enforces strict rejection of invalid names, while `true` enables sanitisation.

**masterIndexKey:**

- Must be a non-empty string
- Used as ScriptProperties key
- Should be unique per database instance

**File retry settings:**

- `fileRetryAttempts` must be a positive integer
- `fileRetryDelayMs` must be a non-negative number
- `fileRetryBackoffBase` must be a positive number

**QueryEngine settings:**

- `queryEngineMaxNestedDepth` must be an integer greater than or equal to zero
- `queryEngineSupportedOperators` must be a non-empty array of non-empty strings
- `queryEngineLogicalOperators` must be a non-empty array of non-empty strings, each present in `queryEngineSupportedOperators`

### Error Scenarios

Common validation errors and their meanings:

| Error Message                                        | Cause                                                           | Solution                             |
| ---------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------ |
| "Lock timeout must be a non-negative number"         | Invalid timeout value                                           | Use positive number or zero          |
| "Log level must be one of: DEBUG, INFO, WARN, ERROR" | Invalid log level                                               | Use exact string match               |
| "Auto create collections must be a boolean"          | Non-boolean value                                               | Use true or false explicitly         |
| "Failed to get default root folder"                  | Drive access issue                                              | Check permissions and authentication |
| "Collection sanitisation flag must be a boolean"     | Non-boolean value for `stripDisallowedCollectionNameCharacters` | Use true or false explicitly         |

## Usage Examples

### Basic Configuration

```javascript
// Minimal configuration (uses defaults)
const config = new DatabaseConfig();

// Custom root folder
const config = new DatabaseConfig({
  rootFolderId: '1ABC123xyz789'
});

// Production-ready configuration
const config = new DatabaseConfig({
  rootFolderId: 'prod-folder-id',
  autoCreateCollections: false,
  lockTimeout: 10000,
  logLevel: 'WARN',
  // Avoid Drive file churn on start; backups occur lazily or explicitly
  backupOnInitialise: false
});
```

### Development vs Production

```javascript
// Development configuration
const devConfig = new DatabaseConfig({
  autoCreateCollections: true,
  logLevel: 'DEBUG',
  cacheEnabled: true,
  // Enable eager backup if you want an index snapshot each initialise
  backupOnInitialise: true,
  // Looser query depth for exploratory work
  queryEngineMaxNestedDepth: 12
});

// Production configuration
const prodConfig = new DatabaseConfig({
  rootFolderId: 'production-folder-id',
  autoCreateCollections: false,
  lockTimeout: 5000,
  logLevel: 'ERROR',
  cacheEnabled: true,
  backupOnInitialise: false
});
```

### Configuration Cloning

```javascript
const baseConfig = new DatabaseConfig({
  rootFolderId: 'base-folder',
  logLevel: 'INFO'
});

// Create variation for testing
const testConfig = baseConfig.clone();
// Note: Properties are read-only after creation
// Clone and create new instance for modifications

const modifiedConfig = new DatabaseConfig({
  ...baseConfig.toJSON(),
  logLevel: 'DEBUG'
});
```

### Configuration Serialization

```javascript
const config = new DatabaseConfig({
  autoCreateCollections: false,
  lockTimeout: 15000
});

// Serialize for storage or logging
const configData = config.toJSON();
console.log('Config:', JSON.stringify(configData, null, 2));

// Recreate from serialised data
const restoredConfig = DatabaseConfig.fromJSON(configData);
```

## Integration with Database

The DatabaseConfig class integrates seamlessly with the Database class. For Apps Script consumers, prefer the public API factories:

```javascript
// First-time setup
const db1 = JsonDbApp.createAndInitialiseDatabase(
  new DatabaseConfig({
    masterIndexKey: 'myMasterIndex'
  })
);

// Load existing database
const db2 = JsonDbApp.loadDatabase({
  masterIndexKey: 'myMasterIndex',
  logLevel: 'DEBUG',
  // Only back up MasterIndex to Drive during initialise when explicitly enabled
  backupOnInitialise: false
});

// Configuration is validated when constructing DatabaseConfig/Database
try {
  JsonDbApp.loadDatabase({ lockTimeout: -1 }); // Will throw
} catch (error) {
  console.error('Invalid configuration:', error.message);
}
```

## Component-Level Configuration

While `DatabaseConfig` handles database-wide settings, individual components may have their own configuration options:

### QueryEngine Configuration

The QueryEngine uses defaults sourced from `DatabaseConfig` and is instantiated through `DocumentOperations`. You can still override defaults by passing a custom config directly to `QueryEngine` when needed.

```javascript
// QueryEngine has its own configuration
const queryEngine = new QueryEngine({
  maxNestedDepth: 15 // Override default of 10
});

// DatabaseConfig supplies defaults for collections
const dbConfig = new DatabaseConfig({
  logLevel: 'DEBUG',
  lockTimeout: 20000,
  queryEngineMaxNestedDepth: 12,
  queryEngineSupportedOperators: ['$eq', '$gt', '$lt', '$and', '$or']
});

const db = new Database(dbConfig);
// Collections use the QueryEngine internally with DatabaseConfig defaults
```

**QueryEngine Options:**

- `maxNestedDepth` (Number, default: 10): Maximum allowed query nesting depth for security
- `supportedOperators` (String[], default: `['$eq', '$gt', '$lt', '$and', '$or']`): Operators permitted by the engine
- `logicalOperators` (String[], default: `['$and', '$or']`): Logical operators permitted by the engine

### FileOperations Configuration

File operations use retry settings from `DatabaseConfig` when the `Database` constructs `FileOperations`:

- `fileRetryAttempts`: Number of retry attempts for Drive operations
- `fileRetryDelayMs`: Delay between retries
- `fileRetryBackoffBase`: Exponential backoff base for retries

**Security Note:** QueryEngine always validates all queries for structure and supported operators to prevent malicious queries, regardless of configuration.

### Index Backup Strategy

`backupOnInitialise` controls whether `Database.initialise()` performs Drive index creation and backup:

- `false` (default): Initialise reads from MasterIndex only; no Drive writes are performed. The Drive-based index is created lazily on first write operation (e.g., `createCollection`, `dropCollection`) or when calling `database.loadIndex()`.
- `true`: Initialise will create/find the index file in Drive and back up the current MasterIndex immediately. This is useful when you want a snapshot on every start at the cost of additional Drive operations.

Independent of this flag, explicit calls to `database.backupIndexToDrive()` will always perform a backup if an index file exists.

## Best Practices

1. **Validate early:** Create DatabaseConfig instances explicitly to catch errors
2. **Use appropriate timeouts:** Consider script execution limits when setting lockTimeout
3. **Environment-specific configs:** Create different configurations for dev/test/prod
4. **Immutable configurations:** Don't modify config properties after creation
5. **Proper folder permissions:** Ensure root folder is accessible to the script
6. **Sensible logging levels:** Use DEBUG for development, INFO/WARN for production
7. **Document custom settings:** Comment why specific values were chosen
8. **Test configuration validation:** Include config validation in your tests
9. **Security-first design:** All components prioritise security over optional performance optimisations
10. **Component separation:** Each component manages its own configuration appropriate to its responsibilities
