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
      - [`toObject()`](#toobject)
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

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `rootFolderId` | String | Drive root folder | Root Drive folder for database files |
| `masterIndexKey` | String | 'GASDB_MASTER_INDEX' | ScriptProperties key for master index |

### Optional Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `autoCreateCollections` | Boolean | `true` | Auto-create collections when accessed |
| `lockTimeout` | Number | `30000` | Lock timeout in milliseconds |
| `cacheEnabled` | Boolean | `true` | Enable file caching |
| `logLevel` | String | 'INFO' | Log level (DEBUG, INFO, WARN, ERROR) |

## Constructor

```javascript
constructor(config = {})
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

#### `toObject()`

Converts configuration to plain JavaScript object.

- **Returns:** `Object` - Plain object with all configuration properties
- **Use Cases:**
  - Serialization
  - Debugging and logging
  - Configuration comparison

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

**logLevel:**

- Must be one of: 'DEBUG', 'INFO', 'WARN', 'ERROR'
- Case-sensitive validation
- Affects logging verbosity across the system

**rootFolderId:**

- Must be a valid string if provided
- Auto-detected if not specified
- Should correspond to accessible Drive folder

**Boolean Properties:**

- `autoCreateCollections`: Must be true or false
- `cacheEnabled`: Must be true or false
- Type coercion not performed

**masterIndexKey:**

- Must be a non-empty string
- Used as ScriptProperties key
- Should be unique per database instance

### Error Scenarios

Common validation errors and their meanings:

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "Lock timeout must be a non-negative number" | Invalid timeout value | Use positive number or zero |
| "Log level must be one of: DEBUG, INFO, WARN, ERROR" | Invalid log level | Use exact string match |
| "Auto create collections must be a boolean" | Non-boolean value | Use true or false explicitly |
| "Failed to get default root folder" | Drive access issue | Check permissions and authentication |

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
  logLevel: 'WARN'
});
```

### Development vs Production

```javascript
// Development configuration
const devConfig = new DatabaseConfig({
  autoCreateCollections: true,
  logLevel: 'DEBUG',
  cacheEnabled: true
});

// Production configuration
const prodConfig = new DatabaseConfig({
  rootFolderId: 'production-folder-id',
  autoCreateCollections: false,
  lockTimeout: 5000,
  logLevel: 'ERROR',
  cacheEnabled: true
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
  ...baseConfig.toObject(),
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
const configData = config.toObject();
console.log('Config:', JSON.stringify(configData, null, 2));

// Recreate from serialised data
const restoredConfig = new DatabaseConfig(configData);
```

## Integration with Database

The DatabaseConfig class integrates seamlessly with the Database class. For Apps Script consumers, prefer the public API factories:

```javascript
// First-time setup
const db1 = JsonDbApp.createAndInitialiseDatabase(new DatabaseConfig({
  masterIndexKey: 'myMasterIndex'
}));

// Load existing database
const db2 = JsonDbApp.loadDatabase({
  masterIndexKey: 'myMasterIndex',
  logLevel: 'DEBUG'
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

The QueryEngine accepts its own configuration object independently of DatabaseConfig:

```javascript
// QueryEngine has its own configuration
const queryEngine = new QueryEngine({
  maxNestedDepth: 15  // Override default of 10
});

// DatabaseConfig and QueryEngine configurations are separate
const dbConfig = new DatabaseConfig({
  logLevel: 'DEBUG',
  lockTimeout: 20000
});

const db = new Database(dbConfig);
// Collections use the QueryEngine internally with their own configuration
```

**QueryEngine Options:**

- `maxNestedDepth` (Number, default: 10): Maximum allowed query nesting depth for security

**Security Note:** QueryEngine always validates all queries for structure and supported operators to prevent malicious queries, regardless of configuration.

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
