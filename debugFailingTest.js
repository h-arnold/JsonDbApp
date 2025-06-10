/**
 * debugFailingTest.js - Debug the specific failing DocumentOperations test
 * 
 * This function isolates and debugs the specific test that's failing:
 * "should validate queries and propagate errors properly"
 * 
 * It will help us understand exactly what error is being thrown vs what's expected.
 */

function debugFailingTest() {
  GASDBLogger.info('=== DEBUGGING FAILING TEST ===');
  GASDBLogger.info('Test: should validate queries and propagate errors properly');
  
  try {
    // Set up test environment
    setupDocumentOperationsTestEnvironment();
    
    // Reset collection state
    resetCollectionState();
    
    // Get test collection and create DocumentOperations
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    
    GASDBLogger.info('Step 1: Testing malformed $and query');
    GASDBLogger.info('Query to test: { $and: "not an array" }');
    
    try {
      // This is the specific failing assertion from the test
      const result = docOps.findByQuery({ $and: "not an array" });
      
      // If we get here, no error was thrown - that's the problem!
      GASDBLogger.error('ERROR: No exception was thrown! Result was:', { result });
      GASDBLogger.error('Expected: InvalidQueryError should have been thrown');
      
    } catch (error) {
      // Log detailed error information
      GASDBLogger.info('Exception was thrown as expected');
      GASDBLogger.info('Error details:', {
        name: error.name,
        constructor: error.constructor.name,
        message: error.message,
        code: error.code || 'no code',
        isInvalidQueryError: error.name === 'InvalidQueryError',
        isInstanceOfInvalidQuery: error instanceof ErrorHandler.ErrorTypes.INVALID_QUERY,
        errorHandlerInvalidQuery: typeof ErrorHandler.ErrorTypes.INVALID_QUERY
      });
      
      // Test what the test framework expects
      GASDBLogger.info('Testing error type checks:');
      GASDBLogger.info('error.name === "InvalidQueryError":', error.name === 'InvalidQueryError');
      GASDBLogger.info('error instanceof InvalidQueryError:', error instanceof InvalidQueryError);
      GASDBLogger.info('error instanceof ErrorHandler.ErrorTypes.INVALID_QUERY:', error instanceof ErrorHandler.ErrorTypes.INVALID_QUERY);
      
      // Check if the global InvalidQueryError exists
      try {
        GASDBLogger.info('Global InvalidQueryError type:', typeof InvalidQueryError);
        GASDBLogger.info('ErrorHandler.ErrorTypes.INVALID_QUERY type:', typeof ErrorHandler.ErrorTypes.INVALID_QUERY);
        GASDBLogger.info('Are they the same?', InvalidQueryError === ErrorHandler.ErrorTypes.INVALID_QUERY);
      } catch (globalError) {
        GASDBLogger.info('Error checking global InvalidQueryError:', globalError.message);
      }
      
      // Re-throw to see if test framework catches it correctly
      throw error;
    }
    
  } catch (setupError) {
    GASDBLogger.error('Setup error:', setupError.message);
    GASDBLogger.error('Stack:', setupError.stack);
  } finally {
    // Clean up
    try {
      cleanupDocumentOperationsTestEnvironment();
    } catch (cleanupError) {
      GASDBLogger.error('Cleanup error:', cleanupError.message);
    }
  }
}

/**
 * Debug QueryEngine directly to see what it throws
 */
function debugQueryEngineDirectly() {
  GASDBLogger.info('=== DEBUGGING QUERYENGINE DIRECTLY ===');
  
  try {
    const queryEngine = new QueryEngine();
    const testDocs = [{ _id: "test1", name: "Test" }];
    const malformedQuery = { $and: "not an array" };
    
    GASDBLogger.info('Testing QueryEngine.executeQuery directly with:', malformedQuery);
    
    try {
      const result = queryEngine.executeQuery(testDocs, malformedQuery);
      GASDBLogger.error('ERROR: QueryEngine did not throw an error! Result:', result);
    } catch (error) {
      GASDBLogger.info('QueryEngine threw error:', {
        name: error.name,
        constructor: error.constructor.name,
        message: error.message,
        code: error.code || 'no code'
      });
      
      // Check error type
      GASDBLogger.info('Error type checks:');
      GASDBLogger.info('error.name === "InvalidQueryError":', error.name === 'InvalidQueryError');
      
      try {
        GASDBLogger.info('error instanceof InvalidQueryError:', error instanceof InvalidQueryError);
        GASDBLogger.info('error instanceof ErrorHandler.ErrorTypes.INVALID_QUERY:', error instanceof ErrorHandler.ErrorTypes.INVALID_QUERY);
      } catch (typeError) {
        GASDBLogger.info('Error checking instanceof:', typeError.message);
      }
    }
    
  } catch (error) {
    GASDBLogger.error('Setup error in QueryEngine debug:', error.message);
  }
}

/**
 * Test the actual assertion that's failing
 */
function debugTestFrameworkAssertion() {
  GASDBLogger.info('=== DEBUGGING TEST FRAMEWORK ASSERTION ===');
  
  try {
    // Set up test environment
    setupDocumentOperationsTestEnvironment();
    resetCollectionState();
    
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    
    GASDBLogger.info('About to run the exact assertion that fails...');
    
    // This is the exact assertion from the failing test
    TestFramework.assertThrows(() => {
      docOps.findByQuery({ $and: "not an array" });
    }, InvalidQueryError, 'Should reject malformed $and query');
    
    GASDBLogger.info('SUCCESS: Assertion passed!');
    
  } catch (error) {
    GASDBLogger.error('ASSERTION FAILED:', error.message);
    GASDBLogger.error('This tells us exactly what the test framework sees');
  } finally {
    try {
      cleanupDocumentOperationsTestEnvironment();
    } catch (cleanupError) {
      GASDBLogger.error('Cleanup error:', cleanupError.message);
    }
  }
}

/**
 * Run all debug functions
 */
function runFullDebug() {
  GASDBLogger.info('Starting comprehensive debug of failing test...');
  
  debugQueryEngineDirectly();
  GASDBLogger.info('---');
  debugFailingTest();
  GASDBLogger.info('---');
  debugTestFrameworkAssertion();
  
  GASDBLogger.info('Debug complete.');
}
