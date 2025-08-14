/**
 * 03_NumericUpdateOperators.js - End-to-end validation tests for numeric update operators
 * 
 * Tests MongoDB-compatible numeric update operators ($inc, $mul, $min, $max) against ValidationMockData
 * using full database functionality including Collection, MasterIndex, and file persistence.
 */

/**
 * Create test suite for $inc operator - Basic incrementation
 * @returns {TestSuite} Test suite for $inc basic incrementation operations
 */
function createIncBasicIncrementationTestSuite() {
  const suite = new TestSuite('$inc Basic Incrementation Tests');

  // Positive increments
  suite.addTest('should increment positive integer values', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $inc: { age: 5 } }
    );
    JDbLogger.debug(`'should increment positive integer values' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    JDbLogger.debug(`'should increment positive integer values' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(34, updated.age, 'Should increment age from 29 to 34');
  });

  suite.addTest('should increment positive decimal values', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $inc: { score: 10.5 } }
    );
    JDbLogger.debug(`'should increment positive decimal values' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    JDbLogger.debug(`'should increment positive decimal values' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(96.0, updated.score, 'Should increment score from 85.5 to 96.0');
  });

  // Negative increments (decrement)
  suite.addTest('should decrement with negative increment values', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person4' },
      { $inc: { age: -3, score: -8.1 } }
    );
    JDbLogger.debug(`'should decrement with negative increment values' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person4' });
    JDbLogger.debug(`'should decrement with negative increment values' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(35, updated.age, 'Should decrement age from 38 to 35');
    TestFramework.assertEquals(70.0, updated.score, 'Should decrement score from 78.1 to 70.0');
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
    TestFramework.assertEquals(1, result.modifiedCount, 'Should still report as modified');
    const updated = collection.findOne({ _id: 'person3' });
    JDbLogger.debug(`'should handle zero increment as no-op' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(originalAge, updated.age, 'Age should remain unchanged');
    TestFramework.assertEquals(originalScore, updated.score, 'Score should remain unchanged');
  });

  // Fractional increments
  suite.addTest('should handle fractional increments correctly', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $inc: { balance: 0.25 } }
    );
    JDbLogger.debug(`'should handle fractional increments correctly' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    JDbLogger.debug(`'should handle fractional increments correctly' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(1251.0, updated.balance, 'Should increment balance from 1250.75 to 1251.0');
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
    const result = collection.updateOne(
      { _id: 'person1' },
      { $inc: { newCounterField: 42 } }
    );
    JDbLogger.debug(`'should create non-existent field with increment value' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    JDbLogger.debug(`'should create non-existent field with increment value' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(42, updated.newCounterField, 'Should create field with increment value');
  });

  suite.addTest('should create non-existent decimal field with increment value', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person2' },
      { $inc: { newRatingField: 3.7 } }
    );
    JDbLogger.debug(`'should create non-existent decimal field with increment value' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person2' });
    JDbLogger.debug(`'should create non-existent decimal field with increment value' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(3.7, updated.newRatingField, 'Should create field with decimal increment value');
  });

  // Increment in non-existent nested object
  suite.addTest('should create nested object structure when incrementing nested field', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $inc: { 'stats.loginCount': 1 } }
    );
    JDbLogger.debug(`'should create nested object structure when incrementing nested field' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    JDbLogger.debug(`'should create nested object structure when incrementing nested field' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(1, updated.stats.loginCount, 'Should create nested object with field');
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
    const result = collection.updateOne(
      { _id: 'person6' },
      { $inc: { balance: largeIncrement } }
    );
    JDbLogger.debug(`'should handle large number increments' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person6' });
    JDbLogger.debug(`'should handle large number increments' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(1010000.99, updated.balance, 'Should handle large increment correctly');
  });

  // Floating point precision
  suite.addTest('should maintain floating point precision', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $inc: { score: 0.1 } }
    );
    JDbLogger.debug(`'should maintain floating point precision' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    JDbLogger.debug(`'should maintain floating point precision' updated: 
${JSON.stringify(updated, null, 2)}`);
    // Note: Floating point arithmetic might have precision issues
    TestFramework.assertTrue(Math.abs(updated.score - 85.6) < 0.0001, 'Should maintain reasonable floating point precision');
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
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
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
    const result = collection.updateOne(
      { _id: 'person1' },
      { $mul: { age: 2 } }
    );
    JDbLogger.debug(`'should multiply by positive integer' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    JDbLogger.debug(`'should multiply by positive integer' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(58, updated.age, 'Should multiply age from 29 to 58');
  });

  suite.addTest('should multiply by positive decimal', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $mul: { score: 1.1 } }
    );
    JDbLogger.debug(`'should multiply by positive decimal' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    JDbLogger.debug(`'should multiply by positive decimal' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertTrue(Math.abs(updated.score - 94.05) < 0.01, 'Should multiply score from 85.5 to ~94.05');
  });

  // Negative multipliers
  suite.addTest('should multiply by negative value', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person4' },
      { $mul: { age: -1 } }
    );
    JDbLogger.debug(`'should multiply by negative value' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person4' });
    JDbLogger.debug(`'should multiply by negative value' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(-38, updated.age, 'Should multiply age from 38 to -38');
  });

  // Zero multiplier (sets to 0)
  suite.addTest('should set field to zero when multiplying by zero', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person3' },
      { $mul: { score: 0 } }
    );
    JDbLogger.debug(`'should set field to zero when multiplying by zero' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person3' });
    JDbLogger.debug(`'should set field to zero when multiplying by zero' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(0, updated.score, 'Should set score to 0');
  });

  // Fractional multipliers
  suite.addTest('should multiply by fractional values', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person6' },
      { $mul: { balance: 0.5 } }
    );
    JDbLogger.debug(`'should multiply by fractional values' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person6' });
    JDbLogger.debug(`'should multiply by fractional values' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertTrue(Math.abs(updated.balance - 5000.495) < 0.01, 'Should multiply balance by 0.5');
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
    const result = collection.updateOne(
      { _id: 'person1' },
      { $mul: { nonExistentField: 5 } }
    );
    JDbLogger.debug(`'should create non-existent field as 0 when multiplied' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    JDbLogger.debug(`'should create non-existent field as 0 when multiplied' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(0, updated.nonExistentField, 'Should create field with value 0');
  });

  suite.addTest('should create nested non-existent field as 0', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person2' },
      { $mul: { 'stats.multipliedField': 3.5 } }
    );
    JDbLogger.debug(`'should create nested non-existent field as 0' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person2' });
    JDbLogger.debug(`'should create nested non-existent field as 0' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(0, updated.stats.multipliedField, 'Should create nested field with value 0');
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
    const result = collection.updateOne(
      { _id: 'person1' },
      { $min: { age: 25 } }
    );
    JDbLogger.debug(`'should replace field when new value is smaller' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    JDbLogger.debug(`'should replace field when new value is smaller' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(25, updated.age, 'Should replace age with smaller value');
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
    TestFramework.assertEquals(1, result.modifiedCount, 'Should still report as modified');
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
    TestFramework.assertEquals(1, result.modifiedCount, 'Should still report as modified');
    const updated = collection.findOne({ _id: 'person3' });
    JDbLogger.debug(`'should not change field when values are equal' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(originalAge, updated.age, 'Should keep same value');
  });

  // Mix of integer/float comparisons
  suite.addTest('should handle mixed integer/float comparisons', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $min: { score: 80 } }
    );
    JDbLogger.debug(`'should handle mixed integer/float comparisons' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    JDbLogger.debug(`'should handle mixed integer/float comparisons' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(80, updated.score, 'Should replace decimal with smaller integer');
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
    const result = collection.updateOne(
      { _id: 'person1' },
      { $min: { newMinField: 100 } }
    );
    JDbLogger.debug(`'should create non-existent field with min value' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    JDbLogger.debug(`'should create non-existent field with min value' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(100, updated.newMinField, 'Should create field with min value');
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
    const result = collection.updateOne(
      { _id: 'person1' },
      { $min: { lastLogin: earlierDate } }
    );
    JDbLogger.debug(`'should handle Date comparisons correctly' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    JDbLogger.debug(`'should handle Date comparisons correctly' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(earlierDate.getTime(), updated.lastLogin.getTime(), 'Should replace with earlier date');
  });

  // String comparisons (lexicographical)
  suite.addTest('should handle string comparisons lexicographically', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $min: { 'name.first': 'Aaron' } }
    );
    JDbLogger.debug(`'should handle string comparisons lexicographically' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    JDbLogger.debug(`'should handle string comparisons lexicographically' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals('Aaron', updated.name.first, 'Should replace with lexicographically smaller string');
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
    const result = collection.updateOne(
      { _id: 'person2' },
      { $min: { lastLogin: new Date('2025-06-01T00:00:00Z') } }
    );
    JDbLogger.debug(`'should handle null vs number comparisons' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person2' });
    JDbLogger.debug(`'should handle null vs number comparisons' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(null, updated.lastLogin, 'Null should be considered smaller than Date');
  });

  // Undefined field handling
  suite.addTest('should handle undefined field appropriately', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person1' },
      { $min: { undefinedField: 50 } }
    );
    JDbLogger.debug(`'should handle undefined field appropriately' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    JDbLogger.debug(`'should handle undefined field appropriately' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(50, updated.undefinedField, 'Should create field when undefined');
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
    const result = collection.updateOne(
      { _id: 'person1' },
      { $max: { age: 35 } }
    );
    JDbLogger.debug(`'should replace field when new value is larger' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    JDbLogger.debug(`'should replace field when new value is larger' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(35, updated.age, 'Should replace age with larger value');
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
    TestFramework.assertEquals(1, result.modifiedCount, 'Should still report as modified');
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
    TestFramework.assertEquals(1, result.modifiedCount, 'Should still report as modified');
    const updated = collection.findOne({ _id: 'person3' });
    JDbLogger.debug(`'should not change field when values are equal' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(originalAge, updated.age, 'Should keep same value');
  });

  // Mix of integer/float comparisons
  suite.addTest('should handle mixed integer/float comparisons', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const result = collection.updateOne(
      { _id: 'person2' },
      { $max: { score: 5 } }
    );
    JDbLogger.debug(`'should handle mixed integer/float comparisons' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person2' });
    JDbLogger.debug(`'should handle mixed integer/float comparisons' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(5, updated.score, 'Should replace 0 with larger integer');
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
    const result = collection.updateOne(
      { _id: 'person1' },
      { $max: { newMaxField: 200 } }
    );
    JDbLogger.debug(`'should create non-existent field with max value' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    JDbLogger.debug(`'should create non-existent field with max value' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(200, updated.newMaxField, 'Should create field with max value');
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
    const result = collection.updateOne(
      { _id: 'person1' },
      { $max: { age: Number.MAX_SAFE_INTEGER } }
    );
    JDbLogger.debug(`'should handle maximum safe integer values' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    JDbLogger.debug(`'should handle maximum safe integer values' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(Number.MAX_SAFE_INTEGER, updated.age, 'Should handle maximum safe integer');
  });

  // Date range maximums
  suite.addTest('should handle date range maximums', function() {
    const collection = VALIDATION_TEST_ENV.collections.persons;
    const futureDate = new Date('2030-12-31T23:59:59Z');
    const result = collection.updateOne(
      { _id: 'person1' },
      { $max: { lastLogin: futureDate } }
    );
    JDbLogger.debug(`'should handle date range maximums' result: 
${JSON.stringify(result, null, 2)}`);
    TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
    const updated = collection.findOne({ _id: 'person1' });
    JDbLogger.debug(`'should handle date range maximums' updated: 
${JSON.stringify(updated, null, 2)}`);
    TestFramework.assertEquals(futureDate.getTime(), updated.lastLogin.getTime(), 'Should handle future date maximum');
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
