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
GAS DB Test Functions - Section 1:

Main Functions:
- testSection1(): Run all Section 1 tests
- validateSection1Setup(): Quick validation of all components
- initializeTestEnvironment(): Initialize and verify test environment

Specific Test Suites:
- testSection1Suite("Environment Tests"): Test environment setup
- testSection1Suite("Utility Class Tests"): Test utility classes
- testSection1Suite("Test Framework Tests"): Test testing framework

Utility Functions:
- showTestHelp(): Display this help information

Usage:
1. Run initializeTestEnvironment() first
2. Run validateSection1Setup() for quick check
3. Run testSection1() for comprehensive testing
4. Use specific suite functions for targeted testing
  `;
  
  GASDBLogger.info(helpText);
  return helpText;
}
