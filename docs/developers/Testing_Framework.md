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
runIndividualTest(4, 'Database Initialization', 'should create database with valid config');

// First, list available tests to see what's available
listAvailableTests(4);
// This will show you all suites and tests in section 4

// Then run the specific test you want to debug
runIndividualTest(4, 'Collection Management', 'should create new collection');
```

This is particularly useful when using the GAS debugger, as you can focus on just the test you're interested in without having to step through all the other tests.

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

function initializeTestEnvironment() {
  return UnifiedTestExecution.initializeEnvironment();
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
- `initializeEnvironment()` – Check basic environment setup

**Example:**

```javascript
// Run all Database tests
const results = UnifiedTestExecution.runSection(4);
Logger.log(results.summary);

// Run a specific test suite
const suiteResults = UnifiedTestExecution.runSuite(4, 'Database Initialization');
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
testRunner.addTestSuite(testDatabaseInitialization());
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

### Test Dependencies with Setup/Teardown

Use hooks to manage shared resources:

```javascript
function testDatabaseOperations() {
  const suite = new TestSuite('Database Operations');
  
  let testFolder = null;
  let testDb = null;
  
  suite.setBeforeAll(function() {
    testFolder = DriveApp.createFolder('GASDB_Test_' + Date.now());
    testDb = new Database({ rootFolderId: testFolder.getId() });
    testDb.initialize();
  });
  
  suite.setAfterAll(function() {
    if (testFolder) {
      testFolder.setTrashed(true);
    }
  });
  
  // Tests that use the shared testDb...
  
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

### Section-Based Organisation

The framework organises tests into sections, each focusing on a specific area of functionality:

- **Section 1**: Project Setup and Basic Infrastructure
- **Section 2**: ScriptProperties Master Index
- **Section 3**: File Service and Drive Integration
- **Section 4**: Database and Collection Management

### Test Suites Within Sections

Each section contains multiple test suites, each testing a specific component or feature:

```javascript
// Sample organisation for Section 4
function runSection4Tests() {
  const testRunner = new TestRunner();
  
  // Add test suites in logical order
  testRunner.addTestSuite(testSection4Setup());
  testRunner.addTestSuite(testDatabaseConfigFunctionality());
  testRunner.addTestSuite(testDatabaseInitialization());
  testRunner.addTestSuite(testCollectionManagement());
  testRunner.addTestSuite(testIndexFileStructure());
  testRunner.addTestSuite(testDatabaseMasterIndexIntegration());
  testRunner.addTestSuite(testSection4Cleanup());
  
  return testRunner.runAllTests();
}
```

## Best Practices

1. **Test Isolation** – Each test should be independent and not rely on other tests
2. **Descriptive Names** – Use clear, descriptive names for tests and suites
3. **Clean Up Resources** – Use setup/teardown to manage test resources
4. **Test Edge Cases** – Include tests for error conditions and boundary values
5. **Fail Fast** – Let tests fail clearly when preconditions are not met

## Troubleshooting

### Common Issues

1. **Test timeout errors** – Google Apps Script execution time limits may be reached for large test suites
   - Solution: Break tests into smaller suites or use continuation patterns

2. **Drive API permission errors** – Tests that use DriveApp require proper permissions
   - Solution: Run `initializeTestEnvironment()` to check permissions first

3. **Test dependency failures** – When tests depend on each other
   - Solution: Use proper setup/teardown hooks and make tests independent

### Getting Help

1. Run `validateSection4Setup()` to check if the necessary components are available
2. Run `getAvailableTests()` to see what test sections and suites exist
3. Check the execution logs for detailed error information