/**
 * Main test execution entry point for Google Apps Script
 * 
 * This file provides the main functions that can be called from the Google Apps Script
 * editor to run tests. It serves as the entry point for test execution.
 */

/**
 * Run all Section 1 tests
 * This function can be called from the Google Apps Script editor
 */
function testSection1() {
  try {
    GASDBLogger.info('='.repeat(50));
    GASDBLogger.info('Starting Section 1 Test Execution');
    GASDBLogger.info('='.repeat(50));
    
    const results = runSection1Tests();
    
    GASDBLogger.info('='.repeat(50));
    GASDBLogger.info('Section 1 Test Execution Complete');
    GASDBLogger.info('='.repeat(50));
    
    // Return results for programmatic access
    return {
      success: results.getFailed().length === 0,
      summary: results.getSummary(),
      details: results.getDetailedReport(),
      passRate: results.getPassRate(),
      totalTests: results.results.length,
      passedTests: results.getPassed().length,
      failedTests: results.getFailed().length
    };
    
  } catch (error) {
    GASDBLogger.error('Failed to execute Section 1 tests', { error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Run specific test suite from Section 1
 * @param {string} suiteName - Name of the test suite to run
 */
function testSection1Suite(suiteName) {
  try {
    GASDBLogger.info(`Running specific test suite: ${suiteName}`);
    
    const testRunner = new TestRunner();
    
    switch (suiteName) {
      case 'Environment Tests':
        testRunner.addTestSuite(runEnvironmentTests());
        break;
      case 'Utility Class Tests':
        testRunner.addTestSuite(runUtilityClassTests());
        break;
      case 'Test Framework Tests':
        testRunner.addTestSuite(runTestFrameworkTests());
        break;
      default:
        throw new Error(`Unknown test suite: ${suiteName}`);
    }
    
    const results = testRunner.runAllTests();
    
    return {
      success: results.getFailed().length === 0,
      summary: results.getSummary(),
      details: results.getDetailedReport()
    };
    
  } catch (error) {
    GASDBLogger.error(`Failed to execute test suite ${suiteName}`, { error: error.message });
    throw error;
  }
}

/**
 * Quick validation function to check if all basic components are working
 * This can be used as a smoke test
 */
function validateSection1Setup() {
  try {
    GASDBLogger.info('Running Section 1 setup validation...');
    
    const validations = [];
    
    // Check GASDBLogger
    try {
      GASDBLogger.info('Testing GASDBLogger functionality');
      validations.push({ component: 'GASDBLogger', status: 'PASS', message: 'GASDBLogger working correctly' });
    } catch (error) {
      validations.push({ component: 'GASDBLogger', status: 'FAIL', message: error.message });
    }
    
    // Check ErrorHandler
    try {
      ErrorHandler.validateRequired('test', 'testParam');
      const error = ErrorHandler.createError('DOCUMENT_NOT_FOUND', { id: 'test' });
      validations.push({ component: 'ErrorHandler', status: 'PASS', message: 'ErrorHandler working correctly' });
    } catch (error) {
      validations.push({ component: 'ErrorHandler', status: 'FAIL', message: error.message });
    }
    
    // Check IdGenerator
    try {
      const id1 = IdGenerator.generateUUID();
      const id2 = IdGenerator.generateTimestampId();
      if (id1 && id2 && id1 !== id2) {
        validations.push({ component: 'IdGenerator', status: 'PASS', message: 'IdGenerator working correctly' });
      } else {
        validations.push({ component: 'IdGenerator', status: 'FAIL', message: 'ID generation failed' });
      }
    } catch (error) {
      validations.push({ component: 'IdGenerator', status: 'FAIL', message: error.message });
    }
    
    // Check TestRunner
    try {
      const testRunner = new TestRunner();
      const testSuite = new TestSuite('ValidationSuite');
      testSuite.addTest('dummyTest', () => AssertionUtilities.assertTrue(true));
      testRunner.addTestSuite(testSuite);
      const results = testRunner.runAllTests();
      
      if (results.getPassed().length === 1) {
        validations.push({ component: 'TestRunner', status: 'PASS', message: 'TestRunner working correctly' });
      } else {
        validations.push({ component: 'TestRunner', status: 'FAIL', message: 'Test execution failed' });
      }
    } catch (error) {
      validations.push({ component: 'TestRunner', status: 'FAIL', message: error.message });
    }
    
    // Check Drive API access
    try {
      DriveApp.getRootFolder();
      validations.push({ component: 'Drive API', status: 'PASS', message: 'Drive API access working' });
    } catch (error) {
      validations.push({ component: 'Drive API', status: 'FAIL', message: error.message });
    }
    
    // Log results
    GASDBLogger.info('Validation Results:');
    validations.forEach(validation => {
      GASDBLogger.info(`${validation.component}: ${validation.status} - ${validation.message}`);
    });
    
    const allPassed = validations.every(v => v.status === 'PASS');
    const summary = `${validations.filter(v => v.status === 'PASS').length}/${validations.length} components validated successfully`;
    
    GASDBLogger.info(`Overall validation: ${allPassed ? 'PASS' : 'FAIL'} - ${summary}`);
    
    return {
      success: allPassed,
      summary: summary,
      validations: validations
    };
    
  } catch (error) {
    GASDBLogger.error('Validation failed', { error: error.message });
    throw error;
  }
}

/**
 * Initialize and test the basic environment
 * This function should be run first to ensure everything is set up correctly
 */
function initializeTestEnvironment() {
  try {
    GASDBLogger.info('Initializing test environment for GAS DB');
    GASDBLogger.info(`Logger level: ${GASDBLogger.getLevelName()}`);
    GASDBLogger.info(`Test runner available: ${typeof GlobalTestRunner !== 'undefined'}`);
    
    // Set appropriate log level for testing
    GASDBLogger.setLevel(GASDBLogger.LOG_LEVELS.INFO);
    
    GASDBLogger.info('Test environment initialized successfully');
    return true;
    
  } catch (error) {
    console.error('Failed to initialize test environment:', error.message);
    throw error;
  }
}

/**
 * Display help information about available test functions
 */
function showTestHelp() {
  const helpText = `
GAS DB Test Functions:

=== SECTION 1 FUNCTIONS ===
Main Functions:
- testSection1(): Run all Section 1 tests
- validateSection1Setup(): Quick validation of all components
- initializeTestEnvironment(): Initialize and verify test environment

Specific Test Suites:
- testSection1Suite("Environment Tests"): Test environment setup
- testSection1Suite("Utility Class Tests"): Test utility classes
- testSection1Suite("Test Framework Tests"): Test testing framework

=== SECTION 2 FUNCTIONS ===
Main Functions:
- testSection2(): Run all Section 2 tests (ScriptProperties Master Index)
- validateSection2Setup(): Quick validation of Section 2 components

Specific Test Suites:
- testSection2Suite("MasterIndex Functionality"): Test master index core features
- testSection2Suite("Virtual Locking Mechanism"): Test virtual locking system
- testSection2Suite("Conflict Detection and Resolution"): Test conflict handling
- testSection2Suite("MasterIndex Integration"): Test component integration

=== SECTION 3 FUNCTIONS ===
Main Functions:
- testSection3(): Run all Section 3 tests (File Service and Drive Integration)
- validateSection3Setup(): Quick validation of Section 3 components

Specific Test Suites:
- testSection3Suite("FileOperations Functionality"): Test file operations
- testSection3Suite("FileOperations Error Handling"): Test file operations error handling
- testSection3Suite("FileService Functionality"): Test file service functionality
- testSection3Suite("FileService Optimisation"): Test file service optimisation
- testSection3Suite("FileService Error Recovery"): Test file service error recovery
- testSection3Suite("File Integration"): Test file integration
- testSection3Suite("Drive API Edge Cases"): Test Drive API edge cases

=== UTILITY FUNCTIONS ===
- showTestHelp(): Display this help information

=== USAGE ===
1. Run initializeTestEnvironment() first
2. Run validateSection1Setup(), validateSection2Setup(), and validateSection3Setup() for quick checks
3. Run testSection1(), testSection2(), and testSection3() for comprehensive testing
4. Use specific suite functions for targeted testing

Note: Section 2 and 3 tests are designed to FAIL initially (TDD Red phase)
  `;
  
  GASDBLogger.info(helpText);
  return helpText;
}

/**
 * Run all Section 2 tests
 * This function can be called from the Google Apps Script editor
 */
function testSection2() {
  try {
    GASDBLogger.info('='.repeat(50));
    GASDBLogger.info('Starting Section 2 Test Execution');
    GASDBLogger.info('='.repeat(50));
    
    const results = runSection2Tests();
    
    GASDBLogger.info('='.repeat(50));
    GASDBLogger.info('Section 2 Test Execution Complete');
    GASDBLogger.info('='.repeat(50));
    
    // Return results for programmatic access
    return {
      success: results.getFailed().length === 0,
      summary: results.getSummary(),
      details: results.getDetailedReport(),
      passRate: results.getPassRate(),
      totalTests: results.results.length,
      passedTests: results.getPassed().length,
      failedTests: results.getFailed().length
    };
    
  } catch (error) {
    GASDBLogger.error('Failed to execute Section 2 tests', { error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Run specific test suite from Section 2
 * @param {string} suiteName - Name of the test suite to run
 */
function testSection2Suite(suiteName) {
  try {
    GASDBLogger.info(`Running specific test suite: ${suiteName}`);
    
    const testRunner = new TestRunner();
    
    switch (suiteName) {
      case 'MasterIndex Functionality':
        testRunner.addTestSuite(testMasterIndexFunctionality());
        break;
      case 'Virtual Locking Mechanism':
        testRunner.addTestSuite(testVirtualLockingMechanism());
        break;
      case 'Conflict Detection and Resolution':
        testRunner.addTestSuite(testConflictDetectionResolution());
        break;
      case 'MasterIndex Integration':
        testRunner.addTestSuite(testMasterIndexIntegration());
        break;
      default:
        throw new Error(`Unknown test suite: ${suiteName}`);
    }
    
    const results = testRunner.runAllTests();
    
    return {
      success: results.getFailed().length === 0,
      summary: results.getSummary(),
      details: results.getDetailedReport()
    };
    
  } catch (error) {
    GASDBLogger.error(`Failed to execute test suite ${suiteName}`, { error: error.message });
    throw error;
  }
}

/**
 * Quick validation function to check if Section 2 components are working
 * This can be used as a smoke test for Section 2
 */
function validateSection2Setup() {
  try {
    GASDBLogger.info('Running Section 2 setup validation...');
    
    const validations = [];
    
    // Check MasterIndex class exists
    try {
      const masterIndex = new MasterIndex();
      validations.push({ component: 'MasterIndex Class', status: 'FAIL', message: 'Class exists but methods not implemented (expected for TDD)' });
    } catch (error) {
      if (error.message.includes('not implemented')) {
        validations.push({ component: 'MasterIndex Class', status: 'PASS', message: 'Class exists with placeholder methods (TDD Red phase)' });
      } else {
        validations.push({ component: 'MasterIndex Class', status: 'FAIL', message: error.message });
      }
    }
    
    // Check Section 2 test functions exist
    try {
      if (typeof testMasterIndexFunctionality === 'function' &&
          typeof testVirtualLockingMechanism === 'function' &&
          typeof testConflictDetectionResolution === 'function' &&
          typeof testMasterIndexIntegration === 'function') {
        validations.push({ component: 'Section 2 Test Functions', status: 'PASS', message: 'All test functions available' });
      } else {
        validations.push({ component: 'Section 2 Test Functions', status: 'FAIL', message: 'Some test functions missing' });
      }
    } catch (error) {
      validations.push({ component: 'Section 2 Test Functions', status: 'FAIL', message: error.message });
    }
    
    // Check ScriptProperties access
    try {
      PropertiesService.getScriptProperties().getProperty('test');
      validations.push({ component: 'ScriptProperties Access', status: 'PASS', message: 'ScriptProperties API accessible' });
    } catch (error) {
      validations.push({ component: 'ScriptProperties Access', status: 'FAIL', message: error.message });
    }
    
    // Log results
    GASDBLogger.info('Section 2 Validation Results:');
    validations.forEach(validation => {
      GASDBLogger.info(`${validation.component}: ${validation.status} - ${validation.message}`);
    });
    
    const allPassed = validations.every(v => v.status === 'PASS');
    const summary = `${validations.filter(v => v.status === 'PASS').length}/${validations.length} components validated successfully`;
    
    GASDBLogger.info(`Overall Section 2 validation: ${allPassed ? 'PASS' : 'PARTIAL'} - ${summary}`);
    
    return {
      success: allPassed,
      summary: summary,
      validations: validations
    };
    
  } catch (error) {
    GASDBLogger.error('Section 2 validation failed', { error: error.message });
    throw error;
  }
}

/**
 * Run all Section 3 tests
 * This function can be called from the Google Apps Script editor
 */
function testSection3() {
  try {
    GASDBLogger.info('='.repeat(50));
    GASDBLogger.info('Starting Section 3 Test Execution');
    GASDBLogger.info('='.repeat(50));
    
    const results = runSection3Tests();
    
    GASDBLogger.info('='.repeat(50));
    GASDBLogger.info('Section 3 Test Execution Complete');
    GASDBLogger.info('='.repeat(50));
    
    // Return results for programmatic access
    return {
      success: results.getFailed().length === 0,
      summary: results.getSummary(),
      details: results.getDetailedReport(),
      passRate: results.getPassRate(),
      totalTests: results.results.length,
      passedTests: results.getPassed().length,
      failedTests: results.getFailed().length
    };
    
  } catch (error) {
    GASDBLogger.error('Failed to execute Section 3 tests', { error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Run specific test suite from Section 3
 * @param {string} suiteName - Name of the test suite to run
 */
function testSection3Suite(suiteName) {
  try {
    GASDBLogger.info(`Running specific test suite: ${suiteName}`);
    
    const testRunner = new TestRunner();
    
    switch (suiteName) {
      case 'FileOperations Functionality':
        testRunner.addTestSuite(testFileOperationsFunctionality());
        break;
      case 'FileOperations Error Handling':
        testRunner.addTestSuite(testFileOperationsErrorHandling());
        break;
      case 'FileService Functionality':
        testRunner.addTestSuite(testFileServiceFunctionality());
        break;
      case 'FileService Optimisation':
        testRunner.addTestSuite(testFileServiceOptimisation());
        break;
      case 'FileService Error Recovery':
        testRunner.addTestSuite(testFileServiceErrorRecovery());
        break;
      case 'File Integration':
        testRunner.addTestSuite(testFileIntegration());
        break;
      case 'Drive API Edge Cases':
        testRunner.addTestSuite(testDriveApiEdgeCases());
        break;
      default:
        throw new Error(`Unknown test suite: ${suiteName}`);
    }
    
    const results = testRunner.runAllTests();
    
    return {
      success: results.getFailed().length === 0,
      summary: results.getSummary(),
      details: results.getDetailedReport()
    };
    
  } catch (error) {
    GASDBLogger.error(`Failed to execute test suite ${suiteName}`, { error: error.message });
    throw error;
  }
}

/**
 * Quick validation function to check if Section 3 components are working
 * This can be used as a smoke test for Section 3
 */
function validateSection3Setup() {
  try {
    GASDBLogger.info('Running Section 3 setup validation...');
    
    const validations = [];
    
    // Check FileOperations class exists
    try {
      const fileOps = new FileOperations(new GASDBLogger('Test', 'INFO'));
      validations.push({ component: 'FileOperations Class', status: 'FAIL', message: 'Class exists but methods not implemented (expected for TDD)' });
    } catch (error) {
      if (error.message.includes('not implemented') || error.message.includes('FileOperations is not defined')) {
        validations.push({ component: 'FileOperations Class', status: 'PASS', message: 'Class not yet implemented (TDD Red phase)' });
      } else {
        validations.push({ component: 'FileOperations Class', status: 'FAIL', message: error.message });
      }
    }
    
    // Check FileService class exists
    try {
      const fileService = new FileService(null, new GASDBLogger('Test', 'INFO'));
      validations.push({ component: 'FileService Class', status: 'FAIL', message: 'Class exists but methods not implemented (expected for TDD)' });
    } catch (error) {
      if (error.message.includes('not implemented') || error.message.includes('FileService is not defined')) {
        validations.push({ component: 'FileService Class', status: 'PASS', message: 'Class not yet implemented (TDD Red phase)' });
      } else {
        validations.push({ component: 'FileService Class', status: 'FAIL', message: error.message });
      }
    }
    
    // Check Section 3 test functions exist
    try {
      if (typeof testFileOperationsFunctionality === 'function' &&
          typeof testFileOperationsErrorHandling === 'function' &&
          typeof testFileServiceFunctionality === 'function' &&
          typeof testFileServiceOptimisation === 'function' &&
          typeof testFileServiceErrorRecovery === 'function' &&
          typeof testFileIntegration === 'function' &&
          typeof testDriveApiEdgeCases === 'function') {
        validations.push({ component: 'Section 3 Test Functions', status: 'PASS', message: 'All test functions available' });
      } else {
        validations.push({ component: 'Section 3 Test Functions', status: 'FAIL', message: 'Some test functions missing' });
      }
    } catch (error) {
      validations.push({ component: 'Section 3 Test Functions', status: 'FAIL', message: error.message });
    }
    
    // Check Drive API access
    try {
      DriveApp.getRootFolder();
      validations.push({ component: 'Drive API Access', status: 'PASS', message: 'Drive API accessible for file operations' });
    } catch (error) {
      validations.push({ component: 'Drive API Access', status: 'FAIL', message: error.message });
    }
    
    // Log results
    GASDBLogger.info('Section 3 Validation Results:');
    validations.forEach(validation => {
      GASDBLogger.info(`${validation.component}: ${validation.status} - ${validation.message}`);
    });
    
    const allPassed = validations.every(v => v.status === 'PASS');
    const summary = `${validations.filter(v => v.status === 'PASS').length}/${validations.length} components validated successfully`;
    
    GASDBLogger.info(`Overall Section 3 validation: ${allPassed ? 'PASS' : 'PARTIAL'} - ${summary}`);
    
    return {
      success: allPassed,
      summary: summary,
      validations: validations
    };
    
  } catch (error) {
    GASDBLogger.error('Section 3 validation failed', { error: error.message });
    throw error;
  }
}

/**
 * Run all Section 3 tests - wrapper function for the actual test runner
 * This function consolidates all Section 3 test suites into a single execution
 */
function runSection3Tests() {
  try {
    const testRunner = new TestRunner();
    
    // Add all Section 3 test suites
    testRunner.addTestSuite(testFileOperationsFunctionality());
    testRunner.addTestSuite(testFileOperationsErrorHandling());
    testRunner.addTestSuite(testFileServiceFunctionality());
    testRunner.addTestSuite(testFileServiceOptimisation());
    testRunner.addTestSuite(testFileServiceErrorRecovery());
    testRunner.addTestSuite(testFileIntegration());
    testRunner.addTestSuite(testDriveApiEdgeCases());
    
    // Run all tests
    const results = testRunner.runAllTests();
    
    GASDBLogger.info(`Section 3 Tests Complete: ${results.getSummary()}`);
    
    return results;
    
  } catch (error) {
    GASDBLogger.error('Failed to run Section 3 tests', { error: error.message });
    throw error;
  }
}
