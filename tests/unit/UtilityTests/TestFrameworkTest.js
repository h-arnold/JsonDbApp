/**
 * TestFrameworkTest.js - TestFramework Class Tests
 * 
 * Tests for the testing framework itself including assertion utilities,
 * test suite functionality, and framework functionality.
 * 
 * Migrated from Section1Tests.js - runTestFrameworkTests()
 */

/**
 * TestFramework Tests
 * Tests for the testing framework itself
 */
function createTestFrameworkTestSuite() {
  const suite = new TestSuite('TestFramework Tests');
  
  suite.addTest('testAssertionUtilities', function() {
    // Test basic assertions
    TestFramework.assertEquals(1, 1, 'Basic equality should work');
    TestFramework.assertNotEquals(1, 2, 'Basic inequality should work');
    TestFramework.assertTrue(true, 'assertTrue should work');
    TestFramework.assertFalse(false, 'assertFalse should work');
    
    // Test null/undefined assertions
    TestFramework.assertNull(null, 'assertNull should work');
    TestFramework.assertNotNull('value', 'assertNotNull should work');
    TestFramework.assertDefined('value', 'assertDefined should work');
    TestFramework.assertUndefined(undefined, 'assertUndefined should work');
  });
  
  suite.addTest('testAssertionThrows', function() {
    // Test that assertThrows works correctly
    TestFramework.assertThrows(() => {
      throw new Error('Test error');
    }, Error, 'Should detect thrown errors');
    
    // Test that it fails when no error is thrown
    try {
      TestFramework.assertThrows(() => {
        // Do nothing
      });
      TestFramework.assertTrue(false, 'Should have thrown error when function does not throw');
    } catch (e) {
      TestFramework.assertTrue(true, 'Correctly detected missing throw');
    }
  });
  
  suite.addTest('testTestSuiteFunctionality', function() {
    const testSuite = new TestSuite('TestSuite');
    testSuite.addTest('dummyTest', () => { /* dummy test */ });
    
    TestFramework.assertEquals('TestSuite', testSuite.name, 'Test suite should have correct name');
    TestFramework.assertTrue(testSuite.tests.has('dummyTest'), 'Should store added tests');
  });
  
  return suite;
}

/**
 * Register the TestFramework test suite with the TestFramework
 */
function registerTestFrameworkTests() {
  const testFramework = new TestFramework();
  testFramework.registerTestSuite(createTestFrameworkTestSuite());
  return testFramework;
}

/**
 * Run TestFramework Tests independently
 */
function runTestFrameworkTests() {
  GASDBLogger.info('Running TestFramework Tests: Testing Framework Functionality');
  
  const testFramework = registerTestFrameworkTests();
  const results = testFramework.runTestSuite('TestFramework Tests');
  
  // Log summary
  GASDBLogger.info('TestFramework Test Results:');
  GASDBLogger.info(results.getSummary());
  
  return results;
}
