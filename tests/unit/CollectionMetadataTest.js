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
    const metadataObject = metadata.toObject();
    
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
    const metadataObject = metadata.toObject();
    
    // Assert
    TestFramework.assertEquals(metadataObject.created.getTime(), initialMetadata.created.getTime(), 'Should preserve created timestamp');
    TestFramework.assertEquals(metadataObject.lastUpdated.getTime(), initialMetadata.lastUpdated.getTime(), 'Should preserve lastUpdated timestamp');
    TestFramework.assertEquals(metadataObject.documentCount, 5, 'Should preserve documentCount');
  });
  
  suite.addTest('should throw error for invalid metadata input', function() {
    // Arrange & Act & Assert
    TestFramework.assertThrows(() => {
      new CollectionMetadata('invalid-metadata');
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for non-object metadata');
  });
  
  suite.addTest('should throw error for invalid documentCount type', function() {
    // Arrange
    const invalidMetadata = {
      created: new Date(),
      lastUpdated: new Date(),
      documentCount: 'not-a-number'
    };
    
    // Act & Assert
    TestFramework.assertThrows(() => {
      new CollectionMetadata(invalidMetadata);
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for non-numeric documentCount');
  });
  
  suite.addTest('should throw error for negative documentCount', function() {
    // Arrange
    const invalidMetadata = {
      created: new Date(),
      lastUpdated: new Date(),
      documentCount: -1
    };
    
    // Act & Assert
    TestFramework.assertThrows(() => {
      new CollectionMetadata(invalidMetadata);
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for negative documentCount');
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
    const originalLastUpdated = metadata.toObject().lastUpdated;
    
    // Wait a small amount to ensure timestamp difference
    Utilities.sleep(1);
    
    // Act
    metadata.updateLastModified();
    const updatedMetadata = metadata.toObject();
    
    // Assert
    TestFramework.assertTrue(updatedMetadata.lastUpdated > originalLastUpdated, 'LastUpdated should be more recent');
  });
  
  suite.addTest('should increment document count', function() {
    // Arrange
    const metadata = new CollectionMetadata();
    const originalCount = metadata.toObject().documentCount;
    
    // Act
    metadata.incrementDocumentCount();
    const updatedCount = metadata.toObject().documentCount;
    
    // Assert
    TestFramework.assertEquals(updatedCount, originalCount + 1, 'Document count should be incremented by 1');
  });
  
  suite.addTest('should decrement document count', function() {
    // Arrange
    const initialMetadata = { documentCount: 5 };
    const metadata = new CollectionMetadata(initialMetadata);
    const originalCount = metadata.toObject().documentCount;
    
    // Act
    metadata.decrementDocumentCount();
    const updatedCount = metadata.toObject().documentCount;
    
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
    const updatedCount = metadata.toObject().documentCount;
    
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
    const originalLastUpdated = metadata.toObject().lastUpdated;
    
    // Wait a small amount to ensure timestamp difference
    Utilities.sleep(1);
    
    // Act
    metadata.incrementDocumentCount();
    const updatedMetadata = metadata.toObject();
    
    // Assert
    TestFramework.assertTrue(updatedMetadata.lastUpdated > originalLastUpdated, 'LastUpdated should be updated when document count changes');
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
    const initialMetadata = {
      created: new Date('2024-01-01T00:00:00Z'),
      lastUpdated: new Date('2024-01-02T00:00:00Z'),
      documentCount: 10
    };
    const metadata = new CollectionMetadata(initialMetadata);
    
    // Act
    const plainObject = metadata.toObject();
    
    // Assert
    TestFramework.assertEquals(typeof plainObject, 'object', 'Should return an object');
    TestFramework.assertFalse(plainObject instanceof CollectionMetadata, 'Should not be an instance of CollectionMetadata');
    TestFramework.assertEquals(plainObject.documentCount, 10, 'Should preserve documentCount');
    TestFramework.assertTrue(plainObject.created instanceof Date, 'Should preserve Date objects');
  });
  
  suite.addTest('should create independent clone', function() {
    // Arrange
    const metadata = new CollectionMetadata();
    metadata.setDocumentCount(5);
    
    // Act
    const clonedMetadata = metadata.clone();
    
    // Modify original
    metadata.setDocumentCount(10);
    
    // Assert
    TestFramework.assertEquals(clonedMetadata.toObject().documentCount, 5, 'Clone should maintain original values');
    TestFramework.assertEquals(metadata.toObject().documentCount, 10, 'Original should have modified values');
    TestFramework.assertTrue(clonedMetadata instanceof CollectionMetadata, 'Clone should be instance of CollectionMetadata');
  });
  
  suite.addTest('should clone with independent timestamps', function() {
    // Arrange
    const metadata = new CollectionMetadata();
    const clone = metadata.clone();
    
    // Wait and modify original
    Utilities.sleep(1);
    metadata.updateLastModified();
    
    // Assert
    const originalMetadata = metadata.toObject();
    const clonedMetadata = clone.toObject();
    TestFramework.assertTrue(originalMetadata.lastUpdated > clonedMetadata.lastUpdated, 'Clone timestamps should be independent');
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
    TestFramework.assertEquals(metadata.toObject().documentCount, largeCount, 'Should handle large document counts');
  });
  
  suite.addTest('should handle partial metadata objects', function() {
    // Arrange
    const partialMetadata = {
      documentCount: 3
      // Missing created and lastUpdated
    };
    
    // Act
    const metadata = new CollectionMetadata(partialMetadata);
    const metadataObject = metadata.toObject();
    
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
    TestFramework.assertEquals(metadata.toObject().documentCount, 0, 'Should handle zero document count');
    
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
      totalSuites: results.suites?.length || 'unknown',
      totalTests: results.results?.length || 'unknown',
      passedTests: results.getPassed()?.length || 'unknown',
      failedTests: results.getFailed()?.length || 'unknown',
      success: results.results?.every(r => r.passed) || false
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
