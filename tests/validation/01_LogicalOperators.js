/**
 * 01_LogicalOperators.js - End-to-end validation tests for logical operators
 * 
 * Tests MongoDB-compatible logical operators ($and, $or) against ValidationMockData
 * using full database functionality including Collection, MasterIndex, and file persistence.
 */

/**
 * Create test suite for $and (Logical AND) operator
 * @returns {TestSuite} Test suite for logical AND operator
 */
function createLogicalAndOperatorTestSuite() {
  const suite = new TestSuite('$and Logical AND Operator Tests');

  // Basic conjunction - Two field conditions
  suite.addTest('should match documents satisfying both field conditions', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ 
      $and: [
        { isActive: { $eq: true } },
        { age: { $gt: 30 } }
      ]
    });
    TestFramework.assertEquals(3, results.length, 'Should find 3 active persons over 30');
    const expectedIds = ['person3', 'person4', 'person6'];
    results.forEach(doc => {
      TestFramework.assertTrue(expectedIds.includes(doc._id), `Document ${doc._id} should be in expected results`);
      TestFramework.assertTrue(doc.isActive, `Document ${doc._id} should be active`);
      TestFramework.assertTrue(doc.age > 30, `Document ${doc._id} should have age > 30`);
    });
  });

  // Multiple field conditions (3+)
  suite.addTest('should match documents satisfying multiple field conditions', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ 
      $and: [
        { isActive: { $eq: true } },
        { score: { $gt: 80 } },
        { balance: { $gt: 1000 } }
      ]
    });
    TestFramework.assertEquals(1, results.length, 'Should find 1 active person with score > 80 and balance > 1000');
    const expectedIds = ['person1'];
    results.forEach(doc => {
      TestFramework.assertTrue(expectedIds.includes(doc._id), `Document ${doc._id} should be in expected results`);
      TestFramework.assertTrue(doc.isActive, `Document ${doc._id} should be active`);
      TestFramework.assertTrue(doc.score > 80, `Document ${doc._id} should have score > 80`);
      TestFramework.assertTrue(doc.balance > 1000, `Document ${doc._id} should have balance > 1000`);
    });
  });

  // Mix of comparison operators
  suite.addTest('should work with mixed comparison operators', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ 
      $and: [
        { 'name.first': { $eq: 'Anna' } },
        { age: { $lt: 35 } },
        { score: { $gt: 80 } }
      ]
    });
    TestFramework.assertEquals(1, results.length, 'Should find Anna with age < 35 and score > 80');
    TestFramework.assertEquals('person1', results[0]._id, 'Should match person1');
    TestFramework.assertEquals('Anna', results[0].name.first, 'Should match Anna');
  });

  // Nested $and operations - $and within $and
  suite.addTest('should handle nested $and operations', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ 
      $and: [
        { 
          $and: [
            { isActive: { $eq: true } },
            { age: { $gt: 25 } }
          ]
        },
        { score: { $gt: 85 } }
      ]
    });
    TestFramework.assertEquals(2, results.length, 'Should find 2 active persons over 25 with score > 85');
    const expectedIds = ['person1', 'person3'];
    results.forEach(doc => {
      TestFramework.assertTrue(expectedIds.includes(doc._id), `Document ${doc._id} should be in expected results`);
      TestFramework.assertTrue(doc.isActive, `Document ${doc._id} should be active`);
      TestFramework.assertTrue(doc.age > 25, `Document ${doc._id} should have age > 25`);
      TestFramework.assertTrue(doc.score > 85, `Document ${doc._id} should have score > 85`);
    });
  });

  // Edge cases - Empty $and array
  suite.addTest('should match all documents with empty $and array', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ $and: [] });
    TestFramework.assertEquals(6, results.length, 'Empty $and should match all 6 persons');
  });

  // Single condition in $and
  suite.addTest('should handle single condition in $and', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ 
      $and: [
        { isActive: { $eq: false } }
      ]
    });
    TestFramework.assertEquals(2, results.length, 'Should find 2 inactive persons');
    const expectedIds = ['person2', 'person5'];
    results.forEach(doc => {
      TestFramework.assertTrue(expectedIds.includes(doc._id), `Document ${doc._id} should be in expected results`);
      TestFramework.assertFalse(doc.isActive, `Document ${doc._id} should be inactive`);
    });
  });

  // $and with contradictory conditions
  suite.addTest('should return no results for contradictory conditions', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ 
      $and: [
        { isActive: { $eq: true } },
        { isActive: { $eq: false } }
      ]
    });
    TestFramework.assertEquals(0, results.length, 'Contradictory conditions should match no documents');
  });

  return suite;
}

/**
 * Create test suite for $or (Logical OR) operator
 * @returns {TestSuite} Test suite for logical OR operator
 */
function createLogicalOrOperatorTestSuite() {
  const suite = new TestSuite('$or Logical OR Operator Tests');

  // Basic disjunction - Two field conditions
  suite.addTest('should match documents satisfying either field condition', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ 
      $or: [
        { age: { $lt: 30 } },
        { age: { $gt: 60 } }
      ]
    });
    TestFramework.assertEquals(2, results.length, 'Should find persons under 30 or over 60');
    const expectedIds = ['person1', 'person6']; // Anna (29) and Frank (65)
    results.forEach(doc => {
      TestFramework.assertTrue(expectedIds.includes(doc._id), `Document ${doc._id} should be in expected results`);
      TestFramework.assertTrue(doc.age < 30 || doc.age > 60, `Document ${doc._id} should have age < 30 or > 60`);
    });
  });

  // Multiple field conditions (3+)
  suite.addTest('should match documents satisfying any of multiple conditions', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ 
      $or: [
        { 'name.first': { $eq: 'Anna' } },
        { 'name.first': { $eq: 'Clara' } },
        { 'name.first': { $eq: 'Frank' } }
      ]
    });
    TestFramework.assertEquals(3, results.length, 'Should find Anna, Clara, or Frank');
    const expectedIds = ['person1', 'person3', 'person6'];
    results.forEach(doc => {
      TestFramework.assertTrue(expectedIds.includes(doc._id), `Document ${doc._id} should be in expected results`);
      const expectedNames = ['Anna', 'Clara', 'Frank'];
      TestFramework.assertTrue(expectedNames.includes(doc.name.first), `Document ${doc._id} should have expected name`);
    });
  });

  // Mix of comparison operators
  suite.addTest('should work with mixed comparison operators', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ 
      $or: [
        { score: { $gt: 95 } },
        { balance: { $lt: 0 } },
        { age: { $eq: 0 } }
      ]
    });
    TestFramework.assertEquals(3, results.length, 'Should find persons with high score, negative balance, or zero age');
    const expectedIds = ['person2', 'person3', 'person5']; // Ben (age 0), Clara (negative balance), Ethan (score 95.8)
    results.forEach(doc => {
      TestFramework.assertTrue(expectedIds.includes(doc._id), `Document ${doc._id} should be in expected results`);
      const matchesCondition = doc.score > 95 || doc.balance < 0 || doc.age === 0;
      TestFramework.assertTrue(matchesCondition, `Document ${doc._id} should match at least one condition`);
    });
  });

  // Nested $or operations - $or within $or
  suite.addTest('should handle nested $or operations', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ 
      $or: [
        { 
          $or: [
            { 'name.first': { $eq: 'Anna' } },
            { 'name.first': { $eq: 'Ben' } }
          ]
        },
        { age: { $gt: 60 } }
      ]
    });
    TestFramework.assertEquals(3, results.length, 'Should find Anna, Ben, or persons over 60');
    const expectedIds = ['person1', 'person2', 'person6']; // Anna, Ben, Frank
    results.forEach(doc => {
      TestFramework.assertTrue(expectedIds.includes(doc._id), `Document ${doc._id} should be in expected results`);
    });
  });

  // Edge cases - Empty $or array
  suite.addTest('should match no documents with empty $or array', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ $or: [] });
    TestFramework.assertEquals(0, results.length, 'Empty $or should match no documents');
  });

  // Single condition in $or
  suite.addTest('should handle single condition in $or', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ 
      $or: [
        { isActive: { $eq: true } }
      ]
    });
    TestFramework.assertEquals(4, results.length, 'Should find 4 active persons');
    results.forEach(doc => {
      TestFramework.assertTrue(doc.isActive, `Document ${doc._id} should be active`);
    });
  });

  // $or with duplicate conditions
  suite.addTest('should handle duplicate conditions in $or', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ 
      $or: [
        { 'name.first': { $eq: 'Anna' } },
        { 'name.first': { $eq: 'Anna' } }
      ]
    });
    TestFramework.assertEquals(1, results.length, 'Duplicate conditions should still only match Anna once');
    TestFramework.assertEquals('person1', results[0]._id, 'Should match person1');
    TestFramework.assertEquals('Anna', results[0].name.first, 'Should match Anna');
  });

  return suite;
}

/**
 * Create test suite for combined logical operations
 * @returns {TestSuite} Test suite for combined logical operations
 */
function createCombinedLogicalOperatorTestSuite() {
  const suite = new TestSuite('Combined Logical Operations Tests');

  // $and containing $or clauses
  suite.addTest('should handle $and containing $or clauses', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ 
      $and: [
        { 
          $or: [
            { 'name.first': { $eq: 'Anna' } },
            { 'name.first': { $eq: 'Diana' } }
          ]
        },
        { isActive: { $eq: true } }
      ]
    });
    TestFramework.assertEquals(2, results.length, 'Should find active Anna or Diana');
    const expectedIds = ['person1', 'person4'];
    results.forEach(doc => {
      TestFramework.assertTrue(expectedIds.includes(doc._id), `Document ${doc._id} should be in expected results`);
      TestFramework.assertTrue(doc.isActive, `Document ${doc._id} should be active`);
      TestFramework.assertTrue(['Anna', 'Diana'].includes(doc.name.first), `Document ${doc._id} should be Anna or Diana`);
    });
  });

  // $or containing $and clauses
  suite.addTest('should handle $or containing $and clauses', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ 
      $or: [
        { 
          $and: [
            { isActive: { $eq: false } },
            { age: { $gt: 40 } }
          ]
        },
        { score: { $gt: 95 } }
      ]
    });
    TestFramework.assertEquals(1, results.length, 'Should find person5 (inactive over 40 with high score)');
    const actualIds = results.map(doc => doc._id);
    TestFramework.assertTrue(actualIds.includes('person5'), 'Should include person5 (inactive, age 50, score 95.8)');
  });

  // Complex nested logical trees
  suite.addTest('should handle complex nested logical operations', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ 
      $and: [
        {
          $or: [
            { age: { $lt: 35 } },
            { age: { $gt: 60 } }
          ]
        },
        {
          $or: [
            { isActive: { $eq: true } },
            { score: { $gt: 90 } }
          ]
        }
      ]
    });
    TestFramework.assertEquals(2, results.length, 'Should find persons matching complex nested conditions');
    const expectedIds = ['person1', 'person6']; // Anna (29, active) and Frank (65, active)
    results.forEach(doc => {
      TestFramework.assertTrue(expectedIds.includes(doc._id), `Document ${doc._id} should be in expected results`);
      const ageCondition = doc.age < 35 || doc.age > 60;
      const activeOrHighScore = doc.isActive || doc.score > 90;
      TestFramework.assertTrue(ageCondition, `Document ${doc._id} should satisfy age condition`);
      TestFramework.assertTrue(activeOrHighScore, `Document ${doc._id} should be active or have high score`);
    });
  });

  // Implicit AND with explicit operators - Field conditions + $and
  suite.addTest('should handle implicit AND with explicit $and', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ 
      isActive: { $eq: true },
      $and: [
        { age: { $gt: 30 } },
        { score: { $gt: 80 } }
      ]
    });
    TestFramework.assertEquals(2, results.length, 'Should find active persons over 30 with score > 80');
    const expectedIds = ['person3', 'person4']; 
    results.forEach(doc => {
      TestFramework.assertTrue(expectedIds.includes(doc._id), `Document ${doc._id} should be in expected results`);
      TestFramework.assertTrue(doc.isActive, `Document ${doc._id} should be active`);
      TestFramework.assertTrue(doc.age > 30, `Document ${doc._id} should have age > 30`);
      TestFramework.assertTrue(doc.score > 80, `Document ${doc._id} should have score > 80`);
    });
  });

  // Field conditions + $or
  suite.addTest('should handle implicit AND with explicit $or', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ 
      isActive: { $eq: true },
      $or: [
        { age: { $lt: 35 } },
        { age: { $gt: 60 } }
      ]
    });
    TestFramework.assertEquals(2, results.length, 'Should find active persons under 35 or over 60');
    const expectedIds = ['person1', 'person6']; 
    results.forEach(doc => {
      TestFramework.assertTrue(expectedIds.includes(doc._id), `Document ${doc._id} should be in expected results`);
      TestFramework.assertTrue(doc.isActive, `Document ${doc._id} should be active`);
      TestFramework.assertTrue(doc.age < 35 || doc.age > 60, `Document ${doc._id} should have age < 35 or > 60`);
    });
  });

  // Multiple fields + multiple logical operators
  suite.addTest('should handle multiple fields with multiple logical operators', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ 
      'preferences.newsletter': { $eq: true },
      $and: [
        {
          $or: [
            { age: { $lt: 40 } },
            { score: { $gt: 90 } }
          ]
        },
        { balance: { $gt: 500 } }
      ]
    });
    TestFramework.assertEquals(2, results.length, 'Should find newsletter subscribers matching complex conditions');
    const expectedIds = ['person1', 'person3']; // Anna and Clara both have newsletter: true
    results.forEach(doc => {
      TestFramework.assertTrue(expectedIds.includes(doc._id), `Document ${doc._id} should be in expected results`);
      TestFramework.assertTrue(doc.preferences.newsletter, `Document ${doc._id} should have newsletter subscription`);
      TestFramework.assertTrue(doc.age < 40 || doc.score > 90, `Document ${doc._id} should be young or high scorer`);
      TestFramework.assertTrue(doc.balance > 500, `Document ${doc._id} should have balance > 500`);
    });
  });

  return suite;
}

/**
 * Create test suite for logical operator error cases
 * @returns {TestSuite} Test suite for logical operator error handling
 */
function createLogicalOperatorErrorTestSuite() {
  const suite = new TestSuite('Logical Operator Error Handling Tests');

  // Invalid $and structure
  suite.addTest('should throw error for invalid $and structure', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    TestFramework.assertThrows(function() {
      collection.find({ $and: "not an array" });
    }, 'Should throw error for non-array $and');
  });

  // Invalid $or structure
  suite.addTest('should throw error for invalid $or structure', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    TestFramework.assertThrows(function() {
      collection.find({ $or: { invalid: "structure" } });
    }, 'Should throw error for non-array $or');
  });

  return suite;
}

/**
 * Convenience function to run all logical operator tests
 * @returns {TestResults} Combined results from all logical operator test suites
 */
function runLogicalOperatorTests() {
  const logger = JDbLogger.createComponentLogger('ValidationTests-LogicalOps');
  logger.info('Running all logical operator tests...');

  let combinedResults = new TestResults();

  try {
    // Ensure validation environment is set up
    if (!VALIDATION_TEST_ENV.collections) {
      setupValidationTestEnvironmentForTests();
    }

    const framework = new TestFramework();
    
    // Run all logical operator test suites
    const andSuite = createLogicalAndOperatorTestSuite();
    const orSuite = createLogicalOrOperatorTestSuite();
    const combinedSuite = createCombinedLogicalOperatorTestSuite();
    const errorSuite = createLogicalOperatorErrorTestSuite();

    framework.addTestSuite(andSuite);
    framework.addTestSuite(orSuite);
    framework.addTestSuite(combinedSuite);
    framework.addTestSuite(errorSuite);

    combinedResults = framework.runAllTests();

    logger.info('Logical operator tests completed', {
      totalTests: combinedResults.totalTests,
      passed: combinedResults.passed,
      failed: combinedResults.failed
    });

    return combinedResults;

  } catch (error) {
    logger.error('Error running logical operator tests:', error);
    throw error;
  }
}

/* exported 
   createLogicalAndOperatorTestSuite, 
   createLogicalOrOperatorTestSuite, 
   createCombinedLogicalOperatorTestSuite,
   createLogicalOperatorErrorTestSuite,
   runLogicalOperatorTests
*/
