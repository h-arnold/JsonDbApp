/**
 * 04_ArrayUpdateOperators.js - End-to-end validation tests for array update operators
 *
 * Tests MongoDB-compatible array update operators ($push, $pull, $addToSet) against ValidationMockData
 * using full database functionality including Collection, MasterIndex, and file persistence.
 */

/**
 * Create test suite for $push operator - Appending elements to arrays
 * @returns {TestSuite} Test suite for $push operations
 */
function createPushOperatorTestSuite() {
  const suite = new TestSuite('$push Operator Tests');

  // Basic array appending
  suite.addTest('should append a single value to an existing array', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $push: { 'preferences.tags': 'new-tag' } }
    );
    JDbLogger.debug(`'should append a single value to an existing array' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    JDbLogger.debug(`'should append a single value to an existing array' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertDeepEquals(['sports', 'music', 'new-tag'], updated.preferences.tags, 'Should append new tag to array');
  });

  suite.addTest('should append an object value to an array', function() {
    const collection = VALIDATION_TEST_ENV.collections.inventory;
    const newAlert = { type: 'high-temp', value: 30 };
    const result = collection.updateOne(
      { _id: 'inv1' },
      { $push: { alerts: newAlert } }
    );
    JDbLogger.debug(`'should append an object value to an array' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'inv1' });
    JDbLogger.debug(`'should append an object value to an array' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(3, updated.alerts.length, 'Should have 3 alerts');
    TestFramework.assertDeepEquals(newAlert, updated.alerts[2], 'Should append new alert object');
  });

  // Array creation
  suite.addTest('should create array when pushing to a non-existent field', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person2' },
      { $push: { newArrayField: 'first-element' } }
    );
    JDbLogger.debug(`'should create array when pushing to a non-existent field' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person2' });
    JDbLogger.debug(`'should create array when pushing to a non-existent field' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertDeepEquals(['first-element'], updated.newArrayField, 'Should create new array with one element');
  });

  suite.addTest('should create array when pushing to a nested non-existent field', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person2' },
      { $push: { 'newly.nested.array': 'deep-value' } }
    );
    JDbLogger.debug(`'should create array when pushing to a nested non-existent field' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person2' });
    JDbLogger.debug(`'should create array when pushing to a nested non-existent field' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertDeepEquals(['deep-value'], updated.newly.nested.array, 'Should create deeply nested array');
  });

  // Type validation
  suite.addTest('should throw error when pushing to a non-array field', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    TestFramework.assertThrows(function() {
      collection.updateOne(
        { _id: 'person1' },
        { $push: { 'name.first': 'invalid' } }
      );
    }, null, 'Should throw error when pushing to a string');
  });

  // $each modifier
  suite.addTest('should push multiple values with $each modifier', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person4' },
      { $push: { 'preferences.tags': { $each: ['new1', 'new2', 'new3'] } } }
    );
    JDbLogger.debug(`'should push multiple values with $each modifier' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person4' });
    JDbLogger.debug(`'should push multiple values with $each modifier' updated: 
${JSON.stringify(updated, null, 2)}`);
    const expected = ['travel', 'photography', 'music', 'new1', 'new2', 'new3'];
    TestFramework.assertDeepEquals(expected, updated.preferences.tags, 'Should append multiple new tags');
  });

  suite.addTest('should handle empty array with $each modifier', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const original = collection.findOne({ _id: 'person5' });
    JDbLogger.debug(`'should handle empty array with $each modifier' original: 
${JSON.stringify(original, null, 2)}`);
    const originalTags = original.preferences.tags;

    const result = collection.updateOne(
      { _id: 'person5' },
      { $push: { 'preferences.tags': { $each: [] } } }
    );
    JDbLogger.debug(`'should handle empty array with $each modifier' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(0, result.modifiedCount, 'Should report 0 modified documents for a no-op push');
    const updated = collection.findOne({ _id: 'person5' });
    JDbLogger.debug(`'should handle empty array with $each modifier' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertDeepEquals(originalTags, updated.preferences.tags, 'Tags array should be unchanged');
  });

  suite.addTest('should push array of objects with $each', function() {
    const collection = VALIDATION_TEST_ENV.collections.inventory;
    const newAlerts = [{ type: 'audit', user: 'system' }, { type: 'reorder', product: 'prod2' }];
    const result = collection.updateOne(
      { _id: 'inv2' },
      { $push: { alerts: { $each: newAlerts } } }
    );
    JDbLogger.debug(`'should push array of objects with $each' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'inv2' });
    JDbLogger.debug(`'should push array of objects with $each' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(2, updated.alerts.length, 'Should have 2 alerts');
    TestFramework.assertDeepEquals(newAlerts, updated.alerts, 'Should append new alert object');
  });

  return suite;
}

/**
 * Create test suite for $pull operator - Removing elements from arrays
 * @returns {TestSuite} Test suite for $pull operations
 */
function createPullOperatorTestSuite() {
  const suite = new TestSuite('$pull Operator Tests');

  // Basic value removal
  suite.addTest('should remove a specific value from an array', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person3' },
      { $pull: { 'preferences.tags': 'alerts' } }
    );
    JDbLogger.debug(`'should remove a specific value from an array' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person3' });
    JDbLogger.debug(`'should remove a specific value from an array' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertDeepEquals(['news', 'sports'], updated.preferences.tags, 'Should remove "alerts" tag');
  });

  suite.addTest('should remove all occurrences of a value', function() {
    const collection = VALIDATION_TEST_ENV.collections.orders;
    const result = collection.updateOne(
      { _id: 'order3' },
      { $pull: { 'items': { sku: 'prod1', quantity: 1, price: 9.99, category: 'electronics' } } }
    );
    JDbLogger.debug(`'should remove all occurrences of a value' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'order3' });
    JDbLogger.debug(`'should remove all occurrences of a value' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(2, updated.items.length, 'Should have 2 items left');
    const remainingSkus = updated.items.map(item => item.sku);
    JDbLogger.debug(`'should remove all occurrences of a value' remainingSkus: 
${JSON.stringify(remainingSkus, null, 2)}`);
    TestFramework.assertFalse(remainingSkus.includes('prod1'), 'Should remove all items matching prod1 exactly');
  });

  // Edge cases
  suite.addTest('should handle pulling from a non-array field gracefully', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    // This should not throw an error, but simply not modify the document
    TestFramework.assertNoThrow(function() {
        const result = collection.updateOne(
            { _id: 'person1' },
            { $pull: { 'name.first': 'Anna' } }
        );
        JDbLogger.debug(`'should handle pulling from a non-array field gracefully' result: 
${JSON.stringify(result, null, 2)}`);
        TestFramework.assertEquals(0, result.modifiedCount, 'Should not modify document');
    }, 'Pulling from non-array should not throw');
  });

  suite.addTest('should handle pulling a non-existent value', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const original = collection.findOne({ _id: 'person1' });
    JDbLogger.debug(`'should handle pulling a non-existent value' original: 
${JSON.stringify(original, null, 2)}`);
    const originalTags = original.preferences.tags;

    const result = collection.updateOne(
      { _id: 'person1' },
      { $pull: { 'preferences.tags': 'non-existent-tag' } }
    );
    JDbLogger.debug(`'should handle pulling a non-existent value' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(0, result.modifiedCount, 'Should not modify document');
    const updated = collection.findOne({ _id: 'person1' });
    JDbLogger.debug(`'should handle pulling a non-existent value' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertDeepEquals(originalTags, updated.preferences.tags, 'Tags array should be unchanged');
  });

  suite.addTest('should handle pulling from an empty array', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person2' },
      { $pull: { 'preferences.tags': 'any-tag' } }
    );
    JDbLogger.debug(`'should handle pulling from an empty array' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(0, result.modifiedCount, 'Should not modify document');
    const updated = collection.findOne({ _id: 'person2' });
    JDbLogger.debug(`'should handle pulling from an empty array' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertDeepEquals([], updated.preferences.tags, 'Tags array should remain empty');
  });

  return suite;
}

/**
 * Convenience function to run all array update operator test suites
 * @returns {TestResults} Combined results from all array update operator test suites
 */
function runArrayUpdateOperatorTests() {
  const logger = JDbLogger.createComponentLogger('ValidationTests-ArrayUpdateQuick');
  logger.info('Running all array update operator tests...');

  let combinedResults = new TestResults();

  try {
    // Setup test environment
    setupValidationTestEnvironmentForTests();
    
    // Initialise test framework
    const framework = initialiseValidationTests();
    
    // Validate environment before running tests
    framework.validateEnvironment();

    // Run array update operator test suites
    const suiteNames = [
      '$push Operator Tests',
      '$pull Operator Tests'
    ];

    for (const suiteName of suiteNames) {
      try {
        logger.info(`Running suite: ${suiteName}`);
        const suiteResult = framework.runTestSuite(suiteName);
        
        suiteResult.results.forEach(result => {
          combinedResults.addResult(result);
        });
        
        logger.info(`Completed ${suiteName}`, {
          passed: suiteResult.getPassed().length,
          failed: suiteResult.getFailed().length
        });
      } catch (error) {
        logger.error(`Failed to run ${suiteName}`, { error: error.message });
        throw error;
      }
    }

    combinedResults.finish();

    logger.info('All array update operator tests completed', {
      totalSuites: suiteNames.length,
      totalTests: combinedResults.results.length,
      passed: combinedResults.getPassed().length,
      failed: combinedResults.getFailed().length
    });

    return combinedResults;

  } catch (error) {
    logger.error('Array update operator tests failed', { error: error.message });
    throw error;

  } finally {
    try {
      cleanupValidationTestEnvironment();
    } catch (cleanupError) {
      logger.error('Cleanup failed', { error: cleanupError.message });
    }
  }
}

/* exported 
   createPushOperatorTestSuite, 
   createPullOperatorTestSuite,
   runArrayUpdateOperatorTests
*/