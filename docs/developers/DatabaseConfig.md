# DatabaseConfig Developer Documentation

- [DatabaseConfig Developer Documentation](#databaseconfig-developer-documentation)
  - [Overview](#overview)
  - [Configuration Properties](#configuration-properties)
    - [Core Properties](#core-properties)
    - [Optional Properties](#optional-properties)
  - [Constructor](#constructor)
  - [Validation Rules](#validation-rules)
    - [Property Validation](#property-validation)
    - [Error Scenarios](#error-scenarios)
  - [Integration with Database](#integration-with-database)
  - [Component-Level Configuration](#component-level-configuration)
    - [QueryEngine Configuration](#queryengine-configuration)
    - [FileOperations Configuration](#fileoperations-configuration)
    - [Index Backup Strategy](#index-backup-strategy)

## Overview

The `DatabaseConfig` class manages database configuration settings with validation and defaults. It provides a standardised configuration object for Database instances, ensuring all settings are validated and properly formatted before use.

**Key Responsibilities:**

- Configuration validation and normalisation
- Default value management
- Type checking and constraint enforcement
- Configuration serialisation

**Design Principles:**

- Fail-fast validation in constructor (passing `null` config throws immediately)
- Configuration intended to be treated as immutable after creation
- Clear error messages for invalid settings
- Sensible defaults for all properties

## Configuration Properties

### Core Properties

| Property         | Type   | Default              | Description                           |
| ---------------- | ------ | -------------------- | ------------------------------------- |
| `rootFolderId`   | String | Drive root folder    | Root Drive folder for database files  |
| `masterIndexKey` | String | 'GASDB_MASTER_INDEX' | ScriptProperties key for master index |

### Optional Properties

| Property                                  | Type     | Default                            | Description                                                                                                                                                                                            |
| ----------------------------------------- | -------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `autoCreateCollections`                   | Boolean  | `true`                             | Auto-create collections when accessed                                                                                                                                                                  |
| `lockTimeout`                             | Number   | `30000`                            | Constructor input alias for the timing defaults; the instance properties are `collectionLockLeaseMs` and `coordinationTimeoutMs`                                                                       |
| `collectionLockLeaseMs`                   | Number   | `30000`                            | Collection lock lease duration in milliseconds and the lock acquisition wait window; must be at least as long as `coordinationTimeoutMs`                                                               |
| `coordinationTimeoutMs`                   | Number   | `30000`                            | Maximum duration allowed for a coordinated collection operation                                                                                                                                        |
| `retryAttempts`                           | Number   | `3`                                | Validated positive integer; lock acquisition is bounded by `collectionLockLeaseMs`                                                                                                                     |
| `retryDelayMs`                            | Number   | `1000`                             | Base delay for acquisition backoff, floored at 500 ms and capped at 5000 ms                                                                                                                            |
| `lockRetryBackoffBase`                    | Number   | `2`                                | Exponential growth base for the acquisition backoff; must be at least 1                                                                                                                                |
| `cacheEnabled`                            | Boolean  | `true`                             | Enable file caching                                                                                                                                                                                    |
| `logLevel`                                | String   | `DEFAULT_LOG_LEVEL` ('INFO')       | Log level constrained to the values declared in `LOG_LEVELS`                                                                                                                                           |
| `fileRetryAttempts`                       | Number   | `3`                                | File operation retry attempts                                                                                                                                                                          |
| `fileRetryDelayMs`                        | Number   | `1000`                             | Delay between file retries                                                                                                                                                                             |
| `fileRetryBackoffBase`                    | Number   | `2`                                | Exponential backoff base for file retries                                                                                                                                                              |
| `queryEngineMaxNestedDepth`               | Number   | `10`                               | Maximum allowed query nesting depth                                                                                                                                                                    |
| `queryEngineSupportedOperators`           | String[] | `['$eq','$gt','$lt','$and','$or']` | Operators permitted by the QueryEngine                                                                                                                                                                 |
| `queryEngineLogicalOperators`             | String[] | `['$and','$or']`                   | Logical operators recognised by the QueryEngine                                                                                                                                                        |
| `backupOnInitialise`                      | Boolean  | `false`                            | Controls eager Drive index backup during `initialise()`; default `false`                                                                                                                               |
| `stripDisallowedCollectionNameCharacters` | Boolean  | `false`                            | When enabled, invalid characters are stripped from collection names before validation so integrations that cannot guarantee clean inputs can still rely on strict reserved-name and empty-name checks. |

## Constructor

The constructor applies defaults through grouped helpers so each concern is handled consistently, and uses nullish coalescing (`??`) so explicit falsy overrides survive while nullish values fall back to defaults. Parameter types, defaults and error contracts are documented on the [`DatabaseConfig` class](../../src/04_core/DatabaseConfig.js).

## Validation Rules

### Property Validation

**collectionLockLeaseMs / coordinationTimeoutMs:**

- Each value must be a number of at least 500ms
- Constructor input `lockTimeout` supplies both timing values when their specific keys are absent
- `collectionLockLeaseMs` must be greater than or equal to `coordinationTimeoutMs`
- `CollectionCoordinator` may renew a lease shortly before final metadata persistence, but the configured lease should still comfortably cover the main write callback
- Size `collectionLockLeaseMs` to cover the callback; an over-budget operation may still publish collection metadata before the timeout is reported. See [CollectionCoordinator](CollectionCoordinator.md) for the violation algorithm.
- Recommended range: 5000-60000ms unless you have a measured need for longer operations
- Zero is invalid because the minimum is enforced during validation

```javascript
const config = {
  lockTimeout: 12000,
  coordinationTimeoutMs: 10000
};
```

**retryAttempts / retryDelayMs / lockRetryBackoffBase:**

- `retryAttempts` must be a positive integer (default `3`); lock acquisition is bounded by `collectionLockLeaseMs`
- `retryDelayMs` must be a non-negative number; it feeds the floored and capped acquisition backoff
- `lockRetryBackoffBase` must be at least 1; it feeds the same acquisition backoff

**logLevel:**

- Must be one of the entries in `LOG_LEVELS` (currently 'DEBUG', 'INFO', 'WARN', 'ERROR')
- Case-sensitive validation
- Defaults to `DEFAULT_LOG_LEVEL` to remain consistent with `JDbLogger`
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

| Error Message                                                                   | Cause                                                           | Solution                             |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------ |
| "Invalid argument: collectionLockLeaseMs - must be a number"                    | Invalid timeout value                                           | Use a number of at least 500ms       |
| "Invalid argument: logLevel - must be one of: DEBUG, INFO, WARN, ERROR"         | Invalid log level                                               | Use exact string match               |
| "Invalid argument: autoCreateCollections - must be a boolean"                   | Non-boolean value                                               | Use true or false explicitly         |
| "Invalid configuration for rootFolderId: <message>"                             | Drive access issue; reason `Failed to get default root folder`  | Check permissions and authentication |
| "Invalid argument: stripDisallowedCollectionNameCharacters - must be a boolean" | Non-boolean value for `stripDisallowedCollectionNameCharacters` | Use true or false explicitly         |

## Integration with Database

`Database` validates its configuration through `DatabaseConfig` at construction. For Apps Script consumers, prefer the public API factories:

```javascript
// First-time setup
const db1 = JsonDbApp.createAndInitialiseDatabase({
  masterIndexKey: 'myMasterIndex'
});

// Load existing database
const db2 = JsonDbApp.loadDatabase({
  masterIndexKey: 'myMasterIndex',
  logLevel: 'DEBUG',
  // Only back up MasterIndex to Drive during initialise when explicitly enabled
  backupOnInitialise: false
});

// Configuration is validated when constructing DatabaseConfig/Database
try {
  JsonDbApp.loadDatabase({ coordinationTimeoutMs: -1 }); // Will throw
} catch (error) {
  console.error('Invalid configuration:', error.message);
}
```

## Component-Level Configuration

While `DatabaseConfig` handles database-wide settings, individual components may have their own configuration options:

### QueryEngine Configuration

`DatabaseConfig` supplies the QueryEngine defaults through `DocumentOperations`. See the [`QueryEngine` constructor](../../src/02_components/QueryEngine/99_QueryEngine.js) for its option contract.

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
