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
 * 
 * Section 5 Test Coverage:
 * - Basic CRUD operations with limited filter support
 * - Clear error messages for unsupported features
 * - MongoDB-compatible return value formats
 */

// Global test data storage for Collection tests
const COLLECTION_TEST_DATA = {
  testFolderId: null,
  testFolderName: 'GASDB_Collection_Test_Folder_' + new Date().getTime(),
  testCollectionFileId: null,
  testCollectionFileName: 'GASDB_Collection_Test_' + new Date().getTime() + '.json',
  testDatabase: null,
  testFileService: null,
  testStartTime: null,
  testEnvironmentReady: false,
  createdFileIds: [],
  createdFolderIds: [],
  testCollectionData: {
    metadata: {
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      documentCount: 0
    },
    documents: {}
  }
};

/**
 * Setup Collection test environment with real Drive files and dependencies
 */
function setupCollectionTestEnvironment() {
  const logger = GASDBLogger.createComponentLogger('Collection-Setup');
  
  try {
    logger.info('Setting up Collection test environment');
    COLLECTION_TEST_DATA.testStartTime = new Date();
    
    // Create test folder in Drive
    const testFolder = DriveApp.createFolder(COLLECTION_TEST_DATA.testFolderName);
    COLLECTION_TEST_DATA.testFolderId = testFolder.getId();
    COLLECTION_TEST_DATA.createdFolderIds.push(testFolder.getId());
    
    logger.info('Created test folder: ' + testFolder.getName() + ' (ID: ' + testFolder.getId() + ')');
    
    // Create test collection file with initial data
    const testCollectionFile = testFolder.createFile(
      COLLECTION_TEST_DATA.testCollectionFileName,
      JSON.stringify(COLLECTION_TEST_DATA.testCollectionData, null, 2),
      'application/json'
    );
    COLLECTION_TEST_DATA.testCollectionFileId = testCollectionFile.getId();
    COLLECTION_TEST_DATA.createdFileIds.push(testCollectionFile.getId());
    
    logger.info('Created test collection file: ' + testCollectionFile.getName() + ' (ID: ' + testCollectionFile.getId() + ')');
    
    // Create FileService dependencies
    const fileOps = new FileOperations(logger);
    COLLECTION_TEST_DATA.testFileService = new FileService(fileOps, logger);
    
    // Create mock Database reference
    COLLECTION_TEST_DATA.testDatabase = {
      getName: () => 'testDatabase',
      getConfig: () => ({ name: 'testDatabase' })
    };
    
    COLLECTION_TEST_DATA.testEnvironmentReady = true;
    logger.info('Collection test environment setup completed');
    
  } catch (error) {
    logger.error('Failed to setup Collection test environment: ' + error.message);
    throw new OperationError('setup', 'Failed to create Collection test environment: ' + error.message);
  }
}

/**
 * Clean up Collection test environment
 */
function cleanupCollectionTestEnvironment() {
  const logger = GASDBLogger.createComponentLogger('Collection-Cleanup');
  
  try {
    logger.info('Starting Collection test environment cleanup');
    
    // Clean up created files
    COLLECTION_TEST_DATA.createdFileIds.forEach(fileId => {
      try {
        const file = DriveApp.getFileById(fileId);
        file.setTrashed(true);
        logger.info('Cleaned up test file: ' + file.getName());
      } catch (error) {
        logger.warn('Could not clean up file ' + fileId + ': ' + error.message);
      }
    });
    
    // Clean up created folders
    COLLECTION_TEST_DATA.createdFolderIds.forEach(folderId => {
      try {
        const folder = DriveApp.getFolderById(folderId);
        folder.setTrashed(true);
        logger.info('Cleaned up test folder: ' + folder.getName());
      } catch (error) {
        logger.warn('Could not clean up folder ' + folderId + ': ' + error.message);
      }
    });
    
    // Reset test data
    COLLECTION_TEST_DATA.testFolderId = null;
    COLLECTION_TEST_DATA.testCollectionFileId = null;
    COLLECTION_TEST_DATA.testDatabase = null;
    COLLECTION_TEST_DATA.testFileService = null;
    COLLECTION_TEST_DATA.testEnvironmentReady = false;
    COLLECTION_TEST_DATA.createdFileIds = [];
    COLLECTION_TEST_DATA.createdFolderIds = [];
    
    const endTime = new Date();
    const duration = endTime.getTime() - COLLECTION_TEST_DATA.testStartTime.getTime();
    logger.info('Collection test cleanup completed in ' + duration + 'ms');
    
  } catch (error) {
    logger.error('Failed to cleanup Collection test environment: ' + error.message);
  }
}

/**
 * Create Collection test suite
 */
function createCollectionTestSuite() {
  const suite = new TestSuite('Collection Tests');
  
  // Set up lifecycle hooks
  suite.setBeforeAll(() => {
    setupCollectionTestEnvironment();
  });
  
  suite.setAfterAll(() => {
    cleanupCollectionTestEnvironment();
  });
  
  // 1. Collection Initialisation Tests
  suite.addTest('testCollectionInitialisation', function() {
    if (!COLLECTION_TEST_DATA.testEnvironmentReady) {
      throw new Error('Test environment not ready');
    }
    
    // Test successful collection creation
    const collection = new Collection(
      'testCollection',
      COLLECTION_TEST_DATA.testCollectionFileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    TestFramework.assertNotNull(collection, 'Collection should be created successfully');
    TestFramework.assertEquals('testCollection', collection.getName(), 'Collection name should match constructor parameter');
    TestFramework.assertFalse(collection.isDirty(), 'New collection should not be dirty initially');
  });
  
  // 2. Lazy Loading Tests
  suite.addTest('testCollectionLazyLoading', function() {
    if (!COLLECTION_TEST_DATA.testEnvironmentReady) {
      throw new Error('Test environment not ready');
    }
    
    const collection = new Collection(
      'lazyTestCollection',
      COLLECTION_TEST_DATA.testCollectionFileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Data should not be loaded initially
    // First operation should trigger loading
    const documents = collection.find({});
    TestFramework.assertArrayEquals([], documents, 'Empty collection should return empty array');
  });
  
  // 3. Data Loading Tests
  suite.addTest('testCollectionLoadDataFromDrive', function() {
    if (!COLLECTION_TEST_DATA.testEnvironmentReady) {
      throw new Error('Test environment not ready');
    }
    
    // Create collection file with test data
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
    
    const testFile = DriveApp.getFolderById(COLLECTION_TEST_DATA.testFolderId).createFile(
      'testDataCollection.json',
      JSON.stringify(testData, null, 2),
      'application/json'
    );
    COLLECTION_TEST_DATA.createdFileIds.push(testFile.getId());
    
    const collection = new Collection(
      'dataTestCollection',
      testFile.getId(),
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Trigger data loading
    const documents = collection.find({});
    TestFramework.assertEquals(2, documents.length, 'Should load 2 documents from file');
    TestFramework.assertEquals('Test Doc 1', documents[0].name, 'First document should match file data');
    
    const metadata = collection.getMetadata();
    TestFramework.assertEquals(2, metadata.documentCount, 'Metadata document count should match file data');
  });
  
  // 4. Corrupted File Handling Tests
  suite.addTest('testCollectionLoadDataCorruptedFile', function() {
    if (!COLLECTION_TEST_DATA.testEnvironmentReady) {
      throw new Error('Test environment not ready');
    }
    
    // Create collection file with corrupted JSON
    const corruptedFile = DriveApp.getFolderById(COLLECTION_TEST_DATA.testFolderId).createFile(
      'corruptedCollection.json',
      '{ "invalid": json data }',
      'application/json'
    );
    COLLECTION_TEST_DATA.createdFileIds.push(corruptedFile.getId());
    
    const collection = new Collection(
      'corruptedTestCollection',
      corruptedFile.getId(),
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Should handle corrupted file gracefully
    TestFramework.assertThrows(() => {
      collection.find({});
    }, OperationError, 'Should throw OperationError for corrupted file');
  });
  
  // 5. Data Saving Tests
  suite.addTest('testCollectionSaveDataToDrive', function() {
    if (!COLLECTION_TEST_DATA.testEnvironmentReady) {
      throw new Error('Test environment not ready');
    }
    
    const collection = new Collection(
      'saveTestCollection',
      COLLECTION_TEST_DATA.testCollectionFileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert a document to make collection dirty
    const result = collection.insertOne({ name: 'Test Save Doc', value: 500 });
    TestFramework.assertTrue(collection.isDirty(), 'Collection should be dirty after insert');
    
    // Save to Drive
    collection.save();
    TestFramework.assertFalse(collection.isDirty(), 'Collection should not be dirty after save');
    
    // Verify file content was updated
    const fileContent = COLLECTION_TEST_DATA.testFileService.readFile(COLLECTION_TEST_DATA.testCollectionFileId);
    const data = JSON.parse(fileContent);
    TestFramework.assertEquals(1, data.metadata.documentCount, 'File should show updated document count');
    TestFramework.assertNotNull(data.documents[result.insertedId], 'File should contain inserted document');
  });
  
  // 6. Insert Operations Tests
  suite.addTest('testCollectionInsertOne', function() {
    if (!COLLECTION_TEST_DATA.testEnvironmentReady) {
      throw new Error('Test environment not ready');
    }
    
    const collection = new Collection(
      'insertTestCollection',
      COLLECTION_TEST_DATA.testCollectionFileId,
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
    
    // Verify document was actually inserted
    const foundDoc = collection.findOne({ _id: result.insertedId });
    TestFramework.assertNotNull(foundDoc, 'Inserted document should be findable');
    TestFramework.assertEquals(testDoc.name, foundDoc.name, 'Document name should match');
    TestFramework.assertEquals(result.insertedId, foundDoc._id, 'Document ID should match result');
  });
  
  // 7. Insert with Explicit ID Tests
  suite.addTest('testCollectionInsertOneWithExplicitId', function() {
    if (!COLLECTION_TEST_DATA.testEnvironmentReady) {
      throw new Error('Test environment not ready');
    }
    
    const collection = new Collection(
      'insertExplicitIdTestCollection',
      COLLECTION_TEST_DATA.testCollectionFileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    const testDoc = { _id: 'explicit-id-123', name: 'Explicit ID Doc', value: 400 };
    const result = collection.insertOne(testDoc);
    
    TestFramework.assertEquals('explicit-id-123', result.insertedId, 'Should use provided ID');
    TestFramework.assertTrue(result.acknowledged, 'Operation should be acknowledged');
    
    // Verify document was inserted with correct ID
    const foundDoc = collection.findOne({ _id: 'explicit-id-123' });
    TestFramework.assertNotNull(foundDoc, 'Document should be findable by explicit ID');
    TestFramework.assertEquals('Explicit ID Doc', foundDoc.name, 'Document content should match');
    
    // Test duplicate ID error
    TestFramework.assertThrows(() => {
      collection.insertOne({ _id: 'explicit-id-123', name: 'Duplicate' });
    }, ConflictError, 'Should throw ConflictError for duplicate ID');
  });
  
  // 8. FindOne Empty Collection Tests
  suite.addTest('testCollectionFindOneEmpty', function() {
    if (!COLLECTION_TEST_DATA.testEnvironmentReady) {
      throw new Error('Test environment not ready');
    }
    
    const collection = new Collection(
      'findOneEmptyTestCollection',
      COLLECTION_TEST_DATA.testCollectionFileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Test findOne on empty collection
    const result = collection.findOne({});
    TestFramework.assertNull(result, 'findOne on empty collection should return null');
    
    const resultById = collection.findOne({ _id: 'nonexistent' });
    TestFramework.assertNull(resultById, 'findOne with nonexistent ID should return null');
  });
  
  // 9. FindOne by ID Tests
  suite.addTest('testCollectionFindOneById', function() {
    if (!COLLECTION_TEST_DATA.testEnvironmentReady) {
      throw new Error('Test environment not ready');
    }
    
    const collection = new Collection(
      'findOneByIdTestCollection',
      COLLECTION_TEST_DATA.testCollectionFileId,
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
    TestFramework.assertEquals(doc1.insertedId, foundDoc1._id, 'Document ID should match');
    
    const foundDoc2 = collection.findOne({ _id: doc2.insertedId });
    TestFramework.assertEquals('Second Doc', foundDoc2.name, 'Should return correct second document');
    
    // Test findOne with empty filter (should return first document)
    const firstDoc = collection.findOne({});
    TestFramework.assertNotNull(firstDoc, 'findOne with empty filter should return a document');
    TestFramework.assertTrue(
      firstDoc._id === doc1.insertedId || firstDoc._id === doc2.insertedId,
      'Should return one of the inserted documents'
    );
  });
  
  // 10. FindOne Unsupported Query Tests
  suite.addTest('testCollectionFindOneUnsupportedQuery', function() {
    if (!COLLECTION_TEST_DATA.testEnvironmentReady) {
      throw new Error('Test environment not ready');
    }
    
    const collection = new Collection(
      'findOneUnsupportedTestCollection',
      COLLECTION_TEST_DATA.testCollectionFileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Test unsupported field-based query
    TestFramework.assertThrows(() => {
      collection.findOne({ name: 'Test' });
    }, OperationError, 'Should throw OperationError for field-based query');
    
    // Test unsupported comparison operator
    TestFramework.assertThrows(() => {
      collection.findOne({ value: { $gt: 100 } });
    }, OperationError, 'Should throw OperationError for comparison operators');
    
    // Verify error message mentions Section 6
    try {
      collection.findOne({ name: 'Test' });
      TestFramework.fail('Should have thrown OperationError');
    } catch (error) {
      TestFramework.assertTrue(
        error.message.includes('Section 6 Query Engine'),
        'Error message should mention Section 6 Query Engine'
      );
    }
  });
  
  // 11. Find Empty Collection Tests
  suite.addTest('testCollectionFindEmpty', function() {
    if (!COLLECTION_TEST_DATA.testEnvironmentReady) {
      throw new Error('Test environment not ready');
    }
    
    const collection = new Collection(
      'findEmptyTestCollection',
      COLLECTION_TEST_DATA.testCollectionFileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Test find on empty collection
    const results = collection.find({});
    TestFramework.assertArrayEquals([], results, 'find on empty collection should return empty array');
    TestFramework.assertTrue(Array.isArray(results), 'find should always return an array');
  });
  
  // 12. Find All Documents Tests
  suite.addTest('testCollectionFindAll', function() {
    if (!COLLECTION_TEST_DATA.testEnvironmentReady) {
      throw new Error('Test environment not ready');
    }
    
    const collection = new Collection(
      'findAllTestCollection',
      COLLECTION_TEST_DATA.testCollectionFileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert multiple test documents
    const docs = [
      { name: 'Doc A', value: 100, category: 'test' },
      { name: 'Doc B', value: 200, category: 'prod' },
      { name: 'Doc C', value: 300, category: 'test' }
    ];
    
    const insertedIds = docs.map(doc => collection.insertOne(doc).insertedId);
    
    // Test find all documents
    const allDocs = collection.find({});
    TestFramework.assertEquals(3, allDocs.length, 'Should find all 3 documents');
    TestFramework.assertTrue(Array.isArray(allDocs), 'find should return an array');
    
    // Verify all documents are present
    const foundIds = allDocs.map(doc => doc._id).sort();
    const expectedIds = insertedIds.sort();
    TestFramework.assertArrayEquals(expectedIds, foundIds, 'Should find all inserted document IDs');
    
    // Verify document content
    const docA = allDocs.find(doc => doc.name === 'Doc A');
    TestFramework.assertNotNull(docA, 'Should find Doc A');
    TestFramework.assertEquals(100, docA.value, 'Doc A should have correct value');
  });
  
  // 13. Find Unsupported Query Tests
  suite.addTest('testCollectionFindUnsupportedQuery', function() {
    if (!COLLECTION_TEST_DATA.testEnvironmentReady) {
      throw new Error('Test environment not ready');
    }
    
    const collection = new Collection(
      'findUnsupportedTestCollection',
      COLLECTION_TEST_DATA.testCollectionFileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Test unsupported field-based query
    TestFramework.assertThrows(() => {
      collection.find({ name: 'Test' });
    }, OperationError, 'Should throw OperationError for field-based query in find');
    
    // Test unsupported comparison operator
    TestFramework.assertThrows(() => {
      collection.find({ value: { $gte: 100 } });
    }, OperationError, 'Should throw OperationError for comparison operators in find');
    
    // Verify error message mentions Section 6
    try {
      collection.find({ category: 'test' });
      TestFramework.fail('Should have thrown OperationError');
    } catch (error) {
      TestFramework.assertTrue(
        error.message.includes('Section 6 Query Engine'),
        'Error message should mention Section 6 Query Engine for find'
      );
    }
  });
  
  // 14. UpdateOne by ID Tests
  suite.addTest('testCollectionUpdateOneById', function() {
    if (!COLLECTION_TEST_DATA.testEnvironmentReady) {
      throw new Error('Test environment not ready');
    }
    
    const collection = new Collection(
      'updateOneByIdTestCollection',
      COLLECTION_TEST_DATA.testCollectionFileId,
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
    TestFramework.assertTrue(updateResult.hasOwnProperty('matchedCount'), 'Result should have matchedCount');
    TestFramework.assertTrue(updateResult.hasOwnProperty('modifiedCount'), 'Result should have modifiedCount');
    TestFramework.assertTrue(updateResult.hasOwnProperty('acknowledged'), 'Result should have acknowledged');
    TestFramework.assertEquals(1, updateResult.matchedCount, 'Should match 1 document');
    TestFramework.assertEquals(1, updateResult.modifiedCount, 'Should modify 1 document');
    TestFramework.assertTrue(updateResult.acknowledged, 'Operation should be acknowledged');
    
    // Verify document was actually updated
    const updatedDoc = collection.findOne({ _id: docId });
    TestFramework.assertNotNull(updatedDoc, 'Updated document should still exist');
    TestFramework.assertEquals('Updated Doc', updatedDoc.name, 'Document name should be updated');
    TestFramework.assertEquals(150, updatedDoc.value, 'Document value should be updated');
    TestFramework.assertEquals('added', updatedDoc.newField, 'New field should be added');
    
    // Test updateOne with nonexistent ID
    const noMatchResult = collection.updateOne({ _id: 'nonexistent' }, { name: 'No Match' });
    TestFramework.assertEquals(0, noMatchResult.matchedCount, 'Should match 0 documents for nonexistent ID');
    TestFramework.assertEquals(0, noMatchResult.modifiedCount, 'Should modify 0 documents for nonexistent ID');
  });
  
  // 15. UpdateOne Unsupported Filter Tests
  suite.addTest('testCollectionUpdateOneUnsupportedFilter', function() {
    if (!COLLECTION_TEST_DATA.testEnvironmentReady) {
      throw new Error('Test environment not ready');
    }
    
    const collection = new Collection(
      'updateOneUnsupportedFilterTestCollection',
      COLLECTION_TEST_DATA.testCollectionFileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Test unsupported field-based filter
    TestFramework.assertThrows(() => {
      collection.updateOne({ name: 'Test' }, { name: 'Updated' });
    }, OperationError, 'Should throw OperationError for field-based filter in updateOne');
    
    // Test unsupported comparison operator in filter
    TestFramework.assertThrows(() => {
      collection.updateOne({ value: { $gt: 100 } }, { status: 'updated' });
    }, OperationError, 'Should throw OperationError for comparison operators in updateOne filter');
    
    // Verify error message mentions Section 6
    try {
      collection.updateOne({ status: 'active' }, { status: 'inactive' });
      TestFramework.fail('Should have thrown OperationError');
    } catch (error) {
      TestFramework.assertTrue(
        error.message.includes('Section 6 Query Engine'),
        'Error message should mention Section 6 Query Engine for updateOne filter'
      );
    }
  });
  
  // 16. UpdateOne Unsupported Operators Tests
  suite.addTest('testCollectionUpdateOneUnsupportedOperators', function() {
    if (!COLLECTION_TEST_DATA.testEnvironmentReady) {
      throw new Error('Test environment not ready');
    }
    
    const collection = new Collection(
      'updateOneUnsupportedOperatorsTestCollection',
      COLLECTION_TEST_DATA.testCollectionFileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test document
    const insertResult = collection.insertOne({ name: 'Test Doc', value: 100 });
    const docId = insertResult.insertedId;
    
    // Test unsupported $set operator
    TestFramework.assertThrows(() => {
      collection.updateOne({ _id: docId }, { $set: { name: 'Updated' } });
    }, OperationError, 'Should throw OperationError for $set operator');
    
    // Test unsupported $inc operator
    TestFramework.assertThrows(() => {
      collection.updateOne({ _id: docId }, { $inc: { value: 50 } });
    }, OperationError, 'Should throw OperationError for $inc operator');
    
    // Verify error message mentions Section 7
    try {
      collection.updateOne({ _id: docId }, { $unset: { value: 1 } });
      TestFramework.fail('Should have thrown OperationError');
    } catch (error) {
      TestFramework.assertTrue(
        error.message.includes('Section 7 Update Engine'),
        'Error message should mention Section 7 Update Engine for update operators'
      );
    }
  });
  
  // 17. DeleteOne by ID Tests
  suite.addTest('testCollectionDeleteOneById', function() {
    if (!COLLECTION_TEST_DATA.testEnvironmentReady) {
      throw new Error('Test environment not ready');
    }
    
    const collection = new Collection(
      'deleteOneByIdTestCollection',
      COLLECTION_TEST_DATA.testCollectionFileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test documents
    const doc1 = collection.insertOne({ name: 'Delete Doc 1', value: 100 });
    const doc2 = collection.insertOne({ name: 'Delete Doc 2', value: 200 });
    
    // Test deleteOne by ID
    const deleteResult = collection.deleteOne({ _id: doc1.insertedId });
    
    // Verify MongoDB-compatible return format
    TestFramework.assertTrue(deleteResult.hasOwnProperty('deletedCount'), 'Result should have deletedCount');
    TestFramework.assertTrue(deleteResult.hasOwnProperty('acknowledged'), 'Result should have acknowledged');
    TestFramework.assertEquals(1, deleteResult.deletedCount, 'Should delete 1 document');
    TestFramework.assertTrue(deleteResult.acknowledged, 'Operation should be acknowledged');
    
    // Verify document was actually deleted
    const deletedDoc = collection.findOne({ _id: doc1.insertedId });
    TestFramework.assertNull(deletedDoc, 'Deleted document should not be findable');
    
    // Verify other document still exists
    const remainingDoc = collection.findOne({ _id: doc2.insertedId });
    TestFramework.assertNotNull(remainingDoc, 'Non-deleted document should still exist');
    TestFramework.assertEquals('Delete Doc 2', remainingDoc.name, 'Remaining document should be unchanged');
    
    // Test deleteOne with nonexistent ID
    const noMatchResult = collection.deleteOne({ _id: 'nonexistent' });
    TestFramework.assertEquals(0, noMatchResult.deletedCount, 'Should delete 0 documents for nonexistent ID');
    TestFramework.assertTrue(noMatchResult.acknowledged, 'Operation should still be acknowledged');
  });
  
  // 18. DeleteOne Unsupported Filter Tests
  suite.addTest('testCollectionDeleteOneUnsupportedFilter', function() {
    if (!COLLECTION_TEST_DATA.testEnvironmentReady) {
      throw new Error('Test environment not ready');
    }
    
    const collection = new Collection(
      'deleteOneUnsupportedFilterTestCollection',
      COLLECTION_TEST_DATA.testCollectionFileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Test unsupported field-based filter
    TestFramework.assertThrows(() => {
      collection.deleteOne({ name: 'Test' });
    }, OperationError, 'Should throw OperationError for field-based filter in deleteOne');
    
    // Test unsupported comparison operator in filter
    TestFramework.assertThrows(() => {
      collection.deleteOne({ value: { $lt: 100 } });
    }, OperationError, 'Should throw OperationError for comparison operators in deleteOne');
    
    // Verify error message mentions Section 6
    try {
      collection.deleteOne({ status: 'inactive' });
      TestFramework.fail('Should have thrown OperationError');
    } catch (error) {
      TestFramework.assertTrue(
        error.message.includes('Section 6 Query Engine'),
        'Error message should mention Section 6 Query Engine for deleteOne filter'
      );
    }
  });
  
  // 19. CountDocuments All Tests
  suite.addTest('testCollectionCountDocumentsAll', function() {
    if (!COLLECTION_TEST_DATA.testEnvironmentReady) {
      throw new Error('Test environment not ready');
    }
    
    const collection = new Collection(
      'countDocumentsAllTestCollection',
      COLLECTION_TEST_DATA.testCollectionFileId,
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
    
    // Test count with explicit empty filter
    count = collection.countDocuments();
    TestFramework.assertEquals(3, count, 'countDocuments with no parameters should count all documents');
    
    // Delete one document and recount
    const docs = collection.find({});
    collection.deleteOne({ _id: docs[0]._id });
    count = collection.countDocuments({});
    TestFramework.assertEquals(2, count, 'Collection should have count 2 after 1 delete');
  });
  
  // 20. CountDocuments Unsupported Filter Tests
  suite.addTest('testCollectionCountDocumentsUnsupportedFilter', function() {
    if (!COLLECTION_TEST_DATA.testEnvironmentReady) {
      throw new Error('Test environment not ready');
    }
    
    const collection = new Collection(
      'countDocumentsUnsupportedFilterTestCollection',
      COLLECTION_TEST_DATA.testCollectionFileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Test unsupported field-based filter
    TestFramework.assertThrows(() => {
      collection.countDocuments({ name: 'Test' });
    }, OperationError, 'Should throw OperationError for field-based filter in countDocuments');
    
    // Test unsupported comparison operator
    TestFramework.assertThrows(() => {
      collection.countDocuments({ value: { $gte: 100 } });
    }, OperationError, 'Should throw OperationError for comparison operators in countDocuments');
    
    // Verify error message mentions Section 6
    try {
      collection.countDocuments({ status: 'active' });
      TestFramework.fail('Should have thrown OperationError');
    } catch (error) {
      TestFramework.assertTrue(
        error.message.includes('Section 6 Query Engine'),
        'Error message should mention Section 6 Query Engine for countDocuments filter'
      );
    }
  });
  
  return suite;
}

// Register Collection test suite for execution
registerTestSuite(createCollectionTestSuite());
