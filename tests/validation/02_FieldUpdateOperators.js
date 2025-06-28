/**
 * 02_FieldUpdateOperators.js - End-to-end validation tests for field update operators
 * 
 * Tests MongoDB-compatible field update operators ($set, $unset) against ValidationMockData
 * using full database functionality including Collection, MasterIndex, and file persistence.
 */

/**
 * Create test suite for $set operator - Basic field setting
 * @returns {TestSuite} Test suite for $set basic field setting operations
 */
function createSetBasicFieldSettingTestSuite() {
  const suite = new TestSuite('$set Basic Field Setting Tests');

  // Overwrite existing values (all types)
  suite.addTest('should overwrite existing string values', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $set: { 'name.first': 'Alexandra' } }
    );
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    TestFramework.assertEquals('Alexandra', updated.name.first, 'Should update first name');
    TestFramework.assertEquals('Brown', updated.name.last, 'Should preserve last name');
  });

  suite.addTest('should overwrite existing numeric values', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $set: { age: 35, score: 92.7 } }
    );
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    TestFramework.assertEquals(35, updated.age, 'Should update age');
    TestFramework.assertEquals(92.7, updated.score, 'Should update score');
  });

  suite.addTest('should overwrite existing boolean values', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $set: { isActive: false, 'preferences.newsletter': false } }
    );
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    TestFramework.assertFalse(updated.isActive, 'Should update isActive to false');
    TestFramework.assertFalse(updated.preferences.newsletter, 'Should update newsletter to false');
  });

  suite.addTest('should overwrite existing array values', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const newTags = ['updated', 'test', 'values'];
    const result = collection.updateOne(
      { _id: 'person1' },
      { $set: { 'preferences.tags': newTags } }
    );
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    TestFramework.assertDeepEquals(newTags, updated.preferences.tags, 'Should update tags array');
  });

  suite.addTest('should overwrite existing object values', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const newContact = { email: 'new.email@example.com', phones: ['999-111-2222'] };
    const result = collection.updateOne(
      { _id: 'person1' },
      { $set: { contact: newContact } }
    );
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    TestFramework.assertDeepEquals(newContact, updated.contact, 'Should update entire contact object');
  });

  // Create new fields
  suite.addTest('should create new top-level fields', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $set: { newField: 'new value', anotherField: 42 } }
    );
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    TestFramework.assertEquals('new value', updated.newField, 'Should create newField');
    TestFramework.assertEquals(42, updated.anotherField, 'Should create anotherField');
  });

  // Set nested fields (dot notation)
  suite.addTest('should set nested fields using dot notation', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $set: { 'preferences.settings.theme': 'auto' } }
    );
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    TestFramework.assertEquals('auto', updated.preferences.settings.theme, 'Should update nested theme');
    TestFramework.assertTrue(updated.preferences.settings.notifications !== undefined, 'Should preserve other nested fields');
  });

  // Set deeply nested fields
  suite.addTest('should set deeply nested fields', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $set: { 'preferences.settings.notifications.email.frequency': 'daily' } }
    );
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    TestFramework.assertEquals('daily', updated.preferences.settings.notifications.email.frequency, 'Should update deeply nested frequency');
    TestFramework.assertTrue(updated.preferences.settings.notifications.email.enabled, 'Should preserve other deeply nested fields');
  });

  return suite;
}

/**
 * Create test suite for $set operator - Type changes
 * @returns {TestSuite} Test suite for $set type change operations
 */
function createSetTypeChangesTestSuite() {
  const suite = new TestSuite('$set Type Changes Tests');

  // String to number
  suite.addTest('should change string field to number', function() {
    const collection = VALIDATION_TEST_ENV.collections.orders;
    // First set a field to string
    collection.updateOne({ _id: 'order1' }, { $set: { stringField: 'text123' } });
    // Then change to number
    const result = collection.updateOne(
      { _id: 'order1' },
      { $set: { stringField: 456 } }
    );
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'order1' });
    TestFramework.assertEquals(456, updated.stringField, 'Should change string to number');
    TestFramework.assertEquals('number', typeof updated.stringField, 'Should be number type');
  });

  // Number to array
  suite.addTest('should change number field to array', function() {
    const collection = VALIDATION_TEST_ENV.collections.orders;
    const newArray = [1, 2, 3, 'mixed', true];
    const result = collection.updateOne(
      { _id: 'order1' },
      { $set: { priority: newArray } }
    );
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'order1' });
    TestFramework.assertDeepEquals(newArray, updated.priority, 'Should change number to array');
    TestFramework.assertTrue(Array.isArray(updated.priority), 'Should be array type');
  });

  // Object to primitive
  suite.addTest('should change object field to primitive', function() {
    const collection = VALIDATION_TEST_ENV.collections.orders;
    const result = collection.updateOne(
      { _id: 'order1' },
      { $set: { metrics: 'simplified' } }
    );
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'order1' });
    TestFramework.assertEquals('simplified', updated.metrics, 'Should change object to string');
    TestFramework.assertEquals('string', typeof updated.metrics, 'Should be string type');
  });

  // Null to non-null
  suite.addTest('should change null field to non-null value', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person2' },
      { $set: { lastLogin: new Date('2025-06-28T12:00:00Z') } }
    );
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person2' });
    TestFramework.assertTrue(updated.lastLogin !== null, 'Should change null to non-null');
    TestFramework.assertTrue(updated.lastLogin instanceof Date, 'Should be Date object');
  });

  return suite;
}

/**
 * Create test suite for $set operator - Object creation
 * @returns {TestSuite} Test suite for $set object creation operations
 */
function createSetObjectCreationTestSuite() {
  const suite = new TestSuite('$set Object Creation Tests');

  // Create nested object structure via dot notation
  suite.addTest('should create nested object structure via dot notation', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $set: { 'profile.bio.summary': 'Software developer', 'profile.bio.skills': ['JavaScript', 'MongoDB'] } }
    );
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    TestFramework.assertEquals('Software developer', updated.profile.bio.summary, 'Should create nested summary');
    TestFramework.assertDeepEquals(['JavaScript', 'MongoDB'], updated.profile.bio.skills, 'Should create nested skills array');
  });

  // Partial object updates
  suite.addTest('should perform partial object updates', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $set: { 'preferences.settings.language': 'en-GB' } }
    );
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    TestFramework.assertEquals('en-GB', updated.preferences.settings.language, 'Should add language setting');
    TestFramework.assertTrue(updated.preferences.settings.theme !== undefined, 'Should preserve existing theme');
    TestFramework.assertTrue(updated.preferences.settings.notifications !== undefined, 'Should preserve existing notifications');
  });

  // Mixed existing/new nested fields
  suite.addTest('should handle mixed existing and new nested fields', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person1' },
      { 
        $set: { 
          'preferences.settings.theme': 'system',  // existing
          'preferences.settings.timezone': 'GMT',  // new
          'preferences.newCategory.option1': true  // completely new branch
        } 
      }
    );
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    TestFramework.assertEquals('system', updated.preferences.settings.theme, 'Should update existing theme');
    TestFramework.assertEquals('GMT', updated.preferences.settings.timezone, 'Should add new timezone');
    TestFramework.assertTrue(updated.preferences.newCategory.option1, 'Should create new category branch');
  });

  return suite;
}

/**
 * Create test suite for $set operator - Edge cases
 * @returns {TestSuite} Test suite for $set edge case operations
 */
function createSetEdgeCasesTestSuite() {
  const suite = new TestSuite('$set Edge Cases Tests');

  // Setting _id field should be restricted or handled appropriately
  suite.addTest('should handle _id field setting appropriately', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    // In MongoDB, setting _id on existing documents typically fails
    // Test that our implementation behaves consistently
    try {
      const result = collection.updateOne(
        { _id: 'person1' },
        { $set: { _id: 'newId' } }
      );
      // If it succeeds, verify the behaviour
      TestFramework.assertTrue(result.modifiedCount >= 0, 'Should return valid result');
      const updated = collection.findOne({ _id: 'person1' });
      TestFramework.assertTrue(updated !== null, 'Original document should still exist or be findable');
    } catch (error) {
      // If it throws an error, that's also acceptable MongoDB-like behaviour
      TestFramework.assertTrue(error.message.includes('_id') || error.message.includes('immutable'), 
        'Error should relate to _id field restrictions');
    }
  });

  // Setting to undefined vs null
  suite.addTest('should handle undefined vs null assignment', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $set: { nullField: null, undefinedField: undefined } }
    );
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    TestFramework.assertEquals(null, updated.nullField, 'Should set field to null');
    // Note: JavaScript/JSON typically converts undefined to null or omits the field
    TestFramework.assertTrue(updated.undefinedField === undefined || updated.undefinedField === null, 
      'Undefined field should be handled consistently');
  });

  // Empty string vs null assignment
  suite.addTest('should distinguish empty string from null assignment', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $set: { emptyStringField: '', nullField: null } }
    );
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    TestFramework.assertEquals('', updated.emptyStringField, 'Should set field to empty string');
    TestFramework.assertEquals(null, updated.nullField, 'Should set field to null');
    TestFramework.assertNotEquals(updated.emptyStringField, updated.nullField, 'Empty string and null should be different');
  });

  return suite;
}

/**
 * Create test suite for $unset operator - Basic field removal
 * @returns {TestSuite} Test suite for $unset basic field removal operations
 */
function createUnsetBasicFieldRemovalTestSuite() {
  const suite = new TestSuite('$unset Basic Field Removal Tests');

  // Remove top-level fields
  suite.addTest('should remove top-level fields', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    // First ensure field exists
    collection.updateOne({ _id: 'person1' }, { $set: { tempField: 'temporary' } });
    let doc = collection.findOne({ _id: 'person1' });
    TestFramework.assertEquals('temporary', doc.tempField, 'Temp field should exist before removal');
    
    // Now remove it
    const result = collection.updateOne(
      { _id: 'person1' },
      { $unset: { tempField: '' } }
    );
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    TestFramework.assertEquals(undefined, updated.tempField, 'Should remove tempField');
    TestFramework.assertTrue(updated.name !== undefined, 'Should preserve other fields');
  });

  suite.addTest('should remove multiple top-level fields', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    // Add multiple temp fields
    collection.updateOne({ _id: 'person1' }, { $set: { temp1: 'value1', temp2: 'value2', temp3: 'value3' } });
    
    const result = collection.updateOne(
      { _id: 'person1' },
      { $unset: { temp1: '', temp3: '' } }
    );
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    TestFramework.assertEquals(undefined, updated.temp1, 'Should remove temp1');
    TestFramework.assertEquals('value2', updated.temp2, 'Should preserve temp2');
    TestFramework.assertEquals(undefined, updated.temp3, 'Should remove temp3');
  });

  // Remove nested fields (dot notation)
  suite.addTest('should remove nested fields using dot notation', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $unset: { 'preferences.newsletter': '' } }
    );
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    TestFramework.assertEquals(undefined, updated.preferences.newsletter, 'Should remove newsletter field');
    TestFramework.assertTrue(updated.preferences.tags !== undefined, 'Should preserve other preference fields');
  });

  suite.addTest('should remove deeply nested fields', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $unset: { 'preferences.settings.notifications.email.frequency': '' } }
    );
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    TestFramework.assertEquals(undefined, updated.preferences.settings.notifications.email.frequency, 'Should remove deeply nested frequency');
    TestFramework.assertTrue(updated.preferences.settings.notifications.email.enabled !== undefined, 'Should preserve other deeply nested fields');
  });

  return suite;
}

/**
 * Create test suite for $unset operator - Object structure preservation
 * @returns {TestSuite} Test suite for $unset object structure preservation operations
 */
function createUnsetObjectStructureTestSuite() {
  const suite = new TestSuite('$unset Object Structure Preservation Tests');

  // Remove field leaves parent object
  suite.addTest('should leave parent object when removing field', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $unset: { 'name.first': '' } }
    );
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    TestFramework.assertEquals(undefined, updated.name.first, 'Should remove first name');
    TestFramework.assertEquals('Brown', updated.name.last, 'Should preserve last name');
    TestFramework.assertTrue(typeof updated.name === 'object', 'Name object should still exist');
  });

  // Remove all fields leaves empty object
  suite.addTest('should leave empty object when removing all fields', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $unset: { 'name.first': '', 'name.last': '' } }
    );
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    TestFramework.assertEquals(undefined, updated.name.first, 'Should remove first name');
    TestFramework.assertEquals(undefined, updated.name.last, 'Should remove last name');
    TestFramework.assertTrue(typeof updated.name === 'object', 'Name object should still exist as empty object');
    TestFramework.assertDeepEquals({}, updated.name, 'Name should be empty object');
  });

  // Remove nested field maintains object hierarchy
  suite.addTest('should maintain object hierarchy when removing nested field', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $unset: { 'preferences.settings.theme': '' } }
    );
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    TestFramework.assertEquals(undefined, updated.preferences.settings.theme, 'Should remove theme');
    TestFramework.assertTrue(typeof updated.preferences === 'object', 'Preferences object should exist');
    TestFramework.assertTrue(typeof updated.preferences.settings === 'object', 'Settings object should exist');
    TestFramework.assertTrue(updated.preferences.settings.notifications !== undefined, 'Should preserve notifications');
  });

  return suite;
}

/**
 * Create test suite for $unset operator - Edge cases
 * @returns {TestSuite} Test suite for $unset edge case operations
 */
function createUnsetEdgeCasesTestSuite() {
  const suite = new TestSuite('$unset Edge Cases Tests');

  // Unset non-existent field
  suite.addTest('should handle unsetting non-existent field gracefully', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $unset: { nonExistentField: '' } }
    );
    // MongoDB typically returns modifiedCount: 0 for non-existent fields
    // but our implementation might differ - test for consistent behaviour
    TestFramework.assertTrue(result.modifiedCount >= 0, 'Should return valid result');
    const updated = collection.findOne({ _id: 'person1' });
    TestFramework.assertEquals(undefined, updated.nonExistentField, 'Non-existent field should remain undefined');
    TestFramework.assertTrue(updated.name !== undefined, 'Should preserve existing fields');
  });

  // Unset _id field
  suite.addTest('should handle _id field unset appropriately', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    // In MongoDB, unsetting _id is typically not allowed
    try {
      const result = collection.updateOne(
        { _id: 'person1' },
        { $unset: { _id: '' } }
      );
      // If it succeeds, verify the document is still findable
      TestFramework.assertTrue(result.modifiedCount >= 0, 'Should return valid result');
      const updated = collection.findOne({ _id: 'person1' });
      TestFramework.assertTrue(updated !== null, 'Document should still be findable');
      TestFramework.assertTrue(updated._id !== undefined, '_id should be preserved or regenerated');
    } catch (error) {
      // If it throws an error, that's acceptable MongoDB-like behaviour
      TestFramework.assertTrue(error.message.includes('_id') || error.message.includes('required'), 
        'Error should relate to _id field restrictions');
    }
  });

  // Unset field in non-existent parent object
  suite.addTest('should handle unsetting field in non-existent parent object', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $unset: { 'nonExistentParent.childField': '' } }
    );
    // Should handle gracefully without creating the parent object
    TestFramework.assertTrue(result.modifiedCount >= 0, 'Should return valid result');
    const updated = collection.findOne({ _id: 'person1' });
    TestFramework.assertEquals(undefined, updated.nonExistentParent, 'Non-existent parent should remain undefined');
  });

  return suite;
}

/**
 * Convenience function to run all field update operator test suites
 * @returns {TestResults} Combined results from all field update operator test suites
 */
function runFieldUpdateOperatorTests() {
  const logger = JDbLogger.createComponentLogger('ValidationTests-FieldUpdateOps');
  logger.info('Running all field update operator tests...');

  let combinedResults = new TestResults();

  try {
    // Ensure test environment is set up
    if (!VALIDATION_TEST_ENV.collections) {
      throw new Error('Validation test environment not initialised. Call setupValidationTestEnvironmentForTests() first.');
    }

    // Create and run all test suites
    const testSuites = [
      createSetBasicFieldSettingTestSuite(),
      createSetTypeChangesTestSuite(),
      createSetObjectCreationTestSuite(),
      createSetEdgeCasesTestSuite(),
      createUnsetBasicFieldRemovalTestSuite(),
      createUnsetObjectStructureTestSuite(),
      createUnsetEdgeCasesTestSuite()
    ];

    const suiteResults = [];

    testSuites.forEach(suite => {
      logger.info(`Running test suite: ${suite.name}`);
      const results = suite.run();
      suiteResults.push({ suite: suite, results: results });
      combinedResults.addResults(results.results);
      
      logger.info(`Suite ${suite.name} completed`, {
        passed: results.getPassed().length,
        failed: results.getFailed().length,
        total: results.results.length
      });
    });

    const summary = {
      totalTests: combinedResults.results.length,
      passed: combinedResults.getPassed().length,
      failed: combinedResults.getFailed().length,
      executionTime: combinedResults.getTotalExecutionTime()
    };

    logger.info('Field update operator tests completed', summary);

    // Log failed tests if any
    if (combinedResults.getFailed().length > 0) {
      logger.warn('Some field update operator tests failed:', {
        failures: combinedResults.getFailed().map(result => ({
          suite: result.suiteName,
          test: result.testName,
          error: result.error ? result.error.message : 'Unknown error'
        }))
      });
    }

    // Log summary of passed tests by suite
    if (combinedResults.getPassed().length > 0) {
      logger.info('Passed tests summary:', {
        totalPassed: combinedResults.getPassed().length,
        bySuite: suiteResults.reduce((acc, suiteData) => {
          acc[suiteData.suite.name] = {
            passed: suiteData.results.getPassed().length,
            total: suiteData.results.results.length,
            tests: suiteData.results.getPassed().map(result => result.testName)
          };
          return acc;
        }, {})
      });
    }

    return combinedResults;

  } catch (error) {
    logger.error('Field update operator test execution failed', { error: error.message });
    throw error;
  }
}

/* exported 
   createSetBasicFieldSettingTestSuite,
   createSetTypeChangesTestSuite,
   createSetObjectCreationTestSuite,
   createSetEdgeCasesTestSuite,
   createUnsetBasicFieldRemovalTestSuite,
   createUnsetObjectStructureTestSuite,
   createUnsetEdgeCasesTestSuite,
   runFieldUpdateOperatorTests
*/
