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
    TestFramework.assertEquals('function', typeof JDbLogger.error, 'GASDBLogger should have error method');
    TestFramework.assertEquals('function', typeof JDbLogger.warn, 'GASDBLogger should have warn method');
    TestFramework.assertEquals('function', typeof JDbLogger.info, 'GASDBLogger should have info method');
    TestFramework.assertEquals('function', typeof JDbLogger.debug, 'GASDBLogger should have debug method');
  });
  
  suite.addTest('testLoggerLevels', function() {
    // Test log level setting
    const originalLevel = JDbLogger.getLevel();
    
    JDbLogger.setLevel(JDbLogger.LOG_LEVELS.ERROR);
    TestFramework.assertEquals(JDbLogger.LOG_LEVELS.ERROR, JDbLogger.getLevel(), 'Should set ERROR level');
    
    JDbLogger.setLevelByName('DEBUG');
    TestFramework.assertEquals(JDbLogger.LOG_LEVELS.DEBUG, JDbLogger.getLevel(), 'Should set DEBUG level by name');
    
    // Restore original level
    JDbLogger.setLevel(originalLevel);
  });
  
  suite.addTest('testLoggerComponentLogger', function() {
    const componentLogger = JDbLogger.createComponentLogger('TestComponent');
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
  JDbLogger.info('Running GASDBLogger Tests: Logger Functionality');
  
  const testFramework = registerGASDBLoggerTests();
  const results = testFramework.runTestSuite('GASDBLogger Tests');
  
  // Log summary
  JDbLogger.info('GASDBLogger Test Results:');
  JDbLogger.info(results.getSummary());
  
  return results;
}
