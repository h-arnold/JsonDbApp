/**
 * ErrorHandlerTest.js - ErrorHandler Class Tests
 * 
 * Tests for the ErrorHandler utility class including error types,
 * error creation, and validation functions.
 * 
 * Migrated from Section1Tests.js - runUtilityClassTests() (error portion)
 */

/**
 * ErrorHandler Tests
 * Tests for the ErrorHandler utility class functionality
 */
function createErrorHandlerTestSuite() {
  const suite = new TestSuite('ErrorHandler Tests');
  
  // ErrorHandler error types tests
  suite.addTest('testErrorHandlerErrorTypes', function() {
    TestFramework.assertTrue(typeof ErrorHandler.ErrorTypes === 'object', 'ErrorHandler should have ErrorTypes');
    TestFramework.assertTrue(typeof ErrorHandler.ErrorTypes.DOCUMENT_NOT_FOUND === 'function', 'Should have DocumentNotFoundError');
    TestFramework.assertTrue(typeof ErrorHandler.ErrorTypes.DUPLICATE_KEY === 'function', 'Should have DuplicateKeyError');
  });
  
  suite.addTest('testErrorCreation', function() {
    const error = ErrorHandler.createError('DOCUMENT_NOT_FOUND', { id: 'test123' }, 'testCollection');
    TestFramework.assertTrue(error instanceof Error, 'Should create Error instance');
    TestFramework.assertEquals('DocumentNotFoundError', error.name, 'Should have correct error name');
    TestFramework.assertEquals('DOCUMENT_NOT_FOUND', error.code, 'Should have correct error code');
  });
  
  suite.addTest('testErrorValidation', function() {
    // Test validation functions
    TestFramework.assertThrows(
      () => ErrorHandler.validateRequired(null, 'testParam'),
      Error,
      'Should throw for null value'
    );
    
    TestFramework.assertThrows(
      () => ErrorHandler.validateType('string', 'number', 'testParam'),
      Error,
      'Should throw for wrong type'
    );
    
    TestFramework.assertThrows(
      () => ErrorHandler.validateNotEmpty('', 'testParam'),
      Error,
      'Should throw for empty string'
    );
  });
  
  return suite;
}

/**
 * Register the ErrorHandler test suite with the TestFramework
 */
function registerErrorHandlerTests() {
  const testFramework = new TestFramework();
  testFramework.registerTestSuite(createErrorHandlerTestSuite());
  return testFramework;
}

/**
 * Run ErrorHandler Tests independently
 */
function runErrorHandlerTests() {
  GASDBLogger.info('Running ErrorHandler Tests: Error Handling Functionality');
  
  const testFramework = registerErrorHandlerTests();
  const results = testFramework.runTestSuite('ErrorHandler Tests');
  
  // Log summary
  GASDBLogger.info('ErrorHandler Test Results:');
  GASDBLogger.info(results.getSummary());
  
  return results;
}
