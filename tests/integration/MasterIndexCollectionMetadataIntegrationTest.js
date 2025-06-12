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
    // Arrange: Create test environment
    const config = new DatabaseConfig({
      baseFolderId: 'test-folder-id',
      masterIndexKey: 'TEST_MASTER_INDEX_INTEGRATION_1'
    });
    
    const masterIndex = new MasterIndex({
      masterIndexKey: 'TEST_MASTER_INDEX_INTEGRATION_1'
    });
    
    const mockFileService = createMockFileServiceWithCollectionSupport();
    const mockDatabase = createMockDatabaseWithMasterIndex(masterIndex);
    
    // Act: Create collection through Database API
    const collection = new Collection('test_collection', 'test-file-id', mockDatabase, mockFileService);
    
    // Assert: MasterIndex should contain CollectionMetadata instance
    const storedMetadata = masterIndex.getCollectionMetadata('test_collection');
    AssertionUtilities.assertNotNull(storedMetadata, 'Collection metadata should be stored in MasterIndex');
    AssertionUtilities.assertTrue(
      storedMetadata instanceof CollectionMetadata,
      'Stored metadata should be CollectionMetadata instance'
    );
    AssertionUtilities.assertEquals(
      storedMetadata.getName(),
      'test_collection',
      'Collection name should match'
    );
    AssertionUtilities.assertEquals(
      storedMetadata.getFileId(),
      'test-file-id',
      'File ID should match'
    );
  });
  
  // Test 2: Collection operations update CollectionMetadata through MasterIndex
  testSuite.addTest('testCollectionOperationsUpdateMetadata', function() {
    // Arrange: Setup collection with existing metadata
    const masterIndex = new MasterIndex({
      masterIndexKey: 'TEST_MASTER_INDEX_INTEGRATION_2'
    });
    
    const initialMetadata = CollectionMetadata.create('update_test_collection', 'update-file-id');
    masterIndex.addCollection('update_test_collection', initialMetadata);
    
    const mockFileService = createMockFileServiceWithCollectionSupport();
    const mockDatabase = createMockDatabaseWithMasterIndex(masterIndex);
    const collection = new Collection('update_test_collection', 'update-file-id', mockDatabase, mockFileService);
    
    const originalLastUpdated = masterIndex.getCollectionMetadata('update_test_collection').getLastUpdated();
    
    // Ensure timestamp difference for test
    Utilities.sleep(10);
    
    // Act: Perform collection operation that should update metadata
    collection.insertOne({ test: 'document' });
    
    // Assert: Metadata should be updated with new timestamp and document count
    const updatedMetadata = masterIndex.getCollectionMetadata('update_test_collection');
    AssertionUtilities.assertTrue(
      updatedMetadata.getLastUpdated() > originalLastUpdated,
      'Last updated timestamp should be newer after operation'
    );
    AssertionUtilities.assertEquals(
      updatedMetadata.getDocumentCount(),
      1,
      'Document count should be updated'
    );
  });
  
  // Test 3: CollectionMetadata serialisation consistency across components
  testSuite.addTest('testCollectionMetadataSerialisationConsistency', function() {
    // Arrange: Create CollectionMetadata with all fields
    const originalMetadata = new CollectionMetadata('serialisation_test', 'serial-file-id', {
      documentCount: 42,
      modificationToken: 'test-token-123',
      lockStatus: {
        isLocked: true,
        lockedBy: 'test-instance',
        lockedAt: Date.now(),
        lockTimeout: Date.now() + 30000
      }
    });
    
    const masterIndex = new MasterIndex({
      masterIndexKey: 'TEST_MASTER_INDEX_INTEGRATION_3'
    });
    
    // Act: Store through MasterIndex and retrieve
    masterIndex.addCollection('serialisation_test', originalMetadata);
    masterIndex.save(); // Force serialisation
    
    // Create new instance to test deserialisation
    const newMasterIndex = new MasterIndex({
      masterIndexKey: 'TEST_MASTER_INDEX_INTEGRATION_3'
    });
    
    const retrievedMetadata = newMasterIndex.getCollectionMetadata('serialisation_test');
    
    // Assert: All properties should be preserved through serialisation cycle
    AssertionUtilities.assertNotNull(retrievedMetadata, 'Metadata should be retrievable');
    AssertionUtilities.assertEquals(
      retrievedMetadata.getName(),
      originalMetadata.getName(),
      'Collection name should be preserved'
    );
    AssertionUtilities.assertEquals(
      retrievedMetadata.getFileId(),
      originalMetadata.getFileId(),
      'File ID should be preserved'
    );
    AssertionUtilities.assertEquals(
      retrievedMetadata.getDocumentCount(),
      originalMetadata.getDocumentCount(),
      'Document count should be preserved'
    );
    AssertionUtilities.assertEquals(
      retrievedMetadata.getModificationToken(),
      originalMetadata.getModificationToken(),
      'Modification token should be preserved'
    );
    
    // Assert Date objects are preserved
    AssertionUtilities.assertTrue(
      retrievedMetadata.getCreated() instanceof Date,
      'Created timestamp should be Date object'
    );
    AssertionUtilities.assertTrue(
      retrievedMetadata.getLastUpdated() instanceof Date,
      'Last updated timestamp should be Date object'
    );
    
    // Assert lock status is preserved
    const retrievedLockStatus = retrievedMetadata.getLockStatus();
    const originalLockStatus = originalMetadata.getLockStatus();
    AssertionUtilities.assertEquals(
      retrievedLockStatus.isLocked,
      originalLockStatus.isLocked,
      'Lock status should be preserved'
    );
    AssertionUtilities.assertEquals(
      retrievedLockStatus.lockedBy,
      originalLockStatus.lockedBy,
      'Locked by should be preserved'
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
    // Arrange: Setup Database with MasterIndex
    const config = new DatabaseConfig({
      baseFolderId: 'test-db-folder',
      masterIndexKey: 'TEST_DATABASE_INTEGRATION_1'
    });
    
    const mockFileService = createMockFileServiceWithCollectionSupport();
    const database = new Database(config, mockFileService);
    
    // Act: Create collection through Database API
    const collection = database.collection('integration_collection');
    
    // Assert: MasterIndex should contain proper CollectionMetadata
    const masterIndex = database._masterIndex; // Access private member for testing
    const metadata = masterIndex.getCollectionMetadata('integration_collection');
    
    AssertionUtilities.assertNotNull(metadata, 'Collection metadata should exist in MasterIndex');
    AssertionUtilities.assertTrue(
      metadata instanceof CollectionMetadata,
      'Metadata should be CollectionMetadata instance'
    );
    AssertionUtilities.assertEquals(
      metadata.getName(),
      'integration_collection',
      'Collection name should match'
    );
  });
  
  // Test 2: Database operations propagate through MasterIndex to CollectionMetadata
  testSuite.addTest('testDatabaseOperationsPropagateToMetadata', function() {
    // Arrange: Setup Database with existing collection
    const config = new DatabaseConfig({
      baseFolderId: 'test-db-folder-2',
      masterIndexKey: 'TEST_DATABASE_INTEGRATION_2'
    });
    
    const mockFileService = createMockFileServiceWithCollectionSupport();
    const database = new Database(config, mockFileService);
    const collection = database.collection('propagation_test');
    
    const masterIndex = database._masterIndex;
    const originalMetadata = masterIndex.getCollectionMetadata('propagation_test');
    const originalLastUpdated = originalMetadata.getLastUpdated();
    const originalDocCount = originalMetadata.getDocumentCount();
    
    // Ensure timestamp difference
    Utilities.sleep(10);
    
    // Act: Perform database operation
    collection.insertOne({ data: 'test_propagation' });
    
    // Assert: Changes should propagate to CollectionMetadata
    const updatedMetadata = masterIndex.getCollectionMetadata('propagation_test');
    AssertionUtilities.assertTrue(
      updatedMetadata.getLastUpdated() > originalLastUpdated,
      'Metadata last updated should be newer'
    );
    AssertionUtilities.assertEquals(
      updatedMetadata.getDocumentCount(),
      originalDocCount + 1,
      'Document count should be incremented'
    );
  });
  
  // Test 3: Multiple collection operations maintain metadata consistency
  testSuite.addTest('testMultipleCollectionMetadataConsistency', function() {
    // Arrange: Setup Database with multiple collections
    const config = new DatabaseConfig({
      baseFolderId: 'test-multi-folder',
      masterIndexKey: 'TEST_DATABASE_INTEGRATION_3'
    });
    
    const mockFileService = createMockFileServiceWithCollectionSupport();
    const database = new Database(config, mockFileService);
    
    const collection1 = database.collection('multi_test_1');
    const collection2 = database.collection('multi_test_2');
    
    // Act: Perform operations on multiple collections
    collection1.insertOne({ collection: 1, data: 'first' });
    collection2.insertOne({ collection: 2, data: 'second' });
    collection1.insertOne({ collection: 1, data: 'third' });
    
    // Assert: Each collection's metadata should be independently maintained
    const masterIndex = database._masterIndex;
    const metadata1 = masterIndex.getCollectionMetadata('multi_test_1');
    const metadata2 = masterIndex.getCollectionMetadata('multi_test_2');
    
    AssertionUtilities.assertEquals(
      metadata1.getDocumentCount(),
      2,
      'Collection 1 should have 2 documents'
    );
    AssertionUtilities.assertEquals(
      metadata2.getDocumentCount(),
      1,
      'Collection 2 should have 1 document'
    );
    AssertionUtilities.assertEquals(
      metadata1.getName(),
      'multi_test_1',
      'Collection 1 name should be preserved'
    );
    AssertionUtilities.assertEquals(
      metadata2.getName(),
      'multi_test_2',
      'Collection 2 name should be preserved'
    );
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
    
    const metadata = masterIndex.getCollectionMetadata('legacy_collection');
    
    // Assert: Legacy data should be converted to CollectionMetadata
    AssertionUtilities.assertNotNull(metadata, 'Legacy metadata should be readable');
    AssertionUtilities.assertTrue(
      metadata instanceof CollectionMetadata,
      'Legacy metadata should be converted to CollectionMetadata instance'
    );
    AssertionUtilities.assertEquals(
      metadata.getName(),
      'legacy_collection',
      'Legacy collection name should be preserved'
    );
    AssertionUtilities.assertEquals(
      metadata.getFileId(),
      'legacy-file-id',
      'Legacy file ID should be preserved'
    );
    AssertionUtilities.assertEquals(
      metadata.getDocumentCount(),
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
    const legacyMetadata = masterIndex.getCollectionMetadata('legacy_collection');
    const currentMetadata = masterIndex.getCollectionMetadata('new_collection');
    
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
      legacyMetadata.getName(),
      'legacy_collection',
      'Legacy collection name should be preserved'
    );
    AssertionUtilities.assertEquals(
      currentMetadata.getName(),
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
    
    const updatedMetadata = masterIndex.getCollectionMetadata('lock_test_collection');
    const lockStatus = updatedMetadata.getLockStatus();
    
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
    const updatedMetadata = masterIndex.getCollectionMetadata('unlock_test_collection');
    const lockStatus = updatedMetadata.getLockStatus();
    
    AssertionUtilities.assertNotNull(lockStatus, 'Lock status should still exist');
    AssertionUtilities.assertFalse(lockStatus.isLocked, 'Collection should not be locked');
    AssertionUtilities.assertNull(lockStatus.lockedBy, 'LockedBy should be null');
  });
  
  // Test 3: Lock timeout handling with CollectionMetadata
  testSuite.addTest('testLockTimeoutWithMetadata', function() {
    // Arrange: Setup MasterIndex with short timeout
    const masterIndex = new MasterIndex({
      masterIndexKey: 'TEST_LOCK_INTEGRATION_3',
      lockTimeout: 100 // Very short timeout for testing
    });
    
    const metadata = CollectionMetadata.create('timeout_test_collection', 'timeout-file-id');
    masterIndex.addCollection('timeout_test_collection', metadata);
    
    // Act: Acquire lock and wait for timeout
    masterIndex.acquireLock('timeout_test_collection', 'test-instance-id');
    Utilities.sleep(150); // Wait longer than timeout
    
    // Try to acquire lock with different instance (should succeed due to timeout)
    const secondLockAcquired = masterIndex.acquireLock('timeout_test_collection', 'second-instance-id');
    
    // Assert: Second lock should be acquired due to timeout
    AssertionUtilities.assertTrue(secondLockAcquired, 'Second lock should be acquired after timeout');
    
    const updatedMetadata = masterIndex.getCollectionMetadata('timeout_test_collection');
    const lockStatus = updatedMetadata.getLockStatus();
    
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
      duration < 5000, // 5 seconds should be more than enough
      `Multiple collection operations took ${duration}ms, should be under 5000ms`
    );
    
    // Verify all collections are stored correctly
    for (let i = 0; i < 50; i++) {
      const metadata = masterIndex.getCollectionMetadata(`perf_collection_${i}`);
      AssertionUtilities.assertNotNull(metadata, `Collection ${i} metadata should exist`);
      AssertionUtilities.assertEquals(
        metadata.getName(),
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
    const firstMetadata = newMasterIndex.getCollectionMetadata('large_collection_0');
    const lastMetadata = newMasterIndex.getCollectionMetadata('large_collection_99');
    
    AssertionUtilities.assertNotNull(firstMetadata, 'First collection should be preserved');
    AssertionUtilities.assertNotNull(lastMetadata, 'Last collection should be preserved');
    AssertionUtilities.assertEquals(
      lastMetadata.getDocumentCount(),
      990,
      'Last collection document count should be preserved'
    );
  });
  
  return testSuite;
}

/**
 * Helper Functions for Creating Mock Objects
 */

function createMockFileServiceWithCollectionSupport() {
  return {
    readFile: function(fileId) {
      return {
        metadata: {
          name: 'mock_collection',
          created: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          documentCount: 0
        },
        documents: {}
      };
    },
    
    writeFile: function(fileId, data) {
      return true; // Success
    },
    
    createFile: function(folderId, filename, content) {
      return `new-file-id-${Date.now()}`;
    }
  };
}

function createMockDatabaseWithMasterIndex(masterIndex) {
  return {
    _masterIndex: masterIndex,
    _config: {
      baseFolderId: 'mock-folder-id'
    },
    _fileService: createMockFileServiceWithCollectionSupport()
  };
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
