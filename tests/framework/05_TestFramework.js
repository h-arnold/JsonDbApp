/**
 * TestFramework.js - Main framework coordination and environment management
 * 
 * Main consolidated testing framework that coordinates test execution,
 * manages environment validation, and provides resource tracking.
 */

/**
 * TestFramework - Main consolidated testing framework
 * 
 * Provides unified API for test execution, environment validation,
 * automatic resource tracking, and comprehensive reporting.
 */
class TestFramework {
  constructor() {
    this.testSuites = new Map();
    this.results = null; // Defer initialization until first use
    this.resourceFiles = new Set(); // Track files created during testing
    this.environmentValidated = false;
  }
  
  /**
   * Get or create the results object
   * @private
   */
  _getResults() {
    if (!this.results) {
      this.results = new TestResults();
    }
    return this.results;
  }
  
  // ============= STATIC ASSERTION UTILITIES =============
  // (Delegated to AssertionUtilities for backwards compatibility)
  
  static assertEquals(expected, actual, message = '') {
    return AssertionUtilities.assertEquals(expected, actual, message);
  }
  
  static assertNotEquals(expected, actual, message = '') {
    return AssertionUtilities.assertNotEquals(expected, actual, message);
  }
  
  static assertTrue(condition, message = '') {
    return AssertionUtilities.assertTrue(condition, message);
  }
  
  static assertFalse(condition, message = '') {
    return AssertionUtilities.assertFalse(condition, message);
  }
  
  static assertDefined(value, message = '') {
    return AssertionUtilities.assertDefined(value, message);
  }
  
  static assertUndefined(value, message = '') {
    return AssertionUtilities.assertUndefined(value, message);
  }
  
  static assertNull(value, message = '') {
    return AssertionUtilities.assertNull(value, message);
  }
  
  static assertNotNull(value, message = '') {
    return AssertionUtilities.assertNotNull(value, message);
  }
  
  static assertThrows(fn, errorType = null, message = '') {
    return AssertionUtilities.assertThrows(fn, errorType, message);
  }
  
  static assertContains(array, element, message = '') {
    return AssertionUtilities.assertContains(array, element, message);
  }
  
  static assertMatches(string, regex, message = '') {
    return AssertionUtilities.assertMatches(string, regex, message);
  }
  
  static assertArrayEquals(expected, actual, message = '') {
    return AssertionUtilities.assertArrayEquals(expected, actual, message);
  }
  
  // ============= MAIN API METHODS =============
  
  /**
   * Register a test suite with the framework
   * @param {TestSuite} suite - The test suite to register
   * @returns {TestFramework} This instance for chaining
   */
  registerTestSuite(suite) {
    if (!(suite instanceof TestSuite)) {
      throw new Error('Expected TestSuite instance');
    }
    this.testSuites.set(suite.name, suite);
    return this;
  }
  
  /**
   * Create and register a new test suite
   * @param {string} name - Name of the test suite
   * @returns {TestSuite} The created test suite for chaining
   */
  createTestSuite(name) {
    const suite = new TestSuite(name);
    this.registerTestSuite(suite);
    return suite;
  }
  
  /**
   * Run all registered test suites
   * @returns {TestResults} Comprehensive test results
   */
  runAllTests() {
    this.results = new TestResults();
    this.validateEnvironment();
    this.setupEnvironment();
    
    try {
      GASDBLogger.info('Running tests...');
      
      for (const [suiteName, suite] of this.testSuites) {
        const suiteResults = suite.runTests();
        suiteResults.forEach(result => this.results.addResult(result));
      }
      
      this.results.finish();
      this.logResults(this.results);
      
    } finally {
      this.teardownEnvironment();
    }
    
    return this.results;
  }
  
  /**
   * Run a specific test suite by name
   * @param {string} name - Name of the test suite
   * @returns {TestResults} Test results for the suite
   */
  runTestSuite(name) {
    const suite = this.testSuites.get(name);
    if (!suite) {
      throw new Error(`Test suite '${name}' not found. Available suites: ${Array.from(this.testSuites.keys()).join(', ')}`);
    }
    
    this.results = new TestResults();
    this.validateEnvironment();
    this.setupEnvironment();
    
    try {
      GASDBLogger.info(`Running test suite: ${name}`);
      const suiteResults = suite.runTests();
      suiteResults.forEach(result => this.results.addResult(result));
      
      this.results.finish();
      this.logResults(this.results);
      
    } finally {
      this.teardownEnvironment();
    }
    
    return this.results;
  }
  
  /**
   * Run a single test within a test suite
   * @param {string} suiteName - Name of the test suite
   * @param {string} testName - Name of the specific test
   * @returns {TestResults} Test results for the single test
   */
  runSingleTest(suiteName, testName) {
    const suite = this.testSuites.get(suiteName);
    if (!suite) {
      throw new Error(`Test suite '${suiteName}' not found. Available suites: ${Array.from(this.testSuites.keys()).join(', ')}`);
    }
    
    if (!suite.hasTest(testName)) {
      throw new Error(`Test '${testName}' not found in suite '${suiteName}'. Available tests: ${suite.getTestNames().join(', ')}`);
    }
    
    this.results = new TestResults();
    this.validateEnvironment();
    this.setupEnvironment();
    
    try {
      GASDBLogger.info(`Running test: ${suiteName}.${testName}`);
      const result = suite.runTest(testName);
      this.results.addResult(result);
      
      this.results.finish();
      this.logResults(this.results);
      
    } catch (error) {
      const errorResult = new TestResult(suiteName, testName, false, error, 0);
      this.results.addResult(errorResult);
    } finally {
      this.teardownEnvironment();
    }
    
    return this.results;
  }
  
  /**
   * List all available tests organised by suite
   * @returns {Object} Map of suite names to test names
   */
  listTests() {
    const testMap = {};
    for (const [suiteName, suite] of this.testSuites) {
      testMap[suiteName] = suite.getTestNames();
    }
    return testMap;
  }
  
  // ============= ENVIRONMENT MANAGEMENT =============
  
  /**
   * Validate that the testing environment is properly set up
   * @throws {Error} If environment validation fails
   */
  validateEnvironment() {
    if (this.environmentValidated) {
      return; // Already validated
    }
    
    GASDBLogger.debug('Validating test environment...');
    
    // Check GAS APIs
    this._validateGASAPI('DriveApp', () => DriveApp.getRootFolder());
    this._validateGASAPI('ScriptProperties', () => PropertiesService.getScriptProperties());
    this._validateGASAPI('Logger', () => Logger.log('Test log'));
    
    // Check GAS DB components
    this._validateComponent('GASDBLogger', GASDBLogger);
    this._validateComponent('ErrorHandler', ErrorHandler);
    this._validateComponent('IdGenerator', IdGenerator);
    
    // Test basic functionality
    this._testBasicFunctionality();
    
    this.environmentValidated = true;
    GASDBLogger.info('Environment validated ✓');
  }
  
  /**
   * Validate a GAS API is available
   * @private
   */
  _validateGASAPI(name, testFn) {
    try {
      testFn();
      GASDBLogger.debug(`✓ ${name} API available`);
    } catch (error) {
      throw new Error(`${name} API not available: ${error.message}`);
    }
  }
  
  /**
   * Validate a component exists and is functional
   * @private
   */
  _validateComponent(name, component) {
    if (typeof component === 'undefined') {
      throw new Error(`${name} component not available`);
    }
    GASDBLogger.debug(`✓ ${name} component available`);
  }
  
  /**
   * Test basic functionality of core components
   * @private
   */
  _testBasicFunctionality() {
    try {
      // Test ID generation
      const id1 = IdGenerator.generateUUID();
      const id2 = IdGenerator.generateTimestampId();
      if (!id1 || !id2 || id1 === id2) {
        throw new Error('ID generation test failed');
      }
      
      // Test error handling
      ValidationUtils.validateRequired('test', 'testParam');
      const error = ErrorHandler.createError('DOCUMENT_NOT_FOUND', { id: 'test' });
      if (!error) {
        throw new Error('Error handling test failed');
      }
      
      GASDBLogger.debug('✓ Basic functionality tests passed');
      
    } catch (error) {
      throw new Error(`Basic functionality test failed: ${error.message}`);
    }
  }
  
  /**
   * Set up the test environment
   * @private
   */
  setupEnvironment() {
    GASDBLogger.debug('Setting up test environment');
    this.resourceFiles.clear();
  }
  
  /**
   * Clean up the test environment and resources
   * @private
   */
  teardownEnvironment() {
    GASDBLogger.debug('Cleaning up test environment');
    
    // Clean up any tracked resource files
    if (this.resourceFiles.size > 0) {
      GASDBLogger.debug(`Cleaning up ${this.resourceFiles.size} test resource files`);
      this.resourceFiles.forEach(fileId => {
        try {
          DriveApp.getFileById(fileId).setTrashed(true);
        } catch (error) {
          GASDBLogger.warn(`Failed to clean up file ${fileId}: ${error.message}`);
        }
      });
      this.resourceFiles.clear();
    }
  }
  
  /**
   * Track a file for automatic cleanup
   * @param {string} fileId - The file ID to track
   */
  trackResourceFile(fileId) {
    this.resourceFiles.add(fileId);
  }
  
  // ============= REPORTING =============
  
  /**
   * Log comprehensive test results
   * @private
   */
  logResults(results) {
    // Add visual separator and use console.log for clean output without timestamps
    console.log('\n' + '='.repeat(50));
    console.log('TEST RESULTS');
    console.log('='.repeat(50));
    results.logComprehensiveResults(console.log);
    console.log('='.repeat(50) + '\n');
  }
  
  // ============= COMPATIBILITY METHODS =============
  
  /**
   * Get registered test suites (for backwards compatibility)
   * @returns {Map} Map of test suite names to TestSuite instances
   */
  getTestSuites() {
    return this.testSuites;
  }
  
  /**
   * Check if a test suite exists
   * @param {string} name - Name of the test suite
   * @returns {boolean} True if suite exists
   */
  hasTestSuite(name) {
    return this.testSuites.has(name);
  }
}

// ============= CONVENIENCE FUNCTIONS =============

/**
 * Create a global TestFramework instance for easy access
 */
const globalTestFramework = new TestFramework();
