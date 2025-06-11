/**
 * UtilityTest.js - Utility Classes Test Convenience Wrapper
 * 
 * Convenience wrapper that runs all utility class tests from individual files:
 * - GASDBLoggerTest.js (logging functionality)
 * - ErrorHandlerTest.js (error handling and validation)
 * - IdGeneratorTest.js (ID generation and validation)
 * - ObjectUtilsTest.js (object manipulation and date preservation)
 * 
 * This wrapper imports and runs the individual test suites while keeping
 * the test files separate and focused on their respective classes.
 */

/**
 * Create unified test framework with all utility test suites
 * 
 * This imports the test suite creation functions from individual test files
 * and registers them together for convenient batch execution.
 */
function createUtilityTestFramework() {
  const testFramework = new TestFramework();
  
  // Register utility test suites from individual files
  testFramework.registerTestSuite(createGASDBLoggerTestSuite());  // from GASDBLoggerTest.js
  testFramework.registerTestSuite(createErrorHandlerTestSuite()); // from ErrorHandlerTest.js
  testFramework.registerTestSuite(createIdGeneratorTestSuite());  // from IdGeneratorTest.js
  testFramework.registerTestSuite(createObjectUtilsTestSuite());  // from ObjectUtilsTest.js
  
  return testFramework;
}

/**
 * Run all utility tests as a batch
 */
function runUtilityTests() {
  GASDBLogger.info('Running Utility Tests: GASDBLogger, ErrorHandler, and IdGenerator');
  
  const testFramework = createUtilityTestFramework();
  const results = testFramework.runAllTests();
  
  // Log summary
  GASDBLogger.info('Utility Test Results:');
  GASDBLogger.info(results.getSummary());
  
  return results;
}

/**
 * Run individual utility test suites
 */
function runUtilityTestSuite(suiteName) {
  const testFramework = createUtilityTestFramework();
  return testFramework.runTestSuite(suiteName);
}

/**
 * Run a single test from utility suites
 */
function runUtilitySingleTest(suiteName, testName) {
  const testFramework = createUtilityTestFramework();
  return testFramework.runSingleTest(suiteName, testName);
}

/**
 * List all available utility test suites
 */
function listUtilityTestSuites() {
  const testFramework = createUtilityTestFramework();
  const suiteNames = Array.from(testFramework.testSuites.keys());
  
  GASDBLogger.info('Available Utility Test Suites:');
  suiteNames.forEach(name => GASDBLogger.info(`  - ${name}`));
  
  return suiteNames;
}

/**
 * Convenience methods to run individual utility class tests
 * These delegate to the individual test files
 */
function runUtilityGASDBLoggerTests() {
  return runGASDBLoggerTests(); // from GASDBLoggerTest.js
}

function runUtilityErrorHandlerTests() {
  return runErrorHandlerTests(); // from ErrorHandlerTest.js
}

function runUtilityIdGeneratorTests() {
  return runIdGeneratorTests(); // from IdGeneratorTest.js
}

function runUtilityObjectUtilsTests() {
  return runObjectUtilsTests(); // from ObjectUtilsTest.js
}
