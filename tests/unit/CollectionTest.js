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
  
  // RED PHASE: Collection API Enhancement Tests - Field-based queries
  suite.addTest('testCollectionFindByFieldMatching', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    const collection = new Collection(
      'findByFieldTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test documents with various field types
    collection.insertOne({ name: 'Alice', age: 30, active: true, department: 'Engineering' });
    collection.insertOne({ name: 'Bob', age: 25, active: false, department: 'Marketing' });
    collection.insertOne({ name: 'Charlie', age: 30, active: true, department: 'Engineering' });
    
    // Act & Assert - Should find documents by exact field match
    const engineeringDocs = collection.find({ department: 'Engineering' });
    TestFramework.assertEquals(2, engineeringDocs.length, 'Should find 2 Engineering documents');
    TestFramework.assertEquals('Alice', engineeringDocs[0].name, 'First result should be Alice');
    TestFramework.assertEquals('Charlie', engineeringDocs[1].name, 'Second result should be Charlie');
    
    // Test numeric field matching
    const age30Docs = collection.find({ age: 30 });
    TestFramework.assertEquals(2, age30Docs.length, 'Should find 2 documents with age 30');
    
    // Test boolean field matching
    const activeDocs = collection.find({ active: true });
    TestFramework.assertEquals(2, activeDocs.length, 'Should find 2 active documents');
  });
  
  suite.addTest('testCollectionFindByMultipleFields', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    const collection = new Collection(
      'findMultiFieldTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test documents
    collection.insertOne({ name: 'Alice', age: 30, active: true, department: 'Engineering' });
    collection.insertOne({ name: 'Bob', age: 30, active: false, department: 'Engineering' });
    collection.insertOne({ name: 'Charlie', age: 25, active: true, department: 'Engineering' });
    
    // Act & Assert - Should find documents matching multiple fields (implicit AND)
    const results = collection.find({ age: 30, active: true, department: 'Engineering' });
    TestFramework.assertEquals(1, results.length, 'Should find 1 document matching all criteria');
    TestFramework.assertEquals('Alice', results[0].name, 'Should find Alice');
  });
  
  suite.addTest('testCollectionFindByNestedField', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    const collection = new Collection(
      'findNestedFieldTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert documents with nested fields
    collection.insertOne({ 
      name: 'Alice', 
      profile: { email: 'alice@company.com', yearsOfService: 5 },
      address: { city: 'London', country: 'UK' }
    });
    collection.insertOne({ 
      name: 'Bob', 
      profile: { email: 'bob@company.com', yearsOfService: 3 },
      address: { city: 'Manchester', country: 'UK' }
    });
    
    // Act & Assert - Should find documents by nested field (dot notation)
    const londonDocs = collection.find({ 'address.city': 'London' });
    TestFramework.assertEquals(1, londonDocs.length, 'Should find 1 document in London');
    TestFramework.assertEquals('Alice', londonDocs[0].name, 'Should find Alice');
    
    // Test nested numeric field
    const experiencedDocs = collection.find({ 'profile.yearsOfService': 5 });
    TestFramework.assertEquals(1, experiencedDocs.length, 'Should find 1 experienced document');
    TestFramework.assertEquals('Alice', experiencedDocs[0].name, 'Should find Alice');
  });
  
  suite.addTest('testCollectionFindByComparisonOperators', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    const collection = new Collection(
      'findComparisonTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test documents with numeric values
    collection.insertOne({ name: 'Alice', score: 85, joinDate: new Date('2020-01-15') });
    collection.insertOne({ name: 'Bob', score: 92, joinDate: new Date('2021-03-20') });
    collection.insertOne({ name: 'Charlie', score: 78, joinDate: new Date('2019-11-10') });
    
    // Act & Assert - Should find documents using comparison operators
    const highScoreDocs = collection.find({ score: { $gt: 80 } });
    TestFramework.assertEquals(2, highScoreDocs.length, 'Should find 2 documents with score > 80');
    
    const lowScoreDocs = collection.find({ score: { $lt: 80 } });
    TestFramework.assertEquals(1, lowScoreDocs.length, 'Should find 1 document with score < 80');
    TestFramework.assertEquals('Charlie', lowScoreDocs[0].name, 'Should find Charlie');
    
    // Test date comparison
    const recentDocs = collection.find({ joinDate: { $gt: new Date('2020-06-01') } });
    TestFramework.assertEquals(1, recentDocs.length, 'Should find 1 document with recent join date');
    TestFramework.assertEquals('Bob', recentDocs[0].name, 'Should find Bob');
  });
  
  suite.addTest('testCollectionFindOneByFieldMatching', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    const collection = new Collection(
      'findOneFieldTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test documents
    collection.insertOne({ name: 'Alice', department: 'Engineering', priority: 1 });
    collection.insertOne({ name: 'Bob', department: 'Engineering', priority: 2 });
    collection.insertOne({ name: 'Charlie', department: 'Marketing', priority: 1 });
    
    // Act & Assert - Should find first matching document
    const engineeringDoc = collection.findOne({ department: 'Engineering' });
    TestFramework.assertNotNull(engineeringDoc, 'Should find an Engineering document');
    TestFramework.assertEquals('Engineering', engineeringDoc.department, 'Should return Engineering document');
    TestFramework.assertTrue(['Alice', 'Bob'].includes(engineeringDoc.name), 'Should be Alice or Bob');
    
    // Test findOne with multiple field criteria
    const specificDoc = collection.findOne({ department: 'Engineering', priority: 2 });
    TestFramework.assertNotNull(specificDoc, 'Should find specific document');
    TestFramework.assertEquals('Bob', specificDoc.name, 'Should find Bob');
    
    // Test findOne that returns null
    const nonExistentDoc = collection.findOne({ department: 'NonExistent' });
    TestFramework.assertNull(nonExistentDoc, 'Should return null for non-existent criteria');
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
  
  // RED PHASE: Collection API Enhancement Tests - Field-based update filters
  suite.addTest('testCollectionUpdateOneByFieldFilter', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    const collection = new Collection(
      'updateFieldFilterTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test documents
    collection.insertOne({ name: 'Alice', department: 'Engineering', salary: 75000 });
    collection.insertOne({ name: 'Bob', department: 'Marketing', salary: 65000 });
    collection.insertOne({ name: 'Charlie', department: 'Engineering', salary: 80000 });
    
    // Act & Assert - Should update first matching document by field filter
    const updateResult = collection.updateOne(
      { department: 'Engineering' },
      { name: 'Alice Updated', department: 'Engineering', salary: 85000 }
    );
    
    // Verify MongoDB-compatible return format
    TestFramework.assertEquals(1, updateResult.matchedCount, 'Should match 1 document');
    TestFramework.assertEquals(1, updateResult.modifiedCount, 'Should modify 1 document');
    TestFramework.assertTrue(updateResult.acknowledged, 'Operation should be acknowledged');
    
    // Verify only first matching document was updated
    const engineeringDocs = collection.find({ department: 'Engineering' });
    TestFramework.assertEquals(2, engineeringDocs.length, 'Should still have 2 Engineering docs');
    
    const updatedDoc = engineeringDocs.find(doc => doc.name === 'Alice Updated');
    TestFramework.assertNotNull(updatedDoc, 'Should find updated Alice document');
    TestFramework.assertEquals(85000, updatedDoc.salary, 'Salary should be updated');
  });
  
  suite.addTest('testCollectionUpdateOneByMultipleFieldFilter', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    const collection = new Collection(
      'updateMultiFieldFilterTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test documents
    collection.insertOne({ name: 'Alice', department: 'Engineering', level: 'Senior', active: true });
    collection.insertOne({ name: 'Bob', department: 'Engineering', level: 'Junior', active: true });
    collection.insertOne({ name: 'Charlie', department: 'Engineering', level: 'Senior', active: false });
    
    // Act & Assert - Should update document matching multiple field criteria
    const updateResult = collection.updateOne(
      { department: 'Engineering', level: 'Senior', active: true },
      { name: 'Alice Promoted', department: 'Engineering', level: 'Principal', active: true }
    );
    
    TestFramework.assertEquals(1, updateResult.matchedCount, 'Should match 1 document with all criteria');
    TestFramework.assertEquals(1, updateResult.modifiedCount, 'Should modify 1 document');
    
    // Verify correct document was updated
    const promotedDoc = collection.findOne({ level: 'Principal' });
    TestFramework.assertNotNull(promotedDoc, 'Should find promoted document');
    TestFramework.assertEquals('Alice Promoted', promotedDoc.name, 'Should be updated Alice');
  });
  
  suite.addTest('testCollectionUpdateOneByNestedFieldFilter', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    const collection = new Collection(
      'updateNestedFieldFilterTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert documents with nested fields
    collection.insertOne({ 
      name: 'Alice', 
      profile: { email: 'alice@company.com', team: 'Backend' },
      metadata: { lastLogin: new Date('2023-01-15') }
    });
    collection.insertOne({ 
      name: 'Bob', 
      profile: { email: 'bob@company.com', team: 'Frontend' },
      metadata: { lastLogin: new Date('2023-01-20') }
    });
    
    // Act & Assert - Should update document by nested field filter
    const updateResult = collection.updateOne(
      { 'profile.team': 'Backend' },
      { 
        name: 'Alice Backend Lead', 
        profile: { email: 'alice.lead@company.com', team: 'Backend' },
        metadata: { lastLogin: new Date() }
      }
    );
    
    TestFramework.assertEquals(1, updateResult.matchedCount, 'Should match 1 Backend document');
    TestFramework.assertEquals(1, updateResult.modifiedCount, 'Should modify 1 document');
    
    // Verify correct document was updated
    const updatedDoc = collection.findOne({ 'profile.email': 'alice.lead@company.com' });
    TestFramework.assertNotNull(updatedDoc, 'Should find updated document');
    TestFramework.assertEquals('Alice Backend Lead', updatedDoc.name, 'Should be updated Alice');
  });
  
  suite.addTest('testCollectionUpdateOneByComparisonFilter', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    const collection = new Collection(
      'updateComparisonFilterTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test documents with numeric values
    collection.insertOne({ name: 'Alice', score: 85, bonus: 1000 });
    collection.insertOne({ name: 'Bob', score: 92, bonus: 1500 });
    collection.insertOne({ name: 'Charlie', score: 78, bonus: 800 });
    
    // Act & Assert - Should update first document matching comparison filter
    const updateResult = collection.updateOne(
      { score: { $gt: 90 } },
      { name: 'Bob High Performer', score: 92, bonus: 2000 }
    );
    
    TestFramework.assertEquals(1, updateResult.matchedCount, 'Should match 1 high-score document');
    TestFramework.assertEquals(1, updateResult.modifiedCount, 'Should modify 1 document');
    
    // Verify correct document was updated
    const updatedDoc = collection.findOne({ bonus: 2000 });
    TestFramework.assertNotNull(updatedDoc, 'Should find updated document');
    TestFramework.assertEquals('Bob High Performer', updatedDoc.name, 'Should be updated Bob');
  });
  
  suite.addTest('testCollectionUpdateOneNoMatch', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    const collection = new Collection(
      'updateNoMatchTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test documents
    collection.insertOne({ name: 'Alice', department: 'Engineering' });
    collection.insertOne({ name: 'Bob', department: 'Marketing' });
    
    // Act & Assert - Should return zero matches when filter matches no documents
    const updateResult = collection.updateOne(
      { department: 'NonExistent' },
      { name: 'Updated', department: 'NonExistent' }
    );
    
    TestFramework.assertEquals(0, updateResult.matchedCount, 'Should match 0 documents');
    TestFramework.assertEquals(0, updateResult.modifiedCount, 'Should modify 0 documents');
    TestFramework.assertTrue(updateResult.acknowledged, 'Operation should still be acknowledged');
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
  
  // RED PHASE: Collection API Enhancement Tests - Field-based delete filters
  suite.addTest('testCollectionDeleteOneByFieldFilter', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    const collection = new Collection(
      'deleteFieldFilterTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test documents
    collection.insertOne({ name: 'Alice', department: 'Engineering', status: 'active' });
    collection.insertOne({ name: 'Bob', department: 'Marketing', status: 'active' });
    collection.insertOne({ name: 'Charlie', department: 'Engineering', status: 'inactive' });
    
    // Act & Assert - Should delete first matching document by field filter
    const deleteResult = collection.deleteOne({ department: 'Engineering' });
    
    // Verify MongoDB-compatible return format
    TestFramework.assertEquals(1, deleteResult.deletedCount, 'Should delete 1 document');
    TestFramework.assertTrue(deleteResult.acknowledged, 'Operation should be acknowledged');
    
    // Verify correct document was deleted (one Engineering doc should remain)
    const remainingDocs = collection.find({});
    TestFramework.assertEquals(2, remainingDocs.length, 'Should have 2 documents remaining');
    
    const engineeringDocs = collection.find({ department: 'Engineering' });
    TestFramework.assertEquals(1, engineeringDocs.length, 'Should have 1 Engineering document remaining');
  });
  
  suite.addTest('testCollectionDeleteOneByMultipleFieldFilter', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    const collection = new Collection(
      'deleteMultiFieldFilterTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test documents
    collection.insertOne({ name: 'Alice', department: 'Engineering', status: 'active', level: 'Senior' });
    collection.insertOne({ name: 'Bob', department: 'Engineering', status: 'inactive', level: 'Senior' });
    collection.insertOne({ name: 'Charlie', department: 'Engineering', status: 'active', level: 'Junior' });
    
    // Act & Assert - Should delete document matching multiple field criteria
    const deleteResult = collection.deleteOne({ 
      department: 'Engineering', 
      status: 'active', 
      level: 'Senior' 
    });
    
    TestFramework.assertEquals(1, deleteResult.deletedCount, 'Should delete 1 document matching all criteria');
    TestFramework.assertTrue(deleteResult.acknowledged, 'Operation should be acknowledged');
    
    // Verify correct document was deleted
    const remainingDocs = collection.find({ department: 'Engineering' });
    TestFramework.assertEquals(2, remainingDocs.length, 'Should have 2 Engineering documents remaining');
    
    const activeEngineerDocs = collection.find({ department: 'Engineering', status: 'active' });
    TestFramework.assertEquals(1, activeEngineerDocs.length, 'Should have 1 active Engineering document remaining');
    TestFramework.assertEquals('Charlie', activeEngineerDocs[0].name, 'Charlie should remain');
  });
  
  suite.addTest('testCollectionDeleteOneByNestedFieldFilter', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    const collection = new Collection(
      'deleteNestedFieldFilterTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert documents with nested fields
    collection.insertOne({ 
      name: 'Alice', 
      profile: { email: 'alice@company.com', team: 'Backend' },
      settings: { notifications: true }
    });
    collection.insertOne({ 
      name: 'Bob', 
      profile: { email: 'bob@company.com', team: 'Frontend' },
      settings: { notifications: false }
    });
    collection.insertOne({ 
      name: 'Charlie', 
      profile: { email: 'charlie@company.com', team: 'Backend' },
      settings: { notifications: true }
    });
    
    // Act & Assert - Should delete document by nested field filter
    const deleteResult = collection.deleteOne({ 'profile.team': 'Frontend' });
    
    TestFramework.assertEquals(1, deleteResult.deletedCount, 'Should delete 1 Frontend document');
    TestFramework.assertTrue(deleteResult.acknowledged, 'Operation should be acknowledged');
    
    // Verify correct document was deleted
    const remainingDocs = collection.find({});
    TestFramework.assertEquals(2, remainingDocs.length, 'Should have 2 documents remaining');
    
    const frontendDocs = collection.find({ 'profile.team': 'Frontend' });
    TestFramework.assertEquals(0, frontendDocs.length, 'Should have no Frontend documents remaining');
  });
  
  suite.addTest('testCollectionDeleteOneByComparisonFilter', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    const collection = new Collection(
      'deleteComparisonFilterTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test documents with numeric values
    collection.insertOne({ name: 'Alice', score: 85, lastActive: new Date('2023-01-15') });
    collection.insertOne({ name: 'Bob', score: 92, lastActive: new Date('2023-01-20') });
    collection.insertOne({ name: 'Charlie', score: 78, lastActive: new Date('2023-01-10') });
    
    // Act & Assert - Should delete first document matching comparison filter
    const deleteResult = collection.deleteOne({ score: { $lt: 80 } });
    
    TestFramework.assertEquals(1, deleteResult.deletedCount, 'Should delete 1 low-score document');
    TestFramework.assertTrue(deleteResult.acknowledged, 'Operation should be acknowledged');
    
    // Verify correct document was deleted
    const remainingDocs = collection.find({});
    TestFramework.assertEquals(2, remainingDocs.length, 'Should have 2 documents remaining');
    
    const lowScoreDocs = collection.find({ score: { $lt: 80 } });
    TestFramework.assertEquals(0, lowScoreDocs.length, 'Should have no low-score documents remaining');
  });
  
  suite.addTest('testCollectionDeleteOneNoMatch', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    const collection = new Collection(
      'deleteNoMatchTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test documents
    collection.insertOne({ name: 'Alice', department: 'Engineering' });
    collection.insertOne({ name: 'Bob', department: 'Marketing' });
    
    // Act & Assert - Should return zero deletions when filter matches no documents
    const deleteResult = collection.deleteOne({ department: 'NonExistent' });
    
    TestFramework.assertEquals(0, deleteResult.deletedCount, 'Should delete 0 documents');
    TestFramework.assertTrue(deleteResult.acknowledged, 'Operation should still be acknowledged');
    
    // Verify no documents were deleted
    const remainingDocs = collection.find({});
    TestFramework.assertEquals(2, remainingDocs.length, 'Should still have 2 documents');
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
  
  // RED PHASE: Collection API Enhancement Tests - Field-based count filters
  suite.addTest('testCollectionCountDocumentsByFieldFilter', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    const collection = new Collection(
      'countFieldFilterTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test documents
    collection.insertOne({ name: 'Alice', department: 'Engineering', status: 'active' });
    collection.insertOne({ name: 'Bob', department: 'Marketing', status: 'active' });
    collection.insertOne({ name: 'Charlie', department: 'Engineering', status: 'inactive' });
    collection.insertOne({ name: 'David', department: 'Engineering', status: 'active' });
    
    // Act & Assert - Should count documents by field filter
    const engineeringCount = collection.countDocuments({ department: 'Engineering' });
    TestFramework.assertEquals(3, engineeringCount, 'Should count 3 Engineering documents');
    
    const marketingCount = collection.countDocuments({ department: 'Marketing' });
    TestFramework.assertEquals(1, marketingCount, 'Should count 1 Marketing document');
    
    const activeCount = collection.countDocuments({ status: 'active' });
    TestFramework.assertEquals(3, activeCount, 'Should count 3 active documents');
    
    const inactiveCount = collection.countDocuments({ status: 'inactive' });
    TestFramework.assertEquals(1, inactiveCount, 'Should count 1 inactive document');
  });
  
  suite.addTest('testCollectionCountDocumentsByMultipleFieldFilter', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    const collection = new Collection(
      'countMultiFieldFilterTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test documents
    collection.insertOne({ name: 'Alice', department: 'Engineering', status: 'active', level: 'Senior' });
    collection.insertOne({ name: 'Bob', department: 'Engineering', status: 'inactive', level: 'Senior' });
    collection.insertOne({ name: 'Charlie', department: 'Engineering', status: 'active', level: 'Junior' });
    collection.insertOne({ name: 'David', department: 'Marketing', status: 'active', level: 'Senior' });
    
    // Act & Assert - Should count documents matching multiple field criteria
    const activeEngineeringCount = collection.countDocuments({ 
      department: 'Engineering', 
      status: 'active' 
    });
    TestFramework.assertEquals(2, activeEngineeringCount, 'Should count 2 active Engineering documents');
    
    const seniorActiveCount = collection.countDocuments({ 
      level: 'Senior', 
      status: 'active' 
    });
    TestFramework.assertEquals(2, seniorActiveCount, 'Should count 2 active Senior documents');
    
    const specificCount = collection.countDocuments({ 
      department: 'Engineering', 
      status: 'active', 
      level: 'Senior' 
    });
    TestFramework.assertEquals(1, specificCount, 'Should count 1 document matching all criteria');
  });
  
  suite.addTest('testCollectionCountDocumentsByNestedFieldFilter', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    const collection = new Collection(
      'countNestedFieldFilterTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert documents with nested fields
    collection.insertOne({ 
      name: 'Alice', 
      profile: { email: 'alice@company.com', team: 'Backend' },
      settings: { notifications: true }
    });
    collection.insertOne({ 
      name: 'Bob', 
      profile: { email: 'bob@company.com', team: 'Frontend' },
      settings: { notifications: false }
    });
    collection.insertOne({ 
      name: 'Charlie', 
      profile: { email: 'charlie@company.com', team: 'Backend' },
      settings: { notifications: true }
    });
    collection.insertOne({ 
      name: 'David', 
      profile: { email: 'david@company.com', team: 'DevOps' },
      settings: { notifications: true }
    });
    
    // Act & Assert - Should count documents by nested field filter
    const backendCount = collection.countDocuments({ 'profile.team': 'Backend' });
    TestFramework.assertEquals(2, backendCount, 'Should count 2 Backend documents');
    
    const frontendCount = collection.countDocuments({ 'profile.team': 'Frontend' });
    TestFramework.assertEquals(1, frontendCount, 'Should count 1 Frontend document');
    
    const notificationsCount = collection.countDocuments({ 'settings.notifications': true });
    TestFramework.assertEquals(3, notificationsCount, 'Should count 3 documents with notifications enabled');
  });
  
  suite.addTest('testCollectionCountDocumentsByComparisonFilter', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    const collection = new Collection(
      'countComparisonFilterTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test documents with numeric values
    collection.insertOne({ name: 'Alice', score: 85, experience: 5 });
    collection.insertOne({ name: 'Bob', score: 92, experience: 3 });
    collection.insertOne({ name: 'Charlie', score: 78, experience: 7 });
    collection.insertOne({ name: 'David', score: 88, experience: 2 });
    
    // Act & Assert - Should count documents using comparison filters
    const highScoreCount = collection.countDocuments({ score: { $gt: 85 } });
    TestFramework.assertEquals(2, highScoreCount, 'Should count 2 documents with score > 85');
    
    const lowScoreCount = collection.countDocuments({ score: { $lt: 80 } });
    TestFramework.assertEquals(1, lowScoreCount, 'Should count 1 document with score < 80');
    
    const experiencedCount = collection.countDocuments({ experience: { $gt: 4 } });
    TestFramework.assertEquals(2, experiencedCount, 'Should count 2 documents with experience > 4');
    
    const exactScoreCount = collection.countDocuments({ score: { $eq: 88 } });
    TestFramework.assertEquals(1, exactScoreCount, 'Should count 1 document with score = 88');
  });
  
  suite.addTest('testCollectionCountDocumentsNoMatch', function() {
    // Arrange
    const fileId = createTestCollectionFile();
    const collection = new Collection(
      'countNoMatchTestCollection',
      fileId,
      COLLECTION_TEST_DATA.testDatabase,
      COLLECTION_TEST_DATA.testFileService
    );
    
    // Insert test documents
    collection.insertOne({ name: 'Alice', department: 'Engineering' });
    collection.insertOne({ name: 'Bob', department: 'Marketing' });
    
    // Act & Assert - Should return zero count when filter matches no documents
    const nonExistentCount = collection.countDocuments({ department: 'NonExistent' });
    TestFramework.assertEquals(0, nonExistentCount, 'Should count 0 documents for non-existent department');
    
    const impossibleCount = collection.countDocuments({ score: { $gt: 1000 } });
    TestFramework.assertEquals(0, impossibleCount, 'Should count 0 documents for impossible criteria');
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
