# GAS DB Testing Framework

- [GAS DB Testing Framework](#gas-db-testing-framework)
  - [Overview](#overview)
  - [Components](#components)
    - [AssertionUtilities](#assertionutilities)
      - [Basic Usage](#basic-usage)
      - [Available Assertions](#available-assertions)
      - [Error Handling](#error-handling)
    - [TestRunner](#testrunner)
      - [Basic Test Structure](#basic-test-structure)
      - [Advanced Test Features](#advanced-test-features)
      - [Test Organization](#test-organization)
      - [Running Tests](#running-tests)
      - [Result Format](#result-format)
  - [Best Practices](#best-practices)
    - [Test Design](#test-design)
    - [Error Testing](#error-testing)
    - [Mock Objects](#mock-objects)
    - [Test Data](#test-data)
  - [Integration with GAS DB](#integration-with-gas-db)
    - [Testing Database Operations](#testing-database-operations)
    - [Testing Error Scenarios](#testing-error-scenarios)
  - [Google Apps Script Integration](#google-apps-script-integration)
    - [Automated Test Execution with test-runner.sh](#automated-test-execution-with-test-runnersh)
    - [Manual Test Execution in GAS](#manual-test-execution-in-gas)
    - [Debugging Tests](#debugging-tests)
    - [Performance Considerations](#performance-considerations)
  - [Troubleshooting](#troubleshooting)
    - [Common Issues](#common-issues)
    - [Debug Strategies](#debug-strategies)

## Overview

The GAS DB Testing Framework provides a comprehensive testing infrastructure designed specifically for Google Apps Script environments. It includes assertion utilities and a test runner that handles the unique constraints of the GAS platform.

## Components

### AssertionUtilities

The `AssertionUtilities` class provides a complete set of assertions for validating test conditions.

#### Basic Usage

```javascript
// AssertionUtilities uses static methods - no instantiation needed

// Basic equality
AssertionUtilities.assertEquals('expected', actual, 'Values should be equal');

// Boolean checks
AssertionUtilities.assertTrue(condition, 'Should be true');

// Collections
AssertionUtilities.assertContains([1, 2, 3], 2, 'Array should contain 2');

// Error handling
AssertionUtilities.assertThrows(() => {
  throw new Error('Test error');
}, Error, 'Should throw an error');
```

#### Available Assertions

| Method | Purpose | Example |
|--------|---------|---------|
| `assertEquals(expected, actual, message)` | Value equality | `assertEquals('expected', result)` |
| `assertNotEquals(expected, actual, message)` | Value inequality | `assertNotEquals(null, result)` |
| `assertTrue(condition, message)` | Boolean true | `assertTrue(isValid)` |
| `assertFalse(condition, message)` | Boolean false | `assertFalse(hasErrors)` |
| `assertNull(value, message)` | Null check | `assertNull(emptyResult)` |
| `assertNotNull(value, message)` | Not null check | `assertNotNull(createdObject)` |
| `assertDefined(value, message)` | Defined check | `assertDefined(parameter)` |
| `assertUndefined(value, message)` | Undefined check | `assertUndefined(uninitialised)` |
| `assertContains(array, item, message)` | Array membership | `assertContains(results, expected)` |
| `assertMatches(string, regex, message)` | Regex matching | `assertMatches('test123', /\d+/)` |
| `assertThrows(fn, errorType, message)` | Exception testing | `assertThrows(() => invalidOp(), Error)` |

#### Error Handling

All assertions throw standard `Error` when conditions fail:

```javascript
try {
  AssertionUtilities.assertEquals('expected', 'actual', 'This will fail');
} catch (error) {
  console.log(error.message); // 'This will fail'
}
```

### TestRunner

The `TestRunner` class orchestrates test execution with proper error handling and reporting.

#### Basic Test Structure

```javascript
function testMyFeature() {
  const runner = new TestRunner('MyFeature Tests');
  
  runner.addTest('should do something', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = myFunction(input);
    
    // Assert
    AssertionUtilities.assertEquals('expected', result);
  });
  
  return runner.run();
}
```

#### Advanced Test Features

**Test Setup and Teardown:**

```javascript
function testWithSetup() {
  const runner = new TestRunner('Database Tests');
  
  runner.addTest('should create document', () => {
    // Setup
    const db = new MockDatabase();
    
    try {
      // Test logic
      const doc = db.create({name: 'test'});
      AssertionUtilities.assertNotNull(doc.id);
    } finally {
      // Cleanup
      db.cleanup();
    }
  });
  
  return runner.run();
}
```

**Error Testing:**

```javascript
runner.addTest('should throw validation error', () => {
  const validator = new DocumentValidator();
  
  AssertionUtilities.assertThrows(() => {
    validator.validate(null);
  }, Error, 'Should throw for null document');
});
```

**Complex Assertions:**

```javascript
runner.addTest('should return multiple results', () => {
  const results = searchFunction('query');
  
  AssertionUtilities.assertTrue(Array.isArray(results), 'Should return array');
  AssertionUtilities.assertTrue(results.length > 0, 'Should have results');
  AssertionUtilities.assertContains(results, expectedItem, 'Should contain expected item');
});
```

#### Test Organization

**File Structure:**

```
tests/
├── unit/
│   ├── core/
│   │   ├── DatabaseTest.js
│   │   └── CollectionTest.js
│   └── utils/
│       ├── LoggerTest.js
│       └── ErrorHandlerTest.js
└── integration/
    ├── DatabaseIntegrationTest.js
    └── FileOperationsTest.js
```

**Naming Conventions:**

- Test files: `ClassNameTest.js`
- Test functions: `testClassNameScenario()`
- Test descriptions: `'should behaviour when condition'`

#### Running Tests

**Individual Test:**

```javascript
function runSingleTest() {
  const results = testDatabaseInsert();
  console.log('Test Results:', results);
}
```

**Test Suite:**

```javascript
function runAllDatabaseTests() {
  const results = [];
  results.push(testDatabaseInsert());
  results.push(testDatabaseFind());
  results.push(testDatabaseUpdate());
  
  const summary = {
    total: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length
  };
  
  console.log('Test Summary:', summary);
  return summary;
}
```

#### Result Format

Test results follow a consistent structure:

```javascript
{
  testName: 'Database Tests',
  passed: true,
  totalTests: 5,
  passedTests: 5,
  failedTests: 0,
  results: [
    {
      name: 'should create document',
      passed: true,
      error: null
    }
    // ... more test results
  ],
  executionTime: 150
}
```

## Best Practices

### Test Design

1. **Follow AAA Pattern:**

   ```javascript
   runner.addTest('descriptive name', () => {
     // Arrange - Set up test data
     const input = createTestData();
     
     // Act - Execute the operation
     const result = functionUnderTest(input);
     
     // Assert - Verify the outcome
     AssertionUtilities.assertEquals('success', result.status);
   });
   ```

2. **Use Descriptive Names:**

   ```javascript
   // Good
   runner.addTest('should create document with valid data', () => {});
   runner.addTest('should throw error when document is null', () => {});
   
   // Avoid
   runner.addTest('test1', () => {});
   runner.addTest('create test', () => {});
   ```

3. **Test One Thing:**

   ```javascript
   // Good - focused test
   runner.addTest('should generate unique IDs', () => {
     const id1 = IdGenerator.generate();
     const id2 = IdGenerator.generate();
     AssertionUtilities.assertNotEquals(id1, id2);
   });
   
   // Avoid - testing multiple concerns
   runner.addTest('should work correctly', () => {
     // Tests ID generation, validation, and storage
   });
   ```

### Error Testing

1. **Test Expected Errors:**

   ```javascript
   runner.addTest('should validate required fields', () => {
     const doc = {}; // Missing required fields
     
     AssertionUtilities.assertThrows(() => {
       collection.insert(doc);
     }, Error, 'Should throw validation error');
   });
   ```

2. **Test Error Types:**

   ```javascript
   runner.addTest('should throw specific error type', () => {
     try {
       invalidOperation();
       AssertionUtilities.assertTrue(false, 'Should have thrown error');
     } catch (error) {
       AssertionUtilities.assertTrue(error instanceof ValidationError);
       AssertionUtilities.assertEquals('INVALID_DOCUMENT', error.code);
     }
   });
   ```

### Mock Objects

Create simple mocks for dependencies:

```javascript
function createMockFileService() {
  return {
    readFile: (fileId) => '{"documents": []}',
    writeFile: (fileId, content) => true,
    fileExists: (fileId) => true
  };
}

runner.addTest('should use file service', () => {
  const mockFileService = createMockFileService();
  const collection = new Collection('test', mockFileService);
  
  // Test collection behaviour with mock
});
```

### Test Data

Use consistent test data patterns:

```javascript
function createTestDocument(overrides = {}) {
  return {
    id: 'test-id-123',
    name: 'Test Document',
    status: 'active',
    createdAt: new Date(),
    ...overrides
  };
}

runner.addTest('should handle different document types', () => {
  const doc1 = createTestDocument({type: 'user'});
  const doc2 = createTestDocument({type: 'admin', permissions: ['read', 'write']});
  
  // Test with different document types
});
```

## Integration with GAS DB

### Testing Database Operations

```javascript
function testDatabaseOperations() {
  const runner = new TestRunner('Database Operations');
  
  runner.addTest('should insert and retrieve document', () => {
    const db = new Database();
    const collection = db.collection('users');
    
    const doc = {name: 'John Doe', email: 'john@example.com'};
    const inserted = collection.insertOne(doc);
    
    AssertionUtilities.assertNotNull(inserted.id);
    
    const found = collection.findOne({id: inserted.id});
    AssertionUtilities.assertEquals('John Doe', found.name);
  });
  
  return runner.run();
}
```

### Testing Error Scenarios

```javascript
function testErrorHandling() {
  const runner = new TestRunner('Error Handling');
  
  runner.addTest('should handle file system errors', () => {
    const mockFileService = {
      readFile: () => { throw new Error('File not found'); }
    };
    
    const collection = new Collection('test', mockFileService);
    
    AssertionUtilities.assertThrows(() => {
      collection.find({});
    }, Error, 'Should propagate file system errors');
  });
  
  return runner.run();
}
```

## Google Apps Script Integration

### Automated Test Execution with test-runner.sh

The GAS DB project includes a comprehensive test automation script that handles the complete testing workflow. See the [test-runner.sh documentation](test-runner.sh.md) for full details.

**Quick Usage:**

```bash
# Run all tests (push code, deploy, execute, retrieve logs)
./test-runner.sh

# Run only Section 1 tests
./test-runner.sh 1

# Run validation checks only
./test-runner.sh --validate

# Run tests for specific section
./test-runner.sh --tests 2
```

The script handles:

- Code deployment to Google Apps Script
- Authentication management for clasp operations
- Remote test execution via `clasp run`
- Log retrieval and parsing
- Validation checks
- Error reporting with colour-coded output

### Manual Test Execution in GAS

For manual testing or custom test runners:

1. **Add test functions to your GAS project**
2. **Create a test runner script:**

```javascript
function runAllTests() {
  const results = [];
  
  // Add all your test functions
  results.push(testDatabaseOperations());
  results.push(testErrorHandling());
  results.push(testIdGeneration());
  
  // Log summary
  const total = results.reduce((sum, r) => sum + r.totalTests, 0);
  const passed = results.reduce((sum, r) => sum + r.passedTests, 0);
  
  console.log(`Total Tests: ${total}, Passed: ${passed}, Failed: ${total - passed}`);
  
  return results;
}
```

3. **Run tests manually or via triggers**

### Debugging Tests

Use `console.log` for debugging:

```javascript
runner.addTest('debug example', () => {
  const data = processData(input);
  console.log('Processed data:', data); // Debug output
  
  AssertionUtilities.assertNotNull(data);
});
```

### Performance Considerations

GAS has execution time limits, so structure tests accordingly:

```javascript
// Break large test suites into smaller functions
function testDatabaseCore() {
  // Core functionality tests
}

function testDatabaseAdvanced() {
  // Advanced feature tests
}

function testDatabaseEdgeCases() {
  // Edge case tests
}
```

**Note:** The [test-runner.sh script](test-runner.sh.md) automatically handles section-based test execution to work within GAS time limits.

## Troubleshooting

### Common Issues

1. **Assertion Failures:**
   - Check expected vs actual values
   - Verify test data setup
   - Review assertion message for clues

2. **Test Timeouts:**
   - Break large tests into smaller ones
   - Reduce test data size
   - Optimise test operations

3. **Mock Object Issues:**
   - Ensure mocks implement required interface
   - Verify mock behaviour matches real objects
   - Check mock method signatures

### Debug Strategies

1. **Add Logging:**

   ```javascript
   runner.addTest('debug test', () => {
     console.log('Input:', input);
     const result = functionUnderTest(input);
     console.log('Result:', result);
     AssertionUtilities.assertEquals(expected, result);
   });
   ```

2. **Isolate Problems:**

   ```javascript
   // Comment out other tests to focus on one
   runner.addTest('isolated test', () => {
     // Single test case
   });
   ```

3. **Verify Assumptions:**

   ```javascript
   runner.addTest('verify assumptions', () => {
     // Test your understanding of the system
     AssertionUtilities.assertTrue(typeof someValue === 'string');
   });
   ```

This testing framework provides a solid foundation for maintaining code quality throughout the GAS DB implementation. Use it consistently to ensure reliable, maintainable code.
