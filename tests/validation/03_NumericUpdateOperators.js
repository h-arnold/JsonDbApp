/**
 * 03_NumericUpdateOperators.js - End-to-end validation tests for numeric update operators
 * 
 * Tests MongoDB-compatible numeric update operators ($inc, $mul, $min, $max) against ValidationMockData
 * using full database functionality including Collection, MasterIndex, and file persistence.
 */

// Helper utilities for dynamic expectations
function _getValueByPath(obj, path) {
  if (!path) return undefined;
  return path.split('.').reduce(function(acc, key) { return acc == null ? undefined : acc[key]; }, obj);
}

function _areNumbersClose(a, b, tolerance) {
  if (typeof a !== 'number' || typeof b !== 'number') return false;
  return Math.abs(a - b) <= (tolerance || 0.0001);
}

function _assertNumberEqualsDynamic(expected, actual, message, tolerance) {
  if (typeof expected === 'number' && typeof actual === 'number' && tolerance != null) {
    TestFramework.assertTrue(_areNumbersClose(expected, actual, tolerance), message + ' (expected ~' + expected + ', got ' + actual + ')');
  } else {
    TestFramework.assertEquals(expected, actual, message);
  }
}

/**
 * Create test suite for $inc operator - Basic incrementation
 * @returns {TestSuite} Test suite for $inc basic incrementation operations
 */
function createIncBasicIncrementationTestSuite() {
  const suite = new TestSuite('$inc Basic Incrementation Tests');

  // Positive increments
  suite.addTest('should increment positive integer values', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
  const before = collection.findOne({ _id: 'person1' });
  const original = before.age;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $inc: { age: 5 } }
    );
    JDbLogger.debug(`'should increment positive integer values' result: 
${JSON.stringify(result, null, 2)}`);
  const updated = collection.findOne({ _id: 'person1' });
  const expected = (typeof original === 'number' ? original : 0) + 5;
  const expectedModified = expected !== original ? 1 : 0;
  TestFramework.assertEquals(expectedModified, result.modifiedCount, 'Modified count should reflect actual change');
    JDbLogger.debug(`'should increment positive integer values' updated: 
${JSON.stringify(updated, null, 2)}`);
  TestFramework.assertEquals(expected, updated.age, 'Age should increase by 5');
  });

  suite.addTest('should increment positive decimal values', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
  const before = collection.findOne({ _id: 'person1' });
  const original = before.score;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $inc: { score: 10.5 } }
    );
    JDbLogger.debug(`'should increment positive decimal values' result: 
${JSON.stringify(result, null, 2)}`);
  const updated = collection.findOne({ _id: 'person1' });
  const expected = (typeof original === 'number' ? original : 0) + 10.5;
  const expectedModified = expected !== original ? 1 : 0;
  TestFramework.assertEquals(expectedModified, result.modifiedCount, 'Modified count should reflect actual change');
    JDbLogger.debug(`'should increment positive decimal values' updated: 
${JSON.stringify(updated, null, 2)}`);
  _assertNumberEqualsDynamic(expected, updated.score, 'Score should increase by 10.5', 0.0001);
  });

  // Negative increments (decrement)
  suite.addTest('should decrement with negative increment values', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
  const before = collection.findOne({ _id: 'person4' });
  const originalAge = before.age;
  const originalScore = before.score;
    const result = collection.updateOne(
      { _id: 'person4' },
      { $inc: { age: -3, score: -8.1 } }
    );
    JDbLogger.debug(`'should decrement with negative increment values' result: 
${JSON.stringify(result, null, 2)}`);
  const updated = collection.findOne({ _id: 'person4' });
  const expectedAge = (typeof originalAge === 'number' ? originalAge : 0) - 3;
  const expectedScore = (typeof originalScore === 'number' ? originalScore : 0) - 8.1;
  const changed = (expectedAge !== originalAge) || !_areNumbersClose(expectedScore, originalScore, 0.0001);
  TestFramework.assertEquals(changed ? 1 : 0, result.modifiedCount, 'Modified count should reflect actual change');
    JDbLogger.debug(`'should decrement with negative increment values' updated: 
${JSON.stringify(updated, null, 2)}`);
  TestFramework.assertEquals(expectedAge, updated.age, 'Age should decrease by 3');
  _assertNumberEqualsDynamic(expectedScore, updated.score, 'Score should decrease by 8.1', 0.0001);
  });

  // Zero increment (no-op)
  suite.addTest('should handle zero increment as no-op', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const original = collection.findOne({ _id: 'person3' });
    JDbLogger.debug(`'should handle zero increment as no-op' original: 
${JSON.stringify(original, null, 2)}`);
    const originalAge = original.age;
    const originalScore = original.score;
    
    const result = collection.updateOne(
      { _id: 'person3' },
      { $inc: { age: 0, score: 0.0 } }
    );
    JDbLogger.debug(`'should handle zero increment as no-op' result: 
${JSON.stringify(result, null, 2)}`);
  TestFramework.assertEquals(0, result.modifiedCount, 'Zero increments on existing numeric fields should be no-op');
    const updated = collection.findOne({ _id: 'person3' });
    JDbLogger.debug(`'should handle zero increment as no-op' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(originalAge, updated.age, 'Age should remain unchanged');
    TestFramework.assertEquals(originalScore, updated.score, 'Score should remain unchanged');
  });

  // Fractional increments
  suite.addTest('should handle fractional increments correctly', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
  const before = collection.findOne({ _id: 'person1' });
  const original = before.balance;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $inc: { balance: 0.25 } }
    );
    JDbLogger.debug(`'should handle fractional increments correctly' result: 
${JSON.stringify(result, null, 2)}`);
  const updated = collection.findOne({ _id: 'person1' });
  const expected = (typeof original === 'number' ? original : 0) + 0.25;
  const changed = !_areNumbersClose(expected, original, 0.0001);
  TestFramework.assertEquals(changed ? 1 : 0, result.modifiedCount, 'Modified count should reflect change in balance');
    JDbLogger.debug(`'should handle fractional increments correctly' updated: 
${JSON.stringify(updated, null, 2)}`);
  _assertNumberEqualsDynamic(expected, updated.balance, 'Balance should increase by 0.25', 0.0001);
  });

  return suite;
}

/**
 * Create test suite for $inc operator - Field creation
 * @returns {TestSuite} Test suite for $inc field creation operations
 */
function createIncFieldCreationTestSuite() {
  const suite = new TestSuite('$inc Field Creation Tests');

  // Increment non-existent field (creates with increment value)
  suite.addTest('should create non-existent field with increment value', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
  const before = collection.findOne({ _id: 'person1' });
  const original = before.newCounterField; // likely undefined
    const result = collection.updateOne(
      { _id: 'person1' },
      { $inc: { newCounterField: 42 } }
    );
    JDbLogger.debug(`'should create non-existent field with increment value' result: 
${JSON.stringify(result, null, 2)}`);
  const updated = collection.findOne({ _id: 'person1' });
  const starting = (typeof original === 'number') ? original : 0;
  const expected = starting + 42;
  const changed = expected !== original;
  TestFramework.assertEquals(changed ? 1 : 0, result.modifiedCount, 'Modified count should reflect field creation/increment');
    JDbLogger.debug(`'should create non-existent field with increment value' updated: 
${JSON.stringify(updated, null, 2)}`);
  TestFramework.assertEquals(expected, updated.newCounterField, 'Field should equal prior (or 0) plus increment');
  });

  suite.addTest('should create non-existent decimal field with increment value', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
  const before = collection.findOne({ _id: 'person2' });
  const original = before.newRatingField;
    const result = collection.updateOne(
      { _id: 'person2' },
      { $inc: { newRatingField: 3.7 } }
    );
    JDbLogger.debug(`'should create non-existent decimal field with increment value' result: 
${JSON.stringify(result, null, 2)}`);
  const updated = collection.findOne({ _id: 'person2' });
  const starting = (typeof original === 'number') ? original : 0;
  const expected = starting + 3.7;
  const changed = !_areNumbersClose(expected, original, 0.0001);
  TestFramework.assertEquals(changed ? 1 : 0, result.modifiedCount, 'Modified count should reflect creation/increment');
    JDbLogger.debug(`'should create non-existent decimal field with increment value' updated: 
${JSON.stringify(updated, null, 2)}`);
  _assertNumberEqualsDynamic(expected, updated.newRatingField, 'Field should equal prior (or 0) plus increment', 0.0001);
  });

  // Increment in non-existent nested object
  suite.addTest('should create nested object structure when incrementing nested field', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
  const before = collection.findOne({ _id: 'person1' });
  const original = before.stats && before.stats.loginCount;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $inc: { 'stats.loginCount': 1 } }
    );
    JDbLogger.debug(`'should create nested object structure when incrementing nested field' result: 
${JSON.stringify(result, null, 2)}`);
  const updated = collection.findOne({ _id: 'person1' });
  const starting = (typeof original === 'number') ? original : 0;
  const expected = starting + 1;
  const changed = expected !== original;
  TestFramework.assertEquals(changed ? 1 : 0, result.modifiedCount, 'Modified count should reflect nested field creation/increment');
    JDbLogger.debug(`'should create nested object structure when incrementing nested field' updated: 
${JSON.stringify(updated, null, 2)}`);
  TestFramework.assertEquals(expected, updated.stats.loginCount, 'Nested loginCount should increment from prior (or 0)');
    TestFramework.assertTrue(typeof updated.stats === 'object', 'Stats should be an object');
  });

  return suite;
}

/**
 * Create test suite for $inc operator - Type validation
 * @returns {TestSuite} Test suite for $inc type validation operations
 */
function createIncTypeValidationTestSuite() {
  const suite = new TestSuite('$inc Type Validation Tests');

  // Increment non-numeric field (should error)
  suite.addTest('should error when incrementing non-numeric field', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    TestFramework.assertThrows(function() {
      collection.updateOne(
        { _id: 'person1' },
        { $inc: { 'name.first': 5 } }
      );
    }, null, 'Should throw error when incrementing string field');
  });

  suite.addTest('should error when incrementing boolean field', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    TestFramework.assertThrows(function() {
      collection.updateOne(
        { _id: 'person1' },
        { $inc: { isActive: 1 } }
      );
    }, null, 'Should throw error when incrementing boolean field');
  });

  // Non-numeric increment value (should error)
  suite.addTest('should error with non-numeric increment value', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    TestFramework.assertThrows(function() {
      collection.updateOne(
        { _id: 'person1' },
        { $inc: { age: 'five' } }
      );
    }, null, 'Should throw error with string increment value');
  });

  suite.addTest('should error with boolean increment value', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    TestFramework.assertThrows(function() {
      collection.updateOne(
        { _id: 'person1' },
        { $inc: { age: true } }
      );
    }, null, 'Should throw error with boolean increment value');
  });

  suite.addTest('should error with null increment value', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    TestFramework.assertThrows(function() {
      collection.updateOne(
        { _id: 'person1' },
        { $inc: { age: null } }
      );
    }, null, 'Should throw error with null increment value');
  });

  return suite;
}

/**
 * Create test suite for $inc operator - Boundary testing
 * @returns {TestSuite} Test suite for $inc boundary testing operations
 */
function createIncBoundaryTestingTestSuite() {
  const suite = new TestSuite('$inc Boundary Testing Tests');

  // Large number increments
  suite.addTest('should handle large number increments', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const largeIncrement = 1000000;
  const before = collection.findOne({ _id: 'person6' });
  const original = before.balance;
    const result = collection.updateOne(
      { _id: 'person6' },
      { $inc: { balance: largeIncrement } }
    );
    JDbLogger.debug(`'should handle large number increments' result: 
${JSON.stringify(result, null, 2)}`);
  const updated = collection.findOne({ _id: 'person6' });
  const expected = (typeof original === 'number' ? original : 0) + largeIncrement;
  const changed = expected !== original;
  TestFramework.assertEquals(changed ? 1 : 0, result.modifiedCount, 'Modified count should reflect large increment');
    JDbLogger.debug(`'should handle large number increments' updated: 
${JSON.stringify(updated, null, 2)}`);
  _assertNumberEqualsDynamic(expected, updated.balance, 'Balance should increase by large increment', 0.0001);
  });

  // Floating point precision
  suite.addTest('should maintain floating point precision', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
  const before = collection.findOne({ _id: 'person1' });
  const original = before.score;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $inc: { score: 0.1 } }
    );
    JDbLogger.debug(`'should maintain floating point precision' result: 
${JSON.stringify(result, null, 2)}`);
  const updated = collection.findOne({ _id: 'person1' });
  const expected = (typeof original === 'number' ? original : 0) + 0.1;
  const changed = !_areNumbersClose(expected, original, 0.000001);
  TestFramework.assertEquals(changed ? 1 : 0, result.modifiedCount, 'Modified count should reflect precision increment');
    JDbLogger.debug(`'should maintain floating point precision' updated: 
${JSON.stringify(updated, null, 2)}`);
  _assertNumberEqualsDynamic(expected, updated.score, 'Score should increase by 0.1 with acceptable precision', 0.0001);
  });

  // Integer overflow scenarios
  suite.addTest('should handle near-maximum safe integer values', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    // Set up a document with a large number close to MAX_SAFE_INTEGER
    collection.updateOne(
      { _id: 'person1' },
      { $set: { largeNumber: Number.MAX_SAFE_INTEGER - 100 } }
    );

    const result = collection.updateOne(
      { _id: 'person1' },
      { $inc: { largeNumber: 50 } }
    );
    JDbLogger.debug(`'should handle near-maximum safe integer values' result: 
${JSON.stringify(result, null, 2)}`);
  // largeNumber was set immediately prior so this should always modify unless engine optimises identical values (unlikely)
  TestFramework.assertEquals(1, result.modifiedCount, 'Should modify largeNumber field');
    const updated = collection.findOne({ _id: 'person1' });
    JDbLogger.debug(`'should handle near-maximum safe integer values' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(Number.MAX_SAFE_INTEGER - 50, updated.largeNumber, 'Should handle large integer increment');
  });

  return suite;
}

/**
 * Create test suite for $mul operator - Basic multiplication
 * @returns {TestSuite} Test suite for $mul basic multiplication operations
 */
function createMulBasicMultiplicationTestSuite() {
  const suite = new TestSuite('$mul Basic Multiplication Tests');

  // Positive multipliers
  suite.addTest('should multiply by positive integer', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
  const before = collection.findOne({ _id: 'person1' });
  const original = before.age;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $mul: { age: 2 } }
    );
    JDbLogger.debug(`'should multiply by positive integer' result: 
${JSON.stringify(result, null, 2)}`);
    const updated = collection.findOne({ _id: 'person1' });
    let expected;
    if (typeof original === 'number') {
      expected = original * 2;
    } else {
      // Non-existent numeric becomes 0 then multiplied -> 0 (MongoDB semantics for $mul on absent field sets to 0)
      expected = 0;
    }
    const changed = expected !== original;
    TestFramework.assertEquals(changed ? 1 : 0, result.modifiedCount, 'Modified count should reflect multiplication');
    JDbLogger.debug(`'should multiply by positive integer' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(expected, updated.age, 'Age should be doubled from prior value');
  });

  suite.addTest('should multiply by positive decimal', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
  const before = collection.findOne({ _id: 'person1' });
  const original = before.score;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $mul: { score: 1.1 } }
    );
    JDbLogger.debug(`'should multiply by positive decimal' result: 
${JSON.stringify(result, null, 2)}`);
  const updated = collection.findOne({ _id: 'person1' });
  const expected = (typeof original === 'number') ? original * 1.1 : 0; // absent => 0
  const changed = !_areNumbersClose(expected, original, 0.0001);
  TestFramework.assertEquals(changed ? 1 : 0, result.modifiedCount, 'Modified count should reflect multiplication');
    JDbLogger.debug(`'should multiply by positive decimal' updated: 
${JSON.stringify(updated, null, 2)}`);
  _assertNumberEqualsDynamic(expected, updated.score, 'Score should be multiplied by 1.1', 0.01);
  });

  // Negative multipliers
  suite.addTest('should multiply by negative value', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
  const before = collection.findOne({ _id: 'person4' });
  const original = before.age;
    const result = collection.updateOne(
      { _id: 'person4' },
      { $mul: { age: -1 } }
    );
    JDbLogger.debug(`'should multiply by negative value' result: 
${JSON.stringify(result, null, 2)}`);
  const updated = collection.findOne({ _id: 'person4' });
  const expected = (typeof original === 'number') ? original * -1 : 0;
  const changed = expected !== original;
  TestFramework.assertEquals(changed ? 1 : 0, result.modifiedCount, 'Modified count should reflect negation');
    JDbLogger.debug(`'should multiply by negative value' updated: 
${JSON.stringify(updated, null, 2)}`);
  TestFramework.assertEquals(expected, updated.age, 'Age should be negated');
  });

  // Zero multiplier (sets to 0)
  suite.addTest('should set field to zero when multiplying by zero', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
  const before = collection.findOne({ _id: 'person3' });
  const original = before.score;
    const result = collection.updateOne(
      { _id: 'person3' },
      { $mul: { score: 0 } }
    );
    JDbLogger.debug(`'should set field to zero when multiplying by zero' result: 
${JSON.stringify(result, null, 2)}`);
  const updated = collection.findOne({ _id: 'person3' });
  const expected = 0; // always 0 for multiplication by zero
  const changed = expected !== original;
  TestFramework.assertEquals(changed ? 1 : 0, result.modifiedCount, 'Modified count should reflect zeroing logic');
    JDbLogger.debug(`'should set field to zero when multiplying by zero' updated: 
${JSON.stringify(updated, null, 2)}`);
  TestFramework.assertEquals(expected, updated.score, 'Score should be set to 0');
  });

  // Fractional multipliers
  suite.addTest('should multiply by fractional values', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
  const before = collection.findOne({ _id: 'person6' });
  const original = before.balance;
    const result = collection.updateOne(
      { _id: 'person6' },
      { $mul: { balance: 0.5 } }
    );
    JDbLogger.debug(`'should multiply by fractional values' result: 
${JSON.stringify(result, null, 2)}`);
  const updated = collection.findOne({ _id: 'person6' });
  const expected = (typeof original === 'number') ? original * 0.5 : 0;
  const changed = !_areNumbersClose(expected, original, 0.0001);
  TestFramework.assertEquals(changed ? 1 : 0, result.modifiedCount, 'Modified count should reflect fractional multiplication');
    JDbLogger.debug(`'should multiply by fractional values' updated: 
${JSON.stringify(updated, null, 2)}`);
  _assertNumberEqualsDynamic(expected, updated.balance, 'Balance should be halved', 0.01);
  });

  return suite;
}

/**
 * Create test suite for $mul operator - Field creation
 * @returns {TestSuite} Test suite for $mul field creation operations
 */
function createMulFieldCreationTestSuite() {
  const suite = new TestSuite('$mul Field Creation Tests');

  // Multiply non-existent field (creates as 0)
  suite.addTest('should create non-existent field as 0 when multiplied', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
  const before = collection.findOne({ _id: 'person1' });
  const original = before.nonExistentField;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $mul: { nonExistentField: 5 } }
    );
    JDbLogger.debug(`'should create non-existent field as 0 when multiplied' result: 
${JSON.stringify(result, null, 2)}`);
  const updated = collection.findOne({ _id: 'person1' });
  // Mongo semantics: create field set to 0 (0 * multiplier)
  const expected = (typeof original === 'number') ? original * 5 : 0;
  const changed = expected !== original;
  TestFramework.assertEquals(changed ? 1 : 0, result.modifiedCount, 'Modified count should reflect creation');
    JDbLogger.debug(`'should create non-existent field as 0 when multiplied' updated: 
${JSON.stringify(updated, null, 2)}`);
  TestFramework.assertEquals(expected, updated.nonExistentField, 'Field should be 0 after multiplication creation semantics');
  });

  suite.addTest('should create nested non-existent field as 0', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
  const before = collection.findOne({ _id: 'person2' });
  const original = before.stats && before.stats.multipliedField;
    const result = collection.updateOne(
      { _id: 'person2' },
      { $mul: { 'stats.multipliedField': 3.5 } }
    );
    JDbLogger.debug(`'should create nested non-existent field as 0' result: 
${JSON.stringify(result, null, 2)}`);
  const updated = collection.findOne({ _id: 'person2' });
  const starting = (typeof original === 'number') ? original : 0; // absent => 0
  const expected = starting * 3.5; // if absent -> 0
  const changed = expected !== original;
  TestFramework.assertEquals(changed ? 1 : 0, result.modifiedCount, 'Modified count should reflect nested creation');
    JDbLogger.debug(`'should create nested non-existent field as 0' updated: 
${JSON.stringify(updated, null, 2)}`);
  TestFramework.assertEquals(expected, updated.stats.multipliedField, 'Nested field should follow multiplication semantics');
  });

  return suite;
}

/**
 * Create test suite for $mul operator - Type validation
 * @returns {TestSuite} Test suite for $mul type validation operations
 */
function createMulTypeValidationTestSuite() {
  const suite = new TestSuite('$mul Type Validation Tests');

  // Multiply non-numeric field (should error)
  suite.addTest('should error when multiplying non-numeric field', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    TestFramework.assertThrows(function() {
      collection.updateOne(
        { _id: 'person1' },
        { $mul: { 'name.first': 2 } }
      );
    }, null, 'Should throw error when multiplying string field');
  });

  // Non-numeric multiplier (should error)
  suite.addTest('should error with non-numeric multiplier', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    TestFramework.assertThrows(function() {
      collection.updateOne(
        { _id: 'person1' },
        { $mul: { age: 'two' } }
      );
    }, null, 'Should throw error with string multiplier');
  });

  return suite;
}

/**
 * Create test suite for $min operator - Value comparison and replacement
 * @returns {TestSuite} Test suite for $min value comparison operations
 */
function createMinValueComparisonTestSuite() {
  const suite = new TestSuite('$min Value Comparison Tests');

  // Replace when new value is smaller
  suite.addTest('should replace field when new value is smaller', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
  const before = collection.findOne({ _id: 'person1' });
  const original = before.age;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $min: { age: 25 } }
    );
    JDbLogger.debug(`'should replace field when new value is smaller' result: 
${JSON.stringify(result, null, 2)}`);
  const updated = collection.findOne({ _id: 'person1' });
  const expected = (original == null || original > 25) ? 25 : original;
  const changed = expected !== original;
  TestFramework.assertEquals(changed ? 1 : 0, result.modifiedCount, 'Modified count should reflect min replacement');
    JDbLogger.debug(`'should replace field when new value is smaller' updated: 
${JSON.stringify(updated, null, 2)}`);
  TestFramework.assertEquals(expected, updated.age, 'Age should be min(original, 25)');
  });

  // No change when current value is smaller
  suite.addTest('should not change field when current value is smaller', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const original = collection.findOne({ _id: 'person1' });
    JDbLogger.debug(`'should not change field when current value is smaller' original: 
${JSON.stringify(original, null, 2)}`);
    const originalAge = original.age;
    
    const result = collection.updateOne(
      { _id: 'person1' },
      { $min: { age: 35 } }
    );
    JDbLogger.debug(`'should not change field when current value is smaller' result: 
${JSON.stringify(result, null, 2)}`);
  const expected = (originalAge == null || originalAge > 35) ? 35 : originalAge;
  const changed = expected !== originalAge;
  TestFramework.assertEquals(changed ? 1 : 0, result.modifiedCount, 'Modified count should reflect whether min applied');
    const updated = collection.findOne({ _id: 'person1' });
    JDbLogger.debug(`'should not change field when current value is smaller' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(originalAge, updated.age, 'Should keep original smaller value');
  });

  // Equal values (no change)
  suite.addTest('should not change field when values are equal', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const original = collection.findOne({ _id: 'person3' });
    JDbLogger.debug(`'should not change field when values are equal' original: 
${JSON.stringify(original, null, 2)}`);
    const originalAge = original.age;
    
    const result = collection.updateOne(
      { _id: 'person3' },
      { $min: { age: originalAge } }
    );
    JDbLogger.debug(`'should not change field when values are equal' result: 
${JSON.stringify(result, null, 2)}`);
  const expected = originalAge; // unchanged
  const changed = expected !== originalAge;
  TestFramework.assertEquals(changed ? 1 : 0, result.modifiedCount, 'Modified count should reflect equality no-op');
    const updated = collection.findOne({ _id: 'person3' });
    JDbLogger.debug(`'should not change field when values are equal' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(originalAge, updated.age, 'Should keep same value');
  });

  // Mix of integer/float comparisons
  suite.addTest('should handle mixed integer/float comparisons', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
  const before = collection.findOne({ _id: 'person1' });
  const original = before.score;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $min: { score: 80 } }
    );
    JDbLogger.debug(`'should handle mixed integer/float comparisons' result: 
${JSON.stringify(result, null, 2)}`);
  const updated = collection.findOne({ _id: 'person1' });
  const expected = (original == null || original > 80) ? 80 : original;
  const changed = expected !== original;
  TestFramework.assertEquals(changed ? 1 : 0, result.modifiedCount, 'Modified count should reflect min operation');
    JDbLogger.debug(`'should handle mixed integer/float comparisons' updated: 
${JSON.stringify(updated, null, 2)}`);
  TestFramework.assertEquals(expected, updated.score, 'Score should be min(original, 80)');
  });

  return suite;
}

/**
 * Create test suite for $min operator - Field creation
 * @returns {TestSuite} Test suite for $min field creation operations
 */
function createMinFieldCreationTestSuite() {
  const suite = new TestSuite('$min Field Creation Tests');

  // Min on non-existent field (creates with min value)
  suite.addTest('should create non-existent field with min value', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
  const before = collection.findOne({ _id: 'person1' });
  const original = before.newMinField;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $min: { newMinField: 100 } }
    );
    JDbLogger.debug(`'should create non-existent field with min value' result: 
${JSON.stringify(result, null, 2)}`);
  const updated = collection.findOne({ _id: 'person1' });
  const expected = (original == null || original > 100) ? 100 : original;
  const changed = expected !== original;
  TestFramework.assertEquals(changed ? 1 : 0, result.modifiedCount, 'Modified count should reflect min creation');
    JDbLogger.debug(`'should create non-existent field with min value' updated: 
${JSON.stringify(updated, null, 2)}`);
  TestFramework.assertEquals(expected, updated.newMinField, 'Field should be min(original (or undefined treated as +∞), 100)');
  });

  return suite;
}

/**
 * Create test suite for $min operator - Type handling
 * @returns {TestSuite} Test suite for $min type handling operations
 */
function createMinTypeHandlingTestSuite() {
  const suite = new TestSuite('$min Type Handling Tests');

  // Date comparisons
  suite.addTest('should handle Date comparisons correctly', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const earlierDate = new Date('2025-06-01T00:00:00Z');
  const before = collection.findOne({ _id: 'person1' });
  const original = before.lastLogin;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $min: { lastLogin: earlierDate } }
    );
    JDbLogger.debug(`'should handle Date comparisons correctly' result: 
${JSON.stringify(result, null, 2)}`);
  const updated = collection.findOne({ _id: 'person1' });
  const originalTime = original instanceof Date ? original.getTime() : (original ? new Date(original).getTime() : null);
  const expectedTime = (originalTime == null || originalTime > earlierDate.getTime()) ? earlierDate.getTime() : originalTime;
  const changed = expectedTime !== originalTime;
  TestFramework.assertEquals(changed ? 1 : 0, result.modifiedCount, 'Modified count should reflect date min');
    JDbLogger.debug(`'should handle Date comparisons correctly' updated: 
${JSON.stringify(updated, null, 2)}`);
  TestFramework.assertEquals(expectedTime, updated.lastLogin.getTime(), 'lastLogin should be min(original, earlierDate)');
  });

  // String comparisons (lexicographical)
  suite.addTest('should handle string comparisons lexicographically', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
  const before = collection.findOne({ _id: 'person1' });
  const original = _getValueByPath(before, 'name.first');
    const result = collection.updateOne(
      { _id: 'person1' },
      { $min: { 'name.first': 'Aaron' } }
    );
    JDbLogger.debug(`'should handle string comparisons lexicographically' result: 
${JSON.stringify(result, null, 2)}`);
  const updated = collection.findOne({ _id: 'person1' });
  const expected = (original == null || original > 'Aaron') ? 'Aaron' : original;
  const changed = expected !== original;
  TestFramework.assertEquals(changed ? 1 : 0, result.modifiedCount, 'Modified count should reflect lexicographical min');
    JDbLogger.debug(`'should handle string comparisons lexicographically' updated: 
${JSON.stringify(updated, null, 2)}`);
  TestFramework.assertEquals(expected, updated.name.first, 'First name should be lexicographical min');
  });

  // Type mismatch handling
  suite.addTest('should handle type mismatches appropriately', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    // This should either error or have consistent behavior with MongoDB
    TestFramework.assertThrows(function() {
      collection.updateOne(
        { _id: 'person1' },
        { $min: { age: 'twenty-five' } }
      );
    }, null, 'Should handle type mismatch consistently');
  });

  return suite;
}

/**
 * Create test suite for $min operator - Edge cases
 * @returns {TestSuite} Test suite for $min edge case operations
 */
function createMinEdgeCasesTestSuite() {
  const suite = new TestSuite('$min Edge Cases Tests');

  // Null vs number comparisons
  suite.addTest('should handle null vs number comparisons', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
  const before = collection.findOne({ _id: 'person2' });
  const original = before.lastLogin; // expect null
    const result = collection.updateOne(
      { _id: 'person2' },
      { $min: { lastLogin: new Date('2025-06-01T00:00:00Z') } }
    );
    JDbLogger.debug(`'should handle null vs number comparisons' result: 
${JSON.stringify(result, null, 2)}`);
  const originalTime = original instanceof Date ? original.getTime() : (original ? new Date(original).getTime() : null);
  const compTime = new Date('2025-06-01T00:00:00Z').getTime();
  // In these tests we treat null as smaller (MongoDB sort order: null < numbers/strings/dates), so expect no change
  const expectedTime = (originalTime == null || originalTime < compTime) ? originalTime : compTime;
  const changed = expectedTime !== originalTime;
  TestFramework.assertEquals(changed ? 1 : 0, result.modifiedCount, 'Modified count should reflect null handling');
    const updated = collection.findOne({ _id: 'person2' });
    JDbLogger.debug(`'should handle null vs number comparisons' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(null, updated.lastLogin, 'Null should be considered smaller than Date');
  });

  // Undefined field handling
  suite.addTest('should handle undefined field appropriately', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
  const before = collection.findOne({ _id: 'person1' });
  const original = before.undefinedField;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $min: { undefinedField: 50 } }
    );
    JDbLogger.debug(`'should handle undefined field appropriately' result: 
${JSON.stringify(result, null, 2)}`);
  const updated = collection.findOne({ _id: 'person1' });
  const expected = (original == null || original > 50) ? 50 : original;
  const changed = expected !== original;
  TestFramework.assertEquals(changed ? 1 : 0, result.modifiedCount, 'Modified count should reflect undefined field min');
    JDbLogger.debug(`'should handle undefined field appropriately' updated: 
${JSON.stringify(updated, null, 2)}`);
  TestFramework.assertEquals(expected, updated.undefinedField, 'Undefined field should adopt min semantics');
  });

  return suite;
}

/**
 * Create test suite for $max operator - Value comparison and replacement (inverted from $min)
 * @returns {TestSuite} Test suite for $max value comparison operations
 */
function createMaxValueComparisonTestSuite() {
  const suite = new TestSuite('$max Value Comparison Tests');

  // Replace when new value is larger
  suite.addTest('should replace field when new value is larger', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
  const before = collection.findOne({ _id: 'person1' });
  const original = before.age;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $max: { age: 35 } }
    );
    JDbLogger.debug(`'should replace field when new value is larger' result: 
${JSON.stringify(result, null, 2)}`);
  const updated = collection.findOne({ _id: 'person1' });
  const expected = (original == null || original < 35) ? 35 : original;
  const changed = expected !== original;
  TestFramework.assertEquals(changed ? 1 : 0, result.modifiedCount, 'Modified count should reflect max replacement');
    JDbLogger.debug(`'should replace field when new value is larger' updated: 
${JSON.stringify(updated, null, 2)}`);
  TestFramework.assertEquals(expected, updated.age, 'Age should be max(original, 35)');
  });

  // No change when current value is larger
  suite.addTest('should not change field when current value is larger', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const original = collection.findOne({ _id: 'person6' });
    JDbLogger.debug(`'should not change field when current value is larger' original: 
${JSON.stringify(original, null, 2)}`);
    const originalAge = original.age;
    
    const result = collection.updateOne(
      { _id: 'person6' },
      { $max: { age: 60 } }
    );
    JDbLogger.debug(`'should not change field when current value is larger' result: 
${JSON.stringify(result, null, 2)}`);
  const expected = (originalAge == null || originalAge < 60) ? 60 : originalAge;
  const changed = expected !== originalAge;
  TestFramework.assertEquals(changed ? 1 : 0, result.modifiedCount, 'Modified count should reflect max operation');
    const updated = collection.findOne({ _id: 'person6' });
    JDbLogger.debug(`'should not change field when current value is larger' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(originalAge, updated.age, 'Should keep original larger value');
  });

  // Equal values (no change)
  suite.addTest('should not change field when values are equal', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const original = collection.findOne({ _id: 'person3' });
    JDbLogger.debug(`'should not change field when values are equal' original: 
${JSON.stringify(original, null, 2)}`);
    const originalAge = original.age;
    
    const result = collection.updateOne(
      { _id: 'person3' },
      { $max: { age: originalAge } }
    );
    JDbLogger.debug(`'should not change field when values are equal' result: 
${JSON.stringify(result, null, 2)}`);
  const expected = originalAge;
  const changed = expected !== originalAge;
  TestFramework.assertEquals(changed ? 1 : 0, result.modifiedCount, 'Modified count should reflect equality no-op');
    const updated = collection.findOne({ _id: 'person3' });
    JDbLogger.debug(`'should not change field when values are equal' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(originalAge, updated.age, 'Should keep same value');
  });

  // Mix of integer/float comparisons
  suite.addTest('should handle mixed integer/float comparisons', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
  const before = collection.findOne({ _id: 'person2' });
  const original = before.score;
    const result = collection.updateOne(
      { _id: 'person2' },
      { $max: { score: 5 } }
    );
    JDbLogger.debug(`'should handle mixed integer/float comparisons' result: 
${JSON.stringify(result, null, 2)}`);
  const updated = collection.findOne({ _id: 'person2' });
  const expected = (original == null || original < 5) ? 5 : original;
  const changed = expected !== original;
  TestFramework.assertEquals(changed ? 1 : 0, result.modifiedCount, 'Modified count should reflect max operation');
    JDbLogger.debug(`'should handle mixed integer/float comparisons' updated: 
${JSON.stringify(updated, null, 2)}`);
  TestFramework.assertEquals(expected, updated.score, 'Score should be max(original, 5)');
  });

  return suite;
}

/**
 * Create test suite for $max operator - Field creation
 * @returns {TestSuite} Test suite for $max field creation operations
 */
function createMaxFieldCreationTestSuite() {
  const suite = new TestSuite('$max Field Creation Tests');

  // Max on non-existent field (creates with max value)
  suite.addTest('should create non-existent field with max value', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
  const before = collection.findOne({ _id: 'person1' });
  const original = before.newMaxField;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $max: { newMaxField: 200 } }
    );
    JDbLogger.debug(`'should create non-existent field with max value' result: 
${JSON.stringify(result, null, 2)}`);
  const updated = collection.findOne({ _id: 'person1' });
  const expected = (original == null || original < 200) ? 200 : original;
  const changed = expected !== original;
  TestFramework.assertEquals(changed ? 1 : 0, result.modifiedCount, 'Modified count should reflect max creation');
    JDbLogger.debug(`'should create non-existent field with max value' updated: 
${JSON.stringify(updated, null, 2)}`);
  TestFramework.assertEquals(expected, updated.newMaxField, 'Field should be max(original (or undefined treated as -∞), 200)');
  });

  return suite;
}

/**
 * Create test suite for $max operator - Boundary testing
 * @returns {TestSuite} Test suite for $max boundary testing operations
 */
function createMaxBoundaryTestingTestSuite() {
  const suite = new TestSuite('$max Boundary Testing Tests');

  // Maximum safe integer values
  suite.addTest('should handle maximum safe integer values', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
  const before = collection.findOne({ _id: 'person1' });
  const original = before.age;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $max: { age: Number.MAX_SAFE_INTEGER } }
    );
    JDbLogger.debug(`'should handle maximum safe integer values' result: 
${JSON.stringify(result, null, 2)}`);
  const updated = collection.findOne({ _id: 'person1' });
  const expected = (original == null || original < Number.MAX_SAFE_INTEGER) ? Number.MAX_SAFE_INTEGER : original;
  const changed = expected !== original;
  TestFramework.assertEquals(changed ? 1 : 0, result.modifiedCount, 'Modified count should reflect max safe integer update');
    JDbLogger.debug(`'should handle maximum safe integer values' updated: 
${JSON.stringify(updated, null, 2)}`);
  TestFramework.assertEquals(expected, updated.age, 'Age should be max(original, MAX_SAFE_INTEGER)');
  });

  // Date range maximums
  suite.addTest('should handle date range maximums', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const futureDate = new Date('2030-12-31T23:59:59Z');
  const before = collection.findOne({ _id: 'person1' });
  const original = before.lastLogin;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $max: { lastLogin: futureDate } }
    );
    JDbLogger.debug(`'should handle date range maximums' result: 
${JSON.stringify(result, null, 2)}`);
  const updated = collection.findOne({ _id: 'person1' });
  const originalTime = original instanceof Date ? original.getTime() : (original ? new Date(original).getTime() : null);
  const expectedTime = (originalTime == null || originalTime < futureDate.getTime()) ? futureDate.getTime() : originalTime;
  const changed = expectedTime !== originalTime;
  TestFramework.assertEquals(changed ? 1 : 0, result.modifiedCount, 'Modified count should reflect date max');
    JDbLogger.debug(`'should handle date range maximums' updated: 
${JSON.stringify(updated, null, 2)}`);
  TestFramework.assertEquals(expectedTime, updated.lastLogin.getTime(), 'lastLogin should be max(original, futureDate)');
  });

  return suite;
}

/**
 * Convenience function to run all numeric update operator test suites
 * @returns {TestResults} Combined results from all numeric update operator test suites
 */
function runNumericUpdateOperatorTests() {
  const logger = JDbLogger.createComponentLogger('ValidationTests-NumericUpdateOps');
  logger.info('Running all numeric update operator tests...');

  let combinedResults = new TestResults();

  try {
    // Setup test environment
    setupValidationTestEnvironmentForTests();
    
    // Initialise test framework
    const framework = initialiseValidationTests();
    
    // Validate environment before running tests
    framework.validateEnvironment();

    // Run numeric update operator test suites
    const suiteNames = [
      '$inc Basic Incrementation Tests',
      '$inc Field Creation Tests',
      '$inc Type Validation Tests',
      '$inc Boundary Testing Tests',
      '$mul Basic Multiplication Tests',
      '$mul Field Creation Tests',
      '$mul Type Validation Tests',
      '$min Value Comparison Tests',
      '$min Field Creation Tests',
      '$min Type Handling Tests',
      '$min Edge Cases Tests',
      '$max Value Comparison Tests',
      '$max Field Creation Tests',
      '$max Boundary Testing Tests'
    ];

    for (const suiteName of suiteNames) {
      try {
        const results = framework.runTestSuite(suiteName);
        combinedResults.results.push(...results.results);
        logger.info(`Completed ${suiteName}: ${results.getPassed().length} passed, ${results.getFailed().length} failed`);
      } catch (error) {
        logger.error(`Failed to run ${suiteName}`, { error: error.message });
        combinedResults.results.push(new TestResult(suiteName, 'Suite Execution', false, error.message, 0));
      }
    }

    combinedResults.finish();

    logger.info('All numeric update operator tests completed', {
      totalSuites: suiteNames.length,
      totalTests: combinedResults.results.length,
      passed: combinedResults.getPassed().length,
      failed: combinedResults.getFailed().length
    });

    return combinedResults;

  } catch (error) {
    logger.error('Numeric update operator tests failed', { error: error.message });
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
   createIncBasicIncrementationTestSuite,
   createIncFieldCreationTestSuite,
   createIncTypeValidationTestSuite,
   createIncBoundaryTestingTestSuite,
   createMulBasicMultiplicationTestSuite,
   createMulFieldCreationTestSuite,
   createMulTypeValidationTestSuite,
   createMinValueComparisonTestSuite,
   createMinFieldCreationTestSuite,
   createMinTypeHandlingTestSuite,
   createMinEdgeCasesTestSuite,
   createMaxValueComparisonTestSuite,
   createMaxFieldCreationTestSuite,
   createMaxBoundaryTestingTestSuite,
   runNumericUpdateOperatorTests
*/

