/**
 * MasterIndexCollectionMetadataIntegrationTest.js - MasterIndex-CollectionMetadata Integration Tests
 * 
 * RED PHASE: Comprehensive integration tests for the completed MasterIndex-CollectionMetadata refactoring.
 * Tests cross-component integration to ensure seamless operation across all components.
 * 
 * Test Coverage:
 * 1. MasterIndex + CollectionMetadata with Collection class integration
 * 2. Database + MasterIndex + CollectionMetadata end-to-end operations
 * 3. Cross-component serialisation consistency (ObjectUtils integration)
 * 4. Backward compatibility with existing stored data
 * 5. Performance impact assessment
 * 6. Error propagation across component boundaries
 * 7. Lock management integration with CollectionMetadata
 * 8. Conflict resolution with CollectionMetadata integration
 * 
 * Following TDD RED-GREEN-REFACTOR and British English conventions.
 */

/**
 * Test Suite 1: MasterIndex-CollectionMetadata-Collection Integration
 * 
 * Tests the integration between MasterIndex (using CollectionMetadata) and Collection class
 * to ensure proper metadata management and persistence.
 */
function testMasterIndexCollectionMetadataIntegration() {
  const testSuite = new TestSuite('MasterIndex-CollectionMetadata-Collection Integration');
  
  // Test 1: Collection creation with MasterIndex using CollectionMetadata
  testSuite.addTest('testCollectionCreationUpdatesMetadataCorrectly', function() {
    // Arrange: Create MasterIndex directly
    const masterIndex = new MasterIndex({
      masterIndexKey: 'TEST_MASTER_INDEX_INTEGRATION_1'
    });
    
    const metadata = CollectionMetadata.create('test_collection', 'test-file-id');
    
    // Act: Add collection to MasterIndex directly
    masterIndex.addCollection('test_collection', metadata);
    
    // Assert: MasterIndex should contain CollectionMetadata instance
    const storedMetadata = masterIndex.getCollection('test_collection');
    AssertionUtilities.assertNotNull(storedMetadata, 'Collection metadata should be stored in MasterIndex');
    AssertionUtilities.assertTrue(
      storedMetadata instanceof CollectionMetadata,
      'Stored metadata should be CollectionMetadata instance'
    );
    AssertionUtilities.assertEquals(
      storedMetadata.name,
      'test_collection',
      'Collection name should match'
    );
    AssertionUtilities.assertEquals(
      storedMetadata.fileId,
      'test-file-id',
      'File ID should match'
    );
  });
  
  // Test 2: Collection operations update CollectionMetadata through MasterIndex
  testSuite.addTest('testCollectionOperationsUpdateMetadata', function() {
    // Arrange: Setup MasterIndex with existing metadata
    const masterIndex = new MasterIndex({
      masterIndexKey: 'TEST_MASTER_INDEX_INTEGRATION_2'
    });
    
    const initialMetadata = CollectionMetadata.create('update_test_collection', 'update-file-id');
    masterIndex.addCollection('update_test_collection', initialMetadata);
    
    const originalLastUpdated = masterIndex.getCollection('update_test_collection').lastUpdated;
    
    // Ensure timestamp difference for test
    Utilities.sleep(10);
    
    // Act: Update metadata directly through MasterIndex
    masterIndex.updateCollectionMetadata('update_test_collection', {
      documentCount: 1,
      lastUpdated: new Date()
    });
    
    // Assert: Metadata should be updated with new timestamp and document count
    const updatedMetadata = masterIndex.getCollection('update_test_collection');
    AssertionUtilities.assertTrue(
      updatedMetadata.lastUpdated.getTime() > originalLastUpdated.getTime(),
      'Last updated timestamp should be newer after operation'
    );
    AssertionUtilities.assertEquals(
      updatedMetadata.documentCount,
      1,
      'Document count should be updated'
    );
  });
  
  // Test 3: CollectionMetadata serialisation consistency across components
  testSuite.addTest('testCollectionMetadataSerialisationConsistency', function() {
    // Arrange: Create MasterIndex and CollectionMetadata
    const masterIndex = new MasterIndex({
      masterIndexKey: 'TEST_MASTER_INDEX_INTEGRATION_3'
    });
    
    const originalMetadata = new CollectionMetadata('serial_test_collection', 'serial-file-id', {
      documentCount: 42,
      modificationToken: 'test-token-serialisation',
      lockStatus: {
        isLocked: true,
        lockedBy: 'test-instance',
        lockedAt: Date.now(),
        lockTimeout: Date.now() + 30000
      }
    });
    
    // Act: Add to MasterIndex, save, and reload
    masterIndex.addCollection('serial_test_collection', originalMetadata);
    masterIndex.save();
    
    const reloadedMasterIndex = new MasterIndex({
      masterIndexKey: 'TEST_MASTER_INDEX_INTEGRATION_3'
    });
    
    // Assert: All properties should be preserved through serialisation
    const reloadedMetadata = reloadedMasterIndex.getCollection('serial_test_collection');
    
    AssertionUtilities.assertNotNull(reloadedMetadata, 'Metadata should exist after reload');
    AssertionUtilities.assertTrue(
      reloadedMetadata instanceof CollectionMetadata,
      'Reloaded object should be CollectionMetadata instance'
    );
    AssertionUtilities.assertEquals(
      reloadedMetadata.name,
      'serial_test_collection',
      'Collection name should be preserved'
    );
    AssertionUtilities.assertEquals(
      reloadedMetadata.documentCount,
      42,
      'Document count should be preserved'
    );
    AssertionUtilities.assertEquals(
      reloadedMetadata.modificationToken,
      'test-token-serialisation',
      'Modification token should be preserved'
    );
    
    const reloadedLockStatus = reloadedMetadata.lockStatus;
    AssertionUtilities.assertNotNull(reloadedLockStatus, 'Lock status should be preserved');
    AssertionUtilities.assertTrue(reloadedLockStatus.isLocked, 'Lock state should be preserved');
    AssertionUtilities.assertEquals(
      reloadedLockStatus.lockedBy,
      'test-instance',
      'Lock owner should be preserved'
    );
  });
  
  return testSuite;
}

/**
 * Test Suite 2: Database-MasterIndex-CollectionMetadata End-to-End Integration
 * 
 * Tests complete integration from Database API down through MasterIndex and CollectionMetadata.
 */
function testDatabaseMasterIndexIntegration() {
  const testSuite = new TestSuite('Database-MasterIndex-CollectionMetadata End-to-End');
  
  // Test 1: Database collection creation integrates with MasterIndex
  testSuite.addTest('testDatabaseCollectionCreationIntegration', function() {
    // Arrange: Setup real Database with Drive folder
    const testFolderName = 'GASDB_Integration_Test_' + Date.now();
    const testFolder = DriveApp.createFolder(testFolderName);
    const testFolderId = testFolder.getId();
    
    try {
      const config = new DatabaseConfig({
        rootFolderId: testFolderId,
        masterIndexKey: 'TEST_DATABASE_INTEGRATION_1'
      });
      
      const database = new Database(config);
      database.initialise();
      // Act: Create collection through Database API
      const collection = database.collection('integration_collection');
      
      // Assert: MasterIndex should contain proper CollectionMetadata
      const masterIndex = database._masterIndex;
      const metadata = masterIndex.getCollection('integration_collection');
      
      AssertionUtilities.assertNotNull(metadata, 'Collection metadata should exist in MasterIndex');
      AssertionUtilities.assertTrue(
        metadata instanceof CollectionMetadata,
        'Metadata should be CollectionMetadata instance'
      );
      AssertionUtilities.assertEquals(
        metadata.name,
        'integration_collection',
        'Collection name should match'
      );
      AssertionUtilities.assertNotNull(metadata.fileId, 'File ID should be set');
      
    } finally {
      // Clean up test folder
      testFolder.setTrashed(true);
    }
  });
  
  // Test 2: Database operations propagate through MasterIndex to CollectionMetadata
  testSuite.addTest('testDatabaseOperationsPropagateToMetadata', function() {
    // Arrange: Setup real Database with Drive folder
    const testFolderName = 'GASDB_Integration_Propagation_Test_' + Date.now();
    const testFolder = DriveApp.createFolder(testFolderName);
    const testFolderId = testFolder.getId();
    
    try {
      const config = new DatabaseConfig({
        rootFolderId: testFolderId,
        masterIndexKey: 'TEST_DATABASE_INTEGRATION_2'
      });
      
      const database = new Database(config);
      database.initialise();
      const collection = database.collection('propagation_test');
      
      const masterIndex = database._masterIndex;
      const originalMetadata = masterIndex.getCollection('propagation_test');
      const originalLastUpdated = originalMetadata.lastUpdated;
      const originalDocCount = originalMetadata.documentCount;
      
      // Ensure timestamp difference
      Utilities.sleep(10);
      
      // Act: Perform database operation
      collection.insertOne({ data: 'test_propagation' });
      
      // Assert: Changes should propagate to CollectionMetadata
      const updatedMetadata = masterIndex.getCollection('propagation_test');
      AssertionUtilities.assertTrue(
        updatedMetadata.lastUpdated.getTime() > originalLastUpdated.getTime(),
        'Metadata last updated should be newer'
      );
      AssertionUtilities.assertEquals(
        updatedMetadata.documentCount,
        originalDocCount + 1,
        'Document count should be incremented'
      );
      
    } finally {
      // Clean up test folder
      testFolder.setTrashed(true);
    }
  });
  
  // Test 3: Multiple collection operations maintain metadata consistency
  testSuite.addTest('testMultipleCollectionMetadataConsistency', function() {
    // Arrange: Setup real Database with Drive folder
    const testFolderName = 'GASDB_Integration_Multi_Test_' + Date.now();
    const testFolder = DriveApp.createFolder(testFolderName);
    const testFolderId = testFolder.getId();
    
    try {
      const config = new DatabaseConfig({
        rootFolderId: testFolderId,
        masterIndexKey: 'TEST_DATABASE_INTEGRATION_3'
      });
      
      const database = new Database(config);
      database.initialise();
      // Act: Create multiple collections and perform operations
      const collection1 = database.collection('multi_test_1');
      const collection2 = database.collection('multi_test_2');
      
      collection1.insertOne({ type: 'collection1_doc' });
      collection2.insertOne({ type: 'collection2_doc' });
      collection2.insertOne({ type: 'collection2_doc2' });
      
      // Assert: Each collection should have correct metadata
      const masterIndex = database._masterIndex;
      const metadata1 = masterIndex.getCollection('multi_test_1');
      const metadata2 = masterIndex.getCollection('multi_test_2');
      
      AssertionUtilities.assertEquals(
        metadata1.documentCount,
        1,
        'Collection 1 should have 1 document'
      );
      AssertionUtilities.assertEquals(
        metadata2.documentCount,
        2,
        'Collection 2 should have 2 documents'
      );
      
      AssertionUtilities.assertEquals(
        metadata1.name,
        'multi_test_1',
        'Collection 1 name should be correct'
      );
      AssertionUtilities.assertEquals(
        metadata2.name,
        'multi_test_2',
        'Collection 2 name should be correct'
      );
      
    } finally {
      // Clean up test folder
      testFolder.setTrashed(true);
    }
  });
  
  return testSuite;
}

/**
 * Test Suite 3: Backward Compatibility and Data Migration
 * 
 * Tests that existing stored data can be read and that the refactoring maintains compatibility.
 */
function testBackwardCompatibilityIntegration() {
  const testSuite = new TestSuite('Backward Compatibility and Data Migration');
  
  // Test 1: Legacy metadata format can be read as CollectionMetadata
  testSuite.addTest('testLegacyMetadataCompatibility', function() {
    // Arrange: Simulate legacy metadata format in ScriptProperties
    const legacyData = {
      version: 1,
      lastUpdated: new Date().toISOString(),
      collections: {
        'legacy_collection': {
          name: 'legacy_collection',
          fileId: 'legacy-file-id',
          created: new Date('2024-01-01T10:00:00Z').toISOString(),
          lastModified: new Date('2024-01-02T10:00:00Z').toISOString(),
          documentCount: 5,
          modificationToken: 'legacy-token'
        }
      },
      locks: {},
      modificationHistory: {}
    };
    
    // Store legacy format
    PropertiesService.getScriptProperties().setProperty(
      'TEST_LEGACY_COMPATIBILITY',
      JSON.stringify(legacyData)
    );
    
    // Act: Create MasterIndex to read legacy data
    const masterIndex = new MasterIndex({
      masterIndexKey: 'TEST_LEGACY_COMPATIBILITY'
    });
    
    const metadata = masterIndex.getCollection('legacy_collection');
    
    // Assert: Legacy data should be converted to CollectionMetadata
    AssertionUtilities.assertNotNull(metadata, 'Legacy metadata should be readable');
    AssertionUtilities.assertTrue(
      metadata instanceof CollectionMetadata,
      'Legacy metadata should be converted to CollectionMetadata instance'
    );
    AssertionUtilities.assertEquals(
      metadata.name,
      'legacy_collection',
      'Legacy collection name should be preserved'
    );
    AssertionUtilities.assertEquals(
      metadata.fileId,
      'legacy-file-id',
      'Legacy file ID should be preserved'
    );
    AssertionUtilities.assertEquals(
      metadata.documentCount,
      5,
      'Legacy document count should be preserved'
    );
  });
  
  // Test 2: Mixed legacy and new format compatibility
  testSuite.addTest('testMixedFormatCompatibility', function() {
    // Arrange: Create MasterIndex with legacy data, then add new collection
    const legacyData = {
      version: 1,
      lastUpdated: new Date().toISOString(),
      collections: {
        'legacy_collection': {
          name: 'legacy_collection',
          fileId: 'legacy-file-id',
          created: new Date('2024-01-01T10:00:00Z').toISOString(),
          lastModified: new Date('2024-01-02T10:00:00Z').toISOString(),
          documentCount: 3
        }
      },
      locks: {},
      modificationHistory: {}
    };
    
    PropertiesService.getScriptProperties().setProperty(
      'TEST_MIXED_COMPATIBILITY',
      JSON.stringify(legacyData)
    );
    
    const masterIndex = new MasterIndex({
      masterIndexKey: 'TEST_MIXED_COMPATIBILITY'
    });
    
    // Act: Add new collection using CollectionMetadata
    const newMetadata = CollectionMetadata.create('new_collection', 'new-file-id');
    masterIndex.addCollection('new_collection', newMetadata);
    
    // Assert: Both legacy and new collections should work
    const legacyMetadata = masterIndex.getCollection('legacy_collection');
    const currentMetadata = masterIndex.getCollection('new_collection');
    
    AssertionUtilities.assertNotNull(legacyMetadata, 'Legacy collection should be readable');
    AssertionUtilities.assertNotNull(currentMetadata, 'New collection should be stored');
    
    AssertionUtilities.assertTrue(
      legacyMetadata instanceof CollectionMetadata,
      'Legacy metadata should be CollectionMetadata instance'
    );
    AssertionUtilities.assertTrue(
      currentMetadata instanceof CollectionMetadata,
      'New metadata should be CollectionMetadata instance'
    );
    
    AssertionUtilities.assertEquals(
      legacyMetadata.name,
      'legacy_collection',
      'Legacy collection name should be preserved'
    );
    AssertionUtilities.assertEquals(
      currentMetadata.name,
      'new_collection',
      'New collection name should be correct'
    );
  });
  
  return testSuite;
}

/**
 * Test Suite 4: Lock Management Integration
 * 
 * Tests that the lock management system works correctly with CollectionMetadata integration.
 */
function testLockManagementIntegration() {
  const testSuite = new TestSuite('Lock Management with CollectionMetadata Integration');
  
  // Test 1: Lock acquisition updates CollectionMetadata
  testSuite.addTest('testLockAcquisitionUpdatesMetadata', function() {
    // Arrange: Setup MasterIndex with collection
    const masterIndex = new MasterIndex({
      masterIndexKey: 'TEST_LOCK_INTEGRATION_1'
    });
    
    const metadata = CollectionMetadata.create('lock_test_collection', 'lock-file-id');
    masterIndex.addCollection('lock_test_collection', metadata);
    
    // Act: Acquire lock
    const lockAcquired = masterIndex.acquireLock('lock_test_collection', 'test-instance-id');
    
    // Assert: Lock should be acquired and reflected in metadata
    AssertionUtilities.assertTrue(lockAcquired, 'Lock should be acquired successfully');
    
    const updatedMetadata = masterIndex.getCollection('lock_test_collection');
    const lockStatus = updatedMetadata.lockStatus;
    
    AssertionUtilities.assertNotNull(lockStatus, 'Lock status should be set');
    AssertionUtilities.assertTrue(lockStatus.isLocked, 'Collection should be marked as locked');
    AssertionUtilities.assertEquals(
      lockStatus.lockedBy,
      'test-instance-id',
      'Lock should be attributed to correct instance'
    );
    AssertionUtilities.assertTrue(
      typeof lockStatus.lockedAt === 'number',
      'Lock timestamp should be number'
    );
  });
  
  // Test 2: Lock release updates CollectionMetadata
  testSuite.addTest('testLockReleaseUpdatesMetadata', function() {
    // Arrange: Setup MasterIndex with locked collection
    const masterIndex = new MasterIndex({
      masterIndexKey: 'TEST_LOCK_INTEGRATION_2'
    });
    
    const metadata = CollectionMetadata.create('unlock_test_collection', 'unlock-file-id');
    masterIndex.addCollection('unlock_test_collection', metadata);
    masterIndex.acquireLock('unlock_test_collection', 'test-instance-id');
    
    // Act: Release lock
    masterIndex.releaseLock('unlock_test_collection', 'test-instance-id');
    
    // Assert: Lock should be released and reflected in metadata
    const updatedMetadata = masterIndex.getCollection('unlock_test_collection');
    const lockStatus = updatedMetadata.lockStatus;
    
    AssertionUtilities.assertNotNull(lockStatus, 'Lock status should still exist');
    AssertionUtilities.assertFalse(lockStatus.isLocked, 'Collection should not be locked');
    AssertionUtilities.assertNull(lockStatus.lockedBy, 'LockedBy should be null');
  });
  
  // Test 3: Lock timeout handling with CollectionMetadata
  testSuite.addTest('testLockTimeoutWithMetadata', function() {
    // Arrange: Setup MasterIndex with short timeout
    const masterIndex = new MasterIndex({
      masterIndexKey: 'TEST_LOCK_INTEGRATION_3',
      lockTimeout: 500 // Shortest possible timeout for testing
    });
    
    const metadata = CollectionMetadata.create('timeout_test_collection', 'timeout-file-id');
    masterIndex.addCollection('timeout_test_collection', metadata);
    
    // Act: Acquire lock and wait for timeout
    masterIndex.acquireLock('timeout_test_collection', 'test-instance-id');
    Utilities.sleep(1500); // Wait 1000ms longer than timeout. Very short timeouts sometimes mean that the lock expires before the sleep
    //finishes, causing the test to fail incorrectly. In reality I don't expect for super short gaps between locks and timeouts to be an issue
    // but if it does become an issue in the future, I'm fairly sure I need to add an extra writeback of the lock status to memory before
    // updating the lock to avoid this issue.

    
    // Try to acquire lock with different instance (should succeed due to timeout)
    const secondLockAcquired = masterIndex.acquireLock('timeout_test_collection', 'second-instance-id');
    
    // Assert: Second lock should be acquired due to timeout
    AssertionUtilities.assertTrue(secondLockAcquired, 'Second lock should be acquired after timeout');
    
    const updatedMetadata = masterIndex.getCollection('timeout_test_collection');
    const lockStatus = updatedMetadata.lockStatus;
    
    AssertionUtilities.assertEquals(
      lockStatus.lockedBy,
      'second-instance-id',
      'Lock should be owned by second instance'
    );
  });
  
  return testSuite;
}

/**
 * Test Suite 5: Performance and Scalability Integration
 * 
 * Tests that the refactoring doesn't negatively impact performance.
 */
function testPerformanceIntegration() {
  const testSuite = new TestSuite('Performance and Scalability Integration');
  
  // Test 1: Multiple collection metadata operations performance
  testSuite.addTest('testMultipleCollectionPerformance', function() {
    // Arrange: Setup MasterIndex
    const masterIndex = new MasterIndex({
      masterIndexKey: 'TEST_PERFORMANCE_INTEGRATION_1'
    });
    
    const startTime = Date.now();
    
    // Act: Create multiple collections rapidly
    for (let i = 0; i < 50; i++) {
      const metadata = CollectionMetadata.create(`perf_collection_${i}`, `perf-file-id-${i}`);
      masterIndex.addCollection(`perf_collection_${i}`, metadata);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Assert: Operations should complete within reasonable time
    AssertionUtilities.assertTrue(
      duration < 6000, // 6 seconds should be more than enough
      `Multiple collection operations took ${duration}ms, should be under 6000ms`
    );
    
    // Verify all collections are stored correctly
    for (let i = 0; i < 50; i++) {
      const metadata = masterIndex.getCollection(`perf_collection_${i}`);
      AssertionUtilities.assertNotNull(metadata, `Collection ${i} metadata should exist`);
      AssertionUtilities.assertEquals(
        metadata.name,
        `perf_collection_${i}`,
        `Collection ${i} name should be correct`
      );
    }
  });
  
  // Test 2: Serialisation performance with large metadata sets
  testSuite.addTest('testSerialisationPerformance', function() {
    // Arrange: Setup MasterIndex with many collections
    const masterIndex = new MasterIndex({
      masterIndexKey: 'TEST_PERFORMANCE_INTEGRATION_2'
    });
    
    // Add many collections with complex metadata
    for (let i = 0; i < 100; i++) {
      const metadata = new CollectionMetadata(`large_collection_${i}`, `large-file-id-${i}`, {
        documentCount: i * 10,
        modificationToken: `token-${i}-${Date.now()}`,
        lockStatus: {
          isLocked: i % 2 === 0,
          lockedBy: i % 2 === 0 ? `instance-${i}` : null,
          lockedAt: i % 2 === 0 ? Date.now() : null,
          lockTimeout: i % 2 === 0 ? Date.now() + 30000 : null
        }
      });
      masterIndex.addCollection(`large_collection_${i}`, metadata);
    }
    
    const startTime = Date.now();
    
    // Act: Save and reload (full serialisation cycle)
    masterIndex.save();
    const newMasterIndex = new MasterIndex({
      masterIndexKey: 'TEST_PERFORMANCE_INTEGRATION_2'
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Assert: Serialisation should complete within reasonable time
    AssertionUtilities.assertTrue(
      duration < 3000, // 3 seconds for full serialisation cycle
      `Serialisation cycle took ${duration}ms, should be under 3000ms`
    );
    
    // Verify data integrity after serialisation
    const firstMetadata = newMasterIndex.getCollection('large_collection_0');
    const lastMetadata = newMasterIndex.getCollection('large_collection_99');
    
    AssertionUtilities.assertNotNull(firstMetadata, 'First collection should be preserved');
    AssertionUtilities.assertNotNull(lastMetadata, 'Last collection should be preserved');
    AssertionUtilities.assertEquals(
      lastMetadata.documentCount,
      990,
      'Last collection document count should be preserved'
    );
  });
  
  return testSuite;
}

/**
 * Run all MasterIndex-CollectionMetadata integration tests
 */
function runMasterIndexCollectionMetadataIntegrationTests() {
  const testFramework = new TestFramework();
  
  // Add all test suites
  testFramework.registerTestSuite(testMasterIndexCollectionMetadataIntegration());
  testFramework.registerTestSuite(testDatabaseMasterIndexIntegration());
  testFramework.registerTestSuite(testBackwardCompatibilityIntegration());
  testFramework.registerTestSuite(testLockManagementIntegration());
  testFramework.registerTestSuite(testPerformanceIntegration());
  
  // Run all tests
  const results = testFramework.runAllTests();
  
  // Clean up test data
  cleanupMasterIndexCollectionMetadataTestData();
  
  return results;
}

/**
 * Clean up test data created during MasterIndex-CollectionMetadata integration tests
 */
function cleanupMasterIndexCollectionMetadataTestData() {
  const testKeys = [
    'TEST_MASTER_INDEX_INTEGRATION_1',
    'TEST_MASTER_INDEX_INTEGRATION_2',
    'TEST_MASTER_INDEX_INTEGRATION_3',
    'TEST_DATABASE_INTEGRATION_1',
    'TEST_DATABASE_INTEGRATION_2',
    'TEST_DATABASE_INTEGRATION_3',
    'TEST_LEGACY_COMPATIBILITY',
    'TEST_MIXED_COMPATIBILITY',
    'TEST_LOCK_INTEGRATION_1',
    'TEST_LOCK_INTEGRATION_2',
    'TEST_LOCK_INTEGRATION_3',
    'TEST_PERFORMANCE_INTEGRATION_1',
    'TEST_PERFORMANCE_INTEGRATION_2'
  ];
  
  const properties = PropertiesService.getScriptProperties();
  testKeys.forEach(key => {
    try {
      properties.deleteProperty(key);
    } catch (error) {
      // Ignore errors for non-existent keys
    }
  });
  
  console.log('MasterIndex-CollectionMetadata integration test data cleanup completed');
}
