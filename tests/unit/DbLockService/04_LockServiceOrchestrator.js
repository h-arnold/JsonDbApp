/**
 * Orchestrator for LockService unit tests.
 */

// Global test data for LockService environment
const LOCKSERVICE_TEST_ENV = {
  masterIndexKey: 'GASDB_MASTER_INDEX'
};

/**
 * Setup test environment: clear master index before tests
 */
function setupLockServiceTestEnvironment() {
  const logger = GASDBLogger.createComponentLogger('LockService-Setup');
  logger.info('Clearing master index before tests');
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty(LOCKSERVICE_TEST_ENV.masterIndexKey);
}

/**
 * Cleanup test environment: clear master index after tests
 */
function cleanupLockServiceTestEnvironment() {
  const logger = GASDBLogger.createComponentLogger('LockService-Teardown');
  logger.info('Clearing master index after tests');
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty(LOCKSERVICE_TEST_ENV.masterIndexKey);
}

/**
 * Register all LockService test suites
 * @returns {TestFramework} The test framework with registered suites
 */
function registerLockServiceTests() {
  const tf = new TestFramework();
  tf.registerTestSuite(createLockServiceSetupTestSuite());
  tf.registerTestSuite(createLockServiceConstructorTestSuite());
  tf.registerTestSuite(createLockServiceScriptLockTestSuite());
  tf.registerTestSuite(createLockServiceScriptLockTimeoutTestSuite());
  tf.registerTestSuite(createLockServiceRemoveLockTestSuite());
  tf.registerTestSuite(createLockServiceExpiredCleanupTestSuite());
  tf.registerTestSuite(createLockServiceMasterIndexKeyTestSuite());
  return tf;
}

/**
 * Run all LockService unit tests
 * @returns {TestResults} The test results
 */
function runLockServiceTests() {
  setupLockServiceTestEnvironment();
  const logger = GASDBLogger.createComponentLogger('LockService-TestRunner');
  logger.info('Starting LockService unit tests');
  const tf = registerLockServiceTests();
  const results = tf.runAllTests();
  logger.info('LockService unit tests completed', { summary: results.getSummary() });
  cleanupLockServiceTestEnvironment();
  return results;
}
