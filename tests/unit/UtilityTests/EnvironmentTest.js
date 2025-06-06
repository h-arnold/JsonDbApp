/**
 * EnvironmentTest.js - Environment and Project Setup Tests
 * 
 * Tests for basic project setup, clasp configuration, Drive API access,
 * and project dependencies validation.
 * 
 * Migrated from Section1Tests.js - runEnvironmentTests()
 */

/**
 * Environment Tests
 * Tests for basic project setup and configuration
 */
function createEnvironmentTestSuite() {
  const suite = new TestSuite('Environment Tests');
  
  // Test clasp configuration and basic dependencies
  suite.addTest('testClaspConfiguration', function() {
    // Test that clasp.json exists and has required dependencies available
    TestFramework.assertTrue(typeof GASDBLogger !== 'undefined', 'GASDBLogger should be available');
    TestFramework.assertTrue(typeof ErrorHandler !== 'undefined', 'ErrorHandler should be available');
    TestFramework.assertTrue(typeof TestFramework !== 'undefined', 'TestFramework should be available');
  });
  
  // Test Google Drive access permissions
  suite.addTest('testDriveAccess', function() {
    try {
      // Try to access Drive API - this will fail if permissions aren't set up
      const folders = DriveApp.getFolders();
      TestFramework.assertTrue(true, 'Drive API access successful');
    } catch (error) {
      TestFramework.assertTrue(false, `Drive API access failed: ${error.message}`);
    }
  });
  
  return suite;
}

/**
 * Register the Environment test suite with the TestFramework
 */
function registerEnvironmentTests() {
  const testFramework = new TestFramework();
  testFramework.registerTestSuite(createEnvironmentTestSuite());
  return testFramework;
}

/**
 * Run Environment Tests independently
 */
function runEnvironmentTests() {
  GASDBLogger.info('Running Environment Tests: Project Setup and Configuration');
  
  const testFramework = registerEnvironmentTests();
  const results = testFramework.runTestSuite('Environment Tests');
  
  // Log summary
  GASDBLogger.info('Environment Test Results:');
  GASDBLogger.info(results.getSummary());
  
  return results;
}
