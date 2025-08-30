/**
 * 00_ComparisonOperators.js - End-to-end validation tests for comparison operators
 * 
 * Tests MongoDB-compatible comparison operators ($eq, $gt, $lt) against ValidationMockData
 * using full database functionality including Collection, MasterIndex, and file persistence.
 */

/**
 * Create test suite for $eq (Equality) operator
 * @returns {TestSuite} Test suite for equality operator
 */
function createEqualityOperatorTestSuite() {
  const suite = new TestSuite('$eq Equality Operator Tests');

  // Basic equality matching - String, number, boolean, null, undefined
  suite.addTest('should match string values exactly', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ 'name.first': { $eq: 'Anna' } });
    JDbLogger.debug(`'should match string values exactly' results: 
${JSON.stringify(results, null, 2)}`);
    TestFramework.assertEquals(1, results.length, 'Should find one person named Anna');
    TestFramework.assertEquals('person1', results[0]._id, 'Should match person1');
  });

  suite.addTest('should match numeric values exactly', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ age: { $eq: 29 } });
    JDbLogger.debug(`'should match numeric values exactly' results: 
${JSON.stringify(results, null, 2)}`);
    TestFramework.assertEquals(1, results.length, 'Should find one person aged 29');
    TestFramework.assertEquals('person1', results[0]._id, 'Should match person1');
  });

  suite.addTest('should match zero values correctly', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ age: { $eq: 0 } });
    JDbLogger.debug(`'should match zero values correctly' results: 
${JSON.stringify(results, null, 2)}`);
    TestFramework.assertEquals(1, results.length, 'Should find one person aged 0');
    TestFramework.assertEquals('person2', results[0]._id, 'Should match person2');
  });

  suite.addTest('should match boolean values exactly', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ isActive: { $eq: true } });
    JDbLogger.debug(`'should match boolean values exactly' results: 
${JSON.stringify(results, null, 2)}`);
    TestFramework.assertTrue(results.length >= 3, 'Should find multiple active persons');
    const activeIds = results.map(doc => doc._id);
    JDbLogger.debug(`'should match boolean values exactly' activeIds: 
${JSON.stringify(activeIds, null, 2)}`);
    TestFramework.assertTrue(activeIds.includes('person1'), 'Should include person1');
    TestFramework.assertTrue(activeIds.includes('person3'), 'Should include person3');
  });

  suite.addTest('should match null values correctly', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ lastLogin: { $eq: null } });
    JDbLogger.debug(`'should match null values correctly' results: 
${JSON.stringify(results, null, 2)}`);
    TestFramework.assertEquals(1, results.length, 'Should find one person with null lastLogin');
    TestFramework.assertEquals('person2', results[0]._id, 'Should match person2');
  });

  // Date object equality
  suite.addTest('should match Date objects by exact timestamp', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const targetDate = new Date('2025-06-20T10:30:00Z');
    const results = collection.find({ lastLogin: { $eq: targetDate } });
    JDbLogger.debug(`'should match Date objects by exact timestamp' results: 
${JSON.stringify(results, null, 2)}`);
    TestFramework.assertEquals(1, results.length, 'Should find one person with exact login date');
    TestFramework.assertEquals('person1', results[0]._id, 'Should match person1');
  });

  // Nested object equality
  suite.addTest('should match nested objects exactly', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ 'name': { $eq: { first: 'Anna', last: 'Brown' } } });
    JDbLogger.debug(`'should match nested objects exactly' results: 
${JSON.stringify(results, null, 2)}`);
    TestFramework.assertEquals(1, results.length, 'Should find one person with exact name object');
    TestFramework.assertEquals('person1', results[0]._id, 'Should match person1');
  });

  // Edge cases
  suite.addTest('should distinguish empty string from null', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const emptyResults = collection.find({ 'contact.email': { $eq: '' } });
    JDbLogger.debug(`'should distinguish empty string from null' emptyResults: 
${JSON.stringify(emptyResults, null, 2)}`);
    const nullResults = collection.find({ 'contact.email': { $eq: null } });
    JDbLogger.debug(`'should distinguish empty string from null' nullResults: 
${JSON.stringify(nullResults, null, 2)}`);
    
    TestFramework.assertEquals(1, emptyResults.length, 'Should find one person with empty email');
    TestFramework.assertEquals('person6', emptyResults[0]._id, 'Should match person6');
    
    TestFramework.assertEquals(1, nullResults.length, 'Should find one person with null email');
    TestFramework.assertEquals('person3', nullResults[0]._id, 'Should match person3');
  });

  suite.addTest('should distinguish zero from false', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const zeroResults = collection.find({ age: { $eq: 0 } });
    JDbLogger.debug(`'should distinguish zero from false' zeroResults: 
${JSON.stringify(zeroResults, null, 2)}`);
    const falseResults = collection.find({ isActive: { $eq: false } });
    JDbLogger.debug(`'should distinguish zero from false' falseResults: 
${JSON.stringify(falseResults, null, 2)}`);
    
    TestFramework.assertEquals(1, zeroResults.length, 'Should find one person aged 0');
    TestFramework.assertEquals('person2', zeroResults[0]._id, 'Should match person2 for zero age');
    
    TestFramework.assertTrue(falseResults.length >= 1, 'Should find inactive persons');
    const inactiveIds = falseResults.map(doc => doc._id);
    JDbLogger.debug(`'should distinguish zero from false' inactiveIds: 
${JSON.stringify(inactiveIds, null, 2)}`);
    TestFramework.assertTrue(inactiveIds.includes('person2'), 'Should include person2 in inactive');
  });

  // Case sensitivity for strings
  suite.addTest('should be case sensitive for strings', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const lowerResults = collection.find({ 'name.first': { $eq: 'anna' } });
    JDbLogger.debug(`'should be case sensitive for strings' lowerResults: 
${JSON.stringify(lowerResults, null, 2)}`);
    const upperResults = collection.find({ 'name.first': { $eq: 'Anna' } });
    JDbLogger.debug(`'should be case sensitive for strings' upperResults: 
${JSON.stringify(upperResults, null, 2)}`);
    
    TestFramework.assertEquals(0, lowerResults.length, 'Should not find lowercase anna');
    TestFramework.assertEquals(1, upperResults.length, 'Should find capitalised Anna');
  });

  // Nested field equality with dot notation
  suite.addTest('should match nested fields with dot notation', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ 'contact.email': { $eq: 'anna.brown@example.com' } });
    JDbLogger.debug(`'should match nested fields with dot notation' results: 
${JSON.stringify(results, null, 2)}`);
    TestFramework.assertEquals(1, results.length, 'Should find one person with specific email');
    TestFramework.assertEquals('person1', results[0]._id, 'Should match person1');
  });

  suite.addTest('should match deep nested fields', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ 'preferences.settings.notifications.email.enabled': { $eq: true } });
    JDbLogger.debug(`'should match deep nested fields' results: 
${JSON.stringify(results, null, 2)}`);
    TestFramework.assertTrue(results.length >= 2, 'Should find multiple persons with email notifications enabled');
    const enabledIds = results.map(doc => doc._id);
    JDbLogger.debug(`'should match deep nested fields' enabledIds: 
${JSON.stringify(enabledIds, null, 2)}`);
    TestFramework.assertTrue(enabledIds.includes('person1'), 'Should include person1');
    TestFramework.assertTrue(enabledIds.includes('person3'), 'Should include person3');
  });

  suite.addTest('should handle non-existent nested paths', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ 'nonexistent.field': { $eq: 'value' } });
    JDbLogger.debug(`'should handle non-existent nested paths' results: 
${JSON.stringify(results, null, 2)}`);
    TestFramework.assertEquals(0, results.length, 'Should find no documents for non-existent path');
  });

  return suite;
}

/**
 * Create test suite for $gt (Greater Than) operator
 * @returns {TestSuite} Test suite for greater than operator
 */
function createGreaterThanOperatorTestSuite() {
  const suite = new TestSuite('$gt Greater Than Operator Tests');

  // Numeric comparisons
  suite.addTest('should compare integers correctly', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ age: { $gt: 40 } });
    JDbLogger.debug(`'should compare integers correctly' results: 
${JSON.stringify(results, null, 2)}`);
    TestFramework.assertTrue(results.length >= 3, 'Should find persons older than 40');
    const ageIds = results.map(doc => doc._id);
    JDbLogger.debug(`'should compare integers correctly' ageIds: 
${JSON.stringify(ageIds, null, 2)}`);
    TestFramework.assertTrue(ageIds.includes('person3'), 'Should include person3 (age 45)');
    TestFramework.assertTrue(ageIds.includes('person5'), 'Should include person5 (age 50)');
    TestFramework.assertTrue(ageIds.includes('person6'), 'Should include person6 (age 65)');
  });

  suite.addTest('should compare floats correctly', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ score: { $gt: 90.0 } });
    JDbLogger.debug(`'should compare floats correctly' results: 
${JSON.stringify(results, null, 2)}`);
    TestFramework.assertTrue(results.length >= 2, 'Should find persons with score > 90');
    const scoreIds = results.map(doc => doc._id);
    JDbLogger.debug(`'should compare floats correctly' scoreIds: 
${JSON.stringify(scoreIds, null, 2)}`);
    TestFramework.assertTrue(scoreIds.includes('person3'), 'Should include person3 (score 92.3)');
    TestFramework.assertTrue(scoreIds.includes('person5'), 'Should include person5 (score 95.8)');
  });

  suite.addTest('should handle mixed integer and float comparison', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ score: { $gt: 80 } }); // integer 80
    JDbLogger.debug(`'should handle mixed integer and float comparison' results: 
${JSON.stringify(results, null, 2)}`);
    TestFramework.assertTrue(results.length >= 3, 'Should find persons with score > 80');
    const scoreIds = results.map(doc => doc._id);
    JDbLogger.debug(`'should handle mixed integer and float comparison' scoreIds: 
${JSON.stringify(scoreIds, null, 2)}`);
    TestFramework.assertTrue(scoreIds.includes('person1'), 'Should include person1 (score 85.5)');
  });

  suite.addTest('should handle negative numbers correctly', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ balance: { $gt: -200 } });
    JDbLogger.debug(`'should handle negative numbers correctly' results: 
${JSON.stringify(results, null, 2)}`);
    TestFramework.assertTrue(results.length >= 5, 'Should find persons with balance > -200');
    const balanceIds = results.map(doc => doc._id);
    JDbLogger.debug(`'should handle negative numbers correctly' balanceIds: 
${JSON.stringify(balanceIds, null, 2)}`);
    TestFramework.assertTrue(balanceIds.includes('person3'), 'Should include person3 (balance -150.25)');
  });

  suite.addTest('should handle zero boundary cases', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ balance: { $gt: 0 } });
    JDbLogger.debug(`'should handle zero boundary cases' results: 
${JSON.stringify(results, null, 2)}`);
    TestFramework.assertTrue(results.length >= 4, 'Should find persons with positive balance');
    results.forEach(doc => {
      TestFramework.assertTrue(doc.balance > 0, `Person ${doc._id} should have positive balance`);
    });
  });

  // Date comparisons
  suite.addTest('should compare Date objects chronologically', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const cutoffDate = new Date('2025-06-20T00:00:00Z');
    const results = collection.find({ lastLogin: { $gt: cutoffDate } });
    JDbLogger.debug(`'should compare Date objects chronologically' results: 
${JSON.stringify(results, null, 2)}`);
    TestFramework.assertTrue(results.length >= 2, 'Should find persons with recent logins');
    const recentIds = results.map(doc => doc._id);
    JDbLogger.debug(`'should compare Date objects chronologically' recentIds: 
${JSON.stringify(recentIds, null, 2)}`);
    TestFramework.assertTrue(recentIds.includes('person4'), 'Should include person4');
    TestFramework.assertTrue(recentIds.includes('person6'), 'Should include person6');
  });

  // String comparisons - lexicographical
  suite.addTest('should compare strings lexicographically', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ 'name.first': { $gt: 'D' } });
    JDbLogger.debug(`'should compare strings lexicographically' results: 
${JSON.stringify(results, null, 2)}`);
    TestFramework.assertTrue(results.length >= 2, 'Should find names after D');
    const nameIds = results.map(doc => doc._id);
    JDbLogger.debug(`'should compare strings lexicographically' nameIds: 
${JSON.stringify(nameIds, null, 2)}`);
    TestFramework.assertTrue(nameIds.includes('person5'), 'Should include Ethan');
    TestFramework.assertTrue(nameIds.includes('person6'), 'Should include Frank');
  });

  suite.addTest('should handle case sensitivity in string comparison', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ 'preferences.settings.theme': { $gt: 'dark' } });
    JDbLogger.debug(`'should handle case sensitivity in string comparison' results: 
${JSON.stringify(results, null, 2)}`);
    TestFramework.assertTrue(results.length >= 2, 'Should find themes lexicographically after "dark"');
    // Should include 'light', 'high-contrast', etc.
  });

  // Type mixing errors - should not match incompatible types
  suite.addTest('should not compare number with string', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ age: { $gt: '30' } }); // string '30'
    JDbLogger.debug(`'should not compare number with string' results: 
${JSON.stringify(results, null, 2)}`);
    TestFramework.assertEquals(0, results.length, 'Should not match number field with string value');
  });

  // Null/undefined handling
  suite.addTest('should handle null values in comparison', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ lastLogin: { $gt: null } });
    JDbLogger.debug(`'should handle null values in comparison' results: 
${JSON.stringify(results, null, 2)}`);
    // MongoDB: $gt with null should return no results
    TestFramework.assertEquals(0, results.length, 'Should not match any documents when comparing with null');
  });

  suite.addTest('should handle missing fields in comparison', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ 'nonexistent.field': { $gt: 0 } });
    JDbLogger.debug(`'should handle missing fields in comparison' results: 
${JSON.stringify(results, null, 2)}`);
    TestFramework.assertEquals(0, results.length, 'Should find no documents for non-existent field');
  });

  return suite;
}

/**
 * Create test suite for $lt (Less Than) operator
 * @returns {TestSuite} Test suite for less than operator
 */
function createLessThanOperatorTestSuite() {
  const suite = new TestSuite('$lt Less Than Operator Tests');

  // Basic numeric comparisons (inverted from $gt)
  suite.addTest('should compare integers correctly', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ age: { $lt: 40 } });
    JDbLogger.debug(`'should compare integers correctly' results: 
${JSON.stringify(results, null, 2)}`);
    TestFramework.assertTrue(results.length >= 2, 'Should find persons younger than 40');
    const ageIds = results.map(doc => doc._id);
    JDbLogger.debug(`'should compare integers correctly' ageIds: 
${JSON.stringify(ageIds, null, 2)}`);
    TestFramework.assertTrue(ageIds.includes('person1'), 'Should include person1 (age 29)');
    TestFramework.assertTrue(ageIds.includes('person2'), 'Should include person2 (age 0)');
    TestFramework.assertTrue(ageIds.includes('person4'), 'Should include person4 (age 38)');
  });

  suite.addTest('should compare floats correctly', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ score: { $lt: 80.0 } });
    JDbLogger.debug(`'should compare floats correctly' results: 
${JSON.stringify(results, null, 2)}`);
    TestFramework.assertTrue(results.length >= 2, 'Should find persons with score < 80');
    const scoreIds = results.map(doc => doc._id);
    JDbLogger.debug(`'should compare floats correctly' scoreIds: 
${JSON.stringify(scoreIds, null, 2)}`);
    TestFramework.assertTrue(scoreIds.includes('person4'), 'Should include person4 (score 78.1)');
    TestFramework.assertTrue(scoreIds.includes('person6'), 'Should include person6 (score 45.2)');
  });

  suite.addTest('should handle negative number boundaries', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ balance: { $lt: 0 } });
    JDbLogger.debug(`'should handle negative number boundaries' results: 
${JSON.stringify(results, null, 2)}`);
    TestFramework.assertEquals(1, results.length, 'Should find one person with negative balance');
    TestFramework.assertEquals('person3', results[0]._id, 'Should match person3');
  });

  suite.addTest('should handle zero boundary cases', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ age: { $lt: 1 } });
    JDbLogger.debug(`'should handle zero boundary cases' results: 
${JSON.stringify(results, null, 2)}`);
    TestFramework.assertEquals(1, results.length, 'Should find one person aged less than 1');
    TestFramework.assertEquals('person2', results[0]._id, 'Should match person2 (age 0)');
  });

  // Date comparisons
  suite.addTest('should compare Date objects chronologically', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const cutoffDate = new Date('2025-06-20T00:00:00Z');
    const results = collection.find({ lastLogin: { $lt: cutoffDate } });
    JDbLogger.debug(`'should compare Date objects chronologically' results: 
${JSON.stringify(results, null, 2)}`);
    TestFramework.assertTrue(results.length >= 2, 'Should find persons with older logins');
    const olderIds = results.map(doc => doc._id);
    JDbLogger.debug(`'should compare Date objects chronologically' olderIds: 
${JSON.stringify(olderIds, null, 2)}`);
    TestFramework.assertTrue(olderIds.includes('person3'), 'Should include person3');
    TestFramework.assertTrue(olderIds.includes('person5'), 'Should include person5');
  });

  // String comparisons
  suite.addTest('should compare strings lexicographically', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ 'name.first': { $lt: 'D' } });
    JDbLogger.debug(`'should compare strings lexicographically' results: 
${JSON.stringify(results, null, 2)}`);
    TestFramework.assertTrue(results.length >= 3, 'Should find names before D');
    const nameIds = results.map(doc => doc._id);
    JDbLogger.debug(`'should compare strings lexicographically' nameIds: 
${JSON.stringify(nameIds, null, 2)}`);
    TestFramework.assertTrue(nameIds.includes('person1'), 'Should include Anna');
    TestFramework.assertTrue(nameIds.includes('person2'), 'Should include Ben');
    TestFramework.assertTrue(nameIds.includes('person3'), 'Should include Clara');
  });

  // Boundary testing with extreme values
  suite.addTest('should handle large number boundaries', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ balance: { $lt: 15000 } });
    JDbLogger.debug(`'should handle large number boundaries' results: 
${JSON.stringify(results, null, 2)}`);
    TestFramework.assertEquals(6, results.length, 'Should find all persons (all balances < 15000)');
  });

  suite.addTest('should handle floating point precision', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ score: { $lt: 85.5 } });
    JDbLogger.debug(`'should handle floating point precision' results: 
${JSON.stringify(results, null, 2)}`);
    TestFramework.assertTrue(results.length >= 2, 'Should find scores less than 85.5');
    // Should not include person1 who has exactly 85.5
    const scoreIds = results.map(doc => doc._id);
    JDbLogger.debug(`'should handle floating point precision' scoreIds: 
${JSON.stringify(scoreIds, null, 2)}`);
    TestFramework.assertFalse(scoreIds.includes('person1'), 'Should not include person1 (score exactly 85.5)');
  });

  // Type mixing and null handling
  suite.addTest('should handle null in less than comparison', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ lastLogin: { $lt: new Date('2025-12-31') } });
    JDbLogger.debug(`'should handle null in less than comparison' results: 
${JSON.stringify(results, null, 2)}`);
    // All non-null dates should be less than future date, null should not match
    TestFramework.assertTrue(results.length >= 5, 'Should find all non-null dates');
    results.forEach(doc => {
      TestFramework.assertNotEquals(null, doc.lastLogin, 'Should not include null values');
    });
  });

  suite.addTest('should handle missing fields correctly', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const results = collection.find({ 'missing.field': { $lt: 100 } });
    JDbLogger.debug(`'should handle missing fields correctly' results: 
${JSON.stringify(results, null, 2)}`);
    TestFramework.assertEquals(0, results.length, 'Should find no documents for missing field');
  });

  return suite;
}

/* exported createEqualityOperatorTestSuite, createGreaterThanOperatorTestSuite, createLessThanOperatorTestSuite */
