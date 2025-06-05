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
    - [UnifiedTestExecution](#unifiedtestexecution)
      - [Unified API Methods](#unified-api-methods)
      - [Configuration-Driven Architecture](#configuration-driven-architecture)
      - [Section-Based Test Execution](#section-based-test-execution)
      - [Validation System](#validation-system)
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

Testing framework for Google Apps Script environments with assertion utilities, test runner, and unified execution system.

**Components:**
- **AssertionUtilities**: Assertion library for test validation
- **TestRunner**: Test execution and result management
- **UnifiedTestExecution**: Configuration-driven system for streamlined test management

## Components

### AssertionUtilities

The `AssertionUtilities` class provides static methods for test validation.

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

The `TestRunner` class orchestrates test execution with error handling and reporting.

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

### UnifiedTestExecution

The `UnifiedTestExecution` class provides static methods for configuration-driven test execution.

#### Unified API Methods

**Core Methods:**

| Method | Purpose | Example |
|--------|---------|---------|
| `runSection(sectionNumber)` | Execute all tests for a section | `UnifiedTestExecution.runSection(1)` |
| `runSuite(sectionNumber, suiteName)` | Execute specific test suite | `UnifiedTestExecution.runSuite(2, 'MasterIndex Functionality')` |
| `validateSetup(sectionNumber)` | Validate section prerequisites | `UnifiedTestExecution.validateSetup(3)` |
| `getAvailableTests()` | List all available sections and suites | `UnifiedTestExecution.getAvailableTests()` |
| `initializeEnvironment()` | Perform basic environment checks | `UnifiedTestExecution.initializeEnvironment()` |

**Return Value Format:**
```javascript
// Return value from runSection():
{
  success: true,               // Boolean indicating overall success
  summary: "5/5 tests passed", // String summary
  details: "Detailed report...", // String with full details
  passRate: 100,               // Number percentage
  totalTests: 5,               // Total number of tests
  passedTests: 5,              // Number of passed tests
  failedTests: 0               // Number of failed tests
}
```

#### Configuration-Driven Architecture

All test sections are defined in a central configuration object:

```javascript
const TEST_SECTIONS = {
  1: {
    name: 'Section 1',
    description: 'Project Setup and Basic Infrastructure',
    runFunction: 'runSection1Tests',
    suites: {
      'Environment Tests': 'runEnvironmentTests',
      'Utility Class Tests': 'runUtilityClassTests',
      'Test Framework Tests': 'runTestFrameworkTests'
    },
    validations: [
      {
        component: 'GASDBLogger',
        test: () => { /* validation logic */ }
      }
      // ... more validations
    ]
  }
  // ... more sections
};
```

#### Section-Based Test Execution

**Run Complete Section:**
```javascript
// Execute all tests for a section
const results = UnifiedTestExecution.runSection(1);
console.log(`Tests passed: ${results.passedTests}/${results.totalTests}`);
```

**Run Specific Test Suite:**
```javascript
// Execute a specific test suite within a section
const results = UnifiedTestExecution.runSuite(1, 'Environment Tests');
console.log('Suite results:', results.summary);
```

**Available Sections:**
- **Section 1**: Project Setup and Basic Infrastructure
- **Section 2**: ScriptProperties Master Index 
- **Section 3**: File Service and Drive Integration

#### Validation System

Each section includes built-in validations to verify setup and dependencies:

```javascript
// Run validation checks for a section
const validation = UnifiedTestExecution.validateSetup(1);

if (validation.success) {
  console.log('All components validated successfully');
} else {
  console.log('Validation issues:', validation.validations);
}
```

**Validation Types:**
- **Component Availability**: Verify classes and utilities are loaded
- **API Access**: Check Google Apps Script API permissions
- **Dependencies**: Ensure required components are properly configured
- **Test Functions**: Verify all test functions are available

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

```bash
# Run all tests
./test-runner.sh

# Run only Section 1 tests
./test-runner.sh 1

# Run validation checks
./test-runner.sh --validate

# Run tests for specific section
./test-runner.sh --tests 2
```

### Manual Test Execution in GAS

**Execute Complete Sections:**

```javascript
// Run all Section 1 tests
function runSection1Tests() {
  const results = UnifiedTestExecution.runSection(1);
  console.log('Section 1 Results:', results.summary);
  return results;
}

// Run Section 2 with validation
function runSection2WithValidation() {
  const validation = UnifiedTestExecution.validateSetup(2);
  if (!validation.success) {
    console.log('Validation failed:', validation.summary);
    return validation;
  }
  
  return UnifiedTestExecution.runSection(2);
}
```

**Execute Specific Test Suites:**

```javascript
// Run specific test suite from any section
function runSpecificSuite() {
  return UnifiedTestExecution.runSuite(3, 'FileOperations Functionality');
}

// Discover and run available tests
function exploreAvailableTests() {
  const available = UnifiedTestExecution.getAvailableTests();
  console.log('Available test sections:', available);
  
  // Run first available suite from Section 1
  const section1Suites = Object.keys(available['1'].suites);
  return UnifiedTestExecution.runSuite(1, section1Suites[0]);
}
```

**Environment Initialization:**

```javascript
function initializeTestEnvironment() {
  // Check basic environment setup
  const envCheck = UnifiedTestExecution.initializeEnvironment();
  console.log('Environment check:', envCheck.summary);
  
  if (envCheck.success) {
    // Run validation for all sections
    for (let section = 1; section <= 3; section++) {
      const validation = UnifiedTestExecution.validateSetup(section);
      console.log(`Section ${section} validation:`, validation.summary);
    }
  }
  
  return envCheck;
}
```

### Debugging Tests

```javascript
// Debug specific section execution
function debugSection(sectionNumber) {
  try {
    // First validate setup
    const validation = UnifiedTestExecution.validateSetup(sectionNumber);
    console.log('Validation results:', validation);
    
    if (!validation.success) {
      console.log('Setup issues detected - check validation details');
      return validation;
    }
    
    // Run tests with detailed logging
    const results = UnifiedTestExecution.runSection(sectionNumber);
    console.log('Test execution results:', results.details);
    
    return results;
  } catch (error) {
    console.error('Debug execution failed:', error);
    throw error;
  }
}

// Debug specific test suite
function debugTestSuite(sectionNumber, suiteName) {
  console.log(`Debugging suite: ${suiteName} in Section ${sectionNumber}`);
  
  const available = UnifiedTestExecution.getAvailableTests();
  const section = available[sectionNumber];
  
  if (!section || !section.suites.includes(suiteName)) {
    console.error('Suite not found. Available suites:', section ? section.suites : 'Section not found');
    return;
  }
  
  return UnifiedTestExecution.runSuite(sectionNumber, suiteName);
}
```

**Environment Debugging:**

```javascript
// Comprehensive environment check
function debugEnvironment() {
  console.log('Starting comprehensive environment debug...');
  
  // Basic environment
  const envCheck = UnifiedTestExecution.initializeEnvironment();
  console.log('Environment check:', envCheck);
  
  // Section-specific validation
  for (let section = 1; section <= 3; section++) {
    try {
      const validation = UnifiedTestExecution.validateSetup(section);
      console.log(`Section ${section} validation:`, validation);
    } catch (error) {
      console.error(`Section ${section} validation failed:`, error.message);
    }
  }
  
  // Available tests discovery
  const available = UnifiedTestExecution.getAvailableTests();
  console.log('Available test structure:', available);
}
```

### Performance Considerations

**Section-Based Execution:**
Tests are organized into sections to work within GAS execution time limits.

```javascript
// Optimized execution approach
function runTestsWithinTimeLimits() {
  const sections = [1, 2, 3];
  const results = [];
  
  for (const section of sections) {
    try {
      // Each section runs within time limits
      const sectionResult = UnifiedTestExecution.runSection(section);
      results.push(sectionResult);
      
      // Short pause between sections if needed
      Utilities.sleep(100);
    } catch (error) {
      console.error(`Section ${section} failed:`, error.message);
    }
  }
  
  return results;
}
```

**Best Practices:**

1. **Use Section-Based Execution:**
   ```javascript
   // Good - respects time limits
   UnifiedTestExecution.runSection(1);
   ```

2. **Validate Before Testing:**
   ```javascript
   // Efficient - skip tests if validation fails
   const validation = UnifiedTestExecution.validateSetup(2);
   if (validation.success) {
     UnifiedTestExecution.runSection(2);
   }
   ```

3. **Use Targeted Test Execution:**
   ```javascript
   // Run specific suites for focused testing
   UnifiedTestExecution.runSuite(3, 'FileOperations Functionality');
   ```

## Troubleshooting

### Common Issues

1. **Test Execution Failures:**

   **Issue:** Tests fail with "function not found" errors
   ```
   Error: runEnvironmentTests is not defined
   ```
   
   **Solution:** Verify test functions are available and properly named
   ```javascript
   // Check available tests
   const available = UnifiedTestExecution.getAvailableTests();
   console.log('Available sections:', available);
   
   // Validate section setup
   const validation = UnifiedTestExecution.validateSetup(1);
   console.log('Section validation:', validation);
   ```

2. **Configuration Issues:**

   **Issue:** Section not found or invalid configuration
   ```
   Error: Invalid section number: 4
   ```
   
   **Solution:** Use valid section numbers and check configuration
   ```javascript
   // Check valid sections
   const available = UnifiedTestExecution.getAvailableTests();
   const validSections = Object.keys(available);
   console.log('Valid sections:', validSections);
   ```

3. **Validation Failures:**

   **Issue:** Component validation fails unexpectedly
   ```
   Component: TestRunner - FAIL: Missing test framework components
   ```
   
   **Solution:** Initialize environment and check dependencies
   ```javascript
   // Full environment check
   const envCheck = UnifiedTestExecution.initializeEnvironment();
   if (!envCheck.success) {
     console.log('Environment issues:', envCheck.checks);
   }
   ```

### Debug Strategies

1. **Progressive Debugging:**

   ```javascript
   // Start with environment check
   function debugStepByStep() {
     console.log('Step 1: Environment check');
     const envCheck = UnifiedTestExecution.initializeEnvironment();
     
     if (!envCheck.success) {
       console.log('Environment issues found:', envCheck.checks);
       return envCheck;
     }
     
     console.log('Step 2: Validation check');
     const validation = UnifiedTestExecution.validateSetup(1);
     
     if (!validation.success) {
       console.log('Validation issues:', validation.validations);
       return validation;
     }
     
     console.log('Step 3: Test execution');
     return UnifiedTestExecution.runSection(1);
   }
   ```

2. **Configuration Debugging:**

   ```javascript
   // Inspect test configuration
   function debugConfiguration() {
     const available = UnifiedTestExecution.getAvailableTests();
     
     Object.entries(available).forEach(([sectionNum, section]) => {
       console.log(`Section ${sectionNum}:`, section.name);
       console.log('Available suites:', section.suites);
       
       // Test validation for each section
       try {
         const validation = UnifiedTestExecution.validateSetup(parseInt(sectionNum));
         console.log(`Validation status:`, validation.summary);
       } catch (error) {
         console.error(`Validation failed:`, error.message);
       }
     });
   }
   ```

3. **Targeted Suite Debugging:**

   ```javascript
   // Debug specific test suite
   function debugSpecificSuite(sectionNumber, suiteName) {
     console.log(`Debugging Section ${sectionNumber} - ${suiteName}`);
     
     // Check if suite exists
     const available = UnifiedTestExecution.getAvailableTests();
     const section = available[sectionNumber];
     
     if (!section) {
       console.error(`Section ${sectionNumber} not found`);
       return;
     }
     
     if (!section.suites.includes(suiteName)) {
       console.error(`Suite "${suiteName}" not found in section ${sectionNumber}`);
       console.log('Available suites:', section.suites);
       return;
     }
     
     // Run the suite with error handling
     try {
       return UnifiedTestExecution.runSuite(sectionNumber, suiteName);
     } catch (error) {
       console.error('Suite execution failed:', error.message);
       console.error('Stack trace:', error.stack);
       throw error;
     }
   }
   ```
