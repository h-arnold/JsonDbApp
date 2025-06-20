// 00_LockServiceSetupTestSuite.js
// Setup suite for LockService: clear master index before tests

const LOCKSERVICE_TEST_DATA = {
  masterIndexKey: 'GASDB_MASTER_INDEX'
};

/**
 * Creates a test suite to clear the master index property in ScriptProperties
 * @returns {TestSuite}
 */
function createLockServiceSetupTestSuite() {
  const suite = new TestSuite('LockService Setup - Clear Master Index');

  suite.addTest('should clear master index property', function() {
    // Arrange
    const props = PropertiesService.getScriptProperties();
    props.deleteProperty(LOCKSERVICE_TEST_DATA.masterIndexKey);

    // Act
    const value = props.getProperty(LOCKSERVICE_TEST_DATA.masterIndexKey);

    // Assert
    TestFramework.assertNull(value, 'Master index property should be null after deletion');
  });

  return suite;
}
