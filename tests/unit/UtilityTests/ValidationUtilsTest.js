/**
 * ValidationUtils Tests
 * Tests for the ValidationUtils utility class functionality
 */
function createValidationUtilsTestSuite() {
  const suite = new TestSuite('ValidationUtils Tests');

  // ============= REQUIRED VALIDATION TESTS =============
  
  suite.addTest('testValidationUtilsValidateRequired', function() {
    // Should pass for valid values
    ValidationUtils.validateRequired('string', 'param');
    ValidationUtils.validateRequired(0, 'param');
    ValidationUtils.validateRequired(false, 'param');
    ValidationUtils.validateRequired([], 'param');
    ValidationUtils.validateRequired({}, 'param');
    
    // Should throw for null
    TestFramework.assertThrows(() => {
      ValidationUtils.validateRequired(null, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for null value');
    
    // Should throw for undefined
    TestFramework.assertThrows(() => {
      ValidationUtils.validateRequired(undefined, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for undefined value');
  });

  // ============= TYPE VALIDATION TESTS =============
  
  suite.addTest('testValidationUtilsValidateType', function() {
    // Valid type checks
    ValidationUtils.validateType('string', 'string', 'param');
    ValidationUtils.validateType(123, 'number', 'param');
    ValidationUtils.validateType(true, 'boolean', 'param');
    ValidationUtils.validateType({}, 'object', 'param');
    ValidationUtils.validateType(function(){}, 'function', 'param');
    
    // Invalid type checks
    TestFramework.assertThrows(() => {
      ValidationUtils.validateType('string', 'number', 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for wrong type');
    
    TestFramework.assertThrows(() => {
      ValidationUtils.validateType(123, 'string', 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for number vs string');
  });

  // ============= STRING VALIDATION TESTS =============
  
  suite.addTest('testValidationUtilsValidateNonEmptyString', function() {
    // Valid strings
    ValidationUtils.validateNonEmptyString('test', 'param');
    ValidationUtils.validateNonEmptyString('a', 'param');
    ValidationUtils.validateNonEmptyString('  test  ', 'param');
    
    // Invalid strings
    TestFramework.assertThrows(() => {
      ValidationUtils.validateNonEmptyString('', 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for empty string');
    
    TestFramework.assertThrows(() => {
      ValidationUtils.validateNonEmptyString('   ', 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for whitespace-only string');
    
    TestFramework.assertThrows(() => {
      ValidationUtils.validateNonEmptyString(null, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for null');
    
    TestFramework.assertThrows(() => {
      ValidationUtils.validateNonEmptyString(undefined, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for undefined');
    
    TestFramework.assertThrows(() => {
      ValidationUtils.validateNonEmptyString(123, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for number');
  });

  suite.addTest('testValidationUtilsValidateString', function() {
    // Valid strings
    ValidationUtils.validateString('test', 'param');
    ValidationUtils.validateString('', 'param');
    ValidationUtils.validateString('   ', 'param');
    
    // Invalid types
    TestFramework.assertThrows(() => {
      ValidationUtils.validateString(123, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for number');
    
    TestFramework.assertThrows(() => {
      ValidationUtils.validateString(null, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for null');
  });

  // ============= OBJECT VALIDATION TESTS =============
  
  suite.addTest('testValidationUtilsValidateObject', function() {
    // Valid objects
    ValidationUtils.validateObject({}, 'param');
    ValidationUtils.validateObject({key: 'value'}, 'param');
    ValidationUtils.validateObject(new Date(), 'param');
    
    // Invalid objects
    TestFramework.assertThrows(() => {
      ValidationUtils.validateObject(null, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for null');
    
    TestFramework.assertThrows(() => {
      ValidationUtils.validateObject([], 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for array');
    
    TestFramework.assertThrows(() => {
      ValidationUtils.validateObject('string', 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for string');
    
    TestFramework.assertThrows(() => {
      ValidationUtils.validateObject(undefined, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for undefined');
  });

  // ============= BOOLEAN VALIDATION TESTS =============
  
  suite.addTest('testValidationUtilsValidateBoolean', function() {
    // Valid booleans
    ValidationUtils.validateBoolean(true, 'param');
    ValidationUtils.validateBoolean(false, 'param');
    
    // Invalid booleans
    TestFramework.assertThrows(() => {
      ValidationUtils.validateBoolean('true', 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for string "true"');
    
    TestFramework.assertThrows(() => {
      ValidationUtils.validateBoolean(1, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for number 1');
    
    TestFramework.assertThrows(() => {
      ValidationUtils.validateBoolean(0, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for number 0');
  });

  // ============= ARRAY VALIDATION TESTS =============
  
  suite.addTest('testValidationUtilsValidateArray', function() {
    // Valid arrays
    ValidationUtils.validateArray([], 'param');
    ValidationUtils.validateArray([1, 2, 3], 'param');
    ValidationUtils.validateArray(['a', 'b'], 'param');
    
    // Invalid arrays
    TestFramework.assertThrows(() => {
      ValidationUtils.validateArray({}, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for object');
    
    TestFramework.assertThrows(() => {
      ValidationUtils.validateArray('string', 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for string');
    
    TestFramework.assertThrows(() => {
      ValidationUtils.validateArray(null, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for null');
  });

  suite.addTest('testValidationUtilsValidateNonEmptyArray', function() {
    // Valid non-empty arrays
    ValidationUtils.validateNonEmptyArray([1], 'param');
    ValidationUtils.validateNonEmptyArray(['a', 'b'], 'param');
    
    // Invalid arrays
    TestFramework.assertThrows(() => {
      ValidationUtils.validateNonEmptyArray([], 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for empty array');
    
    TestFramework.assertThrows(() => {
      ValidationUtils.validateNonEmptyArray({}, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for object');
  });

  // ============= NUMBER VALIDATION TESTS =============
  
  suite.addTest('testValidationUtilsValidateNumber', function() {
    // Valid numbers
    ValidationUtils.validateNumber(0, 'param');
    ValidationUtils.validateNumber(42, 'param');
    ValidationUtils.validateNumber(-10, 'param');
    ValidationUtils.validateNumber(3.14, 'param');
    
    // Invalid numbers
    TestFramework.assertThrows(() => {
      ValidationUtils.validateNumber('42', 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for string number');
    
    TestFramework.assertThrows(() => {
      ValidationUtils.validateNumber(NaN, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for NaN');
    
    TestFramework.assertThrows(() => {
      ValidationUtils.validateNumber(null, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for null');
  });

  suite.addTest('testValidationUtilsValidateInteger', function() {
    // Valid integers
    ValidationUtils.validateInteger(0, 'param');
    ValidationUtils.validateInteger(42, 'param');
    ValidationUtils.validateInteger(-10, 'param');
    
    // Invalid integers
    TestFramework.assertThrows(() => {
      ValidationUtils.validateInteger(3.14, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for float');
    
    TestFramework.assertThrows(() => {
      ValidationUtils.validateInteger('42', 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for string');
  });

  suite.addTest('testValidationUtilsValidatePositiveNumber', function() {
    // Valid positive numbers
    ValidationUtils.validatePositiveNumber(1, 'param');
    ValidationUtils.validatePositiveNumber(42, 'param');
    ValidationUtils.validatePositiveNumber(0.1, 'param');
    
    // Invalid positive numbers
    TestFramework.assertThrows(() => {
      ValidationUtils.validatePositiveNumber(0, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for zero');
    
    TestFramework.assertThrows(() => {
      ValidationUtils.validatePositiveNumber(-1, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for negative');
  });

  suite.addTest('testValidationUtilsValidateNonNegativeNumber', function() {
    // Valid non-negative numbers
    ValidationUtils.validateNonNegativeNumber(0, 'param');
    ValidationUtils.validateNonNegativeNumber(42, 'param');
    ValidationUtils.validateNonNegativeNumber(0.1, 'param');
    
    // Invalid non-negative numbers
    TestFramework.assertThrows(() => {
      ValidationUtils.validateNonNegativeNumber(-1, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for negative');
    
    TestFramework.assertThrows(() => {
      ValidationUtils.validateNonNegativeNumber(-0.1, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for negative float');
  });

  suite.addTest('testValidationUtilsValidateRange', function() {
    // Valid ranges
    ValidationUtils.validateRange(5, 1, 10, 'param');
    ValidationUtils.validateRange(1, 1, 10, 'param'); // Min boundary
    ValidationUtils.validateRange(10, 1, 10, 'param'); // Max boundary
    
    // Invalid ranges
    TestFramework.assertThrows(() => {
      ValidationUtils.validateRange(0, 1, 10, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for below min');
    
    TestFramework.assertThrows(() => {
      ValidationUtils.validateRange(11, 1, 10, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for above max');
  });

  // ============= FUNCTION VALIDATION TESTS =============
  
  suite.addTest('testValidationUtilsValidateFunction', function() {
    // Valid functions
    ValidationUtils.validateFunction(function(){}, 'param');
    ValidationUtils.validateFunction(() => {}, 'param');
    ValidationUtils.validateFunction(ValidationUtils.validateRequired, 'param');
    
    // Invalid functions
    TestFramework.assertThrows(() => {
      ValidationUtils.validateFunction('function', 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for string');
    
    TestFramework.assertThrows(() => {
      ValidationUtils.validateFunction(null, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for null');
  });

  // ============= ENUM VALIDATION TESTS =============
  
  suite.addTest('testValidationUtilsValidateEnum', function() {
    // Valid enum values
    ValidationUtils.validateEnum('red', ['red', 'green', 'blue'], 'param');
    ValidationUtils.validateEnum(1, [1, 2, 3], 'param');
    ValidationUtils.validateEnum(true, [true, false], 'param');
    
    // Invalid enum values
    TestFramework.assertThrows(() => {
      ValidationUtils.validateEnum('yellow', ['red', 'green', 'blue'], 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for invalid enum value');
    
    TestFramework.assertThrows(() => {
      ValidationUtils.validateEnum(4, [1, 2, 3], 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for number not in enum');
  });

  // ============= OBJECT PROPERTIES VALIDATION TESTS =============
  
  suite.addTest('testValidationUtilsValidateObjectProperties', function() {
    // Valid object with required properties
    ValidationUtils.validateObjectProperties(
      {name: 'test', age: 25, active: true}, 
      ['name', 'age'], 
      'param'
    );
    
    // Invalid - missing required property
    TestFramework.assertThrows(() => {
      ValidationUtils.validateObjectProperties(
        {name: 'test'}, 
        ['name', 'age'], 
        'param'
      );
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for missing required property');
    
    // Invalid - not an object
    TestFramework.assertThrows(() => {
      ValidationUtils.validateObjectProperties(
        'not an object', 
        ['name'], 
        'param'
      );
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for non-object');
  });

  // ============= PATTERN VALIDATION TESTS =============
  
  suite.addTest('testValidationUtilsValidatePattern', function() {
    // Valid patterns
    ValidationUtils.validatePattern('test@example.com', /\S+@\S+\.\S+/, 'email');
    ValidationUtils.validatePattern('123-456-7890', /^\d{3}-\d{3}-\d{4}$/, 'phone');
    
    // Invalid patterns
    TestFramework.assertThrows(() => {
      ValidationUtils.validatePattern('invalid-email', /\S+@\S+\.\S+/, 'email');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for pattern mismatch');
    
    TestFramework.assertThrows(() => {
      ValidationUtils.validatePattern(123, /\d+/, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for non-string value');
  });

  // ============= OPTIONAL VALIDATION TESTS =============
  
  suite.addTest('testValidationUtilsValidateOptional', function() {
    // Should pass for null/undefined without validation
    ValidationUtils.validateOptional(null, () => { throw new Error('Should not run'); }, 'param');
    ValidationUtils.validateOptional(undefined, () => { throw new Error('Should not run'); }, 'param');
    
    // Should validate non-null/undefined values
    ValidationUtils.validateOptional('test', (value, name) => {
      ValidationUtils.validateNonEmptyString(value, name);
    }, 'param');
    
    // Should throw if validation fails for non-null/undefined
    TestFramework.assertThrows(() => {
      ValidationUtils.validateOptional('', (value, name) => {
        ValidationUtils.validateNonEmptyString(value, name);
      }, 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw for failed validation');
  });

  // ============= COMPOUND VALIDATION TESTS =============
  
  suite.addTest('testValidationUtilsValidateAll', function() {
    // Should pass when all validators pass
    ValidationUtils.validateAll([
      (value, name) => ValidationUtils.validateString(value, name),
      (value, name) => ValidationUtils.validateNonEmptyString(value, name)
    ], 'test', 'param');
    
    // Should throw when any validator fails
    TestFramework.assertThrows(() => {
      ValidationUtils.validateAll([
        (value, name) => ValidationUtils.validateString(value, name),
        (value, name) => ValidationUtils.validateNumber(value, name)
      ], 'test', 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw when any validator fails');
  });

  suite.addTest('testValidationUtilsValidateAny', function() {
    // Should pass when at least one validator passes
    ValidationUtils.validateAny([
      (value, name) => ValidationUtils.validateString(value, name),
      (value, name) => ValidationUtils.validateNumber(value, name)
    ], 'test', 'param');
    
    // Should throw when all validators fail
    TestFramework.assertThrows(() => {
      ValidationUtils.validateAny([
        (value, name) => ValidationUtils.validateNumber(value, name),
        (value, name) => ValidationUtils.validateBoolean(value, name)
      ], 'test', 'param');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw when all validators fail');
  });

  // ============= ERROR MESSAGE TESTS =============
  
  suite.addTest('testValidationUtilsErrorMessages', function() {
    // Test that error messages include parameter name
    try {
      ValidationUtils.validateNonEmptyString('', 'testParam');
      TestFramework.assertTrue(false, 'Should have thrown');
    } catch (error) {
      TestFramework.assertTrue(error.message.includes('testParam'), 'Error message should include parameter name');
    }
    
    // Test that error messages include expected values for enum
    try {
      ValidationUtils.validateEnum('invalid', ['valid1', 'valid2'], 'testParam');
      TestFramework.assertTrue(false, 'Should have thrown');
    } catch (error) {
      TestFramework.assertTrue(error.message.includes('valid1'), 'Error message should include allowed values');
      TestFramework.assertTrue(error.message.includes('valid2'), 'Error message should include allowed values');
    }
  });

  return suite;
}

/**
 * Register the ValidationUtils test suite with the TestFramework
 */
function registerValidationUtilsTests() {
  const testFramework = new TestFramework();
  testFramework.registerTestSuite(createValidationUtilsTestSuite());
  return testFramework;
}

/**
 * Run ValidationUtils Tests independently
 */
function runValidationUtilsTests() {
  try {
    GASDBLogger.info('Starting ValidationUtils Test Execution');
    
    const testFramework = registerValidationUtilsTests();
    const results = testFramework.runTestSuite('ValidationUtils Tests');
    
    // Log summary
    GASDBLogger.info('ValidationUtils Test Results:');
    GASDBLogger.info(results.getSummary());
    
    return results;
    
  } catch (error) {
    GASDBLogger.error('Failed to execute ValidationUtils tests', { error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Test suite registration
 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = createValidationUtilsTestSuite;
}
