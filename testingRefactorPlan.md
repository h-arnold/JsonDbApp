# GAS-DB Testing Framework Refactor Plan

## 1. Summary of Current State
- Multiple overlapping test execution files: `TestExecution.js`, `TestRunner.js`, `Un## 7. Benefits

- Easier onboarding for new contributors.
- Clearer, more maintainable test code.
- Reduced duplication and improved resource management.
- Consistent, reliable test execution and reporting.
- **100% functionality preservation** - No existing capabilities lost.
- **Dramatic simplification** - From 4 framework files to 1.
- **Enhanced debugging** - Better error messages and resource tracking.

## 8. Next StepsstExecution.js`, and `AssertionUtilities.js`.
- Test suites and lifecycle hooks are present, but the structure can be confusing for new contributors.
- Test discovery and execution are section-based, with some redundancy in setup/teardown logic.

## 2. Problems Identified
- **Redundancy**: Overlapping responsibilities between test execution files.
- **Complexity**: Multiple entry points and unclear separation of concerns.
- **Onboarding Difficulty**: New contributors may struggle to know where to add or run tests.
- **Resource Management**: Cleanup and setup logic is sometimes duplicated or handled inconsistently.

## 3. Refactor Goals
- Simplify the test framework structure for clarity and maintainability.
- Ensure single responsibility for each component (runner, assertions, reporting).
- Make it easy to add, discover, and run tests.
- Centralise and standardise environment setup/teardown.
- Retain all current features (sectioned tests, lifecycle hooks, individual test running).

## 4. Current Framework Functionality Analysis

### Complete Functionality Inventory

Based on comprehensive analysis of the documentation and code, the existing testing framework provides:

#### **Test Execution and Entry Points**
- **Section-based test execution** (`testSection1()`, `testSection2()`, etc.)
- **Specific test suite execution** (`testSuite(sectionNumber, suiteName)`)
- **Individual test execution for debugging** (`runIndividualTest(sectionNumber, suiteName, testName)`)
- **Test listing** (`listAvailableTests(sectionNumber)`)
- **Environment validation** (`validateSection4Setup()`, etc.)
- **Environment initialisation** (`initialiseTestEnvironment()`)
- **Available tests discovery** (`getAvailableTests()`)

#### **Configuration-Driven Test Management**
- **Section configuration system** with predefined sections (1-4)
- **Section descriptions and metadata**
- **Test suite mapping** (maps suite names to function names)
- **Component validation rules** per section
- **Run function mapping** per section

#### **Core Test Execution Engine**
- **TestRunner class** - Main test execution coordinator
- **TestSuite class** - Collection of related tests with lifecycle hooks
- **TestResult class** - Individual test result representation
- **TestResults class** - Aggregated results with reporting

#### **Test Lifecycle Management**
- **beforeAll/afterAll hooks** - Suite-level setup/teardown
- **beforeEach/afterEach hooks** - Test-level setup/teardown
- **Environment setup/teardown** - Global test environment management
- **Resource tracking** - Automatic cleanup of created files/folders
- **Error handling in lifecycle hooks**

#### **Assertion Library**
- **Basic assertions**: `assertEquals()`, `assertNotEquals()`, `assertTrue()`, `assertFalse()`
- **Null/undefined checks**: `assertNull()`, `assertNotNull()`, `assertDefined()`, `assertUndefined()`
- **Exception testing**: `assertThrows()` with optional error type validation
- **Array operations**: `assertContains()`
- **String pattern matching**: `assertMatches()` with regex support
- **Custom error messages** for all assertions

#### **Test Results and Reporting**
- **Detailed test reports** with pass/fail status
- **Compact summary reports** grouped by test suite
- **Pass rate calculations** with percentages
- **Execution time tracking** per test
- **Error stack trace capture** and reporting
- **Multiple report formats** (detailed, compact, summary)

#### **Individual Test Debugging**
- **Single test execution** with full lifecycle preservation
- **Test discovery** within suites
- **Error reporting** for missing tests/suites
- **Proper setup/teardown** even for individual tests

#### **Environment and Validation**
- **Component availability checking** per section
- **Drive API permission validation**
- **ScriptProperties access validation**
- **Test framework component validation**
- **Smoke testing** capability

#### **Integration Features**
- **Google Apps Script integration** - Works with clasp and GAS editor
- **Drive API integration** - File/folder creation and cleanup
- **ScriptProperties integration** - For master index testing
- **Logger integration** - With GASDBLogger component
- **Error handling integration** - With ErrorHandler component

## 5. Proposed New Structure

```
tests/
├── framework/
│   └── TestFramework.js         # Single unified test framework file
└── test-suites/                 # Individual test suite files
    ├── EnvironmentTests.js      # Environment and basic setup tests
    ├── UtilityTests.js          # Logger, ErrorHandler, IdGenerator tests
    ├── MasterIndexTests.js      # MasterIndex functionality tests
    ├── FileServiceTests.js      # File operations and service tests
    └── DatabaseTests.js         # Database and collection tests
```

### **Complete Functionality Mapping**

| **Current Functionality** | **New Location** | **Implementation** |
|---------------------------|------------------|-------------------|
| **TestRunner, TestSuite, TestResult, TestResults classes** | `TestFramework.js` | Combined into single file with simplified API |
| **AssertionUtilities** | `TestFramework.js` | Integrated as static methods in main framework |
| **Section-based execution** | `TestFramework.js` | Simplified to `runTests()` and `runTestSuite()` methods |
| **Individual test debugging** | `TestFramework.js` | `runSingleTest(suiteName, testName)` method |
| **Test discovery/listing** | `TestFramework.js` | `listTests()` and `listSuites()` methods |
| **beforeAll/afterAll/beforeEach/afterEach hooks** | `TestFramework.js` | Preserved in TestSuite class |
| **Environment setup/teardown** | Each test suite file | Moved to individual test suites as needed |
| **Resource tracking** | `TestFramework.js` | Built-in cleanup tracking with `trackResource()` method |
| **Configuration system** | `TestFramework.js` | Simplified to basic configuration object |
| **Multiple report formats** | `TestFramework.js` | Consolidated to single comprehensive report format |
| **Error handling and validation** | `TestFramework.js` | Integrated error handling with proper stack traces |
| **GAS integration features** | `TestFramework.js` | Preserved Drive API, ScriptProperties, Logger integration |

### **Functionality Preservation Guarantee**

#### **Preserved Core Features:**
✅ **All assertion methods** (assertEquals, assertTrue, assertThrows, etc.)  
✅ **Complete test lifecycle** (beforeAll, afterAll, beforeEach, afterEach)  
✅ **Individual test debugging** capability  
✅ **Resource cleanup** and tracking  
✅ **Test result reporting** with pass/fail statistics  
✅ **Error capture** with stack traces  
✅ **Google Apps Script integration**  
✅ **Environment validation** capabilities  

#### **Simplified Aspects:**
🔧 **Single file framework** instead of 4 separate files  
🔧 **Direct test suite execution** instead of section-based configuration  
🔧 **Streamlined API** with fewer entry points  
🔧 **Reduced configuration complexity** while maintaining functionality  
🔧 **Consolidated reporting** format  

#### **Enhanced Aspects:**
⚡ **Automatic resource tracking** - No manual file ID tracking needed  
⚡ **Better error messages** - More descriptive test failure information  
⚡ **Simplified test writing** - Less boilerplate code required  
⚡ **Cleaner separation** - Test logic separated from framework complexity  

- **TestFramework.js**: Single unified file containing all test execution, assertion, and reporting logic.
- **Test suite files**: Individual files for each major component area, using standardised patterns.

## 6. Migration Steps

1. Create new `framework/` directory and add new TestFramework.js module.
2. Refactor existing test files to use the new unified framework.
3. Migrate lifecycle hooks and resource tracking to individual test suite files.
4. Update documentation and examples to match the new structure.
5. Deprecate/remove redundant files after migration is complete.

## 7. Benefits
- Easier onboarding for new contributors.
- Clearer, more maintainable test code.
- Reduced duplication and improved resource management.
- Consistent, reliable test execution and reporting.

## 8. Refactor Migration Checklist

### **📋 File Migration Overview**
- [ ] Create new `tests/framework/` directory
- [ ] Create unified `TestFramework.js` file
- [ ] Migrate all functionality from 4 existing files
- [ ] Validate no functionality is lost

---

### **🔄 Class Migration from TestRunner.js**

#### **TestResult Class**
- [ ] Migrate constructor: `TestResult(suiteName, testName, passed, error, executionTime)`
- [ ] Migrate properties: `suiteName`, `testName`, `passed`, `error`, `executionTime`, `timestamp`
- [ ] Migrate `toString()` method with status, time, error details

#### **TestResults Class**
- [ ] Migrate constructor: `TestResults()`
- [ ] Migrate `results[]` array property
- [ ] Migrate `addResult(result)` method
- [ ] Migrate `getPassed()` method
- [ ] Migrate `getFailed()` method  
- [ ] Migrate `getPassRate()` method
- [ ] Migrate `getSummary()` method
- [ ] Migrate `getDetailedReport()` method
- [ ] Migrate `getCompactReport()` method

#### **TestSuite Class**
- [ ] Migrate constructor: `TestSuite(name, tests)`
- [ ] Migrate properties: `name`, `tests`, `beforeAll`, `afterAll`, `beforeEach`, `afterEach`
- [ ] Migrate `addTest(name, fn)` method
- [ ] Migrate `setBeforeAll(fn)` method
- [ ] Migrate `setAfterAll(fn)` method
- [ ] Migrate `setBeforeEach(fn)` method
- [ ] Migrate `setAfterEach(fn)` method

#### **TestRunner Class**
- [ ] Migrate constructor: `TestRunner()`
- [ ] Migrate `testSuites[]` property
- [ ] Migrate `addTestSuite(suite)` method
- [ ] Migrate `runAllTests()` method
- [ ] Migrate `runSuite(suite)` method
- [ ] Migrate `runTest(suite, testName, testFn)` method
- [ ] Migrate hook execution logic (beforeAll, afterAll, beforeEach, afterEach)

---

### **🧪 Static Methods Migration from AssertionUtilities.js**

#### **Basic Assertions**
- [ ] Migrate `assertEquals(expected, actual, message)` with error handling
- [ ] Migrate `assertNotEquals(expected, actual, message)` with error handling
- [ ] Migrate `assertTrue(condition, message)` with error handling
- [ ] Migrate `assertFalse(condition, message)` with error handling

#### **Type Assertions**
- [ ] Migrate `assertDefined(value, message)` with error handling
- [ ] Migrate `assertUndefined(value, message)` with error handling
- [ ] Migrate `assertNull(value, message)` with error handling
- [ ] Migrate `assertNotNull(value, message)` with error handling

#### **Advanced Assertions**
- [ ] Migrate `assertThrows(fn, errorType, message)` with optional error type checking
- [ ] Migrate `assertContains(array, element, message)` with array validation
- [ ] Migrate `assertMatches(string, regex, message)` with type validation

---

### **⚙️ Configuration Migration from UnifiedTestExecution.js**

#### **TEST_SECTIONS Configuration**
- [ ] Migrate Section 1 configuration (Environment, Utility, Framework tests)
- [ ] Migrate Section 2 configuration (MasterIndex functionality tests)
- [ ] Migrate Section 3 configuration (File operations tests)
- [ ] Migrate Section 4 configuration (Database integration tests)
- [ ] Migrate validation logic for each section

#### **UnifiedTestExecution Class Methods**
- [ ] Migrate `runSection(sectionNumber)` method
- [ ] Migrate `runSuite(sectionNumber, suiteName)` method
- [ ] Migrate `runIndividualTest(sectionNumber, suiteName, testName)` method
- [ ] Migrate `listSectionTests(sectionNumber)` method
- [ ] Migrate `validateSetup(sectionNumber)` method
- [ ] Migrate `initialiseEnvironment()` method
- [ ] Migrate `getAvailableTests()` method

---

### **🚀 Entry Point Migration from TestExecution.js**

#### **Section Functions**
- [ ] Migrate `testSection1()` function
- [ ] Migrate `testSection2()` function
- [ ] Migrate `testSection3()` function
- [ ] Migrate `testSection4()` function

#### **Utility Functions**
- [ ] Migrate `testSuite(sectionNumber, suiteName)` function
- [ ] Migrate `runIndividualTest(sectionNumber, suiteName, testName)` function
- [ ] Migrate `listAvailableTests(sectionNumber)` function

#### **Validation Functions**
- [ ] Migrate `validateSection1Setup()` function
- [ ] Migrate `validateSection2Setup()` function
- [ ] Migrate `validateSection3Setup()` function
- [ ] Migrate `validateSection4Setup()` function
- [ ] Migrate `initialiseTestEnvironment()` function
- [ ] Migrate `getAvailableTests()` function

---

### **✅ Migration Validation**

#### **Functionality Verification**
- [ ] All TestRunner.js classes work identically in new framework
- [ ] All AssertionUtilities.js methods work identically in new framework  
- [ ] All UnifiedTestExecution.js methods work identically in new framework
- [ ] All TestExecution.js functions work identically in new framework

#### **API Compatibility**
- [ ] Existing test files can use new framework without changes
- [ ] All method signatures remain identical
- [ ] All error handling behaviour preserved
- [ ] All return value structures preserved

#### **Testing Validation**
- [ ] Run existing tests with new framework
- [ ] Verify all tests pass as before
- [ ] Check that individual test debugging still works
- [ ] Verify resource cleanup still functions

---

### **🧹 Cleanup**
- [ ] Remove `tests/test-framework/AssertionUtilities.js` 
- [ ] Remove `tests/test-framework/TestRunner.js`
- [ ] Remove `tests/test-framework/UnifiedTestExecution.js`
- [ ] Remove `tests/test-framework/TestExecution.js`
- [ ] Update any imports/references to point to new `TestFramework.js`

## 9. Next Steps
- Review this implementation checklist with the team.
- Begin implementation following the TDD approach outlined in the coding instructions.
- Execute checklist items systematically, validating each section before proceeding.
