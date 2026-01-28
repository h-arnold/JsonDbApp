/**
 * ValidationUtils Tests
 * Tests for the ValidationUtils utility class functionality
 */
function createValidationUtilsTestSuite() {
  const suite = new TestSuite('ValidationUtils Tests');

  // ============= REQUIRED VALIDATION TESTS =============
  
  suite.addTest('testValidationUtilsValidateRequired', function() {
    // Should pass for valid values
    Validate.required('string', 'param');
    Validate.required(0, 'param');
    Validate.required(false, 'param');
    Validate.required([], 'param');
    Validate.required({}, 'param');
    
    // Should throw for null
    TestFramework.assertThrows(() => {
      Validate.required(null, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for null value');
    
    // Should throw for undefined
    TestFramework.assertThrows(() => {
      Validate.required(undefined, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for undefined value');
  });

  // ============= TYPE VALIDATION TESTS =============
  
  suite.addTest('testValidationUtilsValidateType', function() {
    // Valid type checks
    Validate.type('string', 'string', 'param');
    Validate.type(123, 'number', 'param');
    Validate.type(true, 'boolean', 'param');
    Validate.type({}, 'object', 'param');
    Validate.type(function(){}, 'function', 'param');
    
    // Invalid type checks
    TestFramework.assertThrows(() => {
      Validate.type('string', 'number', 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for wrong type');
    
    TestFramework.assertThrows(() => {
      Validate.type(123, 'string', 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for number vs string');
  });

  // ============= STRING VALIDATION TESTS =============
  
  suite.addTest('testValidationUtilsValidateNonEmptyString', function() {
    // Valid strings
    Validate.nonEmptyString('test', 'param');
    Validate.nonEmptyString('a', 'param');
    Validate.nonEmptyString('  test  ', 'param');
    
    // Invalid strings
    TestFramework.assertThrows(() => {
      Validate.nonEmptyString('', 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for empty string');
    
    TestFramework.assertThrows(() => {
      Validate.nonEmptyString('   ', 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for whitespace-only string');
    
    TestFramework.assertThrows(() => {
      Validate.nonEmptyString(null, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for null');
    
    TestFramework.assertThrows(() => {
      Validate.nonEmptyString(undefined, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for undefined');
    
    TestFramework.assertThrows(() => {
      Validate.nonEmptyString(123, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for number');
  });

  suite.addTest('testValidationUtilsValidateString', function() {
    // Valid strings
    Validate.string('test', 'param');
    Validate.string('', 'param');
    Validate.string('   ', 'param');
    
    // Invalid types
    TestFramework.assertThrows(() => {
      Validate.string(123, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for number');
    
    TestFramework.assertThrows(() => {
      Validate.string(null, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for null');
  });

  // ============= OBJECT VALIDATION TESTS =============
  
  suite.addTest('testValidationUtilsValidateObject', function() {
    // Valid objects
    Validate.object({}, 'param');
    Validate.object({key: 'value'}, 'param');
    Validate.object(new Date(), 'param');
    
    // Invalid objects
    TestFramework.assertThrows(() => {
      Validate.object(null, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for null');
    
    TestFramework.assertThrows(() => {
      Validate.object([], 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for array');
    
    TestFramework.assertThrows(() => {
      Validate.object('string', 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for string');
    
    TestFramework.assertThrows(() => {
      Validate.object(undefined, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for undefined');
  });

  // ============= BOOLEAN VALIDATION TESTS =============
  
  suite.addTest('testValidationUtilsValidateBoolean', function() {
    // Valid booleans
    Validate.boolean(true, 'param');
    Validate.boolean(false, 'param');
    
    // Invalid booleans
    TestFramework.assertThrows(() => {
      Validate.boolean('true', 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for string "true"');
    
    TestFramework.assertThrows(() => {
      Validate.boolean(1, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for number 1');
    
    TestFramework.assertThrows(() => {
      Validate.boolean(0, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for number 0');
  });

  // ============= ARRAY VALIDATION TESTS =============
  
  suite.addTest('testValidationUtilsValidateArray', function() {
    // Valid arrays
    Validate.array([], 'param');
    Validate.array([1, 2, 3], 'param');
    Validate.array(['a', 'b'], 'param');
    
    // Invalid arrays
    TestFramework.assertThrows(() => {
      Validate.array({}, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for object');
    
    TestFramework.assertThrows(() => {
      Validate.array('string', 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for string');
    
    TestFramework.assertThrows(() => {
      Validate.array(null, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for null');
  });

  suite.addTest('testValidationUtilsValidateNonEmptyArray', function() {
    // Valid non-empty arrays
    Validate.nonEmptyArray([1], 'param');
    Validate.nonEmptyArray(['a', 'b'], 'param');
    
    // Invalid arrays
    TestFramework.assertThrows(() => {
      Validate.nonEmptyArray([], 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for empty array');
    
    TestFramework.assertThrows(() => {
      Validate.nonEmptyArray({}, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for object');
  });

  // ============= NUMBER VALIDATION TESTS =============
  
  suite.addTest('testValidationUtilsValidateNumber', function() {
    // Valid numbers
    Validate.number(0, 'param');
    Validate.number(42, 'param');
    Validate.number(-10, 'param');
    Validate.number(3.14, 'param');
    
    // Invalid numbers
    TestFramework.assertThrows(() => {
      Validate.number('42', 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for string number');
    
    TestFramework.assertThrows(() => {
      Validate.number(NaN, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for NaN');
    
    TestFramework.assertThrows(() => {
      Validate.number(null, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for null');
  });

  suite.addTest('testValidationUtilsValidateInteger', function() {
    // Valid integers
    Validate.integer(0, 'param');
    Validate.integer(42, 'param');
    Validate.integer(-10, 'param');
    
    // Invalid integers
    TestFramework.assertThrows(() => {
      Validate.integer(3.14, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for float');
    
    TestFramework.assertThrows(() => {
      Validate.integer('42', 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for string');
  });

  suite.addTest('testValidationUtilsValidatePositiveNumber', function() {
    // Valid positive numbers
    Validate.positiveNumber(1, 'param');
    Validate.positiveNumber(42, 'param');
    Validate.positiveNumber(0.1, 'param');
    
    // Invalid positive numbers
    TestFramework.assertThrows(() => {
      Validate.positiveNumber(0, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for zero');
    
    TestFramework.assertThrows(() => {
      Validate.positiveNumber(-1, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for negative');
  });

  suite.addTest('testValidationUtilsValidateNonNegativeNumber', function() {
    // Valid non-negative numbers
    Validate.nonNegativeNumber(0, 'param');
    Validate.nonNegativeNumber(42, 'param');
    Validate.nonNegativeNumber(0.1, 'param');
    
    // Invalid non-negative numbers
    TestFramework.assertThrows(() => {
      Validate.nonNegativeNumber(-1, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for negative');
    
    TestFramework.assertThrows(() => {
      Validate.nonNegativeNumber(-0.1, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for negative float');
  });

  suite.addTest('testValidationUtilsValidateRange', function() {
    // Valid ranges
    Validate.range(5, 1, 10, 'param');
    Validate.range(1, 1, 10, 'param'); // Min boundary
    Validate.range(10, 1, 10, 'param'); // Max boundary
    
    // Invalid ranges
    TestFramework.assertThrows(() => {
      Validate.range(0, 1, 10, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for below min');
    
    TestFramework.assertThrows(() => {
      Validate.range(11, 1, 10, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for above max');
  });

  // ============= FUNCTION VALIDATION TESTS =============
  
  suite.addTest('testValidationUtilsValidateFunction', function() {
    // Valid functions
    Validate.func(function(){}, 'param');
    Validate.func(() => {}, 'param');
    Validate.func(Validate.required, 'param');
    
    // Invalid functions
    TestFramework.assertThrows(() => {
      Validate.func('function', 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for string');
    
    TestFramework.assertThrows(() => {
      Validate.func(null, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for null');
  });

  // ============= ENUM VALIDATION TESTS =============
  
  suite.addTest('testValidationUtilsValidateEnum', function() {
    // Valid enum values
    Validate.enum('red', ['red', 'green', 'blue'], 'param');
    Validate.enum(1, [1, 2, 3], 'param');
    Validate.enum(true, [true, false], 'param');
    
    // Invalid enum values
    TestFramework.assertThrows(() => {
      Validate.enum('yellow', ['red', 'green', 'blue'], 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for invalid enum value');
    
    TestFramework.assertThrows(() => {
      Validate.enum(4, [1, 2, 3], 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for number not in enum');
  });

  // ============= OBJECT PROPERTIES VALIDATION TESTS =============
  
  suite.addTest('testValidationUtilsValidateObjectProperties', function() {
    // Valid object with required properties
    Validate.objectProperties(
      {name: 'test', age: 25, active: true}, 
      ['name', 'age'], 
      'param'
    );
    
    // Invalid - missing required property
    TestFramework.assertThrows(() => {
      Validate.objectProperties(
        {name: 'test'}, 
        ['name', 'age'], 
        'param'
      );
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for missing required property');
    
    // Invalid - not an object
    TestFramework.assertThrows(() => {
      Validate.objectProperties(
        'not an object', 
        ['name'], 
        'param'
      );
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for non-object');
  });

  // ============= PATTERN VALIDATION TESTS =============
  
  suite.addTest('testValidationUtilsValidatePattern', function() {
    // Valid patterns
    Validate.pattern('test@example.com', /\S+@\S+\.\S+/, 'email');
    Validate.pattern('123-456-7890', /^\d{3}-\d{3}-\d{4}$/, 'phone');
    
    // Invalid patterns
    TestFramework.assertThrows(() => {
      Validate.pattern('invalid-email', /\S+@\S+\.\S+/, 'email');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for pattern mismatch');
    
    TestFramework.assertThrows(() => {
      Validate.pattern(123, /\d+/, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for non-string value');
  });

  // ============= OPTIONAL VALIDATION TESTS =============
  
  suite.addTest('testValidationUtilsValidateOptional', function() {
    // Should pass for null/undefined without validation
    Validate.optional(null, () => { throw new Error('Should not run'); }, 'param');
    Validate.optional(undefined, () => { throw new Error('Should not run'); }, 'param');
    
    // Should validate non-null/undefined values
    Validate.optional('test', (value, name) => {
      Validate.nonEmptyString(value, name);
    }, 'param');
    
    // Should throw if validation fails for non-null/undefined
    TestFramework.assertThrows(() => {
      Validate.optional('', (value, name) => {
        Validate.nonEmptyString(value, name);
      }, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for failed validation');
  });

  // ============= COMPOUND VALIDATION TESTS =============
  
  suite.addTest('testValidationUtilsValidateAll', function() {
    // Should pass when all validators pass
    Validate.all([
      (value, name) => Validate.string(value, name),
      (value, name) => Validate.nonEmptyString(value, name)
    ], 'test', 'param');
    
    // Should throw when any validator fails
    TestFramework.assertThrows(() => {
      Validate.all([
        (value, name) => Validate.string(value, name),
        (value, name) => Validate.number(value, name)
      ], 'test', 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw when any validator fails');
  });

  suite.addTest('testValidationUtilsValidateAny', function() {
    // Should pass when at least one validator passes
    Validate.any([
      (value, name) => Validate.string(value, name),
      (value, name) => Validate.number(value, name)
    ], 'test', 'param');
    
    // Should throw when all validators fail
    TestFramework.assertThrows(() => {
      Validate.any([
        (value, name) => Validate.number(value, name),
        (value, name) => Validate.boolean(value, name)
      ], 'test', 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw when all validators fail');
  });

  // ============= ERROR MESSAGE TESTS =============
  
  suite.addTest('testValidateErrorMessages', function() {
    // Test that error messages include parameter name
    try {
      Validate.nonEmptyString('', 'testParam');
      TestFramework.assertTrue(false, 'Should have thrown');
    } catch (error) {
      TestFramework.assertTrue(error.message.includes('testParam'), 'Error message should include parameter name');
    }
    
    // Test that error messages include expected values for enum
    try {
      Validate.enum('invalid', ['valid1', 'valid2'], 'testParam');
      TestFramework.assertTrue(false, 'Should have thrown');
    } catch (error) {
      TestFramework.assertTrue(error.message.includes('valid1'), 'Error message should include allowed values');
      TestFramework.assertTrue(error.message.includes('valid2'), 'Error message should include allowed values');
    }
  });

  // ============= PLAIN OBJECT VALIDATION TESTS =============
  
  suite.addTest('testValidationUtilsValidatePlainObject', function() {
    // Valid plain objects
    Validate.validateObject({}, 'param');
    Validate.validateObject({key: 'value'}, 'param');
    
    // Invalid plain objects
    TestFramework.assertThrows(() => {
      Validate.validateObject([], 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for array');
    
    TestFramework.assertThrows(() => {
      Validate.validateObject(new Date(), 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for Date');
    
    TestFramework.assertThrows(() => {
      Validate.validateObject(null, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for null');
  });
  
  suite.addTest('testValidationUtilsIsPlainObject', function() {
    TestFramework.assertTrue(Validate.isPlainObject({}), '{} is plain object');
    TestFramework.assertTrue(Validate.isPlainObject({a: 1}), '{a:1} is plain object');
    TestFramework.assertFalse(Validate.isPlainObject([]), '[] is not plain object');
    TestFramework.assertFalse(Validate.isPlainObject(new Date()), 'Date is not plain object');
    TestFramework.assertFalse(Validate.isPlainObject(null), 'null is not plain object');
    TestFramework.assertFalse(Validate.isPlainObject(123), 'number is not plain object');
  });
  
  // ============= UPDATE OBJECT VALIDATION TESTS =============
  
  suite.addTest('testValidationUtilsValidateUpdateObject', function() {
    // Valid default cases
    Validate.validateUpdateObject({field: 1}, 'param');
    Validate.validateUpdateObject({$set: {field: 1}}, 'param');
    
    // Empty update object
    TestFramework.assertThrows(() => {
      Validate.validateUpdateObject({}, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for empty update object');
    
    // Forbidden operators
    TestFramework.assertThrows(() => {
      Validate.validateUpdateObject({$set: {field: 1}}, 'param', {forbidOperators: true});
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw when operators are forbidden');
    
    // Required operators
    TestFramework.assertThrows(() => {
      Validate.validateUpdateObject({field: 1}, 'param', {requireOperators: true});
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw when operators are required');
    
    // Mixed operators and fields (default allowMixed = false)
    TestFramework.assertThrows(() => {
      Validate.validateUpdateObject({$set: {field: 1}, field: 2}, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for mixed operators and fields');
    
    // allowMixed true should pass
    Validate.validateUpdateObject({$set: {field: 1}, field: 2}, 'param', {allowMixed: true});
    
    // Invalid type
    TestFramework.assertThrows(() => {
      Validate.validateUpdateObject(null, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for non-object update');
  });

  return suite;
}

/**
 * Register the Validate test suite with the TestFramework
 */
function registerValidationUtilsTests() {
  const testFramework = new TestFramework();
  testFramework.registerTestSuite(createValidationUtilsTestSuite());
  return testFramework;
}

/**
 * Run Validate Tests independently
 */
function runValidationUtilsTests() {
  try {
    JDbLogger.info('Starting ValidationUtils Test Execution');
    
    const testFramework = registerValidationUtilsTests();
    const results = testFramework.runTestSuite('ValidationUtils Tests');
    
    // Log summary
    JDbLogger.info('ValidationUtils Test Results:');
    JDbLogger.info(results.getSummary());
    
    return results;
    
  } catch (error) {
    JDbLogger.error('Failed to execute ValidationUtils tests', { error: error.message, stack: error.stack });
    throw error;
  }
}