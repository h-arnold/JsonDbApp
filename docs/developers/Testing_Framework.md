# Testing Framework Developer Documentation

- [Testing Framework Developer Documentation](#testing-framework-developer-documentation)
  - [Overview](#overview)
  - [Key Features](#key-features)
  - [Framework Architecture](#framework-architecture)
  - [Basic Workflow](#basic-workflow)
    - [1. Create a Test Suite](#1-create-a-test-suite)
    - [2. Register and Run Tests](#2-register-and-run-tests)
    - [3. Using Global Convenience Functions](#3-using-global-convenience-functions)
  - [Practical Examples](#practical-examples)
    - [Basic Component Test](#basic-component-test)
    - [Test with Setup and Cleanup](#test-with-setup-and-cleanup)
    - [Test with Lifecycle Hooks](#test-with-lifecycle-hooks)
    - [Error Testing](#error-testing)
  - [API Reference](#api-reference)
    - [TestFramework Class](#testframework-class)
      - [Constructor](#constructor)
      - [Methods](#methods)
        - [registerTestSuite(suite)](#registertestsuitesuite)
        - [createTestSuite(name)](#createtestsuitename)
        - [runAllTests()](#runalltests)
        - [runTestSuite(name)](#runtestsuitename)
        - [runSingleTest(suiteName, testName)](#runsingletestsuitename-testname)
        - [listTests()](#listtests)
        - [validateEnvironment()](#validateenvironment)
        - [trackResourceFile(fileId)](#trackresourcefilefileid)
        - [getTestSuites()](#gettestsuites)
        - [hasTestSuite(name)](#hastestsuitename)
      - [Static Assertion Methods](#static-assertion-methods)
    - [TestSuite Class](#testsuite-class)
      - [Constructor](#constructor-1)
      - [Methods](#methods-1)
        - [addTest(name, testFn)](#addtestname-testfn)
        - [setBeforeEach(fn)](#setbeforeeachfn)
        - [setAfterEach(fn)](#setaftereachfn)
        - [setBeforeAll(fn)](#setbeforeallfn)
        - [setAfterAll(fn)](#setafterallfn)
        - [runTests()](#runtests)
        - [runTest(name)](#runtestname)
        - [hasTest(name)](#hastestname)
        - [getTestNames()](#gettestnames)
    - [AssertionUtilities Class](#assertionutilities-class)
      - [Equality Assertions](#equality-assertions)
        - [assertEquals(expected, actual, message)](#assertequalsexpected-actual-message)
        - [assertNotEquals(expected, actual, message)](#assertnotequalsexpected-actual-message)
      - [Boolean Assertions](#boolean-assertions)
        - [assertTrue(condition, message)](#asserttruecondition-message)
        - [assertFalse(condition, message)](#assertfalsecondition-message)
      - [Null/Undefined Assertions](#nullundefined-assertions)
        - [assertNull(value, message)](#assertnullvalue-message)
        - [assertNotNull(value, message)](#assertnotnullvalue-message)
        - [assertDefined(value, message)](#assertdefinedvalue-message)
        - [assertUndefined(value, message)](#assertundefinedvalue-message)
      - [Exception Assertions](#exception-assertions)
        - [assertThrows(fn, errorType, message)](#assertthrowsfn-errortype-message)
      - [Collection Assertions](#collection-assertions)
        - [assertContains(array, element, message)](#assertcontainsarray-element-message)
        - [assertMatches(string, regex, message)](#assertmatchesstring-regex-message)
        - [assertArrayEquals(expected, actual, message)](#assertarrayequalsexpected-actual-message)
    - [TestResult Class](#testresult-class)
      - [Constructor](#constructor-2)
      - [Properties](#properties)
      - [Methods](#methods-2)
        - [toString()](#tostring)
    - [TestResults Class](#testresults-class)
      - [Constructor](#constructor-3)
      - [Methods](#methods-3)
        - [addResult(result)](#addresultresult)
        - [finish()](#finish)
        - [getPassed()](#getpassed)
        - [getFailed()](#getfailed)
        - [getPassRate()](#getpassrate)
        - [getTotalExecutionTime()](#gettotalexecutiontime)
        - [getSummary()](#getsummary)
        - [getComprehensiveReport()](#getcomprehensivereport)
        - [logComprehensiveResults(loggerFunction)](#logcomprehensiveresultsloggerfunction)
  - [Global Convenience Functions](#global-convenience-functions)
    - [runAllTests()](#runalltests-1)
    - [runTestSuite(name)](#runtestsuitename-1)
    - [runSingleTest(suiteName, testName)](#runsingletestsuitename-testname-1)
    - [listTests()](#listtests-1)
    - [registerTestSuite(suite)](#registertestsuitesuite-1)
    - [createTestSuite(name)](#createtestsuitename-1)
    - [getTestFramework()](#gettestframework)
  - [Best Practices](#best-practices)
    - [1. Test Organisation](#1-test-organisation)
    - [2. Assertion Patterns](#2-assertion-patterns)
    - [3. Resource Management](#3-resource-management)
    - [4. TDD Workflow](#4-tdd-workflow)
    - [5. Environment Validation](#5-environment-validation)
  - [Troubleshooting](#troubleshooting)
    - [Common Issues](#common-issues)
    - [Debugging Tips](#debugging-tips)

## Overview

The GAS DB Testing Framework is a comprehensive Test-Driven Development (TDD) infrastructure designed specifically for Google Apps Script environments. It provides MongoDB-like testing patterns with automatic environment validation, resource management, and detailed reporting capabilities.

## Key Features

- **TDD-Ready**: Red-Green-Refactor workflow support
- **Environment Management**: Automatic GAS API validation and resource tracking
- **Comprehensive Assertions**: Static assertion utilities with detailed error messages
- **Lifecycle Hooks**: beforeAll, afterAll, beforeEach, afterEach support
- **Resource Cleanup**: Automatic tracking and cleanup of test files
- **Detailed Reporting**: Suite-based reporting with execution times and comprehensive output

## Framework Architecture

The testing framework consists of several key components:

- **TestFramework**: Main orchestrator for test execution and environment management
- **TestSuite**: Collection of related tests with lifecycle hooks
- **AssertionUtilities**: Static assertion methods for test validation
- **TestResult/TestResults**: Result data structures with comprehensive reporting
- **TestRunner**: Global convenience functions for easy access

## Basic Workflow

### 1. Create a Test Suite

```javascript
// Create a new test suite
const suite = new TestSuite('MyComponent Tests');

// Add tests to the suite
suite.addTest('should create component correctly', function() {
  // Arrange
  const config = { setting: 'value' };
  
  // Act
  const component = new MyComponent(config);
  
  // Assert
  TestFramework.assertNotNull(component, 'Component should be created');
  TestFramework.assertEquals(config.setting, component.config.setting, 'Config should match');
});
```

### 2. Register and Run Tests

```javascript
// Register the suite with the framework
const testFramework = new TestFramework();
testFramework.registerTestSuite(suite);

// Run all tests
const results = testFramework.runAllTests();

// Or run specific suite
const results = testFramework.runTestSuite('MyComponent Tests');

// Or run single test
const results = testFramework.runSingleTest('MyComponent Tests', 'should create component correctly');
```

### 3. Using Global Convenience Functions

```javascript
// Alternative approach using global functions
registerTestSuite(suite);
const results = runAllTests();
```

## Practical Examples

### Basic Component Test

Here's a real example from the IdGenerator tests:

```javascript
function createIdGeneratorTestSuite() {
  const suite = new TestSuite('IdGenerator Tests');
  
  // Test basic functionality
  suite.addTest('testIdGeneratorBasicFunctionality', function() {
    TestFramework.assertEquals('function', typeof IdGenerator.generateUUID, 'Should have generateUUID method');
    TestFramework.assertEquals('function', typeof IdGenerator.generateTimestampId, 'Should have generateTimestampId method');
    TestFramework.assertEquals('function', typeof IdGenerator.generateShortId, 'Should have generateShortId method');
  });
  
  // Test uniqueness
  suite.addTest('testIdGeneratorUniqueness', function() {
    const id1 = IdGenerator.generateUUID();
    const id2 = IdGenerator.generateUUID();
    TestFramework.assertNotEquals(id1, id2, 'UUIDs should be unique');
    
    const timestampId1 = IdGenerator.generateTimestampId();
    const timestampId2 = IdGenerator.generateTimestampId();
    TestFramework.assertNotEquals(timestampId1, timestampId2, 'Timestamp IDs should be unique');
  });
  
  return suite;
}
```

### Test with Setup and Cleanup

Here's an example showing proper use of lifecycle hooks for resource management:

```javascript
// Global test data storage
const DATABASE_TEST_DATA = {
  testFolderId: null,
  testFolderName: 'GASDB_Test_Database_' + new Date().getTime(),
  createdFileIds: [],
  createdFolderIds: []
};

/**
 * Setup database test environment
 */
function setupDatabaseTestEnvironment() {
  const logger = GASDBLogger.createComponentLogger('Database-Setup');
  
  try {
    const folder = DriveApp.createFolder(DATABASE_TEST_DATA.testFolderName);
    DATABASE_TEST_DATA.testFolderId = folder.getId();
    DATABASE_TEST_DATA.createdFolderIds.push(DATABASE_TEST_DATA.testFolderId);
    
    logger.info('Created test folder for Database', { 
      folderId: DATABASE_TEST_DATA.testFolderId, 
      name: DATABASE_TEST_DATA.testFolderName
    });
    
  } catch (error) {
    logger.error('Failed to create test folder for Database', { error: error.message });
    throw error;
  }
}

/**
 * Clean up database test environment
 */
function cleanupDatabaseTestEnvironment() {
  const logger = GASDBLogger.createComponentLogger('Database-Cleanup');
  
  // Clean up created test files and folders
  DATABASE_TEST_DATA.createdFileIds.forEach(fileId => {
    try {
      const file = DriveApp.getFileById(fileId);
      file.setTrashed(true);
    } catch (error) {
      logger.warn('Failed to delete file', { fileId, error: error.message });
    }
  });
  
  DATABASE_TEST_DATA.createdFolderIds.forEach(folderId => {
    try {
      const folder = DriveApp.getFolderById(folderId);
      folder.setTrashed(true);
    } catch (error) {
      logger.warn('Failed to delete folder', { folderId, error: error.message });
    }
  });
  
  logger.info('Database test cleanup completed');
}

function createDatabaseTestSuite() {
  const suite = new TestSuite('Database Tests');
  
  // Setup test environment before all tests in this suite
  suite.setBeforeAll(function() {
    setupDatabaseTestEnvironment();
  });
  
  // Clean up after all tests in this suite
  suite.setAfterAll(function() {
    cleanupDatabaseTestEnvironment();
  });
  
  suite.addTest('should create database correctly', function() {
    // Arrange
    const config = { rootFolderId: DATABASE_TEST_DATA.testFolderId };
    
    // Act
    const database = new Database(config);
    
    // Assert
    TestFramework.assertNotNull(database, 'Database should be created');
    TestFramework.assertEquals(config.rootFolderId, database.config.rootFolderId, 'Config should match');
  });
  
  return suite;
}
```

### Test with Lifecycle Hooks

```javascript
function createTestSuiteWithHooks() {
  const suite = new TestSuite('Component With Lifecycle');
  
  let testResource;
  
  // Setup before all tests in the suite
  suite.setBeforeAll(function() {
    testResource = createSharedResource();
  });
  
  // Setup before each test
  suite.setBeforeEach(function() {
    testResource.reset();
  });
  
  // Cleanup after each test
  suite.setAfterEach(function() {
    testResource.cleanup();
  });
  
  // Cleanup after all tests
  suite.setAfterAll(function() {
    testResource.destroy();
  });
  
  suite.addTest('should use shared resource', function() {
    TestFramework.assertNotNull(testResource, 'Shared resource should be available');
    testResource.doSomething();
    TestFramework.assertTrue(testResource.isValid(), 'Resource should be valid after operation');
  });
  
  return suite;
}
```

### Error Testing

```javascript
suite.addTest('should throw error for invalid input', function() {
  TestFramework.assertThrows(() => {
    new MyComponent(null); // Should throw error
  }, Error, 'Should throw error for null config');
  
  // Test specific error type
  TestFramework.assertThrows(() => {
    new MyComponent({ invalid: true });
  }, InvalidArgumentError, 'Should throw InvalidArgumentError for invalid config');
});
```

## API Reference

### TestFramework Class

The main framework orchestrator.

#### Constructor

```javascript
new TestFramework()
```

Creates a new TestFramework instance, initialising collections for test suites, results, resource file tracking, and setting initial environment validation status.

#### Methods

##### registerTestSuite(suite)

- **Parameters**: `suite` (TestSuite) - The test suite to register
- **Returns**: TestFramework instance for chaining
- **Description**: Registers a test suite with the framework

##### createTestSuite(name)

- **Parameters**: `name` (string) - Name of the test suite
- **Returns**: TestSuite instance for chaining
- **Description**: Creates and registers a new test suite

##### runAllTests()

- **Returns**: TestResults with comprehensive results
- **Description**: Runs all registered test suites with environment validation and cleanup

##### runTestSuite(name)

- **Parameters**: `name` (string) - Name of the test suite to run
- **Returns**: TestResults for the specific suite
- **Throws**: Error if suite not found
- **Description**: Runs a specific test suite by name

##### runSingleTest(suiteName, testName)

- **Parameters**:
  - `suiteName` (string) - Name of the test suite
  - `testName` (string) - Name of the specific test
- **Returns**: TestResults for the single test
- **Throws**: Error if suite or test not found
- **Description**: Runs a single test within a test suite

##### listTests()

- **Returns**: Object mapping suite names to array of test names
- **Description**: Lists all available tests organised by suite

##### validateEnvironment()

- **Throws**: Error if environment validation fails
- **Description**: Validates that the testing environment is properly set up

##### trackResourceFile(fileId)

- **Parameters**: `fileId` (string) - The file ID to track for cleanup
- **Description**: Tracks a file for automatic cleanup after tests

##### getTestSuites()

- **Returns**: Map of test suite names to TestSuite instances
- **Description**: Gets registered test suites (primarily for backward compatibility or internal use)

##### hasTestSuite(name)

- **Parameters**: `name` (string) - Name of the test suite
- **Returns**: boolean
- **Description**: Checks if a test suite with the given name is registered

#### Static Assertion Methods

All assertion methods are available as static methods on TestFramework:

```javascript
TestFramework.assertEquals(expected, actual, message)
TestFramework.assertTrue(condition, message)
// ... etc
```

### TestSuite Class

Represents a collection of related tests with lifecycle hooks.

#### Constructor

```javascript
new TestSuite(name)
```

- **Parameters**: `name` (string) - Name of the test suite

#### Methods

##### addTest(name, testFn)

- **Parameters**:
  - `name` (string) - Name of the test
  - `testFn` (function) - Test function to execute
- **Returns**: TestSuite instance for chaining
- **Description**: Adds a test to the suite

##### setBeforeEach(fn)

- **Parameters**: `fn` (function) - Function to run before each test
- **Returns**: TestSuite instance for chaining
- **Description**: Sets function to run before each test in the suite

##### setAfterEach(fn)

- **Parameters**: `fn` (function) - Function to run after each test
- **Returns**: TestSuite instance for chaining
- **Description**: Sets function to run after each test in the suite

##### setBeforeAll(fn)

- **Parameters**: `fn` (function) - Function to run before all tests
- **Returns**: TestSuite instance for chaining
- **Description**: Sets function to run once before all tests in the suite

##### setAfterAll(fn)

- **Parameters**: `fn` (function) - Function to run after all tests
- **Returns**: TestSuite instance for chaining
- **Description**: Sets function to run once after all tests in the suite

##### runTests()

- **Returns**: Array of TestResult objects
- **Description**: Runs all tests in the suite with lifecycle hooks

##### runTest(name)

- **Parameters**: `name` (string) - Name of the test to run
- **Returns**: TestResult object
- **Throws**: Error if test not found
- **Description**: Runs a specific test by name

##### hasTest(name)

- **Parameters**: `name` (string) - Name of the test to check
- **Returns**: boolean
- **Description**: Checks if a test exists in the suite

##### getTestNames()

- **Returns**: Array of test names
- **Description**: Gets all test names in the suite

### AssertionUtilities Class

Static assertion methods for test validation.

#### Equality Assertions

##### assertEquals(expected, actual, message)

- **Parameters**:
  - `expected` (any) - The expected value
  - `actual` (any) - The actual value
  - `message` (string, optional) - Custom error message
- **Throws**: Error if values are not equal
- **Description**: Asserts that two values are equal using strict equality (===)

##### assertNotEquals(expected, actual, message)

- **Parameters**:
  - `expected` (any) - The value that should not match
  - `actual` (any) - The actual value
  - `message` (string, optional) - Custom error message
- **Throws**: Error if values are equal
- **Description**: Asserts that two values are not equal

#### Boolean Assertions

##### assertTrue(condition, message)

- **Parameters**:
  - `condition` (boolean) - The condition to test
  - `message` (string, optional) - Custom error message
- **Throws**: Error if condition is false
- **Description**: Asserts that a condition is true

##### assertFalse(condition, message)

- **Parameters**:
  - `condition` (boolean) - The condition to test
  - `message` (string, optional) - Custom error message
- **Throws**: Error if condition is true
- **Description**: Asserts that a condition is false

#### Null/Undefined Assertions

##### assertNull(value, message)

- **Parameters**:
  - `value` (any) - The value to test
  - `message` (string, optional) - Custom error message
- **Throws**: Error if value is not null
- **Description**: Asserts that a value is null

##### assertNotNull(value, message)

- **Parameters**:
  - `value` (any) - The value to test
  - `message` (string, optional) - Custom error message
- **Throws**: Error if value is null
- **Description**: Asserts that a value is not null

##### assertDefined(value, message)

- **Parameters**:
  - `value` (any) - The value to test
  - `message` (string, optional) - Custom error message
- **Throws**: Error if value is undefined
- **Description**: Asserts that a value is defined (not undefined)

##### assertUndefined(value, message)

- **Parameters**:
  - `value` (any) - The value to test
  - `message` (string, optional) - Custom error message
- **Throws**: Error if value is not undefined
- **Description**: Asserts that a value is undefined

#### Exception Assertions

##### assertThrows(fn, errorType, message)

- **Parameters**:
  - `fn` (function) - The function that should throw
  - `errorType` (function, optional) - Expected error constructor
  - `message` (string, optional) - Custom error message
- **Throws**: Error if function doesn't throw or throws wrong type
- **Description**: Asserts that a function throws an error, optionally of a specific type

#### Collection Assertions

##### assertContains(array, element, message)

- **Parameters**:
  - `array` (Array) - The array to search
  - `element` (any) - The element to find
  - `message` (string, optional) - Custom error message
- **Throws**: Error if array doesn't contain element
- **Description**: Asserts that an array contains a specific element

##### assertMatches(string, regex, message)

- **Parameters**:
  - `string` (string) - The string to test
  - `regex` (RegExp) - The regular expression to match
  - `message` (string, optional) - Custom error message
- **Throws**: Error if string doesn't match regex
- **Description**: Asserts that a string matches a regular expression

##### assertArrayEquals(expected, actual, message)

- **Parameters**:
  - `expected` (Array) - The expected array
  - `actual` (Array) - The actual array
  - `message` (string, optional) - Custom error message
- **Throws**: Error if arrays are not equal (different lengths or elements)
- **Description**: Asserts that two arrays are equal by comparing length and element-wise equality using strict equality (===)

### TestResult Class

Represents the result of a single test execution.

#### Constructor

```javascript
new TestResult(suiteName, testName, passed, error, executionTime)
```

- **Parameters**:
  - `suiteName` (string) - Name of the test suite
  - `testName` (string) - Name of the test
  - `passed` (boolean) - Whether the test passed
  - `error` (Error, optional) - Error object if test failed
  - `executionTime` (number) - Execution time in milliseconds

#### Properties

- **suiteName**: Name of the test suite
- **testName**: Name of the test
- **passed**: Boolean indicating if test passed
- **error**: Error object if test failed
- **executionTime**: Execution time in milliseconds
- **timestamp**: Date when test was executed

#### Methods

##### toString()

- **Returns**: String representation of the test result
- **Description**: Formats the test result for display

### TestResults Class

Aggregates multiple test results with comprehensive reporting.

#### Constructor

```javascript
new TestResults()
```

#### Methods

##### addResult(result)

- **Parameters**: `result` (TestResult) - Test result to add
- **Description**: Adds a test result to the collection

##### finish()

- **Description**: Marks the test run as finished and records end time

##### getPassed()

- **Returns**: Array of passed TestResult objects
- **Description**: Gets all passed test results

##### getFailed()

- **Returns**: Array of failed TestResult objects
- **Description**: Gets all failed test results

##### getPassRate()

- **Returns**: Number (percentage)
- **Description**: Calculates the pass rate as a percentage

##### getTotalExecutionTime()

- **Returns**: Number (milliseconds)
- **Description**: Gets total execution time from start to finish

##### getSummary()

- **Returns**: String summary of test results
- **Description**: Gets a brief summary of test results

##### getComprehensiveReport()

- **Returns**: String with detailed test report
- **Description**: Gets a comprehensive report with all test details organised by suite

##### logComprehensiveResults(loggerFunction)

- **Parameters**: `loggerFunction` (function, optional) - The logger function to use (e.g., `console.log`). Defaults to `console.log`.
- **Description**: Logs the comprehensive test results, typically to the console, handling potential truncation issues by logging in parts.

## Global Convenience Functions

These functions provide easy access to the global TestFramework instance:

### runAllTests()

- **Returns**: TestResults
- **Description**: Runs all tests using the global framework

### runTestSuite(name)

- **Parameters**: `name` (string) - Suite name
- **Returns**: TestResults
- **Description**: Runs a specific test suite

### runSingleTest(suiteName, testName)

- **Parameters**:
  - `suiteName` (string) - Suite name
  - `testName` (string) - Test name
- **Returns**: TestResults
- **Description**: Runs a single test

### listTests()

- **Returns**: Object mapping suite names to test names
- **Description**: Lists all available tests

### registerTestSuite(suite)

- **Parameters**: `suite` (TestSuite) - Suite to register
- **Description**: Registers a test suite with global framework

### createTestSuite(name)

- **Parameters**: `name` (string) - Suite name
- **Returns**: TestSuite
- **Description**: Creates and registers a new test suite

### getTestFramework()

- **Returns**: TestFramework
- **Description**: Gets the global framework instance

## Best Practices

### 1. Test Organisation

- Create separate test files for each component (`ComponentNameTest.js`)
- Use descriptive test function names (`testComponentInitialisation`)
- Group related tests in test suites
- Use setup and teardown functions for resource management

### 2. Assertion Patterns

```javascript
// Use descriptive messages
TestFramework.assertEquals(expected, actual, 'Config should match input parameters');

// Test both positive and negative cases
TestFramework.assertTrue(component.isValid(), 'Component should be valid after creation');
TestFramework.assertFalse(component.isDestroyed(), 'Component should not be destroyed initially');

// Use specific error types when testing exceptions
TestFramework.assertThrows(() => {
  new Component(null);
}, InvalidArgumentError, 'Should throw InvalidArgumentError for null config');
```

### 3. Resource Management

```javascript
// Track files for automatic cleanup
const testFile = DriveApp.createFile('test.json', '{}');
testFramework.trackResourceFile(testFile.getId());

// Use global test data objects for complex setups
const TEST_DATA = {
  createdFileIds: [],
  createdFolderIds: [],
  testConfig: null
};
```

### 4. TDD Workflow

1. **Red**: Write a failing test first
2. **Green**: Write minimal code to make it pass
3. **Refactor**: Improve code while keeping tests green

```javascript
// Red: Write failing test
suite.addTest('should create component', function() {
  const component = new MyComponent(); // This will fail initially
  TestFramework.assertNotNull(component);
});

// Green: Implement minimal functionality
class MyComponent {
  constructor() {
    // Minimal implementation
  }
}

// Refactor: Improve implementation while tests pass
```

### 5. Environment Validation

The framework automatically validates:

- GAS APIs (DriveApp, PropertiesService, Logger)
- GAS DB components (GASDBLogger, ErrorHandler, IdGenerator)
- Basic functionality of core components

This ensures tests run in a properly configured environment.

## Troubleshooting

### Common Issues

1. **Environment Validation Failures**: Ensure all GAS DB components are loaded before running tests
2. **Resource Cleanup**: Use `trackResourceFile()` to avoid leaving test files in Drive
3. **Assertion Errors**: Include descriptive messages to make failures clear
4. **Test Isolation**: Use beforeEach/afterEach to ensure tests don't interfere with each other

### Debugging Tips

- Use `GASDBLogger` for detailed logging in tests
- Run single tests to isolate issues: `runSingleTest('SuiteName', 'testName')`
- Check the comprehensive report for detailed error information
- Validate that dependencies are loaded before running tests

This testing framework provides a robust foundation for Test-Driven Development in the GAS DB project, with comprehensive assertion capabilities, automatic resource management, and detailed reporting.
