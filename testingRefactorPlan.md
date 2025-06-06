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

## 8. True Consolidation Implementation Plan

### **🎯 Consolidation Goals vs Current Problems**

| **Current Problem** | **Consolidation Solution** | **Implementation** |
|---------------------|---------------------------|-------------------|
| 4 separate files with overlapping responsibilities | Single `TestFramework.js` file | Merge all functionality with clear separation of concerns |
| Multiple entry points (`testSection1()`, `testSection2()`, etc.) | 3 main methods | `runAllTests()`, `runTestSuite(name)`, `runSingleTest(suite, test)` |
| Complex section-based configuration | Simple test suite registry | Replace `TEST_SECTIONS` with `testSuites` map |
| Duplicated environment validation | Centralised validation | Single `validateEnvironment()` method |
| Multiple report formats | Unified comprehensive reporting | Single report format with all necessary details |
| Wrapper functions in `TestExecution.js` | Direct method calls | Remove wrapper layer entirely |

---

### **🏗️ Architecture Consolidation**

#### **Phase 1: Create Consolidated TestFramework Class**
- [ ] **Design unified API** - 3 main public methods instead of 10+ functions
- [ ] **Merge TestRunner + UnifiedTestExecution** - Eliminate overlapping orchestration logic
- [ ] **Integrate AssertionUtilities** - Static methods become part of main class
- [ ] **Simplify configuration** - Replace complex TEST_SECTIONS with simple registry
- [ ] **Unify reporting** - Single comprehensive report format

#### **Phase 2: Eliminate Redundant Layers**
- [ ] **Remove TestExecution.js** - Replace wrapper functions with direct API calls
- [ ] **Consolidate environment validation** - Single method instead of scattered checks
- [ ] **Merge result classes** - Combine TestResult/TestResults into simpler structure
- [ ] **Streamline test discovery** - Replace complex section mapping with direct suite access

#### **Phase 3: Enhanced Functionality**
- [ ] **Add automatic resource tracking** - Built-in cleanup without manual file ID management
- [ ] **Improve error reporting** - Better stack traces and context information
- [ ] **Implement fluent API** - Chainable test suite building
- [ ] **Add test filtering** - Run tests by pattern or tag

---

### **🔧 Specific Consolidation Patterns**

#### **1. API Simplification**
```javascript
// BEFORE: Multiple scattered entry points
testSection1()
testSection2()  
testSuite(2, 'MasterIndex Tests')
runIndividualTest(2, 'MasterIndex Tests', 'testCreateIndex')
listAvailableTests(2)

// AFTER: Clean unified API  
TestFramework.runAllTests()
TestFramework.runTestSuite('MasterIndexTests')
TestFramework.runSingleTest('MasterIndexTests', 'testCreateIndex')
TestFramework.listTests()
```

#### **2. Configuration Consolidation**
```javascript
// BEFORE: Complex section-based configuration
const TEST_SECTIONS = {
  1: { name: 'Section 1', suites: {...}, validations: [...] },
  2: { name: 'Section 2', suites: {...}, validations: [...] }
}

// AFTER: Simple test suite registry
const testSuites = new Map([
  ['EnvironmentTests', new TestSuite('EnvironmentTests')],
  ['MasterIndexTests', new TestSuite('MasterIndexTests')]
])
```

#### **3. Class Merging Strategy**
- [ ] **Merge TestRunner orchestration** into main TestFramework class
- [ ] **Integrate UnifiedTestExecution logic** without section complexity  
- [ ] **Embed AssertionUtilities** as static methods
- [ ] **Consolidate TestResult/TestResults** into simpler result handling

#### **4. Environment Validation Consolidation**
- [ ] **Replace scattered validation** with single `validateEnvironment()` method
- [ ] **Eliminate per-section validation** logic
- [ ] **Centralise GAS API checks** (Drive, ScriptProperties, Logger)
- [ ] **Unified component availability** checking

---

### **📋 Implementation Checklist**

#### **🏁 Phase 1: Core Framework Creation**
- [x] Create `tests/framework/TestFramework.js` with unified class structure
- [x] Implement simplified public API (3 main methods)
- [x] Merge assertion methods as static methods in TestFramework
- [x] Create simple test suite registry system
- [x] Implement unified result reporting

#### **🔄 Phase 2: Logic Consolidation**  
- [x] **Consolidate test execution logic** - Merge TestRunner.runAllTests() + UnifiedTestExecution.runSection()
- [x] **Consolidate test discovery** - Replace section-based mapping with direct suite access
- [x] **Consolidate environment setup** - Single initialisation method
- [x] **Consolidate validation logic** - Unified component checking
- [x] **Consolidate error handling** - Consistent error reporting across all operations

#### **🧹 Phase 3: Remove Redundancy**
- [x] **Eliminate TestExecution.js** - Replaced with direct TestFramework calls
- [x] **Remove section-based configuration** - Replaced TEST_SECTIONS with simple registry
- [x] **Remove wrapper functions** - Direct method invocation implemented
- [x] **Remove duplicate validation** - Single validation point implemented
- [x] **Remove multiple report formats** - Single comprehensive format implemented

#### **⚡ Phase 4: Enhanced Features**
- [x] **Add automatic resource tracking** - Self-managing cleanup system
- [x] **Add fluent test building** - Chainable test suite construction  
- [ ] **Add pattern-based test running** - Filter tests by name patterns
- [x] **Add better error context** - Enhanced stack traces and debugging info

---

### **📊 Implementation Status Summary**

#### **✅ COMPLETED:**
1. **Core Framework Creation (Phase 1)** - ✅ 100% Complete
   - Created unified `TestFramework.js` with all functionality consolidated
   - Implemented 3 main API methods: `runAllTests()`, `runTestSuite(name)`, `runSingleTest(suite, test)`
   - Merged all assertion utilities as static methods in TestFramework class
   - Replaced complex TEST_SECTIONS with simple test suite registry using Map
   - Implemented comprehensive unified reporting system

2. **Logic Consolidation (Phase 2)** - ✅ 100% Complete
   - Merged TestRunner + UnifiedTestExecution orchestration logic
   - Replaced section-based mapping with direct suite access
   - Unified environment initialisation into single method
   - Consolidated all validation logic into centralised component checking
   - Standardised error handling across all operations

3. **Remove Redundancy (Phase 3)** - ✅ 100% Complete
   - ✅ Automatic resource tracking with `trackResourceFile()` method
   - ✅ Fluent API with chainable test suite building
   - ❌ Pattern-based test running (not yet implemented)
   - ✅ Enhanced error context with better stack traces and debugging info

4. **Remove Redundancy (Phase 3)** - ✅ 100% Complete
   - ✅ Eliminated old test framework files (TestExecution.js, TestRunner.js, UnifiedTestExecution.js, AssertionUtilities.js)
   - ✅ Removed section-based configuration complexity
   - ✅ Removed wrapper functions and redundant layers
   - ✅ Consolidated all validation logic into single point
   - ✅ Unified reporting format implemented

#### **🚧 IN PROGRESS:**
- **Test Suite Migration** - ✅ **Section 1 Complete**, Section 2-4 pending

#### **⏳ REMAINING TASKS:**
1. **Test Suite Migration**
   - ✅ **Section 1 Tests COMPLETED:**
     - ✅ `EnvironmentTest.js` - Environment and project setup tests migrated and tested
     - ✅ `GASDBLoggerTest.js` - Logger functionality tests migrated and tested
     - ✅ `ErrorHandlerTest.js` - Error handling tests migrated and tested
     - ✅ `IdGeneratorTest.js` - ID generation tests migrated and tested
     - ✅ `TestFrameworkTest.js` - Framework self-tests migrated and tested
     - ✅ `UtilityTest.js` - Convenience wrapper for utility tests created and tested
     - ✅ Updated all assertion calls from `AssertionUtilities.assertEquals()` to `TestFramework.assertEquals()`
     - ✅ Replaced `new TestRunner()` pattern with new TestFramework API
     - ✅ Individual test functions use new `TestSuite` and `TestFramework.registerTestSuite()` pattern
   - ✅ **Section 2 Tests COMPLETED:**
     - ✅ `MasterIndexTest.js` - MasterIndex functionality, locking, conflicts migrated and tested
     - ✅ Updated all assertion calls from `AssertionUtilities.assertEquals()` to `TestFramework.assertEquals()`
     - ✅ Replaced `new TestRunner()` pattern with new TestFramework API
     - ✅ Individual test functions use new `TestSuite` and `TestFramework.registerTestSuite()` pattern
   
   - ⏳ **Section 3-4 Tests PENDING:**
     - [ ] `Section3Tests.js` → `FileOperationsTest.js`, `FileServiceTest.js`
     - [ ] `Section4Tests.js` → `DatabaseConfigTest.js`, `DatabaseTest.js`

2. **Final Testing and Validation (when migration complete)**
   - ✅ **Section 1:** All tests run identically with new framework (validated)
   - ✅ **Section 1:** Individual test debugging capability confirmed
   - ✅ **Section 1:** Framework functionality confirmed working
   - ✅ **Section 2:** All tests run identically with new framework (validated)
   - ✅ **Section 2:** Individual test debugging capability confirmed
   - ✅ **Section 2:** Framework functionality confirmed working
   - [ ] **Section 2-4:** Remaining sections to be validated after migration

---

### **✅ Success Criteria**

#### **Functional Requirements**
- 🔄 **Partially Complete:** All existing tests run identically with new framework
  - ✅ **Section 1:** All tests migrated and validated (Environment, Utilities, TestFramework)
  - ⏳ **Section 2-4:** Pending migration
- ✅ **Individual test debugging preserved** - Confirmed with Section 1 tests
- ✅ **Lifecycle hooks (beforeAll, afterAll, etc.) work unchanged** - TestSuite supports all hooks
- ✅ **Resource cleanup functions correctly** - Automatic tracking implemented
- ✅ **All assertion methods behave identically** - All TestFramework static methods work correctly

#### **Consolidation Requirements**  
- [x] **Single file framework** - Down from 4 files to 1
- [x] **3 main API methods** - Down from 10+ functions
- [x] **Simple configuration** - No complex section mapping
- [x] **Unified reporting** - Single comprehensive format
- [x] **No wrapper layers** - Direct method calls (Section 1 migrated, others pending)

#### **Enhancement Requirements**
- [x] **Automatic resource tracking** - No manual file ID management needed
- [x] **Better error messages** - More context and clearer stack traces
- [x] **Easier test writing** - Less boilerplate, more focused on test logic
- [x] **Simplified onboarding** - Clear API, single entry point

---

## 9. Implementation Status Summary

### **✅ COMPLETED PHASES:**

**Phase 1: Core Framework Creation** - ✅ 100% Complete
- Created unified `TestFramework.js` with all functionality consolidated
- Implemented 3 main API methods: `runAllTests()`, `runTestSuite(name)`, `runSingleTest(suite, test)`
- Merged all assertion utilities as static methods in TestFramework class
- Replaced complex TEST_SECTIONS with simple test suite registry using Map
- Implemented comprehensive unified reporting system

**Phase 2: Logic Consolidation** - ✅ 100% Complete
- Merged TestRunner + UnifiedTestExecution orchestration logic
- Replaced section-based mapping with direct suite access
- Unified environment initialisation into single method
- Consolidated all validation logic into centralised component checking
- Standardised error handling across all operations

**Phase 4: Enhanced Features** - ✅ 75% Complete
- ✅ Automatic resource tracking with `trackResourceFile()` method
- ✅ Fluent API with chainable test suite building
- ❌ Pattern-based test running (not yet implemented)
- ✅ Enhanced error context with better stack traces and debugging info

### **🚧 REMAINING PHASES:**

**Phase 3: Remove Redundancy** - ✅ 100% Complete
- Eliminated `TestExecution.js` wrapper functions
- Removed section-based configuration from `UnifiedTestExecution.js`
- Removed duplicate validation scattered across multiple files
- Created direct method calls instead of wrapper layers

### **📋 NEXT STEPS:**

## Test Suite Migration and Restructuring Plan

### **Phase 1: Test File Restructuring**

The current section-based test files should be split into class-focused test files that map directly to the codebase structure:

#### **Current Structure → New Structure Mapping:**

| **Current File** | **Current Content** | **New Test Files** | **Status** |
|------------------|-------------------|-------------------|------------|
| `Section1Tests.js` | Environment, Utilities, TestFramework tests | `EnvironmentTest.js`, `GASDBLoggerTest.js`, `ErrorHandlerTest.js`, `IdGeneratorTest.js`, `TestFrameworkTest.js`, `UtilityTest.js` (wrapper) | ✅ **COMPLETED** |
| `Section2Tests.js` | MasterIndex functionality, locking, conflicts | `MasterIndexTest.js` | ✅ **COMPLETED** |
| `Section3Tests.js` | FileOperations, FileService, file integration | `FileOperationsTest.js`, `FileServiceTest.js` | ⏳ Pending |
| `Section4Tests.js` | Database, DatabaseConfig, collections | `DatabaseConfigTest.js`, `DatabaseTest.js` | ⏳ Pending |
| New | Cross-component integration tests | `IntegrationTest.js` | ⏳ Pending |

#### **Detailed File Split Plan:**

**1. EnvironmentTest.js** ✅ **COMPLETED**
- **From:** `Section1Tests.js` → `runEnvironmentTests()`
- **Tests:** Basic project setup, clasp configuration, Drive API access, project dependencies
- **Focus:** Environment validation and project setup verification
- **Status:** ✅ Migrated to new TestFramework, tested and working

**2. GASDBLoggerTest.js** ✅ **COMPLETED**
- **From:** `Section1Tests.js` → `runUtilityClassTests()` (logger portion)
- **Tests:** Logger basic functionality, log levels, component loggers
- **Focus:** `src/utils/GASDBLogger.js` class testing
- **Status:** ✅ Migrated to new TestFramework, tested and working

**3. ErrorHandlerTest.js** ✅ **COMPLETED**
- **From:** `Section1Tests.js` → `runUtilityClassTests()` (error portion) 
- **Tests:** Error types, error creation, validation functions
- **Focus:** `src/utils/ErrorHandler.js` class testing
- **Status:** ✅ Migrated to new TestFramework, tested and working

**4. IdGeneratorTest.js** ✅ **COMPLETED**
- **From:** `Section1Tests.js` → `runUtilityClassTests()` (ID portion)
- **Tests:** UUID generation, timestamp IDs, custom generators, format validation
- **Focus:** `src/utils/IdGenerator.js` class testing
- **Status:** ✅ Migrated to new TestFramework, tested and working

**5. TestFrameworkTest.js** ✅ **COMPLETED**
- **From:** `Section1Tests.js` → `runTestFrameworkTests()`
- **Tests:** Assertion utilities, test suite functionality, framework itself
- **Focus:** `tests/framework/TestFramework.js` testing
- **Status:** ✅ Migrated to new TestFramework, tested and working

**6. UtilityTest.js** ✅ **COMPLETED**
- **New:** Convenience wrapper for all utility tests
- **Tests:** Aggregates GASDBLogger, ErrorHandler, and IdGenerator tests
- **Focus:** Batch utility testing while keeping individual files separate
- **Status:** ✅ Created as convenience wrapper, tested and working

**6. MasterIndexTest.js**
- **From:** `Section2Tests.js` → All functions
  - `testMasterIndexFunctionality()` - Core CRUD operations
  - `testVirtualLockingMechanism()` - Lock acquisition/release/timeout
  - `testConflictDetectionResolution()` - Modification tokens and conflicts
  - `testMasterIndexIntegration()` - Component integration
- **Focus:** `src/core/MasterIndex.js` class testing (comprehensive)

**7. FileOperationsTest.js**
- **From:** `Section3Tests.js` → FileOperations-specific functions
  - `testFileOperationsFunctionality()` - Direct Drive API interactions
  - `testFileOperationsErrorHandling()` - Retry logic and error handling
- **Focus:** `src/components/FileOperations.js` class testing

**8. FileServiceTest.js**
- **From:** `Section3Tests.js` → FileService-specific functions
  - `testFileServiceFunctionality()` - Optimised interface
  - `testFileServiceOptimisation()` - Batch operations and caching
  - `testFileServiceErrorRecovery()` - Error recovery mechanisms
- **Focus:** `src/services/FileService.js` class testing

**9. DatabaseConfigTest.js**
- **From:** `Section4Tests.js` → `testDatabaseConfigFunctionality()`
- **Tests:** Configuration creation, validation, default/custom values
- **Focus:** `src/core/DatabaseConfig.js` class testing

**10. DatabaseTest.js**
- **From:** `Section4Tests.js` → Database-specific functions
  - `testDatabaseInitialization()` - Database class creation and initialisation
  - `testCollectionManagement()` - Collection lifecycle operations
  - `testIndexFileStructure()` - Index file management
- **Focus:** `src/core/Database.js` class testing

**11. IntegrationTest.js**
- **From:** Multiple sources
  - `Section3Tests.js` → `testFileIntegration()`, `testDriveApiEdgeCases()`
  - `Section4Tests.js` → `testDatabaseMasterIndexIntegration()`
  - Setup/cleanup functions from `testSection3Setup()`, `testSection3Cleanup()`
- **Tests:** Cross-component integration, end-to-end workflows
- **Focus:** Integration between multiple classes and components

### **Phase 2: Syntax Migration (for each new file)**

1. **Update all test files to use `TestFramework.assertEquals()` instead of `AssertionUtilities.assertEquals()`**
2. **Replace `new TestRunner()` pattern with new framework global functions**
3. **Update `runSection*Tests()` functions to use new API (`runAllTests()`, `runTestSuite()`, etc.)**
4. **Update assertion calls across all test files**

### **Phase 3: Test Registration and Execution**

1. **Update test registration** to use new `TestFramework` class instead of old section-based system
2. **Create unified test runner** that can execute individual test files or all tests
3. **Maintain backwards compatibility** during transition period
4. **Update entry points** to work with new structure

2. Final testing and validation

---

### **🚀 Entry Point Migration from TestExecution.js**

Instead of migrating wrapper functions, **eliminate them entirely**:

```javascript
// BEFORE: Wrapper functions that just call other methods
function testSection1() { return UnifiedTestExecution.runSection(1); }
function testSection2() { return UnifiedTestExecution.runSection(2); }

// AFTER: Direct API usage  
TestFramework.runAllTests()
TestFramework.runTestSuite('EnvironmentTests')
```

#### **Consolidation Actions**
- [ ] **Remove all wrapper functions** - Replace with direct TestFramework calls
- [ ] **Update clasp entry points** - Point directly to TestFramework methods
- [ ] **Simplify test execution** - Single pattern for all test running

---

### **✅ Migration Validation**

#### **Functionality Verification**
- [ ] All existing tests run with identical results
- [ ] Individual test debugging works as before
- [ ] Lifecycle hooks execute properly
- [ ] Resource cleanup functions correctly
- [ ] Error handling behaves identically

#### **Consolidation Verification**

- [x] **Single framework file** created successfully
- [x] **API simplified** to 3 main methods
- [x] **Configuration streamlined** - No complex sections
- [x] **Redundant files removed** - Only TestFramework.js remains
- [x] **Wrapper layer eliminated** - Direct method calls work

#### **Enhancement Verification**
- [ ] **Automatic resource tracking** functional
- [ ] **Better error messages** implemented
- [ ] **Simplified test writing** achieved
- [ ] **Easier onboarding** confirmed

---

### **🧹 Cleanup**

- [x] Remove `tests/test-framework/AssertionUtilities.js`
- [x] Remove `tests/test-framework/TestRunner.js`
- [x] Remove `tests/test-framework/UnifiedTestExecution.js`
- [x] Remove `tests/test-framework/TestExecution.js`
- [ ] Update any imports/references to point to new `TestFramework.js` (test files still use old patterns)

---

## 9. Next Steps

- Review this consolidation-focused implementation plan
- Begin TDD implementation following the coding instructions
- Focus on **true consolidation** rather than simple method migration
- Validate that each phase achieves **genuine simplification**
- Execute systematic consolidation, validating improvements at each step
