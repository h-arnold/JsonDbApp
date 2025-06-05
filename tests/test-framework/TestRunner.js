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
 * TestResults - Aggregates multiple test results
 */
class TestResults {
  constructor() {
    this.results = [];
  }
  
  addResult(result) {
    this.results.push(result);
  }
  
  getPassed() {
    return this.results.filter(function(r) { return r.passed; });
  }
  
  getFailed() {
    return this.results.filter(function(r) { return !r.passed; });
  }
  
  getPassRate() {
    if (this.results.length === 0) return 0;
    return (this.getPassed().length / this.results.length) * 100;
  }
  
  getSummary() {
    const total = this.results.length;
    const passed = this.getPassed().length;
    const failed = this.getFailed().length;
    const passRate = this.getPassRate().toFixed(1);
    
    return `Tests: ${total}, Passed: ${passed}, Failed: ${failed}, Pass Rate: ${passRate}%`;
  }
  
  getDetailedReport() {
    let report = this.getSummary() + '\n\n';
    
    // Add concise failed tests list
    const failed = this.getFailed();
    if (failed.length > 0) {
      report += 'FAILED TESTS:\n';
      failed.forEach(result => {
        report += `FAIL: ${result.suiteName}.${result.testName} - ${result.error ? result.error.message : 'Unknown error'}\n`;
      });
      report += '\n';
    }
    
    // Add concise passed tests list
    const passed = this.getPassed();
    if (passed.length > 0) {
      report += 'PASSED TESTS:\n';
      passed.forEach(result => {
        report += `PASS: ${result.suiteName}.${result.testName}\n`;
      });
      report += '\n';
    }
    
    return report;
  }
  
  /**
   * Get a compact summary suitable for logging without truncation
   */
  getCompactReport() {
    const total = this.results.length;
    const passed = this.getPassed().length;
    const failed = this.getFailed().length;
    const passRate = this.getPassRate().toFixed(1);
    
    let report = `\n=== TEST RESULTS SUMMARY ===\n`;
    report += `Total: ${total} | Passed: ${passed} | Failed: ${failed} | Pass Rate: ${passRate}%\n\n`;
    
    // Group by suite for better organization
    const suiteGroups = {};
    this.results.forEach(result => {
      if (!suiteGroups[result.suiteName]) {
        suiteGroups[result.suiteName] = { passed: [], failed: [] };
      }
      if (result.passed) {
        suiteGroups[result.suiteName].passed.push(result.testName);
      } else {
        suiteGroups[result.suiteName].failed.push(result.testName);
      }
    });
    
    // Report by suite
    Object.keys(suiteGroups).forEach(suiteName => {
      const suite = suiteGroups[suiteName];
      const suiteTotal = suite.passed.length + suite.failed.length;
      const suitePassed = suite.passed.length;
      
      report += `[${suiteName}] ${suitePassed}/${suiteTotal} passed\n`;
      
      if (suite.failed.length > 0) {
        report += `  FAILED: ${suite.failed.join(', ')}\n`;
      }
      if (suite.passed.length > 0) {
        report += `  PASSED: ${suite.passed.join(', ')}\n`;
      }
      report += '\n';
    });
    
    return report;
  }
}

/**
 * TestSuite - Represents a collection of related tests
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
  }
  
  setBeforeEach(fn) {
    this.beforeEach = fn;
  }
  
  setAfterEach(fn) {
    this.afterEach = fn;
  }
  
  setBeforeAll(fn) {
    this.beforeAll = fn;
  }
  
  setAfterAll(fn) {
    this.afterAll = fn;
  }
  
  runTests() {
    const results = [];
    
    // Run beforeAll if defined
    if (this.beforeAll) {
      try {
        this.beforeAll();
      } catch (error) {
        GASDBLogger.error(`BeforeAll failed for suite ${this.name}: ${error.message}`);
        // Create a failed result for beforeAll
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
}

/**
 * TestRunner - Main test execution engine
 */
class TestRunner {
  constructor() {
    this.testSuites = new Map();
    this.results = new TestResults();
  }
  
  addTestSuite(suite) {
    if (!(suite instanceof TestSuite)) {
      throw new Error('Expected TestSuite instance');
    }
    this.testSuites.set(suite.name, suite);
  }
  
  runAllTests() {
    this.results = new TestResults();
    this.setupEnvironment();
    
    try {
      for (const [suiteName, suite] of this.testSuites) {
        GASDBLogger.info(`Running test suite: ${suiteName}`);
        const suiteResults = suite.runTests();
        suiteResults.forEach(result => this.results.addResult(result));
      }
    } finally {
      this.teardownEnvironment();
    }
    
    this.logResults(this.results);
    return this.results;
  }
  
  runTestSuite(name) {
    const suite = this.testSuites.get(name);
    if (!suite) {
      throw new Error(`Test suite ${name} not found`);
    }
    
    this.results = new TestResults();
    this.setupEnvironment();
    
    try {
      GASDBLogger.info(`Running test suite: ${name}`);
      const suiteResults = suite.runTests();
      suiteResults.forEach(result => this.results.addResult(result));
    } finally {
      this.teardownEnvironment();
    }
    
    this.logResults(this.results);
    return this.results;
  }
  
  /**
   * Run a specific test within a test suite
   * @param {string} suiteName - Name of the test suite
   * @param {string} testName - Name of the specific test
   * @returns {TestResults} Test results object or null if test not found
   */
  runTest(suiteName, testName) {
    const suite = this.testSuites.get(suiteName);
    if (!suite) {
      return null;
    }

    this.results = new TestResults();
    this.setupEnvironment();
    
    try {
      GASDBLogger.info(`Running individual test: ${suiteName}.${testName}`);
      const result = suite.runTest(testName);
      this.results.addResult(result);
    } catch (error) {
      const errorResult = new TestResult(suiteName, testName, false, error, 0);
      this.results.addResult(errorResult);
    } finally {
      this.teardownEnvironment();
    }
    
    this.logResults(this.results);
    return this.results;
  }
  
  setupEnvironment() {
    // Setup any global test environment here
    // For now, just log that we're starting
    GASDBLogger.info('Setting up test environment');
  }
  
  teardownEnvironment() {
    // Cleanup any global test environment here
    // For now, just log that we're done
    GASDBLogger.info('Tearing down test environment');
  }
  
  logResults(results) {
    // First output detailed individual test results
    this.logDetailedResults(results);
    
    // Then output compact summary at the end for easy tail access
    GASDBLogger.info(results.getCompactReport());
  }
  
  logDetailedResults(results) {
    const total = results.results.length;
    const passed = results.getPassed().length;
    const failed = results.getFailed().length;
    const passRate = results.getPassRate().toFixed(1);
    
    GASDBLogger.info(`\n=== DETAILED TEST RESULTS ===`);
    GASDBLogger.info(`Tests: ${total}, Passed: ${passed}, Failed: ${failed}, Pass Rate: ${passRate}%`);
    GASDBLogger.info('');
    
    // Log each test result individually
    results.results.forEach(result => {
      const status = result.passed ? 'PASS' : 'FAIL';
      const time = `(${result.executionTime}ms)`;
      
      if (result.passed) {
        GASDBLogger.info(`${status}: ${result.suiteName}.${result.testName} ${time}`);
      } else {
        GASDBLogger.info(`${status}: ${result.suiteName}.${result.testName} ${time}`);
        if (result.error) {
          GASDBLogger.info(`  Error: ${result.error.message}`);
          if (result.error.stack) {
            GASDBLogger.info(`  Stack: ${result.error.stack}`);
          }
        }
      }
    });
    
    GASDBLogger.info('');
  }
}
