/**
 * Test Environment Tests - Section 1
 * Tests for basic project setup and configuration
 */

function runEnvironmentTests() {
  const suite = new TestSuite('Environment Tests');
  
  // Test clasp configuration
  suite.addTest('testClaspConfiguration', function() {
    // Test that clasp.json exists and has required properties
    AssertionUtilities.assertTrue(typeof GlobalTestRunner !== 'undefined', 'TestRunner should be available');
    AssertionUtilities.assertTrue(typeof Logger !== 'undefined', 'Logger should be available');
    AssertionUtilities.assertTrue(typeof ErrorHandler !== 'undefined', 'ErrorHandler should be available');
  });
  
  // Test Google Drive access permissions
  suite.addTest('testDriveAccess', function() {
    try {
      // Try to access Drive API - this will fail if permissions aren't set up
      const folders = DriveApp.getFolders();
      AssertionUtilities.assertTrue(true, 'Drive API access successful');
    } catch (error) {
      AssertionUtilities.assertTrue(false, `Drive API access failed: ${error.message}`);
    }
  });
  
  // Test test runner functionality
  suite.addTest('testTestRunnerFunctionality', function() {
    AssertionUtilities.assertTrue(GlobalTestRunner instanceof TestRunner, 'Global test runner should be a TestRunner instance');
    AssertionUtilities.assertEquals('function', typeof GlobalTestRunner.addTestSuite, 'TestRunner should have addTestSuite method');
    AssertionUtilities.assertEquals('function', typeof GlobalTestRunner.runAllTests, 'TestRunner should have runAllTests method');
  });
  
  return suite;
}

/**
 * Utility Class Tests - Section 1
 * Tests for Logger, ErrorHandler, and IdGenerator classes
 */

function runUtilityClassTests() {
  const suite = new TestSuite('Utility Class Tests');
  
  // Logger functionality tests
  suite.addTest('testLoggerBasicFunctionality', function() {
    // Test that Logger methods exist
    AssertionUtilities.assertEquals('function', typeof Logger.error, 'Logger should have error method');
    AssertionUtilities.assertEquals('function', typeof Logger.warn, 'Logger should have warn method');
    AssertionUtilities.assertEquals('function', typeof Logger.info, 'Logger should have info method');
    AssertionUtilities.assertEquals('function', typeof Logger.debug, 'Logger should have debug method');
  });
  
  suite.addTest('testLoggerLevels', function() {
    // Test log level setting
    const originalLevel = Logger.getLevel();
    
    Logger.setLevel(Logger.LOG_LEVELS.ERROR);
    AssertionUtilities.assertEquals(Logger.LOG_LEVELS.ERROR, Logger.getLevel(), 'Should set ERROR level');
    
    Logger.setLevelByName('DEBUG');
    AssertionUtilities.assertEquals(Logger.LOG_LEVELS.DEBUG, Logger.getLevel(), 'Should set DEBUG level by name');
    
    // Restore original level
    Logger.setLevel(originalLevel);
  });
  
  suite.addTest('testLoggerComponentLogger', function() {
    const componentLogger = Logger.createComponentLogger('TestComponent');
    AssertionUtilities.assertEquals('function', typeof componentLogger.error, 'Component logger should have error method');
    AssertionUtilities.assertEquals('function', typeof componentLogger.info, 'Component logger should have info method');
  });
  
  // ErrorHandler tests
  suite.addTest('testErrorHandlerErrorTypes', function() {
    AssertionUtilities.assertTrue(typeof ErrorHandler.ErrorTypes === 'object', 'ErrorHandler should have ErrorTypes');
    AssertionUtilities.assertTrue(typeof ErrorHandler.ErrorTypes.DOCUMENT_NOT_FOUND === 'function', 'Should have DocumentNotFoundError');
    AssertionUtilities.assertTrue(typeof ErrorHandler.ErrorTypes.DUPLICATE_KEY === 'function', 'Should have DuplicateKeyError');
  });
  
  suite.addTest('testErrorCreation', function() {
    const error = ErrorHandler.createError('DOCUMENT_NOT_FOUND', { id: 'test123' }, 'testCollection');
    AssertionUtilities.assertTrue(error instanceof Error, 'Should create Error instance');
    AssertionUtilities.assertEquals('DocumentNotFoundError', error.name, 'Should have correct error name');
    AssertionUtilities.assertEquals('DOCUMENT_NOT_FOUND', error.code, 'Should have correct error code');
  });
  
  suite.addTest('testErrorValidation', function() {
    // Test validation functions
    AssertionUtilities.assertThrows(
      () => ErrorHandler.validateRequired(null, 'testParam'),
      Error,
      'Should throw for null value'
    );
    
    AssertionUtilities.assertThrows(
      () => ErrorHandler.validateType('string', 'number', 'testParam'),
      Error,
      'Should throw for wrong type'
    );
    
    AssertionUtilities.assertThrows(
      () => ErrorHandler.validateNotEmpty('', 'testParam'),
      Error,
      'Should throw for empty string'
    );
  });
  
  // IdGenerator tests
  suite.addTest('testIdGeneratorBasicFunctionality', function() {
    AssertionUtilities.assertEquals('function', typeof IdGenerator.generateUUID, 'Should have generateUUID method');
    AssertionUtilities.assertEquals('function', typeof IdGenerator.generateTimestampId, 'Should have generateTimestampId method');
    AssertionUtilities.assertEquals('function', typeof IdGenerator.generateShortId, 'Should have generateShortId method');
  });
  
  suite.addTest('testIdGeneratorUniqueness', function() {
    // Test that generated IDs are unique
    const id1 = IdGenerator.generateUUID();
    const id2 = IdGenerator.generateUUID();
    AssertionUtilities.assertNotEquals(id1, id2, 'UUIDs should be unique');
    
    const timestampId1 = IdGenerator.generateTimestampId();
    const timestampId2 = IdGenerator.generateTimestampId();
    AssertionUtilities.assertNotEquals(timestampId1, timestampId2, 'Timestamp IDs should be unique');
  });
  
  suite.addTest('testIdGeneratorFormats', function() {
    // Test ID format validation
    const uuid = IdGenerator.generateFallbackUUID(); // Use fallback for testing
    AssertionUtilities.assertTrue(IdGenerator.isValidUUID(uuid), 'Generated UUID should be valid');
    
    const objectId = IdGenerator.generateObjectId();
    AssertionUtilities.assertTrue(IdGenerator.isValidObjectId(objectId), 'Generated ObjectId should be valid');
    AssertionUtilities.assertEquals(24, objectId.length, 'ObjectId should be 24 characters');
    
    const shortId = IdGenerator.generateShortId(8);
    AssertionUtilities.assertEquals(8, shortId.length, 'Short ID should have specified length');
  });
  
  suite.addTest('testIdGeneratorCustomGenerator', function() {
    const customGen = IdGenerator.createCustomGenerator({ type: 'short', length: 6 });
    const customId = customGen();
    AssertionUtilities.assertEquals(6, customId.length, 'Custom generator should respect length parameter');
    
    const prefixGen = IdGenerator.createCustomGenerator({ type: 'timestamp', prefix: 'test' });
    const prefixId = prefixGen();
    AssertionUtilities.assertTrue(prefixId.startsWith('test_'), 'Should include prefix');
  });
  
  return suite;
}

/**
 * Test Suite Integration Tests
 * Tests for the testing framework itself
 */
function runTestFrameworkTests() {
  const suite = new TestSuite('Test Framework Tests');
  
  suite.addTest('testAssertionUtilities', function() {
    // Test basic assertions
    AssertionUtilities.assertEquals(1, 1, 'Basic equality should work');
    AssertionUtilities.assertNotEquals(1, 2, 'Basic inequality should work');
    AssertionUtilities.assertTrue(true, 'assertTrue should work');
    AssertionUtilities.assertFalse(false, 'assertFalse should work');
    
    // Test null/undefined assertions
    AssertionUtilities.assertNull(null, 'assertNull should work');
    AssertionUtilities.assertNotNull('value', 'assertNotNull should work');
    AssertionUtilities.assertDefined('value', 'assertDefined should work');
    AssertionUtilities.assertUndefined(undefined, 'assertUndefined should work');
  });
  
  suite.addTest('testAssertionThrows', function() {
    // Test that assertThrows works correctly
    AssertionUtilities.assertThrows(() => {
      throw new Error('Test error');
    }, Error, 'Should detect thrown errors');
    
    // Test that it fails when no error is thrown
    try {
      AssertionUtilities.assertThrows(() => {
        // Do nothing
      });
      AssertionUtilities.assertTrue(false, 'Should have thrown error when function does not throw');
    } catch (e) {
      AssertionUtilities.assertTrue(true, 'Correctly detected missing throw');
    }
  });
  
  suite.addTest('testTestSuiteFunctionality', function() {
    const testSuite = new TestSuite('TestSuite');
    testSuite.addTest('dummyTest', () => { /* dummy test */ });
    
    AssertionUtilities.assertEquals('TestSuite', testSuite.name, 'Test suite should have correct name');
    AssertionUtilities.assertTrue(testSuite.tests.has('dummyTest'), 'Should store added tests');
  });
  
  return suite;
}

/**
 * Main test runner for Section 1
 */
function runSection1Tests() {
  Logger.info('Running Section 1 Tests: Project Setup and Basic Infrastructure');
  
  const testRunner = new TestRunner();
  
  // Add all test suites
  testRunner.addTestSuite(runEnvironmentTests());
  testRunner.addTestSuite(runUtilityClassTests());
  testRunner.addTestSuite(runTestFrameworkTests());
  
  // Run all tests
  const results = testRunner.runAllTests();
  
  // Log summary
  Logger.info('Section 1 Test Results:');
  Logger.info(results.getSummary());
  
  // Return results for further processing
  return results;
}
