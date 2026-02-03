# Testing Framework Developer Documentation

- [Testing Framework Developer Documentation](#testing-framework-developer-documentation)
  - [Overview](#overview)
  - [Key Features](#key-features)
  - [Framework Architecture](#framework-architecture)
  - [Test Suite Structure and Best Practices](#test-suite-structure-and-best-practices)
  - [Getting Started](#getting-started)
    - [Directory Structure](#directory-structure)
    - [Configuration](#configuration)
    - [GAS Mock Setup](#gas-mock-setup)
  - [Writing Tests](#writing-tests)
    - [Basic Test Example](#basic-test-example)
    - [Test with Setup and Cleanup](#test-with-setup-and-cleanup)
    - [Test with Helper Functions](#test-with-helper-functions)
    - [Error Testing](#error-testing)
  - [GAS Mocks](#gas-mocks)
    - [DriveApp](#driveapp)
    - [Folder](#folder)
    - [File](#file)
    - [PropertiesService](#propertiesservice)
    - [LockService](#lockservice)
    - [Utilities](#utilities)
    - [Logger](#logger)
    - [MimeType](#mimetype)
  - [Helper Functions](#helper-functions)
    - [Database Helpers](#database-helpers)
    - [Collection Helpers](#collection-helpers)
    - [MasterIndex Helpers](#masterindex-helpers)
  - [Running Tests](#running-tests)
    - [Run All Tests](#run-all-tests)
    - [Watch Mode](#watch-mode)
    - [Run Specific Test File](#run-specific-test-file)
    - [Run Tests Matching Pattern](#run-tests-matching-pattern)
    - [Coverage](#coverage)
  - [API Reference](#api-reference)
    - [Vitest Core APIs](#vitest-core-apis)
      - [Test Structure](#test-structure)
      - [Assertions](#assertions)
        - [Equality](#equality)
        - [Truthiness](#truthiness)
        - [Numbers](#numbers)
        - [Strings](#strings)
        - [Arrays/Iterables](#arraysiterables)
        - [Objects](#objects)
        - [Exceptions](#exceptions)
      - [Mocking (if needed)](#mocking-if-needed)
    - [GAS Mock APIs](#gas-mock-apis)

## Overview

The JsonDbApp testing framework uses **Vitest** with realistic Google Apps Script (GAS) API mocks to provide fast, reliable unit testing in a local Node.js environment. Tests run against realistic implementations of DriveApp, PropertiesService, LockService and other GAS APIs that write to disk, ensuring high-fidelity test behaviour without requiring deployment to the Apps Script platform.

## Key Features

- **Vitest-based**: Modern, fast test runner with excellent DX
- **Realistic GAS Mocks**: Local implementations of DriveApp, PropertiesService, LockService, Utilities that persist to disk
- **TDD-Ready**: Red-Green-Refactor workflow with watch mode support
- **Isolated Test Environment**: Each test uses isolated ScriptProperties keys and Drive folders
- **Comprehensive Assertions**: Vitest's built-in matchers plus custom helpers
- **Lifecycle Hooks**: `beforeEach`, `afterEach`, `beforeAll`, `afterAll` for setup and teardown
- **Resource Cleanup**: Automatic tracking and cleanup of test artefacts

## Framework Architecture

The testing framework consists of several layers:

- **Vitest**: Test runner and assertion library
- **GAS Mocks** ([tools/gas-mocks/](../../tools/gas-mocks/)): Node.js implementations of Google Apps Script APIs
- **Setup Files** ([tests/setup/](../../tests/setup/)): Bootstrap GAS mocks and load legacy source files
- **Test Helpers** ([tests/helpers/](../../tests/helpers/)): Reusable setup, teardown, and utility functions
- **Test Suites** ([tests/unit/](../../tests/unit/)): Organised test files by component

## Test Suite Structure and Best Practices

All tests follow a consistent, modular structure:

- **One feature per file**: Each test file focuses on a specific component or feature (e.g., [MasterIndex.test.js](../../tests/unit/master-index/MasterIndex.test.js), [database-collection-management.test.js](../../tests/unit/database/database-collection-management.test.js))
- **Descriptive test names**: Use `describe()` blocks to group related tests and `it()` for individual test cases
- **Arrange-Act-Assert**: Each test should clearly separate setup, execution, and assertions
- **Lifecycle hooks**: Use `beforeEach` and `afterEach` for resource management and isolation
- **Descriptive assertions**: Use Vitest's `expect()` with clear matcher names
- **No side effects**: Always clean up files, folders, and ScriptProperties, even on failure
- **Red-Green-Refactor**: Write failing tests first, then minimal passing code, then refactor
- **Coverage**: Include tests for constructor validation, configuration, happy paths, error cases, edge cases, and resource cleanup

**Example test structure:**

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupComponent, cleanupComponent } from '../helpers/component-test-helpers.js';

describe('Component Feature', () => {
  let component;

  beforeEach(() => {
    component = setupComponent();
  });

  afterEach(() => {
    cleanupComponent(component);
  });

  it('should perform expected behaviour', () => {
    // Arrange
    const input = { value: 42 };
    
    // Act
    const result = component.process(input);
    
    // Assert
    expect(result.value).toBe(42);
    expect(result.processed).toBe(true);
  });
});
```

## Getting Started

### Directory Structure

```
tests/
├── vitest.config.js           # Vitest configuration
├── setup/
│   └── gas-mocks.setup.js     # Bootstraps GAS mocks and loads source files
├── helpers/
│   ├── database-test-helpers.js
│   ├── collection-test-helpers.js
│   └── ...                    # Reusable test utilities
├── unit/
│   ├── master-index/
│   ├── database/
│   ├── validation/
│   └── ...                    # Component-specific test suites
└── .gas-drive/                # Mock Drive storage (gitignored)
└── .gas-script-properties.json # Mock ScriptProperties (gitignored)
```

### Configuration

The Vitest configuration ([tests/vitest.config.js](../../tests/vitest.config.js)) sets up:

- Test environment (Node.js)
- Setup files (GAS mocks)
- Test file patterns (`unit/**/*.test.js`, `helpers/**/*.test.js`)
- Mock cleanup behaviour

### GAS Mock Setup

The setup file ([tests/setup/gas-mocks.setup.js](../../tests/setup/gas-mocks.setup.js)):

1. Creates GAS mock instances with isolated storage paths
2. Injects mocks into global scope (`DriveApp`, `PropertiesService`, etc.)
3. Loads legacy source files into the test context using `vm.runInThisContext()`

## Writing Tests

### Basic Test Example

```javascript
import { describe, it, expect } from 'vitest';

describe('IdGenerator', () => {
  it('should generate unique IDs', () => {
    const generator = new IdGenerator();
    const id1 = generator.generateId();
    const id2 = generator.generateId();
    
    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);
  });
});
```

### Test with Setup and Cleanup

```javascript
import { describe, it, expect, afterEach } from 'vitest';

const scriptProperties = PropertiesService.getScriptProperties();
const trackedKeys = new Set();

const registerKey = (key) => {
  trackedKeys.add(key);
  return key;
};

afterEach(() => {
  for (const key of trackedKeys) {
    scriptProperties.deleteProperty(key);
  }
  trackedKeys.clear();
});

describe('MasterIndex Persistence', () => {
  it('should persist to ScriptProperties', () => {
    const key = registerKey(`TEST_KEY_${Date.now()}`);
    const masterIndex = new MasterIndex({ masterIndexKey: key });
    
    const stored = scriptProperties.getProperty(key);
    expect(stored).toBeDefined();
    expect(typeof stored).toBe('string');
  });
});
```

### Test with Helper Functions

```javascript
import { describe, it, expect } from 'vitest';
import {
  setupInitialisedDatabase,
  generateUniqueName,
  registerDatabaseFile
} from '../../helpers/database-test-helpers.js';

describe('Database Collection Management', () => {
  it('should create a new collection', () => {
    const { database } = setupInitialisedDatabase();
    const name = generateUniqueName('testCollection');
    
    const collection = database.createCollection(name);
    registerDatabaseFile(collection.driveFileId);
    
    expect(collection.name).toBe(name);
    expect(database.listCollections()).toContain(name);
  });
});
```

### Error Testing

```javascript
describe('Error Handling', () => {
  it('should throw InvalidArgumentError for invalid input', () => {
    const { database } = setupInitialisedDatabase({ autoCreateCollections: false });
    const missingName = generateUniqueName('missing');
    
    expect(() => database.collection(missingName))
      .toThrowError(/auto-create is disabled/);
  });
});
```

## GAS Mocks

The GAS mocks ([tools/gas-mocks/gas-mocks.cjs](../../tools/gas-mocks/gas-mocks.cjs)) provide realistic implementations of:

### DriveApp

- `createFolder(name)`: Creates folder on disk
- `getFolderById(id)`: Retrieves folder by ID
- `getFileById(id)`: Retrieves file by ID
- `getRootFolder()`: Returns singleton root folder

### Folder

- `createFile(name, content, mimeType)`: Writes file to disk
- `getFiles()`: Returns FileIterator
- `getFoldersByName(name)`: Returns FolderIterator
- `setTrashed(trashed)`: Marks folder as deleted

### File

- `getName()`, `getId()`, `getMimeType()`: Metadata accessors
- `getBlob()`: Returns Blob with `getDataAsString()`
- `setContent(content)`: Updates file content on disk
- `setTrashed(trashed)`: Marks file as deleted

### PropertiesService

- `getScriptProperties()`: Returns singleton Properties instance
- Properties: `getProperty(key)`, `setProperty(key, value)`, `deleteProperty(key)`
- Backed by JSON file on disk

### LockService

- `getScriptLock()`: Returns singleton Lock instance
- Lock: `waitLock(timeout)`, `releaseLock()`
- **Note**: Uses busy-wait, suitable for single-threaded sequential tests only

### Utilities

- `sleep(milliseconds)`: Blocking sleep

### Logger

- `log(data)`: Forwards to console

### MimeType

- `PLAIN_TEXT`: `"text/plain"`
- `JSON`: `"application/json"`

**Configuration:**

```javascript
const mocks = createGasMocks({
  driveRoot: '/tmp/gasdb-drive',           // Where Drive files are stored
  propertiesFile: '/tmp/gasdb-props.json'  // Where ScriptProperties are persisted
});
```

## Helper Functions

Test helpers provide reusable setup and cleanup utilities:

### Database Helpers

([tests/helpers/database-test-helpers.js](../../tests/helpers/database-test-helpers.js))

- `setupInitialisedDatabase(config)`: Creates isolated Database instance
- `generateUniqueName(prefix)`: Generates unique names for artefacts
- `registerDatabaseFile(fileId)`: Tracks files for cleanup

### Collection Helpers

([tests/helpers/collection-test-helpers.js](../../tests/helpers/collection-test-helpers.js))

- `createTestCollection(database, name, options)`: Creates and configures test collection
- `seedCollectionData(collection, documents)`: Pre-populates collection

### MasterIndex Helpers

- `createMasterIndexKey()`: Generates and registers a unique ScriptProperties key for tests
- `registerMasterIndexKey(key)`: Adds an existing key to the tracked cleanup set
- `createTestMasterIndex(config)`: Builds an isolated MasterIndex with automatic key tracking
- `seedMasterIndex(key, data)`: Serialises and stores master index payloads for fixtures
- `cleanupMasterIndexTests()`: Deletes all registered ScriptProperties keys after each test

## Running Tests

### Run All Tests

```bash
npm run test:vitest
```

### Watch Mode

```bash
npm run test:vitest -- --watch
```

### Run Specific Test File

```bash
npm run test:vitest -- tests/unit/master-index/MasterIndex.test.js
```

### Run Tests Matching Pattern

```bash
npm run test:vitest -- -t "should persist"
```

### Coverage

```bash
npm run test:vitest -- --coverage
```

## API Reference

### Vitest Core APIs

#### Test Structure

- `describe(name, fn)`: Groups related tests
- `it(name, fn)` / `test(name, fn)`: Defines individual test
- `beforeEach(fn)`: Runs before each test in scope
- `afterEach(fn)`: Runs after each test in scope
- `beforeAll(fn)`: Runs once before all tests in scope
- `afterAll(fn)`: Runs once after all tests in scope

#### Assertions

Vitest uses `expect()` with matchers:

##### Equality

- `expect(value).toBe(expected)`: Strict equality (===)
- `expect(value).toEqual(expected)`: Deep equality
- `expect(value).not.toBe(expected)`: Negation

##### Truthiness

- `expect(value).toBeTruthy()`: Truthy value
- `expect(value).toBeFalsy()`: Falsy value
- `expect(value).toBeDefined()`: Not undefined
- `expect(value).toBeUndefined()`: Undefined
- `expect(value).toBeNull()`: Null

##### Numbers

- `expect(value).toBeGreaterThan(n)`
- `expect(value).toBeLessThan(n)`
- `expect(value).toBeCloseTo(n, precision)`

##### Strings

- `expect(string).toMatch(pattern)`: Regex or substring match
- `expect(string).toContain(substring)`

##### Arrays/Iterables

- `expect(array).toContain(item)`
- `expect(array).toHaveLength(n)`
- `expect(array).toEqual(expect.arrayContaining([...]))`

##### Objects

- `expect(obj).toHaveProperty(key, value)`
- `expect(obj).toMatchObject(subset)`
- `expect(obj).toBeInstanceOf(Class)`

##### Exceptions

- `expect(() => fn()).toThrow()`: Throws any error
- `expect(() => fn()).toThrow(ErrorClass)`: Throws specific error type
- `expect(() => fn()).toThrowError(message)`: Throws with message matching string/regex

#### Mocking (if needed)

- `vi.fn()`: Creates mock function
- `vi.spyOn(object, 'method')`: Spies on method
- `vi.mock(path)`: Mocks module

### GAS Mock APIs

See [GAS Mocks Plan](../../tools/gas-mocks/plan.md) for complete method signatures and data shapes.
