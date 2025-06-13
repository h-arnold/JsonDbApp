/**
 * CollectionMetadataTest.js - CollectionMetadata Class Tests
 * 
 * Comprehensive tests for the CollectionMetadata class including:
 * - Constructor and initialisation
 * - Metadata property management
 * - Document count tracking
 * - Timestamp generation
 * - Object serialisation and cloning
 * 
 * Following TDD Red-Green-Refactor cycle for Section 5 implementation
 */

// Global test data storage for CollectionMetadata tests
const COLLECTION_METADATA_TEST_DATA = {
  testMetadataObjects: [],
  testStartTime: null,
  testEnvironmentReady: false
};

/**
 * CollectionMetadata Constructor Tests
 * Tests metadata object initialisation and validation
 */
function createCollectionMetadataConstructorTestSuite() {
  const suite = new TestSuite('CollectionMetadata Constructor');
  
  suite.addTest('should create metadata with default values when no input provided', function() {
    // Arrange & Act
    const metadata = new CollectionMetadata();
    const metadataObject = metadata;
    
    // Assert
    TestFramework.assertTrue(metadataObject.hasOwnProperty('created'), 'Should have created timestamp');
    TestFramework.assertTrue(metadataObject.hasOwnProperty('lastUpdated'), 'Should have lastUpdated timestamp');
    TestFramework.assertTrue(metadataObject.hasOwnProperty('documentCount'), 'Should have documentCount property');
    TestFramework.assertEquals(metadataObject.documentCount, 0, 'Default documentCount should be 0');
    TestFramework.assertTrue(metadataObject.created instanceof Date, 'Created should be a Date object');
    TestFramework.assertTrue(metadataObject.lastUpdated instanceof Date, 'LastUpdated should be a Date object');
  });
  
  suite.addTest('should create metadata with provided initial values', function() {
    // Arrange
    const initialMetadata = {
      created: new Date('2024-01-01T00:00:00Z'),
      lastUpdated: new Date('2024-01-02T00:00:00Z'),
      documentCount: 5
    };
    
    // Act
    const metadata = new CollectionMetadata(initialMetadata);
    const metadataObject = metadata;
    
    // Assert
    TestFramework.assertEquals(metadataObject.created.getTime(), initialMetadata.created.getTime(), 'Should preserve created timestamp');
    TestFramework.assertEquals(metadataObject.lastUpdated.getTime(), initialMetadata.lastUpdated.getTime(), 'Should preserve lastUpdated timestamp');
    TestFramework.assertEquals(metadataObject.documentCount, 5, 'Should preserve documentCount');
  });

  // RED PHASE: Test 2.1 - Constructor with name and fileId
  suite.addTest('should create metadata with name and fileId parameters', function() {
    // Arrange
    const name = 'testCollection';
    const fileId = 'file123';
    const initialMetadata = {
      created: new Date('2024-01-01T00:00:00Z'),
      lastUpdated: new Date('2024-01-02T00:00:00Z'),
      documentCount: 5
    };
    
    // Act
    const metadata = new CollectionMetadata(name, fileId, initialMetadata);
    const metadataObject = metadata;
    
    // Assert
    TestFramework.assertEquals(metadata.name, name, 'Should set name property');
    TestFramework.assertEquals(metadata.fileId, fileId, 'Should set fileId property');
    TestFramework.assertEquals(metadataObject.name, name, 'toObject should include name');
    TestFramework.assertEquals(metadataObject.fileId, fileId, 'toObject should include fileId');
    TestFramework.assertEquals(metadataObject.created.getTime(), initialMetadata.created.getTime(), 'Should preserve created timestamp');
    TestFramework.assertEquals(metadataObject.lastUpdated.getTime(), initialMetadata.lastUpdated.getTime(), 'Should preserve lastUpdated timestamp');
    TestFramework.assertEquals(metadataObject.documentCount, 5, 'Should preserve documentCount');
  });
  
  suite.addTest('should create metadata with name only', function() {
    // Arrange
    const name = 'testCollection';
    
    // Act
    const metadata = new CollectionMetadata(name);
    
    // Assert
    TestFramework.assertEquals(metadata.name, name, 'Should set name property');
    TestFramework.assertEquals(metadata.fileId, null, 'Should default fileId to null');
  });
  
  suite.addTest('should throw error for invalid name type', function() {
    // Arrange & Act & Assert
    TestFramework.assertThrows(() => {
      new CollectionMetadata(123);
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for non-string name');
  });
  
  suite.addTest('should throw error for empty name string', function() {
    // Arrange & Act & Assert
    TestFramework.assertThrows(() => {
      new CollectionMetadata('');
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for empty name');
  });
  
  suite.addTest('should throw error for invalid fileId type', function() {
    // Arrange & Act & Assert
    TestFramework.assertThrows(() => {
      new CollectionMetadata('validName', 123);
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for non-string fileId');
  });
  
  return suite;
}

/**
 * CollectionMetadata Update Operations Tests
 * Tests timestamp and property update methods
 */
function createCollectionMetadataUpdateTestSuite() {
  const suite = new TestSuite('CollectionMetadata Update Operations');
  
  suite.addTest('should update lastModified timestamp', function() {
    // Arrange
    const metadata = new CollectionMetadata();
    const originalLastUpdated = metadata.lastUpdated;
    
    // Wait a small amount to ensure timestamp difference
    Utilities.sleep(1);
    
    // Act
    metadata.updateLastModified();
    const updatedMetadata = metadata;
    
    // Assert
    TestFramework.assertTrue(updatedMetadata.lastUpdated > originalLastUpdated, 'LastUpdated should be more recent');
  });
  
  suite.addTest('should increment document count', function() {
    // Arrange
    const metadata = new CollectionMetadata();
    const originalCount = metadata.documentCount;
    
    // Act
    metadata.incrementDocumentCount();
    const updatedCount = metadata.documentCount;
    
    // Assert
    TestFramework.assertEquals(updatedCount, originalCount + 1, 'Document count should be incremented by 1');
  });
  
  suite.addTest('should decrement document count', function() {
    // Arrange
    const initialMetadata = { documentCount: 5 };
    const metadata = new CollectionMetadata(initialMetadata);
    const originalCount = metadata.documentCount;
    
    // Act
    metadata.decrementDocumentCount();
    const updatedCount = metadata.documentCount;
    
    // Assert
    TestFramework.assertEquals(updatedCount, originalCount - 1, 'Document count should be decremented by 1');
  });
  
  suite.addTest('should not allow decrementing below zero', function() {
    // Arrange
    const metadata = new CollectionMetadata(); // documentCount starts at 0
    
    // Act & Assert
    TestFramework.assertThrows(() => {
      metadata.decrementDocumentCount();
    }, InvalidArgumentError, 'Should throw error when trying to decrement below zero');
  });
  
  suite.addTest('should set document count to specific value', function() {
    // Arrange
    const metadata = new CollectionMetadata();
    const newCount = 42;
    
    // Act
    metadata.setDocumentCount(newCount);
    const updatedCount = metadata.documentCount;
    
    // Assert
    TestFramework.assertEquals(updatedCount, newCount, 'Document count should be set to specified value');
  });
  
  suite.addTest('should throw error for invalid document count in setDocumentCount', function() {
    // Arrange
    const metadata = new CollectionMetadata();
    
    // Act & Assert
    TestFramework.assertThrows(() => {
      metadata.setDocumentCount(-5);
    }, InvalidArgumentError, 'Should throw error for negative count');
    
    TestFramework.assertThrows(() => {
      metadata.setDocumentCount('not-a-number');
    }, InvalidArgumentError, 'Should throw error for non-numeric count');
  });
  
  suite.addTest('should update lastModified when document count changes', function() {
    // Arrange
    const metadata = new CollectionMetadata();
    const originalLastUpdated = metadata.lastUpdated;
    
    // Wait a small amount to ensure timestamp difference
    Utilities.sleep(1);
    
    // Act
    metadata.setDocumentCount(5);
    const updatedMetadata = metadata;
    
    // Assert
    TestFramework.assertTrue(updatedMetadata.lastUpdated > originalLastUpdated, 'LastUpdated should be more recent after document count change');
  });

  // RED PHASE: Test 2.2 - Modification Token Management
  suite.addTest('should get and set modificationToken', function() {
    // Arrange
    const metadata = new CollectionMetadata('testCollection', 'file123');
    const token = 'mod-token-12345';
    
    // Act
    metadata.setModificationToken(token);
    
    // Assert
    TestFramework.assertEquals(metadata.getModificationToken(), token, 'Should return set modification token');
    TestFramework.assertEquals(metadata.modificationToken, token, 'Should set modificationToken property');
  });
  
  suite.addTest('should include modificationToken in toObject output', function() {
    // Arrange
    const metadata = new CollectionMetadata('testCollection', 'file123');
    const token = 'mod-token-67890';
    
    // Act
    metadata.setModificationToken(token);
    const metadataObject = metadata;
    
    // Assert
    TestFramework.assertEquals(metadataObject.modificationToken, token, 'toObject should include modificationToken');
  });
  
  suite.addTest('should throw error for invalid modificationToken type', function() {
    // Arrange
    const metadata = new CollectionMetadata('testCollection', 'file123');
    
    // Act & Assert
    TestFramework.assertThrows(() => {
      metadata.setModificationToken(123);
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for non-string modificationToken');
  });
  
  suite.addTest('should throw error for empty modificationToken', function() {
    // Arrange
    const metadata = new CollectionMetadata('testCollection', 'file123');
    
    // Act & Assert
    TestFramework.assertThrows(() => {
      metadata.setModificationToken('');
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for empty modificationToken');
  });
  
  suite.addTest('should allow null modificationToken', function() {
    // Arrange
    const metadata = new CollectionMetadata('testCollection', 'file123');
    metadata.setModificationToken('initial-token');
    
    // Act
    metadata.setModificationToken(null);
    
    // Assert
    TestFramework.assertEquals(metadata.getModificationToken(), null, 'Should allow setting modificationToken to null');
  });

  // RED PHASE: Test 2.3 - Lock Status Management
  suite.addTest('should get and set lockStatus', function() {
    // Arrange
    const metadata = new CollectionMetadata('testCollection', 'file123');
    const lockStatus = {
      isLocked: true,
      lockedBy: 'user123',
      lockedAt: Date.now(),
      lockTimeout: 300000
    };
    
    // Act
    metadata.setLockStatus(lockStatus);
    
    // Assert
    const retrievedLockStatus = metadata.getLockStatus();
    TestFramework.assertEquals(retrievedLockStatus.isLocked, lockStatus.isLocked, 'Should return correct isLocked value');
    TestFramework.assertEquals(retrievedLockStatus.lockedBy, lockStatus.lockedBy, 'Should return correct lockedBy value');
    TestFramework.assertEquals(retrievedLockStatus.lockedAt, lockStatus.lockedAt, 'Should return correct lockedAt timestamp');
    TestFramework.assertEquals(retrievedLockStatus.lockTimeout, lockStatus.lockTimeout, 'Should return correct lockTimeout value');
  });
  
  suite.addTest('should include lockStatus in toObject output', function() {
    // Arrange
    const metadata = new CollectionMetadata('testCollection', 'file123');
    const lockStatus = {
      isLocked: false,
      lockedBy: null,
      lockedAt: null,
      lockTimeout: null
    };
    
    // Act
    metadata.setLockStatus(lockStatus);
    const metadataObject = metadata;
    
    // Assert
    TestFramework.assertEquals(metadataObject.lockStatus.isLocked, false, 'toObject should include lockStatus.isLocked');
    TestFramework.assertEquals(metadataObject.lockStatus.lockedBy, null, 'toObject should include lockStatus.lockedBy');
    TestFramework.assertEquals(metadataObject.lockStatus.lockedAt, null, 'toObject should include lockStatus.lockedAt');
    TestFramework.assertEquals(metadataObject.lockStatus.lockTimeout, null, 'toObject should include lockStatus.lockTimeout');
  });
  
  suite.addTest('should throw error for invalid lockStatus type', function() {
    // Arrange
    const metadata = new CollectionMetadata('testCollection', 'file123');
    
    // Act & Assert
    TestFramework.assertThrows(() => {
      metadata.setLockStatus('invalid');
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for non-object lockStatus');
  });
  
  suite.addTest('should validate lockStatus properties', function() {
    // Arrange
    const metadata = new CollectionMetadata('testCollection', 'file123');
    const invalidLockStatus = {
      isLocked: 'not-boolean',
      lockedBy: 123,
      lockedAt: 'not-date',
      lockTimeout: 'not-number'
    };
    
    // Act & Assert
    TestFramework.assertThrows(() => {
      metadata.setLockStatus(invalidLockStatus);
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for invalid lockStatus properties');
  });
  
  suite.addTest('should allow null lockStatus', function() {
    // Arrange
    const metadata = new CollectionMetadata('testCollection', 'file123');
    const initialLockStatus = {
      isLocked: true,
      lockedBy: 'user123',
      lockedAt: Date.now(),
      lockTimeout: 300000
    };
    metadata.setLockStatus(initialLockStatus);
    
    // Act
    metadata.setLockStatus(null);
    
    // Assert
    TestFramework.assertEquals(metadata.getLockStatus(), null, 'Should allow setting lockStatus to null');
  });
  
  return suite;
}

/**
 * CollectionMetadata Serialisation Tests
 * Tests object conversion and cloning operations
 */
function createCollectionMetadataSerialisationTestSuite() {
  const suite = new TestSuite('CollectionMetadata Serialisation');
  
  suite.addTest('should return plain object from toObject method', function() {
    // Arrange
    const metadata = new CollectionMetadata();
    
    // Act
    const metadataObject = metadata;
    
    // Assert
    TestFramework.assertTrue(typeof metadataObject === 'object', 'Should return an object');
    TestFramework.assertTrue(metadataObject.created instanceof Date, 'Should include created Date');
    TestFramework.assertTrue(metadataObject.lastUpdated instanceof Date, 'Should include lastUpdated Date');
    TestFramework.assertTrue(typeof metadataObject.documentCount === 'number', 'Should include documentCount number');
  });

  // RED PHASE: Test 2.4 - Enhanced toObject() Method
  suite.addTest('should include all fields in toObject output', function() {
    // Arrange
    const name = 'testCollection';
    const fileId = 'file123';
    const modificationToken = 'mod-token-12345';
    const lockStatus = {
      isLocked: true,
      lockedBy: 'user123',
      lockedAt: Date.now(),
      lockTimeout: 300000
    };
    
    const metadata = new CollectionMetadata(name, fileId);
    metadata.setModificationToken(modificationToken);
    metadata.setLockStatus(lockStatus);
    
    // Act
    const metadataObject = metadata;
    
    // Assert
    TestFramework.assertEquals(metadataObject.name, name, 'toObject should include name');
    TestFramework.assertEquals(metadataObject.fileId, fileId, 'toObject should include fileId');
    TestFramework.assertEquals(metadataObject.modificationToken, modificationToken, 'toObject should include modificationToken');
    TestFramework.assertTrue(metadataObject.hasOwnProperty('lockStatus'), 'toObject should include lockStatus property');
    TestFramework.assertEquals(metadataObject.lockStatus.isLocked, lockStatus.isLocked, 'toObject should include lockStatus.isLocked');
    TestFramework.assertEquals(metadataObject.lockStatus.lockedBy, lockStatus.lockedBy, 'toObject should include lockStatus.lockedBy');
    TestFramework.assertEquals(metadataObject.lockStatus.lockedAt, lockStatus.lockedAt, 'toObject should include lockStatus.lockedAt');
    TestFramework.assertEquals(metadataObject.lockStatus.lockTimeout, lockStatus.lockTimeout, 'toObject should include lockStatus.lockTimeout');
    TestFramework.assertTrue(metadataObject.created instanceof Date, 'toObject should include created Date');
    TestFramework.assertTrue(metadataObject.lastUpdated instanceof Date, 'toObject should include lastUpdated Date');
    TestFramework.assertTrue(typeof metadataObject.documentCount === 'number', 'toObject should include documentCount');
  });
  
  suite.addTest('should create independent clone', function() {
    // Arrange
    const name = 'testCollection';
    const fileId = 'file123';
    const modificationToken = 'mod-token-12345';
    const lockStatus = {
      isLocked: true,
      lockedBy: 'user123',
      lockedAt: Date.now(),
      lockTimeout: 300000
    };
    
    const original = new CollectionMetadata(name, fileId);
    original.setModificationToken(modificationToken);
    original.setLockStatus(lockStatus);
    
    // Act
    const cloned = original.clone();
    
    // Assert
    TestFramework.assertEquals(cloned.name, original.name, 'Clone should have same name');
    TestFramework.assertEquals(cloned.fileId, original.fileId, 'Clone should have same fileId');
    TestFramework.assertEquals(cloned.getModificationToken(), original.getModificationToken(), 'Clone should have same modificationToken');
    
    // Verify independence by modifying original
    original.setModificationToken('different-token');
    TestFramework.assertNotEquals(cloned.getModificationToken(), original.getModificationToken(), 'Clone should be independent of original');
  });
  
  suite.addTest('should clone with independent timestamps', function() {
    // Arrange
    const original = new CollectionMetadata('testCollection', 'file123');
    
    // Act
    const cloned = original.clone();
    
    // Wait a small amount to ensure timestamp difference
    Utilities.sleep(1);
    
    // Modify original timestamp
    original.updateLastModified();
    
    // Assert
    TestFramework.assertNotEquals(cloned.lastUpdated.getTime(), original.lastUpdated.getTime(), 'Clone timestamps should be independent');
  });

  // RED PHASE: Test 2.5 - Static Factory Methods
  suite.addTest('should create instance from object using fromObject factory', function() {
    // Arrange
    const sourceObject = {
      name: 'testCollection',
      fileId: 'file123',
      created: new Date('2024-01-01T00:00:00Z'),
      lastUpdated: new Date('2024-01-02T00:00:00Z'),
      documentCount: 5,
      modificationToken: 'mod-token-12345',
      lockStatus: {
        isLocked: true,
        lockedBy: 'user123',
        lockedAt: new Date('2024-01-02T01:00:00Z').getTime(),
        lockTimeout: 300000
      }
    };
    
    // Act
    const metadata = CollectionMetadata.fromObject(sourceObject);
    
    // Assert
    TestFramework.assertEquals(metadata.name, sourceObject.name, 'Should set name from object');
    TestFramework.assertEquals(metadata.fileId, sourceObject.fileId, 'Should set fileId from object');
    TestFramework.assertEquals(metadata.created.getTime(), sourceObject.created.getTime(), 'Should set created from object');
    TestFramework.assertEquals(metadata.lastUpdated.getTime(), sourceObject.lastUpdated.getTime(), 'Should set lastUpdated from object');
    TestFramework.assertEquals(metadata.documentCount, sourceObject.documentCount, 'Should set documentCount from object');
    TestFramework.assertEquals(metadata.getModificationToken(), sourceObject.modificationToken, 'Should set modificationToken from object');
    
    const lockStatus = metadata.getLockStatus();
    TestFramework.assertEquals(lockStatus.isLocked, sourceObject.lockStatus.isLocked, 'Should set lockStatus.isLocked from object');
    TestFramework.assertEquals(lockStatus.lockedBy, sourceObject.lockStatus.lockedBy, 'Should set lockStatus.lockedBy from object');
    TestFramework.assertEquals(lockStatus.lockedAt, sourceObject.lockStatus.lockedAt, 'Should set lockStatus.lockedAt from object');
    TestFramework.assertEquals(lockStatus.lockTimeout, sourceObject.lockStatus.lockTimeout, 'Should set lockStatus.lockTimeout from object');
  });
  
  suite.addTest('should create instance using create factory method', function() {
    // Arrange
    const name = 'testCollection';
    const fileId = 'file123';
    
    // Act
    const metadata = CollectionMetadata.create(name, fileId);
    
    // Assert
    TestFramework.assertEquals(metadata.name, name, 'Should set name using create factory');
    TestFramework.assertEquals(metadata.fileId, fileId, 'Should set fileId using create factory');
    TestFramework.assertEquals(metadata.documentCount, 0, 'Should initialise documentCount to 0');
    TestFramework.assertEquals(metadata.getModificationToken(), null, 'Should initialise modificationToken to null');
    TestFramework.assertEquals(metadata.getLockStatus(), null, 'Should initialise lockStatus to null');
    TestFramework.assertTrue(metadata.created instanceof Date, 'Should set created timestamp');
    TestFramework.assertTrue(metadata.lastUpdated instanceof Date, 'Should set lastUpdated timestamp');
  });
  
  suite.addTest('should throw error for invalid object in fromObject', function() {
    // Arrange & Act & Assert
    TestFramework.assertThrows(() => {
      CollectionMetadata.fromObject(null);
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for null object');
    
    TestFramework.assertThrows(() => {
      CollectionMetadata.fromObject('not-an-object');
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for non-object');
  });
  
  suite.addTest('should throw error for missing required fields in fromObject', function() {
    // Arrange
    const incompleteObject = {
      created: new Date(),
      lastUpdated: new Date(),
      documentCount: 5
      // Missing name and fileId
    };
    
    // Act & Assert
    TestFramework.assertThrows(() => {
      CollectionMetadata.fromObject(incompleteObject);
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for missing required fields');
  });
  
  return suite;
}

/**
 * CollectionMetadata Edge Cases and Validation Tests
 * Tests boundary conditions and error scenarios
 */
function createCollectionMetadataEdgeCasesTestSuite() {
  const suite = new TestSuite('CollectionMetadata Edge Cases');
  
  suite.addTest('should handle very large document counts', function() {
    // Arrange
    const metadata = new CollectionMetadata();
    const largeCount = Number.MAX_SAFE_INTEGER;
    
    // Act
    metadata.setDocumentCount(largeCount);
    
    // Assert
    TestFramework.assertEquals(metadata.documentCount, largeCount, 'Should handle large document counts');
  });
  
  suite.addTest('should handle partial metadata objects', function() {
    // Arrange
    const partialMetadata = {
      documentCount: 3
      // Missing created and lastUpdated
    };
    
    // Act
    const metadata = new CollectionMetadata(partialMetadata);
    const metadataObject = metadata;
    
    // Assert
    TestFramework.assertEquals(metadataObject.documentCount, 3, 'Should preserve provided documentCount');
    TestFramework.assertTrue(metadataObject.created instanceof Date, 'Should generate missing created timestamp');
    TestFramework.assertTrue(metadataObject.lastUpdated instanceof Date, 'Should generate missing lastUpdated timestamp');
  });
  
  suite.addTest('should validate Date objects in input metadata', function() {
    // Arrange
    const invalidMetadata = {
      created: 'not-a-date',
      lastUpdated: new Date(),
      documentCount: 0
    };
    
    // Act & Assert
    TestFramework.assertThrows(() => {
      new CollectionMetadata(invalidMetadata);
    }, InvalidArgumentError, 'Should throw error for invalid Date objects');
  });
  
  suite.addTest('should handle zero document count operations', function() {
    // Arrange
    const metadata = new CollectionMetadata();
    
    // Act & Assert - should work fine
    metadata.setDocumentCount(0);
    TestFramework.assertEquals(metadata.documentCount, 0, 'Should handle zero document count');
    
    // Should not allow decrementing from zero
    TestFramework.assertThrows(() => {
      metadata.decrementDocumentCount();
    }, InvalidArgumentError, 'Should not allow decrementing below zero');
  });
  
  return suite;
}

/**
 * Setup function for CollectionMetadata tests (not a test suite)
 */
function setupCollectionMetadataTests() {
  const logger = GASDBLogger.createComponentLogger('CollectionMetadata-Setup');
  COLLECTION_METADATA_TEST_DATA.testStartTime = new Date();
  
  // Prepare test metadata objects for testing
  COLLECTION_METADATA_TEST_DATA.testMetadataObjects = [
    {
      created: new Date('2024-01-01T00:00:00Z'),
      lastUpdated: new Date('2024-01-01T00:00:00Z'),
      documentCount: 0
    },
    {
      created: new Date('2024-02-01T00:00:00Z'),
      lastUpdated: new Date('2024-02-01T00:00:00Z'),
      documentCount: 5
    },
    {
      created: new Date('2024-03-01T00:00:00Z'),
      lastUpdated: new Date('2024-03-01T12:00:00Z'),
      documentCount: 100
    }
  ];
  
  COLLECTION_METADATA_TEST_DATA.testEnvironmentReady = true;
  
  logger.info('CollectionMetadata test environment prepared', {
    startTime: COLLECTION_METADATA_TEST_DATA.testStartTime,
    metadataObjectCount: COLLECTION_METADATA_TEST_DATA.testMetadataObjects.length
  });
}

/**
 * Cleanup function for CollectionMetadata tests (not a test suite)
 */
function cleanupCollectionMetadataTests() {
  const logger = GASDBLogger.createComponentLogger('CollectionMetadata-Cleanup');
  const testEndTime = new Date();
  const testDuration = testEndTime - COLLECTION_METADATA_TEST_DATA.testStartTime;
  
  // Reset test data
  COLLECTION_METADATA_TEST_DATA.testMetadataObjects = [];
  COLLECTION_METADATA_TEST_DATA.testEnvironmentReady = false;
  
  logger.info('CollectionMetadata test cleanup complete', { 
    testDuration: `${testDuration}ms`,
    testStartTime: COLLECTION_METADATA_TEST_DATA.testStartTime,
    testEndTime: testEndTime
  });
}

/**
 * Register all CollectionMetadata test suites with TestFramework
 */
function registerCollectionMetadataTests() {
  const testFramework = new TestFramework();
  testFramework.registerTestSuite(createCollectionMetadataConstructorTestSuite());
  testFramework.registerTestSuite(createCollectionMetadataUpdateTestSuite());
  testFramework.registerTestSuite(createCollectionMetadataSerialisationTestSuite());
  testFramework.registerTestSuite(createCollectionMetadataEdgeCasesTestSuite());
  return testFramework;
}

/**
 * Run all CollectionMetadata tests
 * This function orchestrates all test suites for CollectionMetadata
 */
function runCollectionMetadataTests() {
  try {
    GASDBLogger.info('Starting CollectionMetadata Test Execution');
    
    // Setup
    setupCollectionMetadataTests();
    
    // Register test suites
    const testFramework = registerCollectionMetadataTests();
    
    // Execute all tests
    const results = testFramework.runAllTests();
    
    // Cleanup
    cleanupCollectionMetadataTests();
    
    GASDBLogger.info('CollectionMetadata Test Execution Complete', {
      totalSuites: testFramework.testSuites.size,
      totalTests: results.results.length,
      passedTests: results.getPassed().length,
      failedTests: results.getFailed().length,
      success: results.results.every(r => r.passed)
    });
    
    return results;
    
  } catch (error) {
    GASDBLogger.error('CollectionMetadata Test Execution Failed', { error: error.message, stack: error.stack });
    cleanupCollectionMetadataTests(); // Ensure cleanup even on error
    throw error;
  }
}

/**
 * Quick test execution for development
 * Runs a subset of CollectionMetadata tests for rapid feedback
 */
function runCollectionMetadataQuickTests() {
  try {
    GASDBLogger.info('Starting CollectionMetadata Quick Test Execution');
    
    // Setup
    setupCollectionMetadataTests();
    
    const testFramework = new TestFramework();
    
    // Run just constructor tests for quick feedback
    testFramework.registerTestSuite(createCollectionMetadataConstructorTestSuite());
    
    const results = testFramework.runAllTests();
    
    // Cleanup
    cleanupCollectionMetadataTests();
    
    GASDBLogger.info('CollectionMetadata Quick Test Execution Complete', {
      totalSuites: results.suites?.length || 'unknown',
      totalTests: results.results?.length || 'unknown',
      passedTests: results.getPassed()?.length || 'unknown',
      failedTests: results.getFailed()?.length || 'unknown',
      success: results.results?.every(r => r.passed) || false
    });
    
    return results;
    
  } catch (error) {
    GASDBLogger.error('CollectionMetadata Quick Test Execution Failed', { error: error.message, stack: error.stack });
    cleanupCollectionMetadataTests(); // Ensure cleanup even on error
    throw error;
  }
}
