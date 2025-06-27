/**
 * 99_ValidationTestsOrchestrator.js - Orchestrates all validation tests
 * 
 * Provides comprehensive test execution for query and update operator validation
 * using full database functionality with proper setup and teardown.
 */

/**
 * Global validation test registry to track all test suites
 */
const VALIDATION_TEST_REGISTRY = {
  testSuites: new Map(),
  framework: null,
  isInitialised: false
};

/**
 * Initialise the validation test framework and register all test suites
 */
function initialiseValidationTests() {
  if (VALIDATION_TEST_REGISTRY.isInitialised) {
    return VALIDATION_TEST_REGISTRY.framework;
  }

  const logger = JDbLogger.createComponentLogger('ValidationTests-Init');
  logger.info('Initialising validation test framework...');

  try {
    // Create test framework instance
    VALIDATION_TEST_REGISTRY.framework = new TestFramework();

    // Register comparison operator test suites
    registerComparisonOperatorTestSuites();

    // TODO: Register additional test suites as they are created
    // registerLogicalOperatorTestSuites();
    // registerFieldExistenceTestSuites();
    // registerArrayOperatorTestSuites();
    // registerUpdateOperatorTestSuites();

    VALIDATION_TEST_REGISTRY.isInitialised = true;
    logger.info('Validation test framework initialised successfully', {
      registeredSuites: VALIDATION_TEST_REGISTRY.testSuites.size
    });

    return VALIDATION_TEST_REGISTRY.framework;

  } catch (error) {
    logger.error('Failed to initialise validation test framework', { error: error.message });
    throw new Error(`Validation test initialisation failed: ${error.message}`);
  }
}

/**
 * Register comparison operator test suites ($eq, $gt, $lt)
 */
function registerComparisonOperatorTestSuites() {
  const logger = JDbLogger.createComponentLogger('ValidationTests-ComparisonOps');

  try {
    // Register $eq operator tests
    const eqSuite = createEqualityOperatorTestSuite();
    VALIDATION_TEST_REGISTRY.framework.registerTestSuite(eqSuite);
    VALIDATION_TEST_REGISTRY.testSuites.set('$eq Equality Operator Tests', eqSuite);

    // Register $gt operator tests
    const gtSuite = createGreaterThanOperatorTestSuite();
    VALIDATION_TEST_REGISTRY.framework.registerTestSuite(gtSuite);
    VALIDATION_TEST_REGISTRY.testSuites.set('$gt Greater Than Operator Tests', gtSuite);

    // Register $lt operator tests
    const ltSuite = createLessThanOperatorTestSuite();
    VALIDATION_TEST_REGISTRY.framework.registerTestSuite(ltSuite);
    VALIDATION_TEST_REGISTRY.testSuites.set('$lt Less Than Operator Tests', ltSuite);

    logger.info('Comparison operator test suites registered successfully');

  } catch (error) {
    logger.error('Failed to register comparison operator test suites', { error: error.message });
    throw error;
  }
}

/**
 * Set up validation test environment with proper database and collections
 */
function setupValidationTestEnvironmentForTests() {
  const logger = JDbLogger.createComponentLogger('ValidationTests-Setup');
  logger.info('Setting up validation test environment...');

  try {
    // Set up the test environment with Drive files and collections
    setupValidationTestEnvironment(); // From ValidationTestEnvironment.js

    // Create Database instance and collections for testing
    const databaseConfig = new DatabaseConfig({
      name: 'ValidationTestDatabase',
      folderId: VALIDATION_TEST_ENV.testFolderId,
      masterIndexId: VALIDATION_TEST_ENV.masterIndexId
    });

    // Create FileService instance
    const fileOps = new FileOperations(logger);
    const fileService = new FileService(fileOps, logger);

    // Create MasterIndex instance
    const masterIndex = new MasterIndex();
    
    // Create Database instance
    const database = new Database(databaseConfig, fileService, masterIndex);

    // Create Collection instances for each test dataset
    VALIDATION_TEST_ENV.collections = {};
    
    // Create persons collection
    if (VALIDATION_TEST_ENV.collectionFileIds && VALIDATION_TEST_ENV.collectionFileIds.persons) {
      VALIDATION_TEST_ENV.collections.persons = new Collection(
        'persons',
        VALIDATION_TEST_ENV.collectionFileIds.persons,
        database,
        fileService
      );
    }

    // Create orders collection
    if (VALIDATION_TEST_ENV.collectionFileIds && VALIDATION_TEST_ENV.collectionFileIds.orders) {
      VALIDATION_TEST_ENV.collections.orders = new Collection(
        'orders',
        VALIDATION_TEST_ENV.collectionFileIds.orders,
        database,
        fileService
      );
    }

    // Create inventory collection
    if (VALIDATION_TEST_ENV.collectionFileIds && VALIDATION_TEST_ENV.collectionFileIds.inventory) {
      VALIDATION_TEST_ENV.collections.inventory = new Collection(
        'inventory',
        VALIDATION_TEST_ENV.collectionFileIds.inventory,
        database,
        fileService
      );
    }

    logger.info('Validation test environment setup completed successfully', {
      collectionsCreated: Object.keys(VALIDATION_TEST_ENV.collections).length,
      folderId: VALIDATION_TEST_ENV.testFolderId
    });

  } catch (error) {
    logger.error('Failed to setup validation test environment', { error: error.message });
    throw new Error(`Validation environment setup failed: ${error.message}`);
  }
}

/**
 * Clean up validation test environment
 */
function cleanupValidationTestEnvironment() {
  const logger = JDbLogger.createComponentLogger('ValidationTests-Cleanup');
  logger.info('Cleaning up validation test environment...');

  try {
    // Clean up collections
    if (VALIDATION_TEST_ENV.collections) {
      Object.keys(VALIDATION_TEST_ENV.collections).forEach(collectionName => {
        try {
          // Collections will be cleaned up when the folder is deleted
          delete VALIDATION_TEST_ENV.collections[collectionName];
        } catch (error) {
          logger.warn(`Failed to cleanup collection ${collectionName}`, { error: error.message });
        }
      });
      delete VALIDATION_TEST_ENV.collections;
    }

    // Clean up test environment (from ValidationTestEnvironment.js)
    cleanupValidationTestEnvironmentEnv();
    
    // Reset test registry
    VALIDATION_TEST_REGISTRY.testSuites.clear();
    VALIDATION_TEST_REGISTRY.framework = null;
    VALIDATION_TEST_REGISTRY.isInitialised = false;

    logger.info('Validation test environment cleanup completed');

  } catch (error) {
    logger.error('Failed to cleanup validation test environment', { error: error.message });
    // Don't throw here - we want cleanup to be as thorough as possible
  }
}

/**
 * Run all validation tests with proper setup and teardown
 * @returns {TestResults} Comprehensive test results
 */
function runAllValidationTests() {
  const logger = JDbLogger.createComponentLogger('ValidationTests-Runner');
  logger.info('Starting comprehensive validation test execution...');

  let results = null;

  try {
    // Setup test environment
    setupValidationTestEnvironmentForTests();
    
    // Initialise test framework
    const framework = initialiseValidationTests();
    
    // Validate environment before running tests
    framework.validateEnvironment();
    
    // Run all registered test suites
    results = framework.runAllTests();
    
    // Log summary results
    const summary = {
      totalTests: results.results.length,
      passed: results.getPassed().length,
      failed: results.getFailed().length,
      executionTime: results.getTotalExecutionTime()
    };
    
    logger.info('Validation test execution completed', summary);
    
    // Log detailed results if there are failures
    if (results.getFailed().length > 0) {
      logger.warn('Some validation tests failed:', {
        failedTests: results.getFailed().length,
        failures: results.getFailed().map(result => ({
          suite: result.suiteName,
          test: result.testName,
          error: result.error ? result.error.message : 'Unknown error'
        }))
      });
    }

    return results;

  } catch (error) {
    logger.error('Validation test execution failed', { error: error.message });
    throw error;

  } finally {
    // Always cleanup, even if tests failed
    try {
      cleanupValidationTestEnvironment();
    } catch (cleanupError) {
      logger.error('Cleanup failed after test execution', { error: cleanupError.message });
    }
  }
}

/**
 * Run specific validation test suite by name
 * @param {string} suiteName - Name of the test suite to run
 * @returns {TestResults} Test results for the specific suite
 */
function runValidationTestSuite(suiteName) {
  const logger = JDbLogger.createComponentLogger('ValidationTests-Suite');
  logger.info(`Running validation test suite: ${suiteName}`);

  let results = null;

  try {
    // Setup test environment
    setupValidationTestEnvironmentForTests();
    
    // Initialise test framework
    const framework = initialiseValidationTests();
    
    // Validate the specific suite exists
    if (!VALIDATION_TEST_REGISTRY.testSuites.has(suiteName)) {
      throw new Error(`Test suite '${suiteName}' not found. Available suites: ${Array.from(VALIDATION_TEST_REGISTRY.testSuites.keys()).join(', ')}`);
    }
    
    // Run the specific test suite
    results = framework.runTestSuite(suiteName);
    
    logger.info(`Test suite '${suiteName}' completed`, {
      totalTests: results.results.length,
      passed: results.getPassed().length,
      failed: results.getFailed().length,
      executionTime: results.getTotalExecutionTime()
    });

    return results;

  } catch (error) {
    logger.error(`Failed to run test suite '${suiteName}'`, { error: error.message });
    throw error;

  } finally {
    // Always cleanup
    try {
      cleanupValidationTestEnvironment();
    } catch (cleanupError) {
      logger.error('Cleanup failed after suite execution', { error: cleanupError.message });
    }
  }
}

/**
 * Run specific validation test within a suite
 * @param {string} suiteName - Name of the test suite
 * @param {string} testName - Name of the specific test
 * @returns {TestResults} Test results for the specific test
 */
function runValidationTest(suiteName, testName) {
  const logger = JDbLogger.createComponentLogger('ValidationTests-Single');
  logger.info(`Running validation test: ${testName} in suite: ${suiteName}`);

  let results = null;

  try {
    // Setup test environment
    setupValidationTestEnvironmentForTests();
    
    // Initialise test framework
    const framework = initialiseValidationTests();
    
    // Run the specific test
    results = framework.runSingleTest(suiteName, testName);
    
    logger.info(`Test '${testName}' completed`, {
      passed: results.getPassed().length,
      failed: results.getFailed().length,
      executionTime: results.getTotalExecutionTime()
    });

    return results;

  } catch (error) {
    logger.error(`Failed to run test '${testName}' in suite '${suiteName}'`, { error: error.message });
    throw error;

  } finally {
    // Always cleanup
    try {
      cleanupValidationTestEnvironment();
    } catch (cleanupError) {
      logger.error('Cleanup failed after test execution', { error: cleanupError.message });
    }
  }
}

/**
 * List all available validation tests
 * @returns {Object} Map of suite names to test names
 */
function listValidationTests() {
  try {
    // Initialise framework to get test registry
    const framework = initialiseValidationTests();
    return framework.listTests();
  } catch (error) {
    const logger = JDbLogger.createComponentLogger('ValidationTests-List');
    logger.error('Failed to list validation tests', { error: error.message });
    throw error;
  }
}

/**
 * Get validation test registry status
 * @returns {Object} Current state of the test registry
 */
function getValidationTestStatus() {
  return {
    isInitialised: VALIDATION_TEST_REGISTRY.isInitialised,
    registeredSuites: Array.from(VALIDATION_TEST_REGISTRY.testSuites.keys()),
    suiteCount: VALIDATION_TEST_REGISTRY.testSuites.size,
    frameworkExists: VALIDATION_TEST_REGISTRY.framework !== null
  };
}

// Convenience functions for quick testing
/**
 * Quick runner for comparison operator tests
 * @returns {TestResults} Results from comparison operator tests
 */
function runComparisonOperatorTests() {
  const logger = JDbLogger.createComponentLogger('ValidationTests-ComparisonQuick');
  logger.info('Running all comparison operator tests...');

  let combinedResults = new TestResults();

  try {
    setupValidationTestEnvironmentForTests();
    const framework = initialiseValidationTests();

    // Run each comparison operator test suite
    const suiteNames = ['$eq Equality Operator Tests', '$gt Greater Than Operator Tests', '$lt Less Than Operator Tests'];

    for (const suiteName of suiteNames) {
      try {
        const suiteResult = framework.runTestSuite(suiteName);
        
        // Manually combine results
        suiteResult.results.forEach(result => {
          combinedResults.addResult(result);
        });
        
        logger.info(`Completed ${suiteName}`, {
          passed: suiteResult.getPassed().length,
          failed: suiteResult.getFailed().length
        });
      } catch (error) {
        logger.error(`Failed to run ${suiteName}`, { error: error.message });
        throw error;
      }
    }

    combinedResults.finish();

    logger.info('All comparison operator tests completed', {
      totalSuites: suiteNames.length,
      totalTests: combinedResults.results.length,
      passed: combinedResults.getPassed().length,
      failed: combinedResults.getFailed().length
    });

    return combinedResults;

  } catch (error) {
    logger.error('Comparison operator tests failed', { error: error.message });
    throw error;

  } finally {
    try {
      cleanupValidationTestEnvironment();
    } catch (cleanupError) {
      logger.error('Cleanup failed', { error: cleanupError.message });
    }
  }
}

/* exported 
   runAllValidationTests, 
   runValidationTestSuite, 
   runValidationTest, 
   listValidationTests, 
   getValidationTestStatus,
   runComparisonOperatorTests,
   initialiseValidationTests,
   setupValidationTestEnvironmentForTests,
   cleanupValidationTestEnvironment 
*/
