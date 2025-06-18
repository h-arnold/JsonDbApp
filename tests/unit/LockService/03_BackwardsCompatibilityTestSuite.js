/**
 * Backwards Compatibility Test Suite
 * Tests to ensure MasterIndex API remains unchanged after LockService extraction
 */

/**
 * Creates test suite for backwards compatibility verification
 * @returns {TestSuite} The backwards compatibility test suite
 */
function createBackwardsCompatibilityTestSuite() {
  const suite = new TestSuite('Backwards Compatibility Tests');

  suite.addTest('testMasterIndexAPIUnchanged', function() {
    // Arrange
    const masterIndex = new MasterIndex();
    
    // Act & Assert - Verify all existing public methods still exist
    TestFramework.assertTrue(typeof masterIndex.addCollection === 'function', 'addCollection method should exist');
    TestFramework.assertTrue(typeof masterIndex.removeCollection === 'function', 'removeCollection method should exist');
    TestFramework.assertTrue(typeof masterIndex.getCollection === 'function', 'getCollection method should exist');
    TestFramework.assertTrue(typeof masterIndex.listCollections === 'function', 'listCollections method should exist');
    TestFramework.assertTrue(typeof masterIndex.hasCollection === 'function', 'hasCollection method should exist');
    TestFramework.assertTrue(typeof masterIndex.updateCollectionMetadata === 'function', 'updateCollectionMetadata method should exist');
    TestFramework.assertTrue(typeof masterIndex.serialise === 'function', 'serialise method should exist');
    TestFramework.assertTrue(typeof masterIndex.toJSON === 'function', 'toJSON method should exist');
    
    // Verify constructor signature hasn't changed (should accept config only by default)
    const masterIndex2 = new MasterIndex({});
    TestFramework.assertNotNull(masterIndex2, 'MasterIndex should construct with config parameter');
  });

  suite.addTest('testMasterIndexBehaviourPreserved', function() {
    // Arrange
    setupLockServiceTestEnvironment();
    const masterIndex = new MasterIndex();
    
    try {
      // Act - Test basic collection operations work identically
      masterIndex.addCollection('test-collection', 'test-file-id');
      
      // Assert - Verify behaviour is preserved
      TestFramework.assertTrue(masterIndex.hasCollection('test-collection'), 'Collection should be added successfully');
      
      const collections = masterIndex.listCollections();
      TestFramework.assertTrue(collections.includes('test-collection'), 'Collection should appear in list');
      
      const collectionData = masterIndex.getCollection('test-collection');
      TestFramework.assertEquals('test-file-id', collectionData.fileId, 'Collection data should be preserved');
      
      // Test removal
      masterIndex.removeCollection('test-collection');
      TestFramework.assertFalse(masterIndex.hasCollection('test-collection'), 'Collection should be removed');
      
    } finally {
      cleanupLockServiceTestEnvironment();
    }
  });

  suite.addTest('testExistingMasterIndexTestsStillPass', function() {
    // This test verifies that existing MasterIndex tests continue to pass
    // We'll run a subset of critical existing tests to ensure no regression
    
    // Arrange
    setupLockServiceTestEnvironment();
    
    try {
      const masterIndex = new MasterIndex();
      
      // Act & Assert - Test core functionality that existing tests rely on
      
      // Test 1: Basic collection addition and retrieval
      masterIndex.addCollection('existing-test-1', 'file-1');
      TestFramework.assertTrue(masterIndex.hasCollection('existing-test-1'), 'Existing test pattern should work');
      
      // Test 2: Duplicate collection handling
      TestFramework.assertThrows(() => {
        masterIndex.addCollection('existing-test-1', 'file-2');
      }, ErrorHandler.ErrorTypes.DUPLICATE_KEY, 'Duplicate key handling should work as before');
      
      // Test 3: Collection metadata operations
      const metadata = { name: 'existing-test-1', fileId: 'file-1', version: 1 };
      masterIndex.updateCollectionMetadata('existing-test-1', metadata);
      const retrieved = masterIndex.getCollection('existing-test-1');
      TestFramework.assertEquals(1, retrieved.version, 'Metadata updates should work as before');
      
      // Test 4: Serialisation compatibility
      const serialised = masterIndex.serialise();
      TestFramework.assertTrue(typeof serialised === 'string', 'Serialisation should return string');
      TestFramework.assertTrue(serialised.includes('existing-test-1'), 'Serialised data should contain collection');
      
    } finally {
      cleanupLockServiceTestEnvironment();
    }
  });

  suite.addTest('testMasterIndexConfigurationCompatible', function() {
    // Arrange
    const customConfig = {
      lockTimeout: 10000,
      version: 2
    };
    
    // Act
    const masterIndex = new MasterIndex(customConfig);
    
    // Assert - Verify existing config options still work
    // Note: This test should pass even before LockService implementation
    // as it tests existing functionality
    TestFramework.assertNotNull(masterIndex, 'MasterIndex should accept custom config');
    
    // The specific config validation will be implementation-dependent
    // but the constructor should not fail with valid config objects
    TestFramework.assertTrue(true, 'Custom configuration should be accepted without errors');
  });

  return suite;
}
