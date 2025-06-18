/**
 * LockService Test Orchestrator
 * Coordinates all LockService-related tests with proper setup and teardown
 */

// Global test data storage for LockService tests
const LOCKSERVICE_TEST_DATA = {
  createdProperties: [],
  testMasterIndexKey: 'GASDB_TEST_LOCKSERVICE_MASTER_INDEX',
  originalMasterIndex: null
};

/**
 * Setup LockService test environment
 * Prepares the environment for LockService testing with proper isolation
 */
function setupLockServiceTestEnvironment() {
  const logger = GASDBLogger.createComponentLogger('LockService-Setup');
  
  try {
    // Store original master index if it exists
    const originalIndex = PropertiesService.getScriptProperties().getProperty('GASDB_MASTER_INDEX');
    if (originalIndex) {
      LOCKSERVICE_TEST_DATA.originalMasterIndex = originalIndex;
      logger.info('Stored original master index for restoration');
    }
    
    // Create test master index
    const testIndex = JSON.stringify({ 
      version: 1, 
      collections: {}, 
      locks: {},
      timestamp: new Date().toISOString()
    });
    
    PropertiesService.getScriptProperties().setProperty(
      LOCKSERVICE_TEST_DATA.testMasterIndexKey, 
      testIndex
    );
    LOCKSERVICE_TEST_DATA.createdProperties.push(LOCKSERVICE_TEST_DATA.testMasterIndexKey);
    
    // Set test master index as active for testing
    PropertiesService.getScriptProperties().setProperty('GASDB_MASTER_INDEX', testIndex);
    
    logger.info('LockService test environment setup completed', {
      testKey: LOCKSERVICE_TEST_DATA.testMasterIndexKey,
      hasOriginal: !!LOCKSERVICE_TEST_DATA.originalMasterIndex
    });
    
  } catch (error) {
    logger.error('Failed to setup LockService test environment', { error: error.message });
    throw new ErrorHandler.ErrorTypes.SETUP_ERROR('Failed to setup LockService test environment', error);
  }
}

/**
 * Clean up LockService test environment
 * Restores the environment to its original state after testing
 */
function cleanupLockServiceTestEnvironment() {
  const logger = GASDBLogger.createComponentLogger('LockService-Cleanup');
  
  try {
    // Clean up created properties
    LOCKSERVICE_TEST_DATA.createdProperties.forEach(key => {
      try {
        PropertiesService.getScriptProperties().deleteProperty(key);
        logger.debug('Deleted test property', { key });
      } catch (error) {
        logger.warn('Failed to delete property during cleanup', { key, error: error.message });
      }
    });
    
    // Restore original master index if it existed
    if (LOCKSERVICE_TEST_DATA.originalMasterIndex) {
      PropertiesService.getScriptProperties().setProperty('GASDB_MASTER_INDEX', LOCKSERVICE_TEST_DATA.originalMasterIndex);
      logger.info('Restored original master index');
    } else {
      // Remove test master index if no original existed
      try {
        PropertiesService.getScriptProperties().deleteProperty('GASDB_MASTER_INDEX');
        logger.info('Removed test master index (no original to restore)');
      } catch (error) {
        logger.warn('Failed to remove test master index', { error: error.message });
      }
    }
    
    // Clear test data
    LOCKSERVICE_TEST_DATA.createdProperties = [];
    LOCKSERVICE_TEST_DATA.originalMasterIndex = null;
    
    logger.info('LockService test cleanup completed');
    
  } catch (error) {
    logger.error('Failed to cleanup LockService test environment', { error: error.message });
    // Don't throw here as we don't want to mask test failures with cleanup failures
  }
}

/**
 * Creates and registers all LockService test suites
 * @returns {Array<TestSuite>} Array of all LockService test suites
 */
function createAllLockServiceTestSuites() {
  const suites = [];
  
  // Create all test suites in order
  suites.push(createLockServiceConstructorTestSuite());
  suites.push(createLockServiceOperationTestSuite());
  suites.push(createLockServiceCollectionOperationTestSuite());
  suites.push(createMasterIndexLockServiceIntegrationTestSuite());
  suites.push(createBackwardsCompatibilityTestSuite());
  suites.push(createRealEnvironmentIntegrationTestSuite());
  
  return suites;
}

/**
 * Registers all LockService test suites with the global test framework
 */
function registerAllLockServiceTestSuites() {
  const logger = GASDBLogger.createComponentLogger('LockService-Registration');
  
  try {
    const suites = createAllLockServiceTestSuites();
    
    suites.forEach(suite => {
      registerTestSuite(suite);
      logger.info('Registered LockService test suite', { suiteName: suite.name });
    });
    
    logger.info('All LockService test suites registered', { count: suites.length });
    
  } catch (error) {
    logger.error('Failed to register LockService test suites', { error: error.message });
    throw error;
  }
}

/**
 * Runs all LockService tests with proper environment management
 * @returns {TestResults} Results of all LockService tests
 */
function runAllLockServiceTests() {
  const logger = GASDBLogger.createComponentLogger('LockService-TestRunner');
  
  logger.info('Starting LockService test execution');
  
  try {
    // Setup test environment
    setupLockServiceTestEnvironment();
    
    // Register all test suites
    registerAllLockServiceTestSuites();
    
    // Run tests in specific order for TDD red phase
    const testOrder = [
      'LockService Constructor Tests',
      'LockService Operation Tests',
      'LockService Collection Operations',
      'MasterIndex LockService Integration',
      'Backwards Compatibility Tests',
      'LockService Real Environment Integration Tests'
    ];
    
    let allResults = new TestResults();
    
    testOrder.forEach(suiteName => {
      try {
        logger.info('Running test suite', { suiteName });
        const suiteResults = runTestSuite(suiteName);
        
        // Merge results
        suiteResults.results.forEach(result => allResults.addResult(result));
        
        logger.info('Completed test suite', { 
          suiteName, 
          passed: suiteResults.getPassed().length,
          failed: suiteResults.getFailed().length
        });
        
      } catch (error) {
        logger.error('Failed to run test suite', { suiteName, error: error.message });
        // Continue with other suites even if one fails
      }
    });
    
    allResults.finish();
    
    logger.info('LockService test execution completed', {
      totalTests: allResults.results.length,
      passed: allResults.getPassed().length,
      failed: allResults.getFailed().length,
      passRate: allResults.getPassRate()
    });
    
    return allResults;
    
  } catch (error) {
    logger.error('LockService test execution failed', { error: error.message });
    throw error;
    
  } finally {
    // Always cleanup, even if tests failed
    try {
      cleanupLockServiceTestEnvironment();
    } catch (cleanupError) {
      logger.error('Failed to cleanup after LockService tests', { error: cleanupError.message });
    }
  }
}

/**
 * Runs a specific LockService test suite with environment management
 * @param {string} suiteName - Name of the test suite to run
 * @returns {TestResults} Results of the specific test suite
 */
function runLockServiceTestSuite(suiteName) {
  const logger = GASDBLogger.createComponentLogger('LockService-SuiteRunner');
  
  try {
    setupLockServiceTestEnvironment();
    
    // Register the specific suite if not already registered
    const allSuites = createAllLockServiceTestSuites();
    const targetSuite = allSuites.find(suite => suite.name === suiteName);
    
    if (!targetSuite) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('suiteName', suiteName, `LockService test suite '${suiteName}' not found`);
    }
    
    registerTestSuite(targetSuite);
    
    const results = runTestSuite(suiteName);
    
    logger.info('LockService test suite completed', { 
      suiteName,
      passed: results.getPassed().length,
      failed: results.getFailed().length
    });
    
    return results;
    
  } finally {
    cleanupLockServiceTestEnvironment();
  }
}
