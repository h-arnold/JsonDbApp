// 08_LockServiceMasterIndexKeyTestSuite.js
// Tests for masterIndexKey injection in DbLockService

/**
 * Creates a test suite for masterIndexKey injection support
 * @returns {TestSuite}
 */
function createLockServiceMasterIndexKeyTestSuite() {
  const suite = new TestSuite('LockService Master Index Key Injection');

  suite.addTest('testInvalidMasterIndexKeyThrows', function() {
    TestFramework.assertThrows(() => {
      new DbLockService({ masterIndexKey: '' });
    }, Error, 'Empty masterIndexKey should throw');
    TestFramework.assertThrows(() => {
      new DbLockService({ masterIndexKey: 123 });
    }, Error, 'Non-string masterIndexKey should throw');
  });

  suite.addTest('testCustomKeyUsedForSaving', function() {
    const customKey = 'MY_TEST_KEY_' + new Date().getTime();
    const props = PropertiesService.getScriptProperties();
    props.deleteProperty(customKey);
    props.deleteProperty('GASDB_MASTER_INDEX');
    const svc = new DbLockService({ masterIndexKey: customKey });
    svc.acquireCollectionLock('colJ', 'opJ');
    const defaultVal = props.getProperty('GASDB_MASTER_INDEX');
    TestFramework.assertNull(defaultVal, 'Default key should remain unset');
    const data = props.getProperty(customKey);
    TestFramework.assertNotNull(data, 'Custom key should have the index value');
    const parsed = JSON.parse(data);
    TestFramework.assertTrue(parsed.locks.hasOwnProperty('colJ'), 'Parsed locks must include colJ');
  });

  suite.addTest('testCustomKeyUsedForLoading', function() {
    const customKey = 'MY_LOAD_KEY_' + new Date().getTime();
    const props = PropertiesService.getScriptProperties();
    props.setProperty(customKey, JSON.stringify({ locks: { x: { operationId: 'oX', timestamp: Date.now(), timeout: 5000 } } }));
    const svc = new DbLockService({ masterIndexKey: customKey });
    TestFramework.assertTrue(svc.isCollectionLocked('x'), 'Should detect lock under custom key');
    props.deleteProperty(customKey);
  });

  return suite;
}
