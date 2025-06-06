/**
 * TestFramework - Consolidated testing framework for GAS DB
 * 
 * This consolidated framework replaces the previous 4-file system with a single,
 * unified testing solution that provides clean API, simplified configuration,
 * and comprehensive functionality.
 */

/**
 * TestResult - Represents the result of a single test execution
 */
class TestResult {
  constructor(suiteName, testName, passed, error = null, executionTime = 0) {
    this.suiteName = suiteName;
    this.testName = testName;
    this.passed = passed;
    this.error = error;
    this.executionTime = executionTime;
    this.timestamp = new Date();
  }
  
  toString() {
    const status = this.passed ? 'PASS' : 'FAIL';
    const time = `(${this.executionTime}ms)`;
    let result = `${status}: ${this.suiteName}.${this.testName} ${time}`;
    
    if (!this.passed && this.error) {
      result += `\n  Error: ${this.error.message}`;
      if (this.error.stack) {
        result += `\n  Stack: ${this.error.stack}`;
      }
    }
    
    return result;
  }
}

/**
 * TestResults - Aggregates multiple test results with comprehensive reporting
 */
class TestResults {
  constructor() {
    this.results = [];
    this.startTime = new Date();
    this.endTime = null;
  }
  
  addResult(result) {
    this.results.push(result);
  }
  
  finish() {
    this.endTime = new Date();
  }
  
  getPassed() {
    return this.results.filter(r => r.passed);
  }
  
  getFailed() {
    return this.results.filter(r => !r.passed);
  }
  
  getPassRate() {
    if (this.results.length === 0) return 0;
    return (this.getPassed().length / this.results.length) * 100;
  }
  
  getTotalExecutionTime() {
    if (!this.endTime) return 0;
    return this.endTime.getTime() - this.startTime.getTime();
  }
  
  getSummary() {
    const total = this.results.length;
    const passed = this.getPassed().length;
    const failed = this.getFailed().length;
    const passRate = this.getPassRate().toFixed(1);
    const totalTime = this.getTotalExecutionTime();
    
    return `Tests: ${total}, Passed: ${passed}, Failed: ${failed}, Pass Rate: ${passRate}%, Total Time: ${totalTime}ms`;
  }
  
  /**
   * Get comprehensive test report with all details
   * @returns {string} Detailed test report
   */
  getComprehensiveReport() {
    const total = this.results.length;
    const passed = this.getPassed().length;
    const failed = this.getFailed().length;
    const passRate = this.getPassRate().toFixed(1);
    const totalTime = this.getTotalExecutionTime();
    
    let report = `\n=== COMPREHENSIVE TEST RESULTS ===\n`;
    report += `Total: ${total} | Passed: ${passed} | Failed: ${failed} | Pass Rate: ${passRate}%\n`;
    report += `Execution Time: ${totalTime}ms | Started: ${this.startTime.toISOString()}\n\n`;
    
    // Group by suite for better organisation
    const suiteGroups = {};
    this.results.forEach(result => {
      if (!suiteGroups[result.suiteName]) {
        suiteGroups[result.suiteName] = { passed: [], failed: [] };
      }
      if (result.passed) {
        suiteGroups[result.suiteName].passed.push(result);
      } else {
        suiteGroups[result.suiteName].failed.push(result);
      }
    });
    
    // Report by suite
    Object.keys(suiteGroups).forEach(suiteName => {
      const suite = suiteGroups[suiteName];
      const suiteTotal = suite.passed.length + suite.failed.length;
      const suitePassed = suite.passed.length;
      const suitePassRate = suiteTotal > 0 ? ((suitePassed / suiteTotal) * 100).toFixed(1) : '0.0';
      
      report += `[${suiteName}] ${suitePassed}/${suiteTotal} passed (${suitePassRate}%)\n`;
      
      // Show failed tests with details
      if (suite.failed.length > 0) {
        report += `  FAILED:\n`;
        suite.failed.forEach(result => {
          report += `    ✗ ${result.testName} (${result.executionTime}ms)\n`;
          if (result.error) {
            report += `      Error: ${result.error.message}\n`;
          }
        });
      }
      
      // Show passed tests
      if (suite.passed.length > 0) {
        report += `  PASSED:\n`;
        suite.passed.forEach(result => {
          report += `    ✓ ${result.testName} (${result.executionTime}ms)\n`;
        });
      }
      report += '\n';
    });
    
    return report;
  }
}

/**
 * TestSuite - Represents a collection of related tests with lifecycle hooks
 */
class TestSuite {
  constructor(name) {
    this.name = name;
    this.tests = new Map();
    this.beforeEach = null;
    this.afterEach = null;
    this.beforeAll = null;
    this.afterAll = null;
  }
  
  addTest(name, testFn) {
    this.tests.set(name, testFn);
    return this; // Enable fluent API
  }
  
  setBeforeEach(fn) {
    this.beforeEach = fn;
    return this;
  }
  
  setAfterEach(fn) {
    this.afterEach = fn;
    return this;
  }
  
  setBeforeAll(fn) {
    this.beforeAll = fn;
    return this;
  }
  
  setAfterAll(fn) {
    this.afterAll = fn;
    return this;
  }
  
  runTests() {
    const results = [];
    
    // Run beforeAll if defined
    if (this.beforeAll) {
      try {
        this.beforeAll();
      } catch (error) {
        GASDBLogger.error(`BeforeAll failed for suite ${this.name}: ${error.message}`);
        results.push(new TestResult(this.name, 'beforeAll', false, error, 0));
        return results;
      }
    }
    
    // Run each test
    for (const [testName, testFn] of this.tests) {
      results.push(this.runTest(testName));
    }
    
    // Run afterAll if defined
    if (this.afterAll) {
      try {
        this.afterAll();
      } catch (error) {
        GASDBLogger.error(`AfterAll failed for suite ${this.name}: ${error.message}`);
        results.push(new TestResult(this.name, 'afterAll', false, error, 0));
      }
    }
    
    return results;
  }
  
  runTest(name) {
    const testFn = this.tests.get(name);
    if (!testFn) {
      throw new Error(`Test ${name} not found in suite ${this.name}`);
    }
    
    const startTime = Date.now();
    let passed = false;
    let error = null;
    
    try {
      // Run beforeEach if defined
      if (this.beforeEach) {
        this.beforeEach();
      }
      
      // Run the actual test
      testFn();
      passed = true;
      
    } catch (e) {
      error = e;
      passed = false;
    } finally {
      // Run afterEach if defined
      try {
        if (this.afterEach) {
          this.afterEach();
        }
      } catch (afterError) {
        // If test passed but afterEach failed, mark test as failed
        if (passed) {
          error = afterError;
          passed = false;
        }
      }
    }
    
    const executionTime = Date.now() - startTime;
    return new TestResult(this.name, name, passed, error, executionTime);
  }
  
  hasTest(name) {
    return this.tests.has(name);
  }
  
  getTestNames() {
    return Array.from(this.tests.keys());
  }
}

/**
 * TestFramework - Main consolidated testing framework
 * 
 * Provides unified API with embedded assertion utilities, environment validation,
 * automatic resource tracking, and comprehensive reporting.
 */
class TestFramework {
  constructor() {
    this.testSuites = new Map();
    this.results = new TestResults();
    this.resourceFiles = new Set(); // Track files created during testing
    this.environmentValidated = false;
  }
  
  // ============= STATIC ASSERTION UTILITIES =============
  
  /**
   * Assert that two values are equal
   * @param {*} expected - The expected value
   * @param {*} actual - The actual value  
   * @param {string} message - Optional error message
   */
  static assertEquals(expected, actual, message = '') {
    if (expected !== actual) {
      const error = message || `Expected: ${expected}, but got: ${actual}`;
      throw new Error(error);
    }
  }
  
  /**
   * Assert that two values are not equal
   * @param {*} expected - The value that should not match
   * @param {*} actual - The actual value
   * @param {string} message - Optional error message
   */
  static assertNotEquals(expected, actual, message = '') {
    if (expected === actual) {
      const error = message || `Expected values to be different, but both were: ${actual}`;
      throw new Error(error);
    }
  }
  
  /**
   * Assert that a condition is true
   * @param {boolean} condition - The condition to test
   * @param {string} message - Optional error message
   */
  static assertTrue(condition, message = '') {
    if (!condition) {
      const error = message || `Expected condition to be true, but it was false`;
      throw new Error(error);
    }
  }
  
  /**
   * Assert that a condition is false
   * @param {boolean} condition - The condition to test
   * @param {string} message - Optional error message
   */
  static assertFalse(condition, message = '') {
    if (condition) {
      const error = message || `Expected condition to be false, but it was true`;
      throw new Error(error);
    }
  }
  
  /**
   * Assert that a value is defined (not undefined)
   * @param {*} value - The value to test
   * @param {string} message - Optional error message
   */
  static assertDefined(value, message = '') {
    if (value === undefined) {
      const error = message || `Expected value to be defined, but it was undefined`;
      throw new Error(error);
    }
  }
  
  /**
   * Assert that a value is undefined
   * @param {*} value - The value to test
   * @param {string} message - Optional error message
   */
  static assertUndefined(value, message = '') {
    if (value !== undefined) {
      const error = message || `Expected value to be undefined, but it was: ${value}`;
      throw new Error(error);
    }
  }
  
  /**
   * Assert that a value is null
   * @param {*} value - The value to test
   * @param {string} message - Optional error message
   */
  static assertNull(value, message = '') {
    if (value !== null) {
      const error = message || `Expected value to be null, but it was: ${value}`;
      throw new Error(error);
    }
  }
  
  /**
   * Assert that a value is not null
   * @param {*} value - The value to test
   * @param {string} message - Optional error message
   */
  static assertNotNull(value, message = '') {
    if (value === null) {
      const error = message || `Expected value to not be null`;
      throw new Error(error);
    }
  }
  
  /**
   * Assert that a function throws an error
   * @param {Function} fn - The function to test
   * @param {Function} errorType - Optional expected error type/constructor
   * @param {string} message - Optional error message
   */
  static assertThrows(fn, errorType = null, message = '') {
    let threwError = false;
    let actualError = null;
    
    try {
      fn();
    } catch (error) {
      threwError = true;
      actualError = error;
      
      if (errorType && !(error instanceof errorType)) {
        const typeError = message || `Expected error of type ${errorType.name}, but got ${error.constructor.name}`;
        throw new Error(typeError);
      }
    }
    
    if (!threwError) {
      const noThrowError = message || `Expected function to throw an error, but it didn't`;
      throw new Error(noThrowError);
    }
  }
  
  /**
   * Assert that an array contains a specific element
   * @param {Array} array - The array to search
   * @param {*} element - The element to find
   * @param {string} message - Optional error message
   */
  static assertContains(array, element, message = '') {
    if (!Array.isArray(array)) {
      throw new Error('First argument must be an array');
    }
    
    if (array.indexOf(element) === -1) {
      const error = message || `Expected array to contain element: ${element}`;
      throw new Error(error);
    }
  }
  
  /**
   * Assert that a string matches a regular expression
   * @param {string} string - The string to test
   * @param {RegExp} regex - The regular expression to match
   * @param {string} message - Optional error message
   */
  static assertMatches(string, regex, message = '') {
    if (typeof string !== 'string') {
      throw new Error('First argument must be a string');
    }
    
    if (!(regex instanceof RegExp)) {
      throw new Error('Second argument must be a RegExp');
    }
    
    if (!regex.test(string)) {
      const error = message || `Expected string "${string}" to match pattern ${regex}`;
      throw new Error(error);
    }
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
      GASDBLogger.info('Starting comprehensive test execution...');
      
      for (const [suiteName, suite] of this.testSuites) {
        GASDBLogger.info(`Running test suite: ${suiteName}`);
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
      GASDBLogger.info(`Running individual test: ${suiteName}.${testName}`);
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
    
    GASDBLogger.info('Validating test environment...');
    
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
    GASDBLogger.info('Environment validation completed successfully');
  }
  
  /**
   * Validate a GAS API is available
   * @private
   */
  _validateGASAPI(name, testFn) {
    try {
      testFn();
      GASDBLogger.info(`✓ ${name} API available`);
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
    GASDBLogger.info(`✓ ${name} component available`);
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
      ErrorHandler.validateRequired('test', 'testParam');
      const error = ErrorHandler.createError('DOCUMENT_NOT_FOUND', { id: 'test' });
      if (!error) {
        throw new Error('Error handling test failed');
      }
      
      GASDBLogger.info('✓ Basic functionality tests passed');
      
    } catch (error) {
      throw new Error(`Basic functionality test failed: ${error.message}`);
    }
  }
  
  /**
   * Set up the test environment
   * @private
   */
  setupEnvironment() {
    GASDBLogger.info('Setting up test environment');
    this.resourceFiles.clear();
  }
  
  /**
   * Clean up the test environment and resources
   * @private
   */
  teardownEnvironment() {
    GASDBLogger.info('Cleaning up test environment');
    
    // Clean up any tracked resource files
    if (this.resourceFiles.size > 0) {
      GASDBLogger.info(`Cleaning up ${this.resourceFiles.size} test resource files`);
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
    // Output the comprehensive report
    GASDBLogger.info(results.getComprehensiveReport());
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
