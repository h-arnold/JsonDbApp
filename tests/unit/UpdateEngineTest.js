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

  // New Field Modification Tests
  suite.addTest('testSetVariousDataTypes', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const originalDoc = { a: 1 };
    const update = { $set: { str: 'text', num: 123, bool: true, arr: [1, 2], obj: { k: 'v' }, n: null } };
    const result = engine.applyOperators(originalDoc, update);

    TestFramework.assertEquals('text', result.str, 'Should set string');
    TestFramework.assertEquals(123, result.num, 'Should set number');
    TestFramework.assertTrue(result.bool, 'Should set boolean true');
    TestFramework.assertArrayEquals([1, 2], result.arr, 'Should set array');
    TestFramework.assertEquals('v', result.obj.k, 'Should set object');
    TestFramework.assertNull(result.n, 'Should set null');
    TestFramework.assertEquals(1, result.a, 'Original field unrelated to $set should remain');
    TestFramework.assertEquals(1, originalDoc.a, 'Original document should be unmodified');
  });

  suite.addTest('testSetOnNonExistentTopLevelField', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { existing: 'value' };
    const update = { $set: { newField: 'newValue' } };
    const result = engine.applyOperators(doc, update);

    TestFramework.assertEquals('newValue', result.newField, 'Should create and set new top-level field');
    TestFramework.assertEquals('value', result.existing, 'Existing field should remain');
  });

  suite.addTest('testIncOnNonNumericThrows', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { val: 'text' };
    const update = { $inc: { val: 1 } };

    TestFramework.assertThrows(function() {
      engine.applyOperators(doc, update);
    }, ErrorHandler.ErrorTypes.INVALID_QUERY, 'Should throw when $inc target is non-numeric');
  });

  suite.addTest('testMulOnNonNumericThrows', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { val: 'text' };
    const update = { $mul: { val: 2 } };

    TestFramework.assertThrows(function() {
      engine.applyOperators(doc, update);
    }, ErrorHandler.ErrorTypes.INVALID_QUERY, 'Should throw when $mul target is non-numeric');
  });

  suite.addTest('testMinOnNonComparableThrows', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc1 = { val: 'text' };
    const update1 = { $min: { val: 1 } };
    TestFramework.assertThrows(function() {
      engine.applyOperators(doc1, update1);
    }, ErrorHandler.ErrorTypes.INVALID_QUERY, 'Should throw $min if current value is non-numeric string and new value is number');

    const doc2 = { val: { a: 1 } };
    const update2 = { $min: { val: 10 } };
    TestFramework.assertThrows(function() {
      engine.applyOperators(doc2, update2);
    }, ErrorHandler.ErrorTypes.INVALID_QUERY, 'Should throw $min if current value is object and new value is number');
  });

  suite.addTest('testMaxOnNonComparableThrows', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc1 = { val: 'text' };
    const update1 = { $max: { val: 1 } };
    TestFramework.assertThrows(function() {
      engine.applyOperators(doc1, update1);
    }, ErrorHandler.ErrorTypes.INVALID_QUERY, 'Should throw $max if current value is non-numeric string and new value is number');

    const doc2 = { val: { a: 1 } };
    const update2 = { $max: { val: 10 } };
    TestFramework.assertThrows(function() {
      engine.applyOperators(doc2, update2);
    }, ErrorHandler.ErrorTypes.INVALID_QUERY, 'Should throw $max if current value is object and new value is number');
  });

  suite.addTest('testMultipleOperatorsInSingleUpdate', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { a: 1, b: 10, d: 'original' };
    const update = { $set: { c: 3, d: 'changed' }, $inc: { a: 1 }, $mul: { b: 2 } };
    const result = engine.applyOperators(doc, update);

    TestFramework.assertEquals(2, result.a, '$inc should be applied');
    TestFramework.assertEquals(20, result.b, '$mul should be applied');
    TestFramework.assertEquals(3, result.c, '$set should create new field');
    TestFramework.assertEquals('changed', result.d, '$set should update existing field');
  });

  suite.addTest('testSetCanChangeFieldType', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { field: 123 };
    const update = { $set: { field: 'new string value' } };
    const result = engine.applyOperators(doc, update);

    TestFramework.assertEquals('new string value', result.field, 'Field value should be updated');
    TestFramework.assertEquals('string', typeof result.field, 'Field type should change from number to string');
  });

  suite.addTest('testNumericOperatorsPreserveNumericType', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { num1: 1.5, num2: 5 };
    const update = { $inc: { num1: 1, num2: 2.5 } };
    const result = engine.applyOperators(doc, update);

    TestFramework.assertEquals(2.5, result.num1, '$inc 1.5 + 1 should be 2.5');
    TestFramework.assertEquals('number', typeof result.num1, 'Type should remain number');
    TestFramework.assertEquals(7.5, result.num2, '$inc 5 + 2.5 should be 7.5');
    TestFramework.assertEquals('number', typeof result.num2, 'Type should remain number');
  });

  suite.addTest('testSetNullAndUndefinedBehaviour', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { a: 1, b: 2 };
    const update = { $set: { a: null, c: undefined } }; // Note: 'b' is not set to undefined, 'c' is new
    const result = engine.applyOperators(doc, update);

    TestFramework.assertNull(result.a, 'Field "a" should be set to null');
    TestFramework.assertEquals(2, result.b, 'Field "b" should be untouched');
    TestFramework.assertTrue(Object.prototype.hasOwnProperty.call(result, 'c'), 'Field "c" should exist');
    TestFramework.assertUndefined(result.c, 'Field "c" should be set to undefined');
  });

  suite.addTest('testIncExtremeValues', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc1 = { val: Number.MAX_SAFE_INTEGER };
    const update1 = { $inc: { val: 1 } };
    const result1 = engine.applyOperators(doc1, update1);
    TestFramework.assertEquals(Number.MAX_SAFE_INTEGER + 1, result1.val, 'Should increment MAX_SAFE_INTEGER correctly');

    const doc2 = { val: Number.MAX_VALUE };
    const update2 = { $inc: { val: Number.MAX_VALUE } }; // This will result in Infinity
    const result2 = engine.applyOperators(doc2, update2);
    TestFramework.assertEquals(Infinity, result2.val, 'Should handle incrementing by MAX_VALUE resulting in Infinity');

    const doc3 = { val: -Number.MAX_SAFE_INTEGER };
    const update3 = { $inc: { val: -1 } };
    const result3 = engine.applyOperators(doc3, update3);
    TestFramework.assertEquals(-Number.MAX_SAFE_INTEGER - 1, result3.val, 'Should decrement MIN_SAFE_INTEGER correctly');
  });

  suite.addTest('testMinOnEqualValueNoChange', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { val: 5 };
    const update = { $min: { val: 5 } };
    const result = engine.applyOperators(doc, update);
    TestFramework.assertEquals(5, result.val, '$min with equal value should not change field');
  });

  suite.addTest('testMaxOnEqualValueNoChange', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { val: 10 };
    const update = { $max: { val: 10 } };
    const result = engine.applyOperators(doc, update);
    TestFramework.assertEquals(10, result.val, '$max with equal value should not change field');
  });

  suite.addTest('testEmptyUpdateObjectThrows', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { a: 1 };
    const update = {};
    TestFramework.assertThrows(function() {
      engine.applyOperators(doc, update);
    }, ErrorHandler.ErrorTypes.INVALID_QUERY, 'Should throw for an empty update object');
  });

  suite.addTest('testUpdateObjectWithNoDollarOperatorsThrows', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { a: 1 };
    const update = { a: 2, b: 3 }; // No $ operators
    TestFramework.assertThrows(function() {
      engine.applyOperators(doc, update);
    }, ErrorHandler.ErrorTypes.INVALID_QUERY, 'Should throw if update object contains no $ operators');
  });

  return suite;
}

// Logger for file-level operations like initial suite registration
const updateEngineTestFileLogger = GASDBLogger.createComponentLogger('UpdateEngineTestFile');

// Register suite on default TestFramework instance
try {
  // This is the primary point of creation and registration for the suite.
  // createUpdateEngineTestSuite is called once here when the file loads.
  testFramework.registerTestSuite(createUpdateEngineTestSuite());
} catch (e) {
  // Fallback for environments where 'testFramework' global might not be initialized,
  // or if the above fails for another reason.
  updateEngineTestFileLogger.warn(
    'Direct registration via testFramework failed, attempting global registerTestSuite function.', 
    { error: e.message }
  );
  try {
    registerTestSuite(createUpdateEngineTestSuite()); // Uses global getTestFramework()
  } catch (e2) {
    updateEngineTestFileLogger.error(
      'Fallback global registration also failed for UpdateEngineTestSuite.', 
      { error: e2.message }
    );
  }
}

/**
 * Run all UpdateEngine tests
 * Convenience function to run the UpdateEngine-related suite
 */
function runUpdateEngineTests() {
  const logger = GASDBLogger.createComponentLogger('UpdateEngine-TestRunner');
  const testFramework = new TestFramework();
  try {
    logger.info('Starting UpdateEngine test execution');

    // The suite should have been registered when this file was loaded.
    // Add a check for robustness.
    if (!testFramework.hasTestSuite('UpdateEngine Tests')) {
      logger.warn('UpdateEngineTestSuite not found during run. Attempting to register now.');
      // Attempt to register it again, using the same logic as at file load.
      try {
        testFramework.registerTestSuite(createUpdateEngineTestSuite());
      } catch (e) {
        logger.warn('Direct re-registration via testFramework failed, trying global registerTestSuite function.', { error: e.message });
        try {
          registerTestSuite(createUpdateEngineTestSuite());
        } catch (e2) {
          logger.error('Failed to register UpdateEngineTestSuite even during run.', { error: e2.message });
          // Depending on desired strictness, could throw an error here.
          // For now, proceed, runAllTests might still pick up other suites or fail gracefully.
        }
      }
    }
    
    // Execute all registered tests (as per original log and structure)
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
    logger.error('Error occurred during UpdateEngine test execution', { error: error.message });
    throw error;
  }
}
