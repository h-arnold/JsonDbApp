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

    // Register logical operator test suites
    registerLogicalOperatorTestSuites();

    // Register field update operator test suites
    registerFieldUpdateOperatorTestSuites();

    // Register numeric update operator test suites
    registerNumericUpdateOperatorTestSuites();

    // Register array update operator test suites
    registerArrayUpdateOperatorTestSuites();

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
 * Register logical operator test suites ($and, $or)
 */
function registerLogicalOperatorTestSuites() {
  const logger = JDbLogger.createComponentLogger('ValidationTests-LogicalOps');

  try {
    // Register $and operator tests
    const andSuite = createLogicalAndOperatorTestSuite();
    VALIDATION_TEST_REGISTRY.framework.registerTestSuite(andSuite);
    VALIDATION_TEST_REGISTRY.testSuites.set('$and Logical AND Operator Tests', andSuite);

    // Register $or operator tests
    const orSuite = createLogicalOrOperatorTestSuite();
    VALIDATION_TEST_REGISTRY.framework.registerTestSuite(orSuite);
    VALIDATION_TEST_REGISTRY.testSuites.set('$or Logical OR Operator Tests', orSuite);

    // Register combined logical operations tests
    const combinedSuite = createCombinedLogicalOperatorTestSuite();
    VALIDATION_TEST_REGISTRY.framework.registerTestSuite(combinedSuite);
    VALIDATION_TEST_REGISTRY.testSuites.set('Combined Logical Operations Tests', combinedSuite);

    // Register logical operator error handling tests
    const errorSuite = createLogicalOperatorErrorTestSuite();
    VALIDATION_TEST_REGISTRY.framework.registerTestSuite(errorSuite);
    VALIDATION_TEST_REGISTRY.testSuites.set('Logical Operator Error Handling Tests', errorSuite);

    logger.info('Logical operator test suites registered successfully');

  } catch (error) {
    logger.error('Failed to register logical operator test suites', { error: error.message });
    throw error;
  }
}

/**
 * Register field update operator test suites ($set, $unset)
 */
function registerFieldUpdateOperatorTestSuites() {
  const logger = JDbLogger.createComponentLogger('ValidationTests-FieldUpdateOps');

  try {
    // Register $set basic field setting tests
    const setBasicSuite = createSetBasicFieldSettingTestSuite();
    VALIDATION_TEST_REGISTRY.framework.registerTestSuite(setBasicSuite);
    VALIDATION_TEST_REGISTRY.testSuites.set('$set Basic Field Setting Tests', setBasicSuite);

    // Register $set type changes tests
    const setTypesSuite = createSetTypeChangesTestSuite();
    VALIDATION_TEST_REGISTRY.framework.registerTestSuite(setTypesSuite);
    VALIDATION_TEST_REGISTRY.testSuites.set('$set Type Changes Tests', setTypesSuite);

    // Register $set object creation tests
    const setObjectSuite = createSetObjectCreationTestSuite();
    VALIDATION_TEST_REGISTRY.framework.registerTestSuite(setObjectSuite);
    VALIDATION_TEST_REGISTRY.testSuites.set('$set Object Creation Tests', setObjectSuite);

    // Register $set edge cases tests
    const setEdgesSuite = createSetEdgeCasesTestSuite();
    VALIDATION_TEST_REGISTRY.framework.registerTestSuite(setEdgesSuite);
    VALIDATION_TEST_REGISTRY.testSuites.set('$set Edge Cases Tests', setEdgesSuite);

    // Register $unset basic field removal tests
    const unsetBasicSuite = createUnsetBasicFieldRemovalTestSuite();
    VALIDATION_TEST_REGISTRY.framework.registerTestSuite(unsetBasicSuite);
    VALIDATION_TEST_REGISTRY.testSuites.set('$unset Basic Field Removal Tests', unsetBasicSuite);

    // Register $unset object structure tests
    const unsetStructureSuite = createUnsetObjectStructureTestSuite();
    VALIDATION_TEST_REGISTRY.framework.registerTestSuite(unsetStructureSuite);
    VALIDATION_TEST_REGISTRY.testSuites.set('$unset Object Structure Preservation Tests', unsetStructureSuite);

    // Register $unset edge cases tests
    const unsetEdgesSuite = createUnsetEdgeCasesTestSuite();
    VALIDATION_TEST_REGISTRY.framework.registerTestSuite(unsetEdgesSuite);
    VALIDATION_TEST_REGISTRY.testSuites.set('$unset Edge Cases Tests', unsetEdgesSuite);

    logger.info('Field update operator test suites registered successfully');

  } catch (error) {
    logger.error('Failed to register field update operator test suites', { error: error.message });
    throw error;
  }
}

/**
 * Register numeric update operator test suites ($inc, $mul, $min, $max)
 */
function registerNumericUpdateOperatorTestSuites() {
  const logger = JDbLogger.createComponentLogger('ValidationTests-NumericUpdateOps');

  try {
    // Register $inc basic incrementation tests
    const incBasicSuite = createIncBasicIncrementationTestSuite();
    VALIDATION_TEST_REGISTRY.framework.registerTestSuite(incBasicSuite);
    VALIDATION_TEST_REGISTRY.testSuites.set('$inc Basic Incrementation Tests', incBasicSuite);

    // Register $inc field creation tests
    const incFieldSuite = createIncFieldCreationTestSuite();
    VALIDATION_TEST_REGISTRY.framework.registerTestSuite(incFieldSuite);
    VALIDATION_TEST_REGISTRY.testSuites.set('$inc Field Creation Tests', incFieldSuite);

    // Register $inc type validation tests
    const incTypeSuite = createIncTypeValidationTestSuite();
    VALIDATION_TEST_REGISTRY.framework.registerTestSuite(incTypeSuite);
    VALIDATION_TEST_REGISTRY.testSuites.set('$inc Type Validation Tests', incTypeSuite);

    // Register $inc boundary testing tests
    const incBoundarySuite = createIncBoundaryTestingTestSuite();
    VALIDATION_TEST_REGISTRY.framework.registerTestSuite(incBoundarySuite);
    VALIDATION_TEST_REGISTRY.testSuites.set('$inc Boundary Testing Tests', incBoundarySuite);

    // Register $mul basic multiplication tests
    const mulBasicSuite = createMulBasicMultiplicationTestSuite();
    VALIDATION_TEST_REGISTRY.framework.registerTestSuite(mulBasicSuite);
    VALIDATION_TEST_REGISTRY.testSuites.set('$mul Basic Multiplication Tests', mulBasicSuite);

    // Register $mul field creation tests
    const mulFieldSuite = createMulFieldCreationTestSuite();
    VALIDATION_TEST_REGISTRY.framework.registerTestSuite(mulFieldSuite);
    VALIDATION_TEST_REGISTRY.testSuites.set('$mul Field Creation Tests', mulFieldSuite);

    // Register $mul type validation tests
    const mulTypeSuite = createMulTypeValidationTestSuite();
    VALIDATION_TEST_REGISTRY.framework.registerTestSuite(mulTypeSuite);
    VALIDATION_TEST_REGISTRY.testSuites.set('$mul Type Validation Tests', mulTypeSuite);

    // Register $min value comparison tests
    const minValueSuite = createMinValueComparisonTestSuite();
    VALIDATION_TEST_REGISTRY.framework.registerTestSuite(minValueSuite);
    VALIDATION_TEST_REGISTRY.testSuites.set('$min Value Comparison Tests', minValueSuite);

    // Register $min field creation tests
    const minFieldSuite = createMinFieldCreationTestSuite();
    VALIDATION_TEST_REGISTRY.framework.registerTestSuite(minFieldSuite);
    VALIDATION_TEST_REGISTRY.testSuites.set('$min Field Creation Tests', minFieldSuite);

    // Register $min type handling tests
    const minTypeSuite = createMinTypeHandlingTestSuite();
    VALIDATION_TEST_REGISTRY.framework.registerTestSuite(minTypeSuite);
    VALIDATION_TEST_REGISTRY.testSuites.set('$min Type Handling Tests', minTypeSuite);

    // Register $min edge cases tests
    const minEdgesSuite = createMinEdgeCasesTestSuite();
    VALIDATION_TEST_REGISTRY.framework.registerTestSuite(minEdgesSuite);
    VALIDATION_TEST_REGISTRY.testSuites.set('$min Edge Cases Tests', minEdgesSuite);

    // Register $max value comparison tests
    const maxValueSuite = createMaxValueComparisonTestSuite();
    VALIDATION_TEST_REGISTRY.framework.registerTestSuite(maxValueSuite);
    VALIDATION_TEST_REGISTRY.testSuites.set('$max Value Comparison Tests', maxValueSuite);

    // Register $max field creation tests
    const maxFieldSuite = createMaxFieldCreationTestSuite();
    VALIDATION_TEST_REGISTRY.framework.registerTestSuite(maxFieldSuite);
    VALIDATION_TEST_REGISTRY.testSuites.set('$max Field Creation Tests', maxFieldSuite);

    // Register $max boundary testing tests
    const maxBoundarySuite = createMaxBoundaryTestingTestSuite();
    VALIDATION_TEST_REGISTRY.framework.registerTestSuite(maxBoundarySuite);
    VALIDATION_TEST_REGISTRY.testSuites.set('$max Boundary Testing Tests', maxBoundarySuite);

    logger.info('Numeric update operator test suites registered successfully');

  } catch (error) {
    logger.error('Failed to register numeric update operator test suites', { error: error.message });
    throw error;
  }
}

/**
 * Register array update operator test suites ($push, $pull)
 */
function registerArrayUpdateOperatorTestSuites() {
  const logger = JDbLogger.createComponentLogger('ValidationTests-ArrayUpdateOps');

  try {
    // Register $push operator tests
    const pushSuite = createPushOperatorTestSuite();
    VALIDATION_TEST_REGISTRY.framework.registerTestSuite(pushSuite);
    VALIDATION_TEST_REGISTRY.testSuites.set('$push Operator Tests', pushSuite);

    // Register $pull operator tests
    const pullSuite = createPullOperatorTestSuite();
    VALIDATION_TEST_REGISTRY.framework.registerTestSuite(pullSuite);
    VALIDATION_TEST_REGISTRY.testSuites.set('$pull Operator Tests', pullSuite);

    logger.info('Array update operator test suites registered successfully');

  } catch (error) {
    logger.error('Failed to register array update operator test suites', { error: error.message });
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
      autoCreateCollections: true
    });

    // Create Database instance (it creates its own FileService and MasterIndex)
    const database = new Database(databaseConfig);
    
    // initialise the database 
    database.initialise();

    // Now we need to populate the MasterIndex with our validation collections
    // Since the collections were created in Drive files, we need to register them
    const masterIndex = database._masterIndex;
    
    // Add collection metadata to MasterIndex for each validation collection
    Object.keys(VALIDATION_TEST_ENV.collectionFileIds).forEach(collectionName => {
      const fileId = VALIDATION_TEST_ENV.collectionFileIds[collectionName];
      const metadata = {
        fileId: fileId,
        created: new Date(),
        lastModified: new Date(),
        documentCount: VALIDATION_TEST_ENV.initialDataMap[collectionName].length,
        modificationToken: 'validation-token-' + Date.now() + '-' + collectionName
      };
      
      // Add to MasterIndex
      masterIndex.addCollection(collectionName, metadata);
      logger.debug(`Added collection ${collectionName} to MasterIndex`, { fileId, documentCount: metadata.documentCount });
    });

    // Store database reference and access collections through database
    VALIDATION_TEST_ENV.database = database;
    VALIDATION_TEST_ENV.collections = {};
    
    // Access collections through the database.collection() method
    // This ensures proper loading and registration
    const collectionNames = ['persons', 'orders', 'inventory'];
    collectionNames.forEach(name => {
      try {
        VALIDATION_TEST_ENV.collections[name] = database.collection(name);
        logger.debug(`Collection ${name} loaded successfully`);
      } catch (error) {
        logger.error(`Failed to load collection ${name}: ${error.message}`);
        throw error;
      }
    });

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

    // Clean up database reference
    if (VALIDATION_TEST_ENV.database) {
      delete VALIDATION_TEST_ENV.database;
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

/**
 * Quick runner for logical operator tests
 * @returns {TestResults} Results from logical operator tests
 */
function runLogicalOperatorTests() {
  const logger = JDbLogger.createComponentLogger('ValidationTests-LogicalQuick');
  logger.info('Running all logical operator tests...');

  let combinedResults = new TestResults();

  try {
    setupValidationTestEnvironmentForTests();
    const framework = initialiseValidationTests();

    // Run each logical operator test suite
    const suiteNames = [
      '$and Logical AND Operator Tests', 
      '$or Logical OR Operator Tests', 
      'Combined Logical Operations Tests',
      'Logical Operator Error Handling Tests'
    ];

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

    logger.info('All logical operator tests completed', {
      totalSuites: suiteNames.length,
      totalTests: combinedResults.results.length,
      passed: combinedResults.getPassed().length,
      failed: combinedResults.getFailed().length
    });

    return combinedResults;

  } catch (error) {
    logger.error('Logical operator tests failed', { error: error.message });
    throw error;

  } finally {
    try {
      cleanupValidationTestEnvironment();
    } catch (cleanupError) {
      logger.error('Cleanup failed', { error: cleanupError.message });
    }
  }
}

/**
 * Quick runner for field update operator tests
 * @returns {TestResults} Results from field update operator tests
 */
function runFieldUpdateOperatorTests() {
  const logger = JDbLogger.createComponentLogger('ValidationTests-FieldUpdateQuick');
  logger.info('Running all field update operator tests...');

  let combinedResults = new TestResults();

  try {
    // Setup test environment
    setupValidationTestEnvironmentForTests();
    
    // Initialise test framework
    const framework = initialiseValidationTests();
    
    // Validate environment before running tests
    framework.validateEnvironment();

    // Run field update operator test suites
    const suiteNames = [
      '$set Basic Field Setting Tests',
      '$set Type Changes Tests', 
      '$set Object Creation Tests',
      '$set Edge Cases Tests',
      '$unset Basic Field Removal Tests',
      '$unset Object Structure Preservation Tests',
      '$unset Edge Cases Tests'
    ];

    for (const suiteName of suiteNames) {
      try {
        logger.info(`Running suite: ${suiteName}`);
        const suiteResult = framework.runTestSuite(suiteName);
        
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

    logger.info('All field update operator tests completed', {
      totalSuites: suiteNames.length,
      totalTests: combinedResults.results.length,
      passed: combinedResults.getPassed().length,
      failed: combinedResults.getFailed().length
    });

    return combinedResults;

  } catch (error) {
    logger.error('Field update operator tests failed', { error: error.message });
    throw error;

  } finally {
    try {
      cleanupValidationTestEnvironment();
    } catch (cleanupError) {
      logger.error('Cleanup failed', { error: cleanupError.message });
    }
  }
}

/**
 * Quick runner for numeric update operator tests
 * @returns {TestResults} Results from numeric update operator tests
 */
function runNumericUpdateOperatorTests() {
  const logger = JDbLogger.createComponentLogger('ValidationTests-NumericUpdateQuick');
  logger.info('Running all numeric update operator tests...');

  let combinedResults = new TestResults();

  try {
    // Setup test environment
    setupValidationTestEnvironmentForTests();
    
    // Initialise test framework
    const framework = initialiseValidationTests();
    
    // Validate environment before running tests
    framework.validateEnvironment();

    // Run numeric update operator test suites
    const suiteNames = [
      '$inc Basic Incrementation Tests',
      '$inc Field Creation Tests',
      '$inc Type Validation Tests',
      '$inc Boundary Testing Tests',
      '$mul Basic Multiplication Tests',
      '$mul Field Creation Tests',
      '$mul Type Validation Tests',
      '$min Value Comparison Tests',
      '$min Field Creation Tests',
      '$min Type Handling Tests',
      '$min Edge Cases Tests',
      '$max Value Comparison Tests',
      '$max Field Creation Tests',
      '$max Boundary Testing Tests'
    ];

    for (const suiteName of suiteNames) {
      try {
        logger.info(`Running suite: ${suiteName}`);
        const suiteResult = framework.runTestSuite(suiteName);
        
        suiteResult.results.forEach(result => {
          combinedResults.addResult(result);
        });
        
        logger.info(`Completed ${suiteName}`, {
          passed: suiteResult.getPassed().length,
          failed: suiteResult.getFailed().length,
          total: suiteResult.results.length
        });

      } catch (error) {
        logger.error(`Failed to run ${suiteName}`, { error: error.message });
        combinedResults.addResult(new TestResult(suiteName, 'Suite Execution', false, error.message, 0));
      }
    }

    combinedResults.finish();

    logger.info('All numeric update operator tests completed', {
      totalSuites: suiteNames.length,
      totalTests: combinedResults.results.length,
      passed: combinedResults.getPassed().length,
      failed: combinedResults.getFailed().length
    });

    return combinedResults;

  } catch (error) {
    logger.error('Numeric update operator tests failed', { error: error.message });
    throw error;

  } finally {
    try {
      cleanupValidationTestEnvironment();
    } catch (cleanupError) {
      logger.error('Cleanup failed', { error: cleanupError.message });
    }
  }
}

/**
 * Quick runner for array update operator tests
 * @returns {TestResults} Results from array update operator tests
 */
function runArrayUpdateOperatorTests() {
  const logger = JDbLogger.createComponentLogger('ValidationTests-ArrayUpdateQuick');
  logger.info('Running all array update operator tests...');

  let combinedResults = new TestResults();

  try {
    // Setup test environment
    setupValidationTestEnvironmentForTests();
    
    // Initialise test framework
    const framework = initialiseValidationTests();
    
    // Validate environment before running tests
    framework.validateEnvironment();

    // Run array update operator test suites
    const suiteNames = [
      '$push Operator Tests',
      '$pull Operator Tests'
    ];

    for (const suiteName of suiteNames) {
      try {
        logger.info(`Running suite: ${suiteName}`);
        const suiteResult = framework.runTestSuite(suiteName);
        
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

    logger.info('All array update operator tests completed', {
      totalSuites: suiteNames.length,
      totalTests: combinedResults.results.length,
      passed: combinedResults.getPassed().length,
      failed: combinedResults.getFailed().length
    });

    return combinedResults;

  } catch (error) {
    logger.error('Array update operator tests failed', { error: error.message });
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
   runLogicalOperatorTests,
   runFieldUpdateOperatorTests,
   runNumericUpdateOperatorTests,
   runArrayUpdateOperatorTests,
   initialiseValidationTests,
   setupValidationTestEnvironmentForTests,
   cleanupValidationTestEnvironment 
*/