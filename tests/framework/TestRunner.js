/**
 * TestRunner.js - Global convenience functions and execution entry points
 * 
 * Provides global convenience functions that delegate to the framework instance
 * for backwards compatibility and simplified access patterns.
 */

/**
 * Global convenience functions that delegate to the global framework instance
 * These maintain backwards compatibility while providing the new unified API
 */

/**
 * Run all tests using the global framework
 * @returns {TestResults} Comprehensive test results
 */
function runAllTests() {
  return globalTestFramework.runAllTests();
}

/**
 * Run a specific test suite
 * @param {string} name - Name of the test suite
 * @returns {TestResults} Test results for the suite
 */
function runTestSuite(name) {
  return globalTestFramework.runTestSuite(name);
}

/**
 * Run a single test
 * @param {string} suiteName - Name of the test suite
 * @param {string} testName - Name of the specific test
 * @returns {TestResults} Test results for the single test
 */
function runSingleTest(suiteName, testName) {
  return globalTestFramework.runSingleTest(suiteName, testName);
}

/**
 * List all available tests
 * @returns {Object} Map of suite names to test names
 */
function listTests() {
  return globalTestFramework.listTests();
}

/**
 * Register a test suite with the global framework
 * @param {TestSuite} suite - The test suite to register
 */
function registerTestSuite(suite) {
  globalTestFramework.registerTestSuite(suite);
}

/**
 * Create and register a new test suite with the global framework
 * @param {string} name - Name of the test suite
 * @returns {TestSuite} The created test suite for chaining
 */
function createTestSuite(name) {
  return globalTestFramework.createTestSuite(name);
}

/**
 * Get the global framework instance for advanced usage
 * @returns {TestFramework} The global framework instance
 */
function getTestFramework() {
  return globalTestFramework;
}
