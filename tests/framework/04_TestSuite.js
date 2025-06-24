/**
 * TestSuite.js - Test suite management and execution
 * 
 * Contains the TestSuite class for managing collections of related tests
 * with lifecycle hooks and individual test execution.
 */

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
      GASDBLogger.info(`Running test: ${testName}`);
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
