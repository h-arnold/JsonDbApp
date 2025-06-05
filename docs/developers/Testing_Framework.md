# GAS-DB Testing Framework Documentation

## Overview

The GAS-DB Testing Framework provides a robust, extensible system for testing Google Apps Script applications. It follows Test-Driven Development principles and offers a structured approach to organising and executing tests through a unified interface.

## Core Components

The framework consists of the following key components:

1. **Test Execution Interface** – Entry points for running tests via the Apps Script UI
2. **Unified Test Execution** – Configuration-driven test execution system
3. **Test Runner** – Core test execution engine
4. **Test Suites** – Collections of related tests
5. **Assertion Utilities** – Methods for verifying expected behaviour
6. **Test Results** – Test outcome tracking and reporting

## Getting Started

### Basic Test Structure

Tests in GAS-DB follow this basic structure:

```javascript
function testMyFeature() {
  const suite = new TestSuite('My Feature Tests');
  
  suite.addTest('should perform specific behaviour', function() {
    // Arrange
    const myObject = new MyClass();
    
    // Act
    const result = myObject.doSomething();
    
    // Assert
    AssertionUtilities.assertEquals('expected result', result);
  });
  
  return suite;
}
```

### Running Tests

Tests are executed by calling one of the exposed functions in the Apps Script editor:

- `testSection1()` – Run all Section 1 tests
- `testSection2()` – Run all Section 2 tests
- `testSection3()` – Run all Section 3 tests
- `testSection4()` – Run all Section 4 tests
- `testSuite(sectionNumber, suiteName)` – Run a specific test suite
- `runIndividualTest(sectionNumber, suiteName, testName)` – Run a specific test for debugging
- `listAvailableTests(sectionNumber)` – List all available tests in a section

### Running Individual Tests for Debugging

For debugging purposes, you can run individual tests using the `runIndividualTest` function:

```javascript
// Run a specific test
runIndividualTest(4, 'Database Initialisation', 'should create database with valid config');

// First, list available tests to see what's available
listAvailableTests(4);
// This will show you all suites and tests in section 4

// Then run the specific test you want to debug
runIndividualTest(4, 'Collection Management', 'should create new collection');
```

This is particularly useful when using the GAS debugger, as you can focus on just the test you're interested in without having to step through all the other tests.

#### How Individual Test Running Works

The individual test runner maintains proper test lifecycle by:

1. **Finding the test suite**: Locates the specified suite within the section
2. **Creating a temporary suite**: Copies only the specific test to a new TestSuite instance
3. **Preserving lifecycle hooks**: Copies all `beforeAll`, `afterAll`, `beforeEach`, and `afterEach` hooks from the original suite
4. **Running full lifecycle**: Executes the complete test lifecycle (setup → test → teardown) for just that one test

```javascript
// Example: Running an individual test preserves environment setup
runIndividualTest(4, 'Database Config', 'should create config with default values');
// This will:
// 1. Execute setupTestEnvironment() via beforeAll hook
// 2. Run only the specified test
// 3. Execute cleanupTestEnvironment() via afterAll hook
```

#### Listing Available Tests

Use `listAvailableTests()` to discover what tests are available for debugging:

```javascript
// List all tests in Section 4
const section4Tests = listAvailableTests(4);
Logger.log(section4Tests);

// Example output:
// {
//   "success": true,
//   "section": 4,
//   "suites": {
//     "Database Config": [
//       "should create config with default values",
//       "should create config with custom values",
//       "should validate configuration parameters"
//     ],
//     "Database Initialisation": [
//       "should create database with default configuration",
//       "should create database with custom configuration",
//       "should initialise database and create index file"
//     ],
//     "Collection Management": [
//       "should create new collection",
//       "should access existing collection",
//       "should auto-create collection when configured"
//     ]
//   }
// }
```

## Class Reference

### TestExecution

Provides entry points for executing tests through the Google Apps Script editor.

**Methods:**

```javascript
function testSection4() {
  return UnifiedTestExecution.runSection(4);
}

function testSuite(sectionNumber, suiteName) {
  return UnifiedTestExecution.runSuite(sectionNumber, suiteName);
}

function validateSection4Setup() {
  return UnifiedTestExecution.validateSetup(4);
}

function initialiseTestEnvironment() {
  return UnifiedTestExecution.initialiseEnvironment();
}

function getAvailableTests() {
  return UnifiedTestExecution.getAvailableTests();
}
```

### UnifiedTestExecution

Manages configuration-driven test execution across different sections of the application.

**Methods:**

- `runSection(sectionNumber)` – Run all tests for a specific section
- `runSuite(sectionNumber, suiteName)` – Run a specific test suite
- `validateSetup(sectionNumber)` – Validate section component availability
- `getAvailableTests()` – Get information about available tests
- `initialiseEnvironment()` – Check basic environment setup

**Example:**

```javascript
// Run all Database tests
const results = UnifiedTestExecution.runSection(4);
Logger.log(results.summary);

// Run a specific test suite
const suiteResults = UnifiedTestExecution.runSuite(4, 'Database Initialisation');
```

### TestRunner

Core test execution engine responsible for running test suites and tracking results.

**Methods:**

- `addTestSuite(suite)` – Add a test suite to the runner
- `runAllTests()` – Run all test suites
- `runTestSuite(name)` – Run a specific test suite
- `runTest(suiteName, testName)` – Run a specific test

**Example:**

```javascript
const testRunner = new TestRunner();
testRunner.addTestSuite(testDatabaseInitialisation());
testRunner.addTestSuite(testCollectionManagement());
const results = testRunner.runAllTests();
```

### TestSuite

Represents a collection of related tests with common setup and teardown procedures.

**Methods:**

- `addTest(name, testFn)` – Add a test to the suite
- `setBeforeEach(fn)` – Set a function to run before each test
- `setAfterEach(fn)` – Set a function to run after each test
- `setBeforeAll(fn)` – Set a function to run once before all tests
- `setAfterAll(fn)` – Set a function to run once after all tests
- `runTests()` – Run all tests in the suite
- `runTest(name)` – Run a specific test

**Example:**

```javascript
function testDatabaseFunctionality() {
  const suite = new TestSuite('Database Functionality');
  
  let testDb = null;
  
  suite.setBeforeAll(function() {
    // Setup that runs once before all tests
    testDb = createTestDatabase();
  });
  
  suite.setAfterAll(function() {
    // Cleanup that runs once after all tests
    cleanupTestDatabase(testDb);
  });
  
  suite.addTest('should create collection', function() {
    const collection = testDb.createCollection('testCollection');
    AssertionUtilities.assertNotNull(collection);
  });
  
  return suite;
}
```

### AssertionUtilities

Provides methods to verify expected behaviours during test execution.

**Key Methods:**

- `assertEquals(expected, actual, message)` – Assert that values are equal
- `assertNotEquals(expected, actual, message)` – Assert that values are not equal
- `assertTrue(condition, message)` – Assert that a condition is true
- `assertFalse(condition, message)` – Assert that a condition is false
- `assertDefined(value, message)` – Assert that a value is not undefined
- `assertNotNull(value, message)` – Assert that a value is not null
- `assertThrows(fn, errorType, message)` – Assert that a function throws an error

**Example:**

```javascript
// Basic assertions
AssertionUtilities.assertEquals(42, calculator.add(20, 22));
AssertionUtilities.assertTrue(user.isLoggedIn(), 'User should be logged in');

// Error assertions
AssertionUtilities.assertThrows(() => {
  database.createCollection('');
}, Error, 'Should throw error for empty collection name');
```

### TestResults

Aggregates and summarises test execution results.

**Methods:**

- `addResult(result)` – Add a test result
- `getPassed()` – Get passed tests
- `getFailed()` – Get failed tests
- `getPassRate()` – Get pass rate percentage
- `getSummary()` – Get summary of test results
- `getDetailedReport()` – Get detailed test report
- `getCompactReport()` – Get compact test report

## Test Structure Patterns

### Arrange-Act-Assert Pattern

Follow this pattern for clear, maintainable tests:

```javascript
suite.addTest('should perform specific behaviour', function() {
  // Arrange – Set up the test conditions
  const user = new User('John');
  
  // Act – Perform the action being tested
  user.grantPermission('read');
  
  // Assert – Verify the expected outcome
  AssertionUtilities.assertTrue(user.hasPermission('read'));
});
```

### Test Environment Setup and Teardown

Use `beforeAll` and `afterAll` hooks to manage test environment lifecycle. Create dedicated setup and cleanup functions for shared resources:

```javascript
// Global test data storage
const TEST_DATA = {
  testFolderId: null,
  createdFileIds: [],
  createdFolderIds: [],
  testConfig: null
};

// Setup function called by beforeAll hooks
function setupTestEnvironment() {
  // Create test folder
  const folder = DriveApp.createFolder('GASDB_Test_' + new Date().getTime());
  TEST_DATA.testFolderId = folder.getId();
  TEST_DATA.createdFolderIds.push(TEST_DATA.testFolderId);
  
  // Prepare test configuration
  TEST_DATA.testConfig = {
    rootFolderId: TEST_DATA.testFolderId,
    autoCreateCollections: true,
    lockTimeout: 30000
  };
}

// Cleanup function called by afterAll hooks
function cleanupTestEnvironment() {
  // Clean up created test files and folders
  TEST_DATA.createdFileIds.forEach(fileId => {
    try {
      DriveApp.getFileById(fileId).setTrashed(true);
    } catch (error) {
      // Log but don't fail cleanup
    }
  });
  
  TEST_DATA.createdFolderIds.forEach(folderId => {
    try {
      DriveApp.getFolderById(folderId).setTrashed(true);
    } catch (error) {
      // Log but don't fail cleanup
    }
  });
}

// Test suite with proper lifecycle management
function testDatabaseConfig() {
  const suite = new TestSuite('Database Config');
  
  // Setup test environment once before all tests
  suite.setBeforeAll(function() {
    setupTestEnvironment();
  });
  
  // Cleanup after all tests
  suite.setAfterAll(function() {
    cleanupTestEnvironment();
  });
  
  suite.addTest('should create config with default values', function() {
    // Act
    const config = new DatabaseConfig();
    
    // Assert
    AssertionUtilities.assertNotNull(config);
    AssertionUtilities.assertTrue(config.autoCreateCollections);
  });
  
  return suite;
}

// Test suite that conditionally sets up environment
function testCollectionOperations() {
  const suite = new TestSuite('Collection Operations');
  
  // Conditionally set up environment if not already done
  suite.setBeforeAll(function() {
    if (!TEST_DATA.testConfig) {
      setupTestEnvironment();
    }
  });
  
  suite.addTest('should create new collection', function() {
    // Arrange
    const database = new Database(TEST_DATA.testConfig);
    
    // Act
    const collection = database.createCollection('testCollection');
    
    // Assert
    AssertionUtilities.assertNotNull(collection);
    
    // Track created files for cleanup
    if (collection?.driveFileId) {
      TEST_DATA.createdFileIds.push(collection.driveFileId);
    }
  });
  
  return suite;
}
```

## TDD Workflow with GAS-DB Framework

1. **Write Test First** – Create a test that defines the expected behaviour
2. **Run the Test** – Verify it fails (Red phase)
3. **Implement Minimal Code** – Write code to make the test pass
4. **Run the Test Again** – Verify it passes (Green phase)
5. **Refactor** – Improve code while keeping the test passing
6. **Repeat** – Continue with the next feature

### Example TDD Workflow

```javascript
// 1. Write a test for DatabaseConfig class
function testDatabaseConfigFunctionality() {
  const suite = new TestSuite('DatabaseConfig Functionality');
  
  suite.addTest('should create DatabaseConfig with default values', function() {
    // This will fail initially (Red phase)
    const config = new DatabaseConfig();
    
    AssertionUtilities.assertNotNull(config);
    AssertionUtilities.assertTrue(config.autoCreateCollections);
    AssertionUtilities.assertEquals(config.lockTimeout, 30000);
  });
  
  return suite;
}

// 2. Implement minimal code to pass the test
/**
 * Configuration for Database
 */
class DatabaseConfig {
  constructor(options = {}) {
    this.rootFolderId = options.rootFolderId || 'default-folder-id';
    this.autoCreateCollections = options.autoCreateCollections !== undefined ? 
      options.autoCreateCollections : true;
    this.lockTimeout = options.lockTimeout || 30000;
    this.cacheEnabled = options.cacheEnabled !== undefined ? 
      options.cacheEnabled : true;
    this.logLevel = options.logLevel || 'INFO';
  }
}
```

## Organising Tests

### Section Organisation Structure

The framework organises tests into sections, each focusing on a specific area of functionality:

- **Section 1**: Project Setup and Basic Infrastructure
- **Section 2**: ScriptProperties Master Index
- **Section 3**: File Service and Drive Integration
- **Section 4**: Database and Collection Management

### Test Suites Within Sections

Each section contains multiple test suites, each testing a specific component or feature. Use only business logic test suites in the run function:

```javascript
// Good: Section run function with only business logic test suites
function runSection4Tests() {
  const testRunner = new TestRunner();
  
  // Add only actual test suites - setup/teardown handled by beforeAll/afterAll hooks
  testRunner.addTestSuite(testDatabaseConfig());
  testRunner.addTestSuite(testDatabaseInitialisation());
  testRunner.addTestSuite(testCollectionManagement());
  testRunner.addTestSuite(testIndexFileStructure());
  
  return testRunner.runAllTests();
}

// Bad: Including setup/teardown as separate test suites (deprecated approach)
function runSection4TestsBad() {
  const testRunner = new TestRunner();
  
  testRunner.addTestSuite(testSection4Setup()); // Don't do this
  testRunner.addTestSuite(testDatabaseConfig());
  testRunner.addTestSuite(testSection4Cleanup()); // Don't do this
  
  return testRunner.runAllTests();
}
```

## Best Practices

### 1. Test Isolation and Independence

Each test should be independent and not rely on other tests:

```javascript
// Good: Independent test
suite.addTest('should create collection', function() {
  // Arrange
  const database = new Database(TEST_DATA.testConfig);
  const collectionName = 'independentTestCollection';
  
  // Act
  const collection = database.createCollection(collectionName);
  
  // Assert
  AssertionUtilities.assertNotNull(collection);
  
  // Track for cleanup
  if (collection?.driveFileId) {
    TEST_DATA.createdFileIds.push(collection.driveFileId);
  }
});

// Bad: Test depends on previous test state
suite.addTest('should access existing collection', function() {
  // This assumes a collection was created in a previous test
  const collection = database.getCollection('someCollection'); // May fail!
  AssertionUtilities.assertNotNull(collection);
});
```

### 2. Proper Environment Setup and Teardown

Use `beforeAll` and `afterAll` hooks for shared resources, and conditional setup for dependent test suites:

```javascript
// Primary test suite handles full lifecycle
function testDatabaseConfig() {
  const suite = new TestSuite('Database Config');
  
  // Setup test environment once before all tests
  suite.setBeforeAll(function() {
    setupTestEnvironment();
  });
  
  // Cleanup after all tests
  suite.setAfterAll(function() {
    cleanupTestEnvironment();
  });
  
  // Tests...
  
  return suite;
}

// Dependent test suite conditionally sets up environment
function testCollectionManagement() {
  const suite = new TestSuite('Collection Management');
  
  // Conditionally set up environment if not already done
  suite.setBeforeAll(function() {
    if (!TEST_DATA.testConfig) {
      setupTestEnvironment();
    }
  });
  
  // Tests...
  
  return suite;
}
```

### 3. Resource Tracking for Cleanup

Track all created resources during tests for proper cleanup:

```javascript
// Global storage for tracking test resources
const TEST_DATA = {
  testFolderId: null,
  createdFileIds: [], // Track all files created during tests
  createdFolderIds: [], // Track all folders created during tests
  testConfig: null
};

// In tests, track resources as they're created
suite.addTest('should create collection file', function() {
  const collection = database.createCollection('testCollection');
  
  // Track the created file for cleanup
  if (collection && collection.driveFileId) {
    TEST_DATA.createdFileIds.push(collection.driveFileId);
  }
  
  AssertionUtilities.assertNotNull(collection);
});

// Cleanup function handles all tracked resources
function cleanupTestEnvironment() {
  // Clean up all tracked files
  TEST_DATA.createdFileIds.forEach(fileId => {
    try {
      DriveApp.getFileById(fileId).setTrashed(true);
    } catch (error) {
      // Log but don't fail cleanup
    }
  });
  
  // Clean up all tracked folders
  TEST_DATA.createdFolderIds.forEach(folderId => {
    try {
      DriveApp.getFolderById(folderId).setTrashed(true);
    } catch (error) {
      // Log but don't fail cleanup
    }
  });
}
```

### 4. Descriptive Test Names

Use clear, descriptive names that explain the expected behaviour:

```javascript
// Good: Descriptive test names
suite.addTest('should create DatabaseConfig with default values', function() { });
suite.addTest('should throw error for invalid collection name', function() { });
suite.addTest('should auto-create collection when configured', function() { });

// Bad: Vague test names
suite.addTest('test config', function() { });
suite.addTest('test error', function() { });
suite.addTest('test collection', function() { });
```

### 5. Comprehensive Error Testing

Include tests for error conditions and boundary values:

```javascript
suite.addTest('should handle collection name validation', function() {
  const database = new Database(TEST_DATA.testConfig);
  
  // Test invalid collection names
  AssertionUtilities.assertThrows(() => {
    database.createCollection('');
  }, Error, 'Should throw error for empty collection name');
  
  AssertionUtilities.assertThrows(() => {
    database.createCollection(null);
  }, Error, 'Should throw error for null collection name');
  
  AssertionUtilities.assertThrows(() => {
    database.createCollection('invalid/name');
  }, Error, 'Should throw error for collection name with invalid characters');
});
```

### 6. Section Organisation Structure

Organise tests by logical sections and avoid setup/teardown test suites:

```javascript
// Good: Run function includes only business logic test suites
function runSection4Tests() {
  const testRunner = new TestRunner();
  
  // Add only actual test suites - setup/teardown handled by hooks
  testRunner.addTestSuite(testDatabaseConfig());
  testRunner.addTestSuite(testDatabaseInitialisation());
  testRunner.addTestSuite(testCollectionManagement());
  testRunner.addTestSuite(testIndexFileStructure());
  
  return testRunner.runAllTests();
}

// Bad: Including setup/teardown as separate test suites
function runSection4TestsBad() {
  const testRunner = new TestRunner();
  
  testRunner.addTestSuite(testSection4Setup()); // Don't do this
  testRunner.addTestSuite(testDatabaseConfig());
  testRunner.addTestSuite(testSection4Cleanup()); // Don't do this
  
  return testRunner.runAllTests();
}
```

## Troubleshooting

### Common Issues

1. **Test timeout errors** – Google Apps Script execution time limits may be reached for large test suites
   - Solution: Break tests into smaller suites or use continuation patterns

2. **Drive API permission errors** – Tests that use DriveApp require proper permissions
   - Solution: Run `initialiseTestEnvironment()` to check permissions first

3. **Test dependency failures** – When tests depend on each other
   - Solution: Use proper setup/teardown hooks and make tests independent

### Getting Help

1. Run `validateSection4Setup()` to check if the necessary components are available
2. Run `getAvailableTests()` to see what test sections and suites exist
3. Check the execution logs for detailed error information