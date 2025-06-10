/**
 * TestResult.js - Test result data structures and reporting
 * 
 * Contains classes for individual test results and aggregated result collections
 * with comprehensive reporting capabilities.
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
            if (result.error.stack) {
              report += `      Stack: ${result.error.stack}\n`;
            }
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
  
  /**
   * Log comprehensive test results using separate console calls to prevent truncation
   * @param {Function} loggerFunction - The logger function to use (e.g., GASDBLogger.info)
   */
  logComprehensiveResults(loggerFunction = console.log) {
    this._logTestSummary(loggerFunction);
    loggerFunction(''); // Empty line
    
    const suiteGroups = this._groupResultsBySuite();
    Object.keys(suiteGroups).forEach(suiteName => {
      this._logSuiteResults(suiteName, suiteGroups[suiteName], loggerFunction);
    });
  }
  
  /**
   * Log the overall test summary header
   * @private
   */
  _logTestSummary(loggerFunction) {
    const total = this.results.length;
    const passed = this.getPassed().length;
    const failed = this.getFailed().length;
    const passRate = this.getPassRate().toFixed(1);
    const totalTime = this.getTotalExecutionTime();
    
    loggerFunction('=== COMPREHENSIVE TEST RESULTS ===');
    loggerFunction(`Total: ${total} | Passed: ${passed} | Failed: ${failed} | Pass Rate: ${passRate}%`);
    loggerFunction(`Execution Time: ${totalTime}ms | Started: ${this.startTime.toISOString()}`);
  }
  
  /**
   * Group test results by suite name
   * @private
   * @returns {Object} Grouped results by suite
   */
  _groupResultsBySuite() {
    const suiteGroups = {};
    this.results.forEach(result => {
      if (!suiteGroups[result.suiteName]) {
        suiteGroups[result.suiteName] = { passed: [], failed: [] };
      }
      suiteGroups[result.suiteName][result.passed ? 'passed' : 'failed'].push(result);
    });
    return suiteGroups;
  }
  
  /**
   * Log results for a single test suite
   * @private
   */
  _logSuiteResults(suiteName, suite, loggerFunction) {
    const suiteTotal = suite.passed.length + suite.failed.length;
    const suitePassed = suite.passed.length;
    const suitePassRate = suiteTotal > 0 ? ((suitePassed / suiteTotal) * 100).toFixed(1) : '0.0';
    
    loggerFunction(`[${suiteName}] ${suitePassed}/${suiteTotal} passed (${suitePassRate}%)`);
    
    this._logFailedTests(suite.failed, loggerFunction);
    this._logPassedTests(suite.passed, loggerFunction);
    
    loggerFunction(''); // Empty line between suites
  }
  
  /**
   * Log failed test results with error details
   * @private
   */
  _logFailedTests(failedTests, loggerFunction) {
    if (failedTests.length === 0) return;
    
    loggerFunction('  FAILED:');
    failedTests.forEach(result => {
      const testOutput = this._formatFailedTestOutput(result);
      loggerFunction(testOutput);
    });
  }
  
  /**
   * Log passed test results
   * @private
   */
  _logPassedTests(passedTests, loggerFunction) {
    if (passedTests.length === 0) return;
    
    loggerFunction('  PASSED:');
    passedTests.forEach(result => {
      loggerFunction(`    ✓ ${result.testName} (${result.executionTime}ms)`);
    });
  }
  
  /**
   * Format failed test output as a single string
   * @private
   */
  _formatFailedTestOutput(result) {
    let output = `    ✗ ${result.testName} (${result.executionTime}ms)`;
    
    if (result.error) {
      output += `\n      Error: ${result.error.message}`;
      if (result.error.stack) {
        output += `\n      Stack: ${result.error.stack}`;
      }
    }
    
    return output;
  }
}
