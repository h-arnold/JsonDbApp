/**
 * DocumentOperationsTest.js - DocumentOperations Class Tests
 * 
 * Comprehensive tests for the DocumentOperations class including:
 * - Document CRUD operations (ID-based only initially)
 * - Document ID generation and validation
 * - Document structure validation
 * - Collection integration
 * 
 * Following TDD Red-Green-Refactor cycle for Section 5 implementation
 * Note: Filtering capabilities will be added in Section 6: Query Engine
 */

// Global test data storage for DocumentOperations tests
const DOCUMENT_OPERATIONS_TEST_DATA = {
  testFolderId: null,
  testFolderName: 'GASDB_DocumentOps_Test_Folder_' + new Date().getTime(),
  testCollectionFileId: null,
  testCollectionFileName: 'GASDB_DocumentOps_Test_Collection_' + new Date().getTime() + '.json',
  testCollection: null,
  testStartTime: null,
  testEnvironmentReady: false,
  createdFileIds: [],
  createdFolderIds: [],
  testCollectionData: {
    collection: 'documentOperationsTest',
    metadata: {
      version: 1,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      documentCount: 0
    },
    documents: {}
  }
};

/**
 * Setup DocumentOperations test environment with real Drive files
 */
function setupDocumentOperationsTestEnvironment() {
  const logger = GASDBLogger.createComponentLogger('DocumentOperations-Setup');
  
  try {
    logger.info('Setting up DocumentOperations test environment');
    DOCUMENT_OPERATIONS_TEST_DATA.testStartTime = new Date();
    
    // Create test folder in Drive
    const testFolder = DriveApp.createFolder(DOCUMENT_OPERATIONS_TEST_DATA.testFolderName);
    DOCUMENT_OPERATIONS_TEST_DATA.testFolderId = testFolder.getId();
    DOCUMENT_OPERATIONS_TEST_DATA.createdFolderIds.push(testFolder.getId());
    
    logger.debug('Created test folder', { 
      folderId: DOCUMENT_OPERATIONS_TEST_DATA.testFolderId,
      folderName: DOCUMENT_OPERATIONS_TEST_DATA.testFolderName
    });
    
    // Create test collection file
    const collectionContent = JSON.stringify(DOCUMENT_OPERATIONS_TEST_DATA.testCollectionData, null, 2);
    const collectionFile = testFolder.createFile(
      DOCUMENT_OPERATIONS_TEST_DATA.testCollectionFileName,
      collectionContent,
      'application/json'
    );
    DOCUMENT_OPERATIONS_TEST_DATA.testCollectionFileId = collectionFile.getId();
    DOCUMENT_OPERATIONS_TEST_DATA.createdFileIds.push(collectionFile.getId());
    
    logger.debug('Created test collection file', {
      fileId: DOCUMENT_OPERATIONS_TEST_DATA.testCollectionFileId,
      fileName: DOCUMENT_OPERATIONS_TEST_DATA.testCollectionFileName
    });
    
    // Create real collection object with FileService integration
    const fileOps = new FileOperations(logger);
    const fileService = new FileService(fileOps, logger);
    
    DOCUMENT_OPERATIONS_TEST_DATA.testCollection = {
      _documents: {},
      _metadata: {
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        documentCount: 0
      },
      _driveFileId: DOCUMENT_OPERATIONS_TEST_DATA.testCollectionFileId,
      _fileService: fileService,
      _isDirty: false,
      name: 'documentOperationsTest',
      
      getDriveFileId: function() { 
        return this._driveFileId; 
      },
      
      getMetadata: function() { 
        return this._metadata; 
      },
      
      _markDirty: function() { 
        this._isDirty = true;
      },
      
      _updateMetadata: function() {
        this._metadata.lastUpdated = new Date().toISOString();
        this._markDirty();
      },
      
      _loadData: function() {
        try {
          const data = this._fileService.readFile(this._driveFileId);
          this._documents = data.documents || {};
          this._metadata = data.metadata || this._metadata;
        } catch (error) {
          logger.warn('Failed to load collection data, using empty collection', { error: error.message });
        }
      },
      
      _saveData: function() {
        if (this._isDirty) {
          const data = {
            collection: this.name,
            metadata: this._metadata,
            documents: this._documents
          };
          this._fileService.writeFile(this._driveFileId, data);
          this._isDirty = false;
        }
      }
    };
    
    // Load initial data
    DOCUMENT_OPERATIONS_TEST_DATA.testCollection._loadData();
    
    DOCUMENT_OPERATIONS_TEST_DATA.testEnvironmentReady = true;
    logger.info('DocumentOperations test environment setup complete');
    
  } catch (error) {
    logger.error('Failed to setup DocumentOperations test environment', { 
      error: error.message, 
      stack: error.stack 
    });
    
    // Clean up on failure
    cleanupDocumentOperationsTestEnvironment();
    throw new Error('DocumentOperations test environment setup failed: ' + error.message);
  }
}

/**
 * Clean up DocumentOperations test environment
 */
function cleanupDocumentOperationsTestEnvironment() {
  const logger = GASDBLogger.createComponentLogger('DocumentOperations-Cleanup');
  
  try {
    logger.info('Cleaning up DocumentOperations test environment');
    
    // Clean up created files
    DOCUMENT_OPERATIONS_TEST_DATA.createdFileIds.forEach(fileId => {
      try {
        const file = DriveApp.getFileById(fileId);
        file.setTrashed(true);
        logger.debug('Cleaned up test file', { fileId });
      } catch (error) {
        logger.warn('Failed to clean up test file', { fileId, error: error.message });
      }
    });
    
    // Clean up created folders
    DOCUMENT_OPERATIONS_TEST_DATA.createdFolderIds.forEach(folderId => {
      try {
        const folder = DriveApp.getFolderById(folderId);
        folder.setTrashed(true);
        logger.debug('Cleaned up test folder', { folderId });
      } catch (error) {
        logger.warn('Failed to clean up test folder', { folderId, error: error.message });
      }
    });
    
    // Reset test data
    DOCUMENT_OPERATIONS_TEST_DATA.testFolderId = null;
    DOCUMENT_OPERATIONS_TEST_DATA.testCollectionFileId = null;
    DOCUMENT_OPERATIONS_TEST_DATA.testCollection = null;
    DOCUMENT_OPERATIONS_TEST_DATA.testEnvironmentReady = false;
    DOCUMENT_OPERATIONS_TEST_DATA.createdFileIds = [];
    DOCUMENT_OPERATIONS_TEST_DATA.createdFolderIds = [];
    
    const endTime = new Date();
    const duration = DOCUMENT_OPERATIONS_TEST_DATA.testStartTime ? 
      endTime.getTime() - DOCUMENT_OPERATIONS_TEST_DATA.testStartTime.getTime() : 0;
    
    logger.info('DocumentOperations test environment cleanup complete', { 
      duration: duration + 'ms' 
    });
    
  } catch (error) {
    logger.error('Failed to clean up DocumentOperations test environment', { 
      error: error.message, 
      stack: error.stack 
    });
  }
}

/**
 * Reset collection state before each test
 */
function resetCollectionState() {
  if (DOCUMENT_OPERATIONS_TEST_DATA.testCollection) {
    // Reset documents and metadata
    DOCUMENT_OPERATIONS_TEST_DATA.testCollection._documents = {};
    DOCUMENT_OPERATIONS_TEST_DATA.testCollection._metadata = {
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      documentCount: 0
    };
    DOCUMENT_OPERATIONS_TEST_DATA.testCollection._isDirty = true;
    
    // Save reset state to Drive
    DOCUMENT_OPERATIONS_TEST_DATA.testCollection._saveData();
  }
}

/**
 * DocumentOperations Constructor and Initialisation Tests
 */
function createDocumentOperationsConstructorTestSuite() {
  const suite = new TestSuite('DocumentOperations Constructor');
  
  // Set up lifecycle hooks
  suite.setBeforeAll(setupDocumentOperationsTestEnvironment);
  suite.setAfterAll(cleanupDocumentOperationsTestEnvironment);
  suite.setBeforeEach(resetCollectionState);
  
  suite.addTest('should create DocumentOperations with valid collection reference', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    
    // Act
    const docOps = new DocumentOperations(testCollection);
    
    // Assert
    TestFramework.assertDefined(docOps, 'DocumentOperations should be created');
    TestFramework.assertEquals('function', typeof docOps.insertDocument, 'Should have insertDocument method');
    TestFramework.assertEquals('function', typeof docOps.findDocumentById, 'Should have findDocumentById method');
    TestFramework.assertEquals('function', typeof docOps.findAllDocuments, 'Should have findAllDocuments method');
    TestFramework.assertEquals('function', typeof docOps.updateDocument, 'Should have updateDocument method');
    TestFramework.assertEquals('function', typeof docOps.deleteDocument, 'Should have deleteDocument method');
    TestFramework.assertEquals('function', typeof docOps.countDocuments, 'Should have countDocuments method');
    TestFramework.assertEquals('function', typeof docOps.documentExists, 'Should have documentExists method');
  });
  
  suite.addTest('should throw error when created without collection reference', function() {
    // Act & Assert
    TestFramework.assertThrows(() => {
      new DocumentOperations(null);
    }, InvalidArgumentError, 'Should throw InvalidArgumentError when collection is null');
    
    TestFramework.assertThrows(() => {
      new DocumentOperations(undefined);
    }, InvalidArgumentError, 'Should throw InvalidArgumentError when collection is undefined');
    
    TestFramework.assertThrows(() => {
      new DocumentOperations();
    }, InvalidArgumentError, 'Should throw InvalidArgumentError when collection is missing');
  });
  
  suite.addTest('should throw error when created with invalid collection reference', function() {
    // Act & Assert
    TestFramework.assertThrows(() => {
      new DocumentOperations({});
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for empty object');
    
    TestFramework.assertThrows(() => {
      new DocumentOperations('not-a-collection');
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for string');
    
    TestFramework.assertThrows(() => {
      new DocumentOperations(42);
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for number');
  });
  
  return suite;
}

/**
 * DocumentOperations Insert Operations Tests
 */
function createDocumentOperationsInsertTestSuite() {
  const suite = new TestSuite('DocumentOperations Insert Operations');
  
  // Set up lifecycle hooks
  suite.setBeforeAll(setupDocumentOperationsTestEnvironment);
  suite.setAfterAll(cleanupDocumentOperationsTestEnvironment);
  suite.setBeforeEach(resetCollectionState);
  
  suite.addTest('should insert document with automatic ID generation', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    const testDoc = { name: 'Test User', email: 'test@example.com' };
    
    // Act
    const result = docOps.insertDocument(testDoc);
    
    // Assert
    TestFramework.assertDefined(result, 'Insert result should be defined');
    TestFramework.assertDefined(result._id, 'Inserted document should have _id');
    TestFramework.assertEquals('string', typeof result._id, 'Document _id should be string');
    TestFramework.assertTrue(result._id.length > 0, 'Document _id should not be empty');
    TestFramework.assertEquals(result.name, testDoc.name, 'Document name should be preserved');
    TestFramework.assertEquals(result.email, testDoc.email, 'Document email should be preserved');
    
    // Verify document was saved to Drive
    testCollection._loadData();
    const savedDoc = testCollection._documents[result._id];
    TestFramework.assertDefined(savedDoc, 'Document should be saved to Drive');
    TestFramework.assertEquals(savedDoc.name, testDoc.name, 'Saved document name should match');
  });
  
  suite.addTest('should insert document with provided ID when valid', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    const customId = 'custom-id-123';
    const testDoc = { _id: customId, name: 'Test User', email: 'test@example.com' };
    
    // Act
    const result = docOps.insertDocument(testDoc);
    
    // Assert
    TestFramework.assertDefined(result, 'Insert result should be defined');
    TestFramework.assertEquals(result._id, customId, 'Document should retain provided _id');
    TestFramework.assertEquals(result.name, testDoc.name, 'Document name should be preserved');
    TestFramework.assertEquals(result.email, testDoc.email, 'Document email should be preserved');
    
    // Verify document was saved to Drive with correct ID
    testCollection._loadData();
    const savedDoc = testCollection._documents[customId];
    TestFramework.assertDefined(savedDoc, 'Document should be saved to Drive with custom ID');
  });
  
  suite.addTest('should throw error when inserting document with duplicate ID', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    const duplicateId = 'duplicate-id-123';
    const firstDoc = { _id: duplicateId, name: 'First User' };
    const secondDoc = { _id: duplicateId, name: 'Second User' };
    
    // Act - Insert first document
    docOps.insertDocument(firstDoc);
    
    // Assert - Second insert should fail
    TestFramework.assertThrows(() => {
      docOps.insertDocument(secondDoc);
    }, ConflictError, 'Should throw ConflictError for duplicate ID');
  });
  
  suite.addTest('should throw error when inserting invalid document', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    
    // Act & Assert
    TestFramework.assertThrows(() => {
      docOps.insertDocument(null);
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for null document');
    
    TestFramework.assertThrows(() => {
      docOps.insertDocument(undefined);
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for undefined document');
    
    TestFramework.assertThrows(() => {
      docOps.insertDocument('not-an-object');
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for string');
    
    TestFramework.assertThrows(() => {
      docOps.insertDocument([]);
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for array');
  });
  
  return suite;
}

/**
 * DocumentOperations Find Operations Tests
 */
function createDocumentOperationsFindTestSuite() {
  const suite = new TestSuite('DocumentOperations Find Operations');
  
  // Set up lifecycle hooks
  suite.setBeforeAll(setupDocumentOperationsTestEnvironment);
  suite.setAfterAll(cleanupDocumentOperationsTestEnvironment);
  suite.setBeforeEach(resetCollectionState);
  
  suite.addTest('should find document by valid ID', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    const testDoc = { name: 'Findable User', email: 'findable@example.com' };
    const insertedDoc = docOps.insertDocument(testDoc);
    
    // Act
    const foundDoc = docOps.findDocumentById(insertedDoc._id);
    
    // Assert
    TestFramework.assertDefined(foundDoc, 'Found document should be defined');
    TestFramework.assertEquals(foundDoc._id, insertedDoc._id, 'Found document should have correct _id');
    TestFramework.assertEquals(foundDoc.name, testDoc.name, 'Found document should have correct name');
    TestFramework.assertEquals(foundDoc.email, testDoc.email, 'Found document should have correct email');
  });
  
  suite.addTest('should return null when document not found by ID', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    const nonExistentId = 'non-existent-id-123';
    
    // Act
    const foundDoc = docOps.findDocumentById(nonExistentId);
    
    // Assert
    TestFramework.assertNull(foundDoc, 'Should return null for non-existent document');
  });
  
  suite.addTest('should throw error when finding with invalid ID', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    
    // Act & Assert
    TestFramework.assertThrows(() => {
      docOps.findDocumentById(null);
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for null ID');
    
    TestFramework.assertThrows(() => {
      docOps.findDocumentById(undefined);
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for undefined ID');
    
    TestFramework.assertThrows(() => {
      docOps.findDocumentById('');
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for empty string ID');
  });
  
  suite.addTest('should find all documents when collection has content', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    const testDoc1 = { name: 'User One', email: 'one@example.com' };
    const testDoc2 = { name: 'User Two', email: 'two@example.com' };
    const testDoc3 = { name: 'User Three', email: 'three@example.com' };
    
    docOps.insertDocument(testDoc1);
    docOps.insertDocument(testDoc2);
    docOps.insertDocument(testDoc3);
    
    // Act
    const allDocs = docOps.findAllDocuments();
    
    // Assert
    TestFramework.assertDefined(allDocs, 'All documents result should be defined');
    TestFramework.assertTrue(Array.isArray(allDocs), 'Should return an array');
    TestFramework.assertEquals(allDocs.length, 3, 'Should return all 3 documents');
    
    // Verify all documents are present
    const names = allDocs.map(doc => doc.name);
    TestFramework.assertTrue(names.includes('User One'), 'Should include User One');
    TestFramework.assertTrue(names.includes('User Two'), 'Should include User Two');
    TestFramework.assertTrue(names.includes('User Three'), 'Should include User Three');
  });
  
  suite.addTest('should return empty array when finding all documents in empty collection', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    
    // Act
    const allDocs = docOps.findAllDocuments();
    
    // Assert
    TestFramework.assertDefined(allDocs, 'All documents result should be defined');
    TestFramework.assertTrue(Array.isArray(allDocs), 'Should return an array');
    TestFramework.assertEquals(allDocs.length, 0, 'Should return empty array for empty collection');
  });
  
  return suite;
}

/**
 * DocumentOperations Update Operations Tests
 */
function createDocumentOperationsUpdateTestSuite() {
  const suite = new TestSuite('DocumentOperations Update Operations');
  
  // Set up lifecycle hooks
  suite.setBeforeAll(setupDocumentOperationsTestEnvironment);
  suite.setAfterAll(cleanupDocumentOperationsTestEnvironment);
  suite.setBeforeEach(resetCollectionState);
  
  suite.addTest('should update existing document by ID', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    const originalDoc = { name: 'Original User', email: 'original@example.com' };
    const insertedDoc = docOps.insertDocument(originalDoc);
    const updatedData = { name: 'Updated User', email: 'updated@example.com', status: 'active' };
    
    // Act
    const result = docOps.updateDocument(insertedDoc._id, updatedData);
    
    // Assert
    TestFramework.assertDefined(result, 'Update result should be defined');
    TestFramework.assertTrue(result.acknowledged, 'Update should be acknowledged');
    TestFramework.assertEquals(result.modifiedCount, 1, 'Should modify 1 document');
    
    // Verify document was updated in memory
    const foundDoc = docOps.findDocumentById(insertedDoc._id);
    TestFramework.assertEquals(foundDoc.name, updatedData.name, 'Document name should be updated');
    TestFramework.assertEquals(foundDoc.email, updatedData.email, 'Document email should be updated');
    TestFramework.assertEquals(foundDoc.status, updatedData.status, 'New fields should be added');
    TestFramework.assertEquals(foundDoc._id, insertedDoc._id, 'Document _id should be preserved');
    
    // Verify document was updated in Drive
    testCollection._loadData();
    const savedDoc = testCollection._documents[insertedDoc._id];
    TestFramework.assertEquals(savedDoc.name, updatedData.name, 'Saved document should be updated');
  });
  
  suite.addTest('should return error result when updating non-existent document', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    const nonExistentId = 'non-existent-id-456';
    const updateData = { name: 'Updated User' };
    
    // Act
    const result = docOps.updateDocument(nonExistentId, updateData);
    
    // Assert
    TestFramework.assertDefined(result, 'Update result should be defined');
    TestFramework.assertTrue(result.acknowledged, 'Update should be acknowledged');
    TestFramework.assertEquals(result.modifiedCount, 0, 'Should modify 0 documents');
  });
  
  suite.addTest('should throw error when updating with invalid parameters', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    
    // Act & Assert
    TestFramework.assertThrows(() => {
      docOps.updateDocument(null, { name: 'Test' });
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for null ID');
    
    TestFramework.assertThrows(() => {
      docOps.updateDocument('valid-id', null);
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for null update data');
    
    TestFramework.assertThrows(() => {
      docOps.updateDocument('', { name: 'Test' });
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for empty ID');
    
    TestFramework.assertThrows(() => {
      docOps.updateDocument('valid-id', 'not-an-object');
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for non-object update data');
  });
  
  return suite;
}

/**
 * DocumentOperations Delete Operations Tests
 */
function createDocumentOperationsDeleteTestSuite() {
  const suite = new TestSuite('DocumentOperations Delete Operations');
  
  // Set up lifecycle hooks
  suite.setBeforeAll(setupDocumentOperationsTestEnvironment);
  suite.setAfterAll(cleanupDocumentOperationsTestEnvironment);
  suite.setBeforeEach(resetCollectionState);
  
  suite.addTest('should delete existing document by ID', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    const testDoc = { name: 'Deletable User', email: 'deletable@example.com' };
    const insertedDoc = docOps.insertDocument(testDoc);
    
    // Act
    const result = docOps.deleteDocument(insertedDoc._id);
    
    // Assert
    TestFramework.assertDefined(result, 'Delete result should be defined');
    TestFramework.assertTrue(result.acknowledged, 'Delete should be acknowledged');
    TestFramework.assertEquals(result.deletedCount, 1, 'Should delete 1 document');
    
    // Verify document was deleted from memory
    const foundDoc = docOps.findDocumentById(insertedDoc._id);
    TestFramework.assertNull(foundDoc, 'Document should no longer exist');
    
    // Verify document was deleted from Drive
    testCollection._loadData();
    const savedDoc = testCollection._documents[insertedDoc._id];
    TestFramework.assertUndefined(savedDoc, 'Document should be deleted from Drive');
  });
  
  suite.addTest('should return error result when deleting non-existent document', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    const nonExistentId = 'non-existent-id-789';
    
    // Act
    const result = docOps.deleteDocument(nonExistentId);
    
    // Assert
    TestFramework.assertDefined(result, 'Delete result should be defined');
    TestFramework.assertTrue(result.acknowledged, 'Delete should be acknowledged');
    TestFramework.assertEquals(result.deletedCount, 0, 'Should delete 0 documents');
  });
  
  suite.addTest('should throw error when deleting with invalid ID', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    
    // Act & Assert
    TestFramework.assertThrows(() => {
      docOps.deleteDocument(null);
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for null ID');
    
    TestFramework.assertThrows(() => {
      docOps.deleteDocument(undefined);
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for undefined ID');
    
    TestFramework.assertThrows(() => {
      docOps.deleteDocument('');
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for empty string ID');
  });
  
  return suite;
}

/**
 * DocumentOperations Utility and Helper Tests
 */
function createDocumentOperationsUtilityTestSuite() {
  const suite = new TestSuite('DocumentOperations Utility Operations');
  
  // Set up lifecycle hooks
  suite.setBeforeAll(setupDocumentOperationsTestEnvironment);
  suite.setAfterAll(cleanupDocumentOperationsTestEnvironment);
  suite.setBeforeEach(resetCollectionState);
  
  suite.addTest('should count documents correctly', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    
    // Act & Assert - Empty collection
    let count = docOps.countDocuments();
    TestFramework.assertEquals(count, 0, 'Empty collection should have 0 documents');
    
    // Add documents and verify count
    docOps.insertDocument({ name: 'User 1' });
    count = docOps.countDocuments();
    TestFramework.assertEquals(count, 1, 'Collection should have 1 document');
    
    docOps.insertDocument({ name: 'User 2' });
    docOps.insertDocument({ name: 'User 3' });
    count = docOps.countDocuments();
    TestFramework.assertEquals(count, 3, 'Collection should have 3 documents');
    
    // Delete a document and verify count
    const allDocs = docOps.findAllDocuments();
    docOps.deleteDocument(allDocs[0]._id);
    count = docOps.countDocuments();
    TestFramework.assertEquals(count, 2, 'Collection should have 2 documents after deletion');
    
    // Verify count persists in Drive
    testCollection._loadData();
    const documentsInDrive = Object.keys(testCollection._documents).length;
    TestFramework.assertEquals(documentsInDrive, 2, 'Drive should also have 2 documents');
  });
  
  suite.addTest('should check document existence correctly', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    const testDoc = { name: 'Existence Test User' };
    const insertedDoc = docOps.insertDocument(testDoc);
    
    // Act & Assert
    TestFramework.assertTrue(docOps.documentExists(insertedDoc._id), 'Should return true for existing document');
    TestFramework.assertFalse(docOps.documentExists('non-existent-id'), 'Should return false for non-existent document');
    
    // Verify existence persists in Drive
    testCollection._loadData();
    const existsInDrive = testCollection._documents.hasOwnProperty(insertedDoc._id);
    TestFramework.assertTrue(existsInDrive, 'Document should exist in Drive');
  });
  
  suite.addTest('should throw error when checking existence with invalid ID', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    
    // Act & Assert
    TestFramework.assertThrows(() => {
      docOps.documentExists(null);
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for null ID');
    
    TestFramework.assertThrows(() => {
      docOps.documentExists(undefined);
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for undefined ID');
    
    TestFramework.assertThrows(() => {
      docOps.documentExists('');
    }, InvalidArgumentError, 'Should throw InvalidArgumentError for empty string ID');
  });
  
  suite.addTest('should generate valid document IDs', function() {
    // Arrange
    const testCollection = DOCUMENT_OPERATIONS_TEST_DATA.testCollection;
    const docOps = new DocumentOperations(testCollection);
    
    // Act - Access private method via public interface (insert without ID)
    const doc1 = docOps.insertDocument({ name: 'Test 1' });
    const doc2 = docOps.insertDocument({ name: 'Test 2' });
    const doc3 = docOps.insertDocument({ name: 'Test 3' });
    
    // Assert
    TestFramework.assertDefined(doc1._id, 'Generated ID should be defined');
    TestFramework.assertDefined(doc2._id, 'Generated ID should be defined');
    TestFramework.assertDefined(doc3._id, 'Generated ID should be defined');
    
    TestFramework.assertEquals('string', typeof doc1._id, 'Generated ID should be string');
    TestFramework.assertEquals('string', typeof doc2._id, 'Generated ID should be string');
    TestFramework.assertEquals('string', typeof doc3._id, 'Generated ID should be string');
    
    TestFramework.assertTrue(doc1._id.length > 0, 'Generated ID should not be empty');
    TestFramework.assertTrue(doc2._id.length > 0, 'Generated ID should not be empty');
    TestFramework.assertTrue(doc3._id.length > 0, 'Generated ID should not be empty');
    
    // All IDs should be unique
    TestFramework.assertNotEquals(doc1._id, doc2._id, 'Generated IDs should be unique');
    TestFramework.assertNotEquals(doc1._id, doc3._id, 'Generated IDs should be unique');
    TestFramework.assertNotEquals(doc2._id, doc3._id, 'Generated IDs should be unique');
    
    // Verify IDs are saved properly in Drive
    testCollection._loadData();
    TestFramework.assertTrue(testCollection._documents.hasOwnProperty(doc1._id), 'Doc1 ID should exist in Drive');
    TestFramework.assertTrue(testCollection._documents.hasOwnProperty(doc2._id), 'Doc2 ID should exist in Drive');
    TestFramework.assertTrue(testCollection._documents.hasOwnProperty(doc3._id), 'Doc3 ID should exist in Drive');
  });
  
  return suite;
}

/**
 * Register all DocumentOperations test suites with TestFramework
 */
function registerDocumentOperationsTests() {
  const testFramework = new TestFramework();
  testFramework.registerTestSuite(createDocumentOperationsConstructorTestSuite());
  testFramework.registerTestSuite(createDocumentOperationsInsertTestSuite());
  testFramework.registerTestSuite(createDocumentOperationsFindTestSuite());
  testFramework.registerTestSuite(createDocumentOperationsUpdateTestSuite());
  testFramework.registerTestSuite(createDocumentOperationsDeleteTestSuite());
  testFramework.registerTestSuite(createDocumentOperationsUtilityTestSuite());
  return testFramework;
}

/**
 * Run all DocumentOperations tests
 */
function runDocumentOperationsTests() {
  try {
    GASDBLogger.info('Starting DocumentOperations Test Execution');
    
    // Register all test suites
    const testFramework = registerDocumentOperationsTests();
    
    // Run all DocumentOperations test suites
    const results = [];
    results.push(testFramework.runTestSuite('DocumentOperations Constructor'));
    results.push(testFramework.runTestSuite('DocumentOperations Insert Operations'));
    results.push(testFramework.runTestSuite('DocumentOperations Find Operations'));
    results.push(testFramework.runTestSuite('DocumentOperations Update Operations'));
    results.push(testFramework.runTestSuite('DocumentOperations Delete Operations'));
    results.push(testFramework.runTestSuite('DocumentOperations Utility Operations'));
    
    GASDBLogger.info('DocumentOperations Test Execution Complete');
    
    // Log summary for each result set
    results.forEach((result, index) => {
      GASDBLogger.info(`Result Set ${index + 1}: ${result.getSummary()}`);
    });
    
    return results;
    
  } catch (error) {
    GASDBLogger.error('Failed to execute DocumentOperations tests', { error: error.message, stack: error.stack });
    throw error;
  }
}
