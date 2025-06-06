/**
 * GASDBLoggerTest.js - GASDBLogger Class Tests
 * 
 * Tests for the GASDBLogger utility class including basic functionality,
 * log levels, and component logger creation.
 * 
 * Migrated from Section1Tests.js - runUtilityClassTests() (logger portion)
 */

/**
 * GASDBLogger Tests
 * Tests for the GASDBLogger utility class functionality
 */
function createGASDBLoggerTestSuite() {
  const suite = new TestSuite('GASDBLogger Tests');
  
  // Logger basic functionality tests
  suite.addTest('testLoggerBasicFunctionality', function() {
    // Test that Logger methods exist
    TestFramework.assertEquals('function', typeof GASDBLogger.error, 'GASDBLogger should have error method');
    TestFramework.assertEquals('function', typeof GASDBLogger.warn, 'GASDBLogger should have warn method');
    TestFramework.assertEquals('function', typeof GASDBLogger.info, 'GASDBLogger should have info method');
    TestFramework.assertEquals('function', typeof GASDBLogger.debug, 'GASDBLogger should have debug method');
  });
  
  suite.addTest('testLoggerLevels', function() {
    // Test log level setting
    const originalLevel = GASDBLogger.getLevel();
    
    GASDBLogger.setLevel(GASDBLogger.LOG_LEVELS.ERROR);
    TestFramework.assertEquals(GASDBLogger.LOG_LEVELS.ERROR, GASDBLogger.getLevel(), 'Should set ERROR level');
    
    GASDBLogger.setLevelByName('DEBUG');
    TestFramework.assertEquals(GASDBLogger.LOG_LEVELS.DEBUG, GASDBLogger.getLevel(), 'Should set DEBUG level by name');
    
    // Restore original level
    GASDBLogger.setLevel(originalLevel);
  });
  
  suite.addTest('testLoggerComponentLogger', function() {
    const componentLogger = GASDBLogger.createComponentLogger('TestComponent');
    TestFramework.assertEquals('function', typeof componentLogger.error, 'Component logger should have error method');
    TestFramework.assertEquals('function', typeof componentLogger.info, 'Component logger should have info method');
  });
  
  return suite;
}

/**
 * Register the GASDBLogger test suite with the TestFramework
 */
function registerGASDBLoggerTests() {
  const testFramework = new TestFramework();
  testFramework.registerTestSuite(createGASDBLoggerTestSuite());
  return testFramework;
}

/**
 * Run GASDBLogger Tests independently
 */
function runGASDBLoggerTests() {
  GASDBLogger.info('Running GASDBLogger Tests: Logger Functionality');
  
  const testFramework = registerGASDBLoggerTests();
  const results = testFramework.runTestSuite('GASDBLogger Tests');
  
  // Log summary
  GASDBLogger.info('GASDBLogger Test Results:');
  GASDBLogger.info(results.getSummary());
  
  return results;
}
