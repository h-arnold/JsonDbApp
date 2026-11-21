# 1. JsonDbApp Infrastructure Components

- [1. JsonDbApp Infrastructure Components](#1-jsondbapp-infrastructure-components)
  - [1.1. Overview](#11-overview)
  - [1.2. Logger (JDbLogger)](#12-logger-jdblogger)
    - [1.2.0.1. Key Features](#1201-key-features)
    - [1.2.0.2. Core Methods](#1202-core-methods)
    - [1.2.0.3. Usage Examples](#1203-usage-examples)
    - [1.2.0.4. Best Practices](#1204-best-practices)
    - [1.2.0.5. Execution-Time Tracking](#1205-execution-time-tracking)
      - [API surface](#api-surface)
      - [Internal seams](#internal-seams)
      - [Timing events](#timing-events)
      - [Console output contract](#console-output-contract)
      - [DEBUG gating and exception rules](#debug-gating-and-exception-rules)
      - [Stacked timers](#stacked-timers)
      - [Lazy context suppliers](#lazy-context-suppliers)
      - [Instrumentation coverage](#instrumentation-coverage)
    - [1.2.1. ErrorHandler](#121-errorhandler)
      - [1.2.1.1. Error Type Hierarchy](#1211-error-type-hierarchy)
      - [1.2.1.2. Error Management Methods](#1212-error-management-methods)
      - [1.2.1.3. Usage Examples](#1213-usage-examples)
      - [1.2.1.4. Best Practices](#1214-best-practices)
      - [1.2.1.5. Coordination Timeout Errors](#1215-coordination-timeout-errors)
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
    - [1.2.5. BackoffUtils](#125-backoffutils)
  - [1.3. Integration Patterns](#13-integration-patterns)
    - [1.3.1. Component Integration](#131-component-integration)
    - [1.3.2. Standardised Error Flow](#132-standardised-error-flow)
  - [1.4. Configuration](#14-configuration)
    - [1.4.1. Logger Configuration](#141-logger-configuration)
    - [1.4.2. Error Handler Configuration](#142-error-handler-configuration)
    - [1.4.3. ID Generator Configuration](#143-id-generator-configuration)
    - [1.4.4. ObjectUtils Configuration](#144-objectutils-configuration)
  - [1.5. Performance Considerations](#15-performance-considerations)
  - [1.6. Component Relationships](#16-component-relationships)
    - [1.6.1. Component Dependencies](#161-component-dependencies)
    - [1.6.2. Extension Points](#162-extension-points)

## 1.1. Overview

The JsonDbApp infrastructure provides essential utilities for logging, error management, ID generation, and object manipulation. These components are designed specifically for Google Apps Script environments and support the core database functionality.

## 1.2. Logger (JDbLogger)

`JDbLogger` provides level-filtered logging with context objects and component loggers for Google Apps Script.

### 1.2.0.1. Key Features

See [JDbLogger](../../src/01_utils/JDbLogger.js) for the supported log levels, context handling and component-logger API.

### 1.2.0.2. Core Methods

Method contracts live in [JDbLogger](../../src/01_utils/JDbLogger.js). `Database` calls `setLevelByName` from its constructor to propagate the configured `logLevel`; see [Logger Configuration](#141-logger-configuration).

### 1.2.0.3. Usage Examples

Examples are covered by the JSDoc on [JDbLogger](../../src/01_utils/JDbLogger.js).

### 1.2.0.4. Best Practices

Log-level selection and context conventions are described in [JDbLogger](../../src/01_utils/JDbLogger.js).

### 1.2.0.5. Execution-Time Tracking

Implemented in `src/01_utils/JDbLogger.js`. The facility measures synchronous operations,
emits a DEBUG-level console record, and delivers structured timing events to registered
listeners so tests and tooling can assert against deterministic event fields.

#### API surface

| Member                                    | Description                                                                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `JDbLogger.timeSync(label, fn, context?)` | Static entry point: runs `fn` once between two clock reads and returns its result unchanged.                                                           |
| `logger.timeSync(label, fn, context?)`    | Component-logger form: delegates straight to the internal seam with the component name; events carry `component: '<Name>'` and labels stay unprefixed. |
| `JDbLogger.addTimingListener(listenerFn)` | Registers a listener receiving every timing event synchronously, in registration order. Returns an idempotent unsubscribe closure.                     |

#### Internal seams

| Member                                               | Description                                                                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `JDbLogger._timeSync(component, label, fn, context)` | Private static seam owning every behavioural rule; both entry points delegate here so behaviour cannot drift apart. |

Arguments validate before any measurement starts: `label` must be a non-empty string, `fn`
a function, and `context` an object, a function, or `null` — `undefined` normalises to
`null`, so context-less calls never throw. Violations raise the dependency-free typed
`JDbLoggerError`, exposed as `JDbLogger.JDbLoggerError`; `JDbLogger` deliberately holds no
`ErrorHandler` dependency.

**Attaching operation metadata via `context`.** The optional third argument of both `timeSync`
forms is the supported way to enrich timing output with operation metadata — attach structured
context rather than adding ad-hoc log lines or changing labels. Pass a plain object, or a
zero-argument lazy supplier that is invoked at most once and only when the DEBUG gate passes:

```javascript
const logger = JDbLogger.createComponentLogger('Collection');

// Structured object: cheapest form when metadata already exists
logger.timeSync('collection.find', () => findDocuments(filter), { filter });

// Lazy supplier: avoids building expensive context when DEBUG is gated off
logger.timeSync(
  'collection.find',
  () => findDocuments(filter),
  () => ({ filter })
);
```

The resolved context appears only on the console record — listener events never carry it (see
[Timing events](#timing-events)).

#### Timing events

```javascript
{
  component: 'Collection',               // PascalCase owner, or null for static use
  label: 'collection.find',
  durationMs: 42, // end − start from two inline Date.now() reads
  timestamp: '2026-08-24T12:00:00.000Z', // ISO string derived from the measured END reading
  error: null // thrown error message, or null on success
}
```

The resolved context is intentionally excluded from events; it appears only on the console
record.

#### Console output contract

Records flow through the standard debug pathway (`console.log` via `formatMessage`):

- Static use: `[TIMING] <label> | Context: { ...resolvedContext, durationMs }` —
  `durationMs` wins key collisions.
- Component use: `[<Component>] [TIMING] <label> | Context: { ...resolvedContext, durationMs }`.
- `formatMessage` stamps its own wall-clock timestamp; only `event.timestamp` derives from
  the measured end value, which is why test assertions target listener events rather than
  console lines (see
  [Testing Framework](Testing_Framework.md#timing-assertions-and-benchmarks)).

#### DEBUG gating and exception rules

Everything downstream of measurement — supplier resolution, formatting, console output,
listener dispatch — happens only when the level gate passes. Standalone `JDbLogger` defaults
to DEBUG; `Database` propagates its configured `logLevel`, so set DEBUG to observe timings.
Measurement itself precedes the gate: **both clock reads occur on every ungated call even
when emission is suppressed**, and the suppressed path still executes `fn`, returning its
result or rethrowing its error unchanged (an accepted, constant measurement tax). Each read
is contained individually: a failing read inherits its successful counterpart (or zero when
both fail) so `durationMs` stays numeric, with the failure reported via `console.error`.

Secondary instrumentation failures are contained identically on both paths — success and
error alike:

- **Both paths**: clock reads, supplier resolution, record emission and listener dispatch are
  individually guarded. A failure is reported through `console.error('Operation failed: ...')`
  and can never displace `fn`'s result nor mask its original error, which alone reaches the
  caller with its identity intact.
- **Listener dispatch**: listeners always fire over a snapshot of the store in registration
  order; a throwing listener is reported and every remaining listener still receives the event.

#### Stacked timers

While a measurement is active, nested `timeSync` calls validate their arguments then execute
their operation directly — no clock reads, no record, no dispatch. Each user-visible operation
therefore emits exactly ONE event for its outermost boundary label:

- A direct bulk call through `_applyToMatchingDocuments` emits a single
  `docOps.applyToMatching` event regardless of how many documents match — the inner
  `docOps.executeQuery`, `docOps.updateWithOperators` and `updateEngine.applyOperators`
  labels stay silent beneath it, keeping bulk-write event volume O(operations), not
  O(matched documents).
- Under Collection-level wrappers such as `updateMany`, the outermost
  `collection.updateMany` measurement is already active, so that inner bulk boundary stays
  silent too.

#### Lazy context suppliers

`context` accepts `Object | Function | null` on all four levels (`error`, `warn`, `info`,
`debug`) and on both `timeSync` forms; component-logger wrappers forward suppliers
uninvoked. Suppliers resolve after the level check and before `formatMessage`, at most once:
gated-out calls never invoke them and a function context never reaches stringification
unresolved. The at-most-once guarantee assumes suppliers do not return functions: a
function-valued resolution reaches `formatMessage` as a raw function context, which fails
validation loudly with `JDbLoggerError` rather than being garbled into output — suppliers must
resolve to an object or null. On the plain level methods a throwing supplier propagates
unchanged (fail loud); inside `timeSync`, resolution is contained on both paths per the
exception rules above.

#### Instrumentation coverage

Timers wrap whole batches and scans — never individual documents inside loops — keeping
event volume proportional to operations, not documents:

- **Boundary layer** (`src/04_core/Collection/99_Collection.js`): all nine public CRUD
  methods (`find`, `findOne`, `countDocuments`, `insertOne`, `updateOne`, `updateMany`,
  `replaceOne`, `deleteOne`, `deleteMany`) emit `collection.<operation>` events through the
  Collection component logger.
- **Inner hot paths**: `queryEngine.executeQuery` and `queryEngine.filterDocuments` (the
  matcher borrows the engine logger via `getLogger()`), `docOps.executeQuery` and
  `docOps.updateWithOperators` plus the single `docOps.applyToMatching` bulk boundary
  (`src/02_components/DocumentOperations.js`),
  `updateEngine.applyOperators` (`src/02_components/UpdateEngine/99_UpdateEngine.js`),
  `masterIndex.save` (`src/04_core/MasterIndex/99_MasterIndex.js` — the single persist point,
  covering all indirect callers), `coordinator.coordinate` and
  `coordinator.updateMasterIndexMetadata`
  (`src/02_components/CollectionCoordinator.js`), and `fileService.readFile` /
  `fileService.createFile` (`src/03_services/FileService.js`). See
  [Stacked timers](#stacked-timers) for which of these labels emit when calls nest.

Labels are lowercase dotted tags independent of the PascalCase `component` field
(`collection.find` events carry `component: 'Collection'`).

**FileService attribution rule.** `FileService` receives its working logger by injection
(`Database` passes its own), so timing through it would mislabel `fileService.*` events as
`Database`. It therefore constructs a dedicated `createComponentLogger('FileService')` used
ONLY for `timeSync`; the injected logger keeps its existing debug/warn/error duties.

**Instrumentation scope.** Timing covers the boundary methods listed above; `DbLockService`,
`Database` lifecycle, `Collection.aggregate` and per-document helpers (`deleteDocument`,
`findAllDocuments`) are outside the facility. `CollectionCoordinator` reads the clock directly
for timeout enforcement, lease renewal and lock-acquisition decisions rather than emitting
timing events.

---

### 1.2.1. ErrorHandler

**Location:** `src/01_utils/ErrorHandler.js`

Provides standardised error handling with custom error types and error context management. For input validation, refer to the Validate utility.

#### 1.2.1.1. Error Type Hierarchy

All errors extend `GASDBError` and carry a code, context and timestamp. The registered classes and their codes are defined in [ErrorHandler](../../src/01_utils/ErrorHandler.js); `ERROR_CODES` mirrors them for consumers that prefer constants. New subclasses should use `createErrorConstructorArgs` to build the standard `(message, code, context)` tuple.

#### 1.2.1.2. Error Management Methods

Method contracts live in [ErrorHandler](../../src/01_utils/ErrorHandler.js).

#### 1.2.1.3. Usage Examples

Examples are covered by the JSDoc in [ErrorHandler](../../src/01_utils/ErrorHandler.js).

#### 1.2.1.4. Best Practices

Error construction and handling conventions are covered in [ErrorHandler](../../src/01_utils/ErrorHandler.js).

#### 1.2.1.5. Coordination Timeout Errors

`CollectionCoordinator.coordinate()` throws `CoordinationTimeoutError` (code `COORDINATION_TIMEOUT`) for coordination-window and lease violations; exhausting the lock-acquisition window instead raises `LockAcquisitionFailureError`. Every coordination throw carries a distinct machine-readable `reason` in `error.context.reason`, alongside `operation` and `timeout`. The full contract — throw sites, reason values, swallows and logging — lives in [CollectionCoordinator](CollectionCoordinator.md).

---

### 1.2.2. IdGenerator

**Location:** `src/01_utils/IdGenerator.js`

Provides multiple strategies for generating unique identifiers suitable for different use cases in the database system.

#### 1.2.2.1. ID Generation Strategies

The generator catalogue and output formats live in [IdGenerator](../../src/01_utils/IdGenerator.js). `generateUUID()` is the default for document IDs.

#### 1.2.2.2. Validation Methods

`isValidUUID` and `isValidObjectId` are documented in [IdGenerator](../../src/01_utils/IdGenerator.js).

#### 1.2.2.3. Custom Generator Creation

See `createCustomGenerator` in [IdGenerator](../../src/01_utils/IdGenerator.js) for the supported options.

#### 1.2.2.4. Usage Examples

Examples are covered by the JSDoc in [IdGenerator](../../src/01_utils/IdGenerator.js).

#### 1.2.2.5. Best Practices

ID-type selection guidance is covered in [IdGenerator](../../src/01_utils/IdGenerator.js).

---

### 1.2.3. ObjectUtils

**Location:** `src/01_utils/ObjectUtils.js`

Provides utilities for object manipulation with Date preservation, essential for handling complex data structures and maintaining Date object integrity during JSON serialisation operations.

#### 1.2.3.1. Core Methods

`deepClone` and `convertDateStringsToObjects` are documented in [ObjectUtils](../../src/01_utils/ObjectUtils.js).

#### 1.2.3.2. Deep Cloning

`deepClone` produces an independent copy that preserves `Date` instances and nested structures; see [ObjectUtils](../../src/01_utils/ObjectUtils.js).

#### 1.2.3.3. Date String Conversion

`convertDateStringsToObjects` converts valid ISO date strings in place, recursively; see [ObjectUtils](../../src/01_utils/ObjectUtils.js).

#### 1.2.3.4. Usage Examples

Examples are covered by the JSDoc in [ObjectUtils](../../src/01_utils/ObjectUtils.js).

#### 1.2.3.5. Best Practices

Usage guidance is covered in [ObjectUtils](../../src/01_utils/ObjectUtils.js). `FileOperations` delegates JSON serialisation to `ObjectUtils.serialise` and `ObjectUtils.deserialise`; see [ObjectUtils Configuration](#144-objectutils-configuration).

---

### 1.2.4. Validate

**Location:** `src/01_utils/Validation.js`

Provides static validation helpers used at API entry points. Validation methods throw `ErrorHandler.ErrorTypes.INVALID_ARGUMENT` on failure, reporting the parameter name and a reason; `isPlainObject` is a predicate that returns a boolean instead.

#### 1.2.4.1. Core Methods

The full method catalogue and signatures live in [Validation](../../src/01_utils/Validation.js).

#### 1.2.4.2. Usage Examples

Examples are covered by the JSDoc in [Validation](../../src/01_utils/Validation.js).

#### 1.2.4.3. Best Practices

Validation conventions are covered in [Validation](../../src/01_utils/Validation.js).

---

### 1.2.5. BackoffUtils

**Location:** `src/01_utils/BackoffUtils.js`

Provides the single clamped exponential-backoff calculation shared by lock acquisition and file-operation retries. `calculateBackoff` is a stateless static method, and the caller supplies every bound, so one implementation serves both bounded and unbounded retry paths.

See [BackoffUtils](../../src/01_utils/BackoffUtils.js) for the formula and arguments.

`attempt` is one-based: attempt 1 returns `baseDelayMs`, subject to the bounds. A caller that must stay unclamped passes `-Infinity` and `Infinity` as the bounds, which is how `FileOperations` preserves its original unbounded retry delays.

---

## 1.3. Integration Patterns

### 1.3.1. Component Integration

```javascript
// Example: Database component using all utilities
class Database {
  constructor(config) {
    // Validate configuration
    Validate.required(config, 'config');
    Validate.type(config.rootFolderId, 'string', 'rootFolderId');

    // Set up logging
    this.logger = JDbLogger.createComponentLogger('Database');
    this.logger.info('Initialising database', { config });

    // Generate instance ID
    this.instanceId = IdGenerator.generateUUID();
  }

  performOperation(operationName, operationFn) {
    try {
      return operationFn();
    } catch (error) {
      ErrorHandler.handleError(error, `Database.${operationName}`, true);
    }
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

### 1.3.2. Standardised Error Flow

```javascript
// Standard error handling pattern across all components
class Collection {
  findOne(query) {
    try {
      Validate.required(query, 'query');
      Validate.type(query, 'object', 'query');

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
// When using Database, the constructor propagates logLevel automatically:
const db = new Database({ logLevel: 'DEBUG' }); // JDbLogger.setLevelByName('DEBUG') called internally

// Manual override (e.g., for standalone scripts or testing):
JDbLogger.setLevelByName('DEBUG'); // Development
JDbLogger.setLevelByName('INFO'); // Production

// Component-specific configuration
const dbLogger = JDbLogger.createComponentLogger('Database');
const collectionLogger = JDbLogger.createComponentLogger('Collection');
```

`DatabaseConfig` enforces these names via its `LOG_LEVELS` constant and defaults to `DEFAULT_LOG_LEVEL` (`'INFO'`), ensuring runtime configuration always maps cleanly onto `JDbLogger` expectations.

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
const debugIdGenerator = IdGenerator.createCustomGenerator({
  type: 'readable'
});
```

Modification tokens come from `MasterIndexConflictResolver.generateModificationToken()`.

### 1.4.4. ObjectUtils Configuration

`ObjectUtils` is stateless and needs no configuration. `FileOperations` delegates JSON serialisation to [ObjectUtils.serialise and ObjectUtils.deserialise](../../src/01_utils/ObjectUtils.js), so `Date` instances survive writes to Drive without callers handling the conversion.

## 1.5. Performance Considerations

1. **Logging:** Use appropriate log levels to avoid performance impact in production
2. **Error Handling:** Error context objects are JSON serialised, avoid large objects
3. **ID Generation:** UUID generation uses Google Apps Script utilities for optimal performance
4. **Validation:** Input validation is performed early to fail fast
5. **ObjectUtils:** Deep cloning and date conversion have performance implications for large objects
   - Use `deepClone` judiciously for large nested structures
   - `convertDateStringsToObjects` modifies objects in-place for efficiency
   - Consider object size and nesting depth when using these utilities

## 1.6. Component Relationships

### 1.6.1. Component Dependencies

- **JDbLogger:** Self-contained, no dependencies
- **ErrorHandler:** Uses JDbLogger for error logging
- **IdGenerator:** Self-contained, uses Google Apps Script Utilities when available
- **ObjectUtils:** Self-contained, no dependencies

### 1.6.2. Extension Points

1. **Custom Log Destinations:** Extend JDbLogger to support additional output targets
2. **Additional Error Types:** Add new error classes that extend GASDBError
3. **New ID Strategies:** Add additional generation methods to IdGenerator
4. **Object Manipulation:** Add additional utility methods to ObjectUtils for specialised data handling
