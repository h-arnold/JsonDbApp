/**
 * Test Entry Points for Google Apps Script clasp run execution
 * Provides main functions that can be called via clasp run to execute tests
 */

/**
 * Entry point for running LockService tests
 * Called via: clasp run testLockService
 */
function testLockService() {
  const logger = GASDBLogger.createComponentLogger('TestEntry-LockService');
  
  try {
    logger.info('Starting LockService test execution via clasp run');
    
    // Run all LockService tests
    const results = runAllLockServiceTests();
    
    // Log comprehensive results
    results.logComprehensiveResults();
    
    // Return summary for clasp run output
    const summary = results.getSummary();
    logger.info('LockService test execution completed', {
      summary: summary,
      passRate: results.getPassRate(),
      totalTime: results.getTotalExecutionTime()
    });
    
    return summary;
    
  } catch (error) {
    logger.error('LockService test execution failed', { error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Entry point for running individual LockService test suites
 * Called via: clasp run testLockServiceConstructor, testLockServiceOperations, etc.
 */
function testLockServiceConstructor() {
  return runLockServiceTestSuite('LockService Constructor Tests');
}

function testLockServiceOperations() {
  return runLockServiceTestSuite('LockService Operation Tests');
}

function testLockServiceIntegration() {
  return runLockServiceTestSuite('MasterIndex Integration Tests');
}

function testLockServiceCompatibility() {
  return runLockServiceTestSuite('Backwards Compatibility Tests');
}

/**
 * Entry point for running all tests (including existing and new LockService tests)
 * Called via: clasp run testAll
 */
function testAll() {
  const logger = GASDBLogger.createComponentLogger('TestEntry-All');
  
  try {
    logger.info('Starting complete test suite execution');
    
    // Run all tests using the global test framework
    const results = runAllTests();
    
    // Log comprehensive results
    results.logComprehensiveResults();
    
    const summary = results.getSummary();
    logger.info('Complete test execution completed', {
      summary: summary,
      passRate: results.getPassRate(),
      totalTime: results.getTotalExecutionTime()
    });
    
    return summary;
    
  } catch (error) {
    logger.error('Complete test execution failed', { error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Entry point for validating test environment setup
 * Called via: clasp run validateTestEnvironment
 */
function validateTestEnvironment() {
  const logger = GASDBLogger.createComponentLogger('TestEntry-Validation');
  
  try {
    logger.info('Validating test environment setup');
    
    // Validate basic framework components exist
    if (typeof TestFramework === 'undefined') {
      throw new Error('TestFramework is not available');
    }
    
    if (typeof TestSuite === 'undefined') {
      throw new Error('TestSuite is not available');
    }
    
    if (typeof GASDBLogger === 'undefined') {
      throw new Error('GASDBLogger is not available');
    }
    
    if (typeof ErrorHandler === 'undefined') {
      throw new Error('ErrorHandler is not available');
    }
    
    // Test basic Google Apps Script services
    const testKey = 'GASDB_TEST_VALIDATION_' + new Date().getTime();
    PropertiesService.getScriptProperties().setProperty(testKey, 'test-value');
    const retrievedValue = PropertiesService.getScriptProperties().getProperty(testKey);
    PropertiesService.getScriptProperties().deleteProperty(testKey);
    
    if (retrievedValue !== 'test-value') {
      throw new Error('PropertiesService is not working correctly');
    }
    
    // Test LockService availability (Google Apps Script built-in)
    const lock = LockService.getScriptLock();
    if (!lock) {
      throw new Error('LockService is not available');
    }
    
    logger.info('Test environment validation completed successfully');
    return 'Test environment validation passed';
    
  } catch (error) {
    logger.error('Test environment validation failed', { error: error.message });
    throw error;
  }
}
