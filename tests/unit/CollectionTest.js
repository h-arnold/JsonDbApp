/**
 * CollectionTest.js - Collection Class Tests
 * 
 * Comprehensive tests for the Collection class including:
 * - MongoDB-compatible API with Section 5 limitations
 * - Lazy loading and memory management  
 * - File persistence and dirty tracking
 * - Integration with CollectionMetadata and DocumentOperations
 * 
 * Following TDD Red-Green-Refactor cycle for Section 5 implementation
 */

// Global test data storage for Collection tests
const COLLECTION_TEST_DATA = {
  testFolderId: null,
  testFolderName: 'GASDB_Test_Collection_' + new Date().getTime(),
  testFileId: null,
  testFileName: 'test_collection.json',
  testCollectionName: 'test_collection',
  createdFileIds: [], // Track all files created for cleanup
  createdFolderIds: [], // Track all folders created for cleanup
  testCollection: null,
  testFileService: null,
  testDatabase: null
};

/**
 * Setup collection test environment
 */
function setupCollectionTestEnvironment() {
  const logger = GASDBLogger.createComponentLogger('Collection-Setup');
  
  try {
    const folder = DriveApp.createFolder(COLLECTION_TEST_DATA.testFolderName);
    COLLECTION_TEST_DATA.testFolderId = folder.getId();
    COLLECTION_TEST_DATA.createdFolderIds.push(COLLECTION_TEST_DATA.testFolderId);
    
    // Create FileService instance with proper dependencies
    const fileOps = new FileOperations(logger);
    COLLECTION_TEST_DATA.testFileService = new FileService(fileOps, logger);
    
    // Create mock database object
    COLLECTION_TEST_DATA.testDatabase = {
      _markDirty: function() { /* mock implementation */ }
    };
    
    logger.info('Created test folder for Collection', { 
      folderId: COLLECTION_TEST_DATA.testFolderId, 
      name: COLLECTION_TEST_DATA.testFolderName
    });
    
  } catch (error) {
    logger.error('Failed to create test folder for Collection', { error: error.message });
    throw error;
  }
}

/**
 * Clean up collection test environment
 */
function cleanupCollectionTestEnvironment() {
  const logger = GASDBLogger.createComponentLogger('Collection-Cleanup');
  let cleanedFiles = 0;
  let failedFiles = 0;
  let cleanedFolders = 0;
  let failedFolders = 0;
  
  // Clean up created test files
  COLLECTION_TEST_DATA.createdFileIds.forEach(fileId => {
    try {
      const file = DriveApp.getFileById(fileId);
      file.setTrashed(true);
      cleanedFiles++;
    } catch (error) {
      failedFiles++;
      logger.warn('Failed to delete file', { fileId, error: error.message });
    }
  });
  
  // Clean up created test folders
  COLLECTION_TEST_DATA.createdFolderIds.forEach(folderId => {
    try {
      const folder = DriveApp.getFolderById(folderId);
      folder.setTrashed(true);
      cleanedFolders++;
    } catch (error) {
      failedFolders++;
      logger.warn('Failed to delete folder', { folderId, error: error.message });
    }
  });
  
  // Reset test data
  COLLECTION_TEST_DATA.createdFileIds = [];
  COLLECTION_TEST_DATA.createdFolderIds = [];
  COLLECTION_TEST_DATA.testCollection = null;
  COLLECTION_TEST_DATA.testFileId = null;
  
  logger.info('Collection test cleanup completed', { 
    cleanedFiles, 
    failedFiles, 
    cleanedFolders, 
    failedFolders 
  });
}

/**
 * Helper function to create a test collection file
 */
function createTestCollectionFile() {
  const folder = DriveApp.getFolderById(COLLECTION_TEST_DATA.testFolderId);
  const fileName = 'test_collection_' + new Date().getTime() + '.json';
  
  // Create proper test data with ISO date strings
  const testData = {
    documents: {},
    metadata: {
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      documentCount: 0
    }
  };
  
  const file = folder.createFile(fileName, JSON.stringify(testData, null, 2));
  const fileId = file.getId();
  COLLECTION_TEST_DATA.createdFileIds.push(fileId);
  return fileId;
}

/**
 * Test Collection initialisation
 */
function createCollectionInitialisationTestSuite() {
  const suite = new TestSuite('Collection Initialisation');
  
  suite.addTest('testCollectionInitialisation', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    
    // Act & Assert - This SHOULD fail in Red phase, making the test fail
    const collection = new Collection(
      COLLECTION_TEST_DATA.testCollectionName,
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // These assertions should fail until Collection is implemented
    TestFramework.assertNotNull(collection, 'Collection should be created');
    TestFramework.assertEquals(COLLECTION_TEST_DATA.testCollectionName, collection.getName(), 'Collection name should match');
    TestFramework.assertFalse(collection.isDirty(), 'New collection should not be dirty');
  });
  
  suite.addTest('testCollectionLazyLoading', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    
    // Act & Assert - Should fail in Red phase if not implemented
    const collection = new Collection(
      'lazyTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Data should not be loaded initially - first operation should trigger loading
    const documents = collection.find({});
    TestFramework.assertArrayEquals([], documents, 'Empty collection should return empty array');
  });
  
  return suite;
}

/**
 * Test Collection data loading and saving
 */
function createCollectionDataOperationsTestSuite() {
  const suite = new TestSuite('Collection Data Operations');
  
  suite.addTest('testCollectionLoadDataFromDrive', function() {
    // Arrange - create file with test data
    const folder = DriveApp.getFolderById(COLLECTION_TEST_DATA.testFolderId);
    const testData = {
      metadata: {
        created: new Date('2023-01-01').toISOString(),
        lastUpdated: new Date('2023-01-02').toISOString(),
        documentCount: 2
      },
      documents: {
        'doc1': { _id: 'doc1', name: 'Test Doc 1', value: 100 },
        'doc2': { _id: 'doc2', name: 'Test Doc 2', value: 200 }
      }
    };
    
    const file = folder.createFile('testDataCollection.json', JSON.stringify(testData));
    COLLECTION_TEST_DATA.createdFileIds.push(file.getId());
    
    // Act & Assert - Should fail in Red phase
    const collection = new Collection(
      'dataTestCollection',
      file.getId(),
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Trigger data loading
    const documents = collection.find({});
    TestFramework.assertEquals(2, documents.length, 'Should load 2 documents from file');
    TestFramework.assertEquals('Test Doc 1', documents[0].name, 'First document should match file data');
  });
  
  suite.addTest('testCollectionLoadDataCorruptedFile', function() {
    // Arrange - create corrupted file
    const folder = DriveApp.getFolderById(COLLECTION_TEST_DATA.testFolderId);
    const file = folder.createFile('corruptedCollection.json', '{ "invalid": json data }');
    COLLECTION_TEST_DATA.createdFileIds.push(file.getId());
    
    // Act & Assert - Should fail in Red phase
    const collection = new Collection(
      'corruptedTestCollection',
      file.getId(),
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Should handle corrupted file gracefully
    TestFramework.assertThrows(() => {
      collection.find({});
    }, OperationError, 'Should throw OperationError for corrupted file');
  });
  
  suite.addTest('testCollectionSaveDataToDrive', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    
    // Act & Assert - Should fail in Red phase
    const collection = new Collection(
      'saveTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert a document to make collection dirty
    const result = collection.insertOne({ name: 'Test Save Doc', value: 500 });
    TestFramework.assertTrue(collection.isDirty(), 'Collection should be dirty after insert');
    
    // Save to Drive
    collection.save();
    TestFramework.assertFalse(collection.isDirty(), 'Collection should not be dirty after save');
  });
  
  return suite;
}

/**
 * Test Collection insert operations
 */
function createCollectionInsertOperationsTestSuite() {
  const suite = new TestSuite('Collection Insert Operations');
  
  suite.addTest('testCollectionInsertOne', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    
    // Act & Assert - Should fail in Red phase
    const collection = new Collection(
      'insertTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    const testDoc = { name: 'Insert Test Doc', value: 300, tags: ['test', 'insert'] };
    const result = collection.insertOne(testDoc);
    
    // Verify MongoDB-compatible return format
    TestFramework.assertTrue(result.hasOwnProperty('insertedId'), 'Result should have insertedId property');
    TestFramework.assertTrue(result.hasOwnProperty('acknowledged'), 'Result should have acknowledged property');
    TestFramework.assertTrue(result.acknowledged, 'Operation should be acknowledged');
    TestFramework.assertNotNull(result.insertedId, 'Should return valid insertedId');
  });
  
  suite.addTest('testCollectionInsertOneWithExplicitId', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    
    // Act & Assert - Should fail in Red phase
    const collection = new Collection(
      'insertExplicitIdTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    const testDoc = { _id: 'explicit-id-123', name: 'Explicit ID Doc', value: 400 };
    const result = collection.insertOne(testDoc);
    
    TestFramework.assertEquals('explicit-id-123', result.insertedId, 'Should use provided ID');
    TestFramework.assertTrue(result.acknowledged, 'Operation should be acknowledged');
  });
  
  return suite;
}

/**
 * Test Collection find operations
 */
function createCollectionFindOperationsTestSuite() {
  const suite = new TestSuite('Collection Find Operations');
  
  suite.addTest('testCollectionFindOneEmpty', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    
    // Act & Assert - Should fail in Red phase
    const collection = new Collection(
      'findOneEmptyTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Test findOne on empty collection
    const result = collection.findOne({});
    TestFramework.assertNull(result, 'findOne on empty collection should return null');
  });
  
  suite.addTest('testCollectionFindOneById', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    
    // Act & Assert - Should fail in Red phase
    const collection = new Collection(
      'findOneByIdTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test documents
    const doc1 = collection.insertOne({ name: 'First Doc', value: 100 });
    const doc2 = collection.insertOne({ name: 'Second Doc', value: 200 });
    
    // Test findOne by ID
    const foundDoc1 = collection.findOne({ _id: doc1.insertedId });
    TestFramework.assertNotNull(foundDoc1, 'Should find first document by ID');
    TestFramework.assertEquals('First Doc', foundDoc1.name, 'Should return correct document');
  });
  
  suite.addTest('testCollectionFindOneUnsupportedQuery', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    
    // Act & Assert - Should fail in Red phase
    const collection = new Collection(
      'findOneUnsupportedTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Test unsupported field-based query - should throw with Section 6 message
    TestFramework.assertThrows(() => {
      collection.findOne({ name: 'Test' });
    }, OperationError, 'Should throw OperationError for field-based query');
  });
  
  suite.addTest('testCollectionFindEmpty', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    
    // Act & Assert - Should fail in Red phase
    const collection = new Collection(
      'findEmptyTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Test find on empty collection
    const results = collection.find({});
    TestFramework.assertArrayEquals([], results, 'find on empty collection should return empty array');
    TestFramework.assertTrue(Array.isArray(results), 'find should always return an array');
  });
  
  suite.addTest('testCollectionFindAll', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    
    // Act & Assert - Should fail in Red phase
    const collection = new Collection(
      'findAllTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert multiple test documents
    collection.insertOne({ name: 'Doc A', value: 100, category: 'test' });
    collection.insertOne({ name: 'Doc B', value: 200, category: 'prod' });
    collection.insertOne({ name: 'Doc C', value: 300, category: 'test' });
    
    // Test find all documents
    const allDocs = collection.find({});
    TestFramework.assertEquals(3, allDocs.length, 'Should find all 3 documents');
    TestFramework.assertTrue(Array.isArray(allDocs), 'find should return an array');
  });
  
  suite.addTest('testCollectionFindUnsupportedQuery', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    
    // Act & Assert - Should fail in Red phase
    const collection = new Collection(
      'findUnsupportedTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Test unsupported field-based query - should throw with Section 6 message
    TestFramework.assertThrows(() => {
      collection.find({ name: 'Test' });
    }, OperationError, 'Should throw OperationError for field-based query in find');
  });
  
  return suite;
}

/**
 * Test Collection update operations
 */
function createCollectionUpdateOperationsTestSuite() {
  const suite = new TestSuite('Collection Update Operations');
  
  suite.addTest('testCollectionUpdateOneById', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    
    // Act & Assert - Should fail in Red phase
    const collection = new Collection(
      'updateOneByIdTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test document
    const insertResult = collection.insertOne({ name: 'Original Doc', value: 100, status: 'active' });
    const docId = insertResult.insertedId;
    
    // Test updateOne by ID with document replacement
    const updateDoc = { name: 'Updated Doc', value: 150, status: 'modified', newField: 'added' };
    const updateResult = collection.updateOne({ _id: docId }, updateDoc);
    
    // Verify MongoDB-compatible return format
    TestFramework.assertEquals(1, updateResult.matchedCount, 'Should match 1 document');
    TestFramework.assertEquals(1, updateResult.modifiedCount, 'Should modify 1 document');
    TestFramework.assertTrue(updateResult.acknowledged, 'Operation should be acknowledged');
  });
  
  suite.addTest('testCollectionUpdateOneUnsupportedFilter', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    
    // Act & Assert - Should fail in Red phase
    const collection = new Collection(
      'updateOneUnsupportedFilterTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Test unsupported field-based filter - should throw with Section 6 message
    TestFramework.assertThrows(() => {
      collection.updateOne({ name: 'Test' }, { name: 'Updated' });
    }, OperationError, 'Should throw OperationError for field-based filter in updateOne');
  });
  
  suite.addTest('testCollectionUpdateOneUnsupportedOperators', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    
    // Act & Assert - Should fail in Red phase
    const collection = new Collection(
      'updateOneUnsupportedOperatorsTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test document
    const insertResult = collection.insertOne({ name: 'Test Doc', value: 100 });
    const docId = insertResult.insertedId;
    
    // Test unsupported $set operator - should throw with Section 7 message
    TestFramework.assertThrows(() => {
      collection.updateOne({ _id: docId }, { $set: { name: 'Updated' } });
    }, OperationError, 'Should throw OperationError for $set operator');
  });
  
  return suite;
}

/**
 * Test Collection delete operations
 */
function createCollectionDeleteOperationsTestSuite() {
  const suite = new TestSuite('Collection Delete Operations');
  
  suite.addTest('testCollectionDeleteOneById', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    
    // Act & Assert - Should fail in Red phase
    const collection = new Collection(
      'deleteOneByIdTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test documents
    const doc1 = collection.insertOne({ name: 'Delete Doc 1', value: 100 });
    const doc2 = collection.insertOne({ name: 'Delete Doc 2', value: 200 });
    
    // Test deleteOne by ID
    const deleteResult = collection.deleteOne({ _id: doc1.insertedId });
    
    // Verify MongoDB-compatible return format
    TestFramework.assertEquals(1, deleteResult.deletedCount, 'Should delete 1 document');
    TestFramework.assertTrue(deleteResult.acknowledged, 'Operation should be acknowledged');
  });
  
  suite.addTest('testCollectionDeleteOneUnsupportedFilter', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    
    // Act & Assert - Should fail in Red phase
    const collection = new Collection(
      'deleteOneUnsupportedFilterTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Test unsupported field-based filter - should throw with Section 6 message
    TestFramework.assertThrows(() => {
      collection.deleteOne({ name: 'Test' });
    }, OperationError, 'Should throw OperationError for field-based filter in deleteOne');
  });
  
  return suite;
}

/**
 * Test Collection count operations
 */
function createCollectionCountOperationsTestSuite() {
  const suite = new TestSuite('Collection Count Operations');
  
  suite.addTest('testCollectionCountDocumentsAll', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    
    // Act & Assert - Should fail in Red phase
    const collection = new Collection(
      'countDocumentsAllTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Test count on empty collection
    let count = collection.countDocuments({});
    TestFramework.assertEquals(0, count, 'Empty collection should have count 0');
    
    // Insert test documents
    collection.insertOne({ name: 'Count Doc 1', value: 100 });
    collection.insertOne({ name: 'Count Doc 2', value: 200 });
    collection.insertOne({ name: 'Count Doc 3', value: 300 });
    
    // Test count after inserts
    count = collection.countDocuments({});
    TestFramework.assertEquals(3, count, 'Collection should have count 3 after 3 inserts');
  });
  
  suite.addTest('testCollectionCountDocumentsUnsupportedFilter', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    
    // Act & Assert - Should fail in Red phase
    const collection = new Collection(
      'countDocumentsUnsupportedFilterTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Test unsupported field-based filter - should throw with Section 6 message
    TestFramework.assertThrows(() => {
      collection.countDocuments({ name: 'Test' });
    }, OperationError, 'Should throw OperationError for field-based filter in countDocuments');
  });
  
  return suite;
}

/**
 * Run all Collection tests
 * This function orchestrates all test suites for Collection
 */
function runCollectionTests() {
  try {
    GASDBLogger.info('Starting Collection Test Execution');
    
    // Setup test environment once for all suites
    setupCollectionTestEnvironment();
    
    try {
      // Register all test suites using global convenience functions
      registerTestSuite(createCollectionInitialisationTestSuite());
      registerTestSuite(createCollectionDataOperationsTestSuite());
      registerTestSuite(createCollectionInsertOperationsTestSuite());
      registerTestSuite(createCollectionFindOperationsTestSuite());
      registerTestSuite(createCollectionUpdateOperationsTestSuite());
      registerTestSuite(createCollectionDeleteOperationsTestSuite());
      registerTestSuite(createCollectionCountOperationsTestSuite());
      
      // Run all tests
      const results = runAllTests();
      
      return results;
      
    } finally {
      // Always clean up test environment
      cleanupCollectionTestEnvironment();
    }
    
  } catch (error) {
    GASDBLogger.error('Failed to execute Collection tests', { error: error.message, stack: error.stack });
    throw error;
  } finally {
    GASDBLogger.info('Collection Test Execution Complete');
  }
}
