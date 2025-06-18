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
    TestFramework.assertTrue(typeof masterIndex.getCollections === 'function', 'getCollections method should exist');
    TestFramework.assertTrue(typeof masterIndex.updateCollectionMetadata === 'function', 'updateCollectionMetadata method should exist');
    TestFramework.assertTrue(typeof masterIndex.acquireLock === 'function', 'acquireLock method should exist');
    TestFramework.assertTrue(typeof masterIndex.releaseLock === 'function', 'releaseLock method should exist');
    TestFramework.assertTrue(typeof masterIndex.isLocked === 'function', 'isLocked method should exist');
    
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
      masterIndex.addCollection('test-collection', '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
      
      // Assert - Verify behaviour is preserved
      const collections = masterIndex.getCollections();
      TestFramework.assertTrue(Object.keys(collections).includes('test-collection'), 'Collection should be added successfully');
      
      const collectionData = masterIndex.getCollection('test-collection');
      TestFramework.assertEquals('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', collectionData.fileId, 'Collection data should be preserved');
      
      // Test removal
      masterIndex.removeCollection('test-collection');
      const collectionsAfterRemoval = masterIndex.getCollections();
      TestFramework.assertFalse(Object.keys(collectionsAfterRemoval).includes('test-collection'), 'Collection should be removed');
      
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
      masterIndex.addCollection('existing-test-1', '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
      const collections = masterIndex.getCollections();
      TestFramework.assertTrue(Object.keys(collections).includes('existing-test-1'), 'Existing test pattern should work');
      
      // Test 2: Duplicate collection handling
      TestFramework.assertThrows(() => {
        masterIndex.addCollection('existing-test-1', '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
      }, ErrorHandler.ErrorTypes.DUPLICATE_KEY, 'Duplicate key handling should work as before');
      
      // Test 3: Collection metadata operations
      const metadata = { name: 'existing-test-1', fileId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', version: 1 };
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
    
    // Assert - Test that LockService dependency injection doesn't exist yet (TDD red phase)
    // This should fail because we expect to be able to inject a LockService in the future
    TestFramework.assertThrows(() => {
      const mockLockService = { acquireScriptLock: function() {}, releaseScriptLock: function() {} };
      const masterIndexWithLockService = new MasterIndex(customConfig, mockLockService);
      // If this doesn't throw, it means LockService injection is already implemented
      TestFramework.assertNotNull(masterIndexWithLockService._lockService, 'LockService should be injectable');
    }, Error, 'LockService dependency injection should not exist yet (TDD red phase)');
  });

  return suite;
}
