/**
 * UpdateEngineTest.js - UpdateEngine Class Tests (Section 7 - Red Phase)
 *
 * Comprehensive tests for the UpdateEngine class including:
 * - Basic update operator application
 * - Nested field updates
 * - Array update operations
 * - Error handling for invalid operators
 *
 * Following TDD Red-Green-Refactor cycle for Section 7 implementation
 */

const UPDATE_ENGINE_TEST_DATA = {
  testEngine: null
};

/**
 * Setup test environment for UpdateEngine
 */
function setupUpdateEngineTestEnvironment() {
  UPDATE_ENGINE_TEST_DATA.testEngine = new UpdateEngine();
}

/**
 * Cleanup test environment
 */
function cleanupUpdateEngineTestEnvironment() {
  UPDATE_ENGINE_TEST_DATA.testEngine = null;
}

/**
 * Creates the UpdateEngine test suite with all operator tests
 */
function createUpdateEngineTestSuite() {
  const suite = new TestSuite('UpdateEngine Tests');

  suite.setBeforeAll(function() {
    setupUpdateEngineTestEnvironment();
  });

  suite.setAfterAll(function() {
    cleanupUpdateEngineTestEnvironment();
  });

  suite.addTest('testUpdateEngineSetStringField', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { name: 'Alice' };
    const update = { $set: { name: 'Bob' } };
    const result = engine.applyOperators(doc, update);
    TestFramework.assertEquals('Bob', result.name, 'Should update string field');
    TestFramework.assertEquals('Alice', doc.name, 'Original document should be unmodified');
  });

  suite.addTest('testUpdateEngineSetCreatesDeepPath', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = {};
    const update = { $set: { 'a.b.c': 5 } };
    const result = engine.applyOperators(doc, update);
    TestFramework.assertEquals(5, result.a.b.c, 'Should create deep path and set value');
  });

  suite.addTest('testUpdateEngineIncPositive', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { count: 1 };
    const update = { $inc: { count: 2 } };
    const result = engine.applyOperators(doc, update);
    TestFramework.assertEquals(3, result.count, 'Should increment positive value');
  });

  suite.addTest('testUpdateEngineIncNegative', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { count: 5 };
    const update = { $inc: { count: -2 } };
    const result = engine.applyOperators(doc, update);
    TestFramework.assertEquals(3, result.count, 'Should increment negative value');
  });

  suite.addTest('testUpdateEngineMulNumber', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { count: 2 };
    const update = { $mul: { count: 3 } };
    const result = engine.applyOperators(doc, update);
    TestFramework.assertEquals(6, result.count, 'Should multiply numeric value');
  });

  suite.addTest('testUpdateEngineMinNumeric', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { value: 10 };
    const update = { $min: { value: 5 } };
    const result = engine.applyOperators(doc, update);
    TestFramework.assertEquals(5, result.value, 'Should set minimum numeric value');
  });

  suite.addTest('testUpdateEngineMaxValue', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { value: 10 };
    const update = { $max: { value: 15 } };
    const result = engine.applyOperators(doc, update);
    TestFramework.assertEquals(15, result.value, 'Should set maximum numeric value');
  });

  suite.addTest('testUpdateEngineUnsetSimpleField', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { a: 1, b: 2 };
    const update = { $unset: { a: '' } };
    const result = engine.applyOperators(doc, update);
    TestFramework.assertUndefined(result.a, 'Should unset simple field');
    TestFramework.assertEquals(2, result.b, 'Other fields should remain');
  });

  suite.addTest('testUpdateEngineUnsetNestedField', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { a: { b: 2, c: 3 } };
    const update = { $unset: { 'a.b': '' } };
    const result = engine.applyOperators(doc, update);
    TestFramework.assertUndefined(result.a.b, 'Should unset nested field');
    TestFramework.assertEquals(3, result.a.c, 'Other nested fields should remain');
  });

  suite.addTest('testUpdateEnginePushArrayValue', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { arr: [1, 2] };
    const update = { $push: { arr: 3 } };
    const result = engine.applyOperators(doc, update);
    TestFramework.assertArrayEquals([1, 2, 3], result.arr, 'Should push value into array');
  });

  suite.addTest('testUpdateEnginePullArrayValue', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { arr: [1, 2, 3, 2] };
    const update = { $pull: { arr: 2 } };
    const result = engine.applyOperators(doc, update);
    TestFramework.assertArrayEquals([1, 3], result.arr, 'Should pull all matching values');
  });

  suite.addTest('testUpdateEngineAddToSetUnique', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { arr: [1, 2] };
    const update = { $addToSet: { arr: 2 } };
    const result = engine.applyOperators(doc, update);
    TestFramework.assertArrayEquals([1, 2], result.arr, 'Should not add duplicate to set');
  });

  suite.addTest('testUpdateEngineInvalidOperatorThrows', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { a: 1 };
    const update = { $foo: { a: 2 } };
    TestFramework.assertThrows(function() {
      engine.applyOperators(doc, update);
    }, ErrorHandler.ErrorTypes.INVALID_QUERY, 'Should throw invalid query error for unknown operator');
  });

  // Register suite with global framework
  registerTestSuite(suite);
  return suite;
}

// Register suite on default TestFramework instance
try {
  testFramework.registerTestSuite(createUpdateEngineTestSuite());
} catch (e) {
  // Fallback to global registration
}

/**
 * Run all UpdateEngine tests
 * Convenience function to run the UpdateEngine-related suite
 */
function runUpdateEngineTests() {
  const logger = GASDBLogger.createComponentLogger('UpdateEngine-TestRunner');
  try {
    logger.info('Starting UpdateEngine test execution');
    // Ensure suite is registered
    createUpdateEngineTestSuite();
    // Execute all registered tests
    const results = runAllTests();
    // Log detailed results
    results.logComprehensiveResults();
    logger.info('UpdateEngine test execution completed', {
      totalTests: results.results.length,
      passed: results.getPassed().length,
      failed: results.getFailed().length,
      passRate: results.getPassRate(),
      executionTime: results.getTotalExecutionTime()
    });
    return results;
  } catch (error) {
    logger.error('Failed to run UpdateEngine tests', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}
