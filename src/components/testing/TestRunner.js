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
    return this.results.filter(r => r.passed);
  }
  
  getFailed() {
    return this.results.filter(r => !r.passed);
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
    
    // Add failed tests first
    const failed = this.getFailed();
    if (failed.length > 0) {
      report += 'FAILED TESTS:\n';
      failed.forEach(result => {
        report += result.toString() + '\n\n';
      });
    }
    
    // Add summary of passed tests
    const passed = this.getPassed();
    if (passed.length > 0) {
      report += 'PASSED TESTS:\n';
      passed.forEach(result => {
        report += `PASS: ${result.suiteName}.${result.testName} (${result.executionTime}ms)\n`;
      });
    }
    
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
        Logger.error(`BeforeAll failed for suite ${this.name}: ${error.message}`);
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
        Logger.error(`AfterAll failed for suite ${this.name}: ${error.message}`);
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
        Logger.info(`Running test suite: ${suiteName}`);
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
      Logger.info(`Running test suite: ${name}`);
      const suiteResults = suite.runTests();
      suiteResults.forEach(result => this.results.addResult(result));
    } finally {
      this.teardownEnvironment();
    }
    
    this.logResults(this.results);
    return this.results;
  }
  
  runTest(suiteName, testName) {
    const suite = this.testSuites.get(suiteName);
    if (!suite) {
      throw new Error(`Test suite ${suiteName} not found`);
    }
    
    this.setupEnvironment();
    
    try {
      Logger.info(`Running test: ${suiteName}.${testName}`);
      const result = suite.runTest(testName);
      this.results = new TestResults();
      this.results.addResult(result);
      
      this.logResults(this.results);
      return result;
    } finally {
      this.teardownEnvironment();
    }
  }
  
  setupEnvironment() {
    // Setup any global test environment here
    // For now, just log that we're starting
    Logger.info('Setting up test environment');
  }
  
  teardownEnvironment() {
    // Cleanup any global test environment here
    // For now, just log that we're done
    Logger.info('Tearing down test environment');
  }
  
  logResults(results) {
    Logger.info('\n' + results.getDetailedReport());
  }
}

// Global test runner instance
var GlobalTestRunner = new TestRunner();
