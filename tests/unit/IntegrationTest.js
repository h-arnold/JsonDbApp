/**
 * IntegrationTest.js - Cross-Component Integration Tests
 * 
 * Comprehensive integration tests across multiple components including:
 * - Cross-component integration workflows
 * - End-to-end database operations
 * - Drive API edge cases and integration
 * - Master index coordination
 * 
 * Migrated from multiple sources:
 * - Section3Tests.js → testFileIntegration(), testDriveApiEdgeCases()
 * - Section4Tests.js → testDatabaseMasterIndexIntegration()
 * - Setup/cleanup functions from testSection3Setup(), testSection3Cleanup()
 */

// Global test data storage for Integration tests
const INTEGRATION_TEST_DATA = {
  testFolderId: null,
  testFolderName: 'GASDB_Integration_Test_' + new Date().getTime(),
  testDatabaseConfig: null,
  testDatabase: null,
  createdFileIds: [], // Track all files created for clean-up
  createdFolderIds: [], // Track all folders created for clean-up
  testCollectionNames: ['integrationCollection1', 'integrationCollection2', 'edgeCaseCollection'],
  testDocuments: []
};

/**
 * Setup function for Integration tests
 */
function createIntegrationSetupTestSuite() {
  const suite = new TestSuite('Integration Setup - Create Test Environment');
  
  suite.addTest('should create test environment for integration tests', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('Integration-Setup');
    
    // Act
    try {
      // Create test folder
      const folder = DriveApp.createFolder(INTEGRATION_TEST_DATA.testFolderName);
      INTEGRATION_TEST_DATA.testFolderId = folder.getId();
      INTEGRATION_TEST_DATA.createdFolderIds.push(INTEGRATION_TEST_DATA.testFolderId);
      
      // Prepare test database configuration
      INTEGRATION_TEST_DATA.testDatabaseConfig = {
        rootFolderId: INTEGRATION_TEST_DATA.testFolderId,
        autoCreateCollections: true,
        lockTimeout: 30000,
        cacheEnabled: true,
        logLevel: 'INFO',
        masterIndexKey: 'GASDB_MASTER_INDEX_INTEGRATION_TEST'
      };
      
      // Create test database instance
      INTEGRATION_TEST_DATA.testDatabase = new Database(INTEGRATION_TEST_DATA.testDatabaseConfig);
      INTEGRATION_TEST_DATA.testDatabase.initialise();
      
      // Track database index file for cleanup
      if (INTEGRATION_TEST_DATA.testDatabase.indexFileId) {
        INTEGRATION_TEST_DATA.createdFileIds.push(INTEGRATION_TEST_DATA.testDatabase.indexFileId);
      }
      
      // Prepare test documents
      INTEGRATION_TEST_DATA.testDocuments = [
        { _id: 'doc1', name: 'Test Document 1', value: 100 },
        { _id: 'doc2', name: 'Test Document 2', value: 200 },
        { _id: 'doc3', name: 'Test Document 3', value: 300 }
      ];
      
      // Assert
      TestFramework.assertDefined(INTEGRATION_TEST_DATA.testFolderId, 'Test folder should be created');
      TestFramework.assertNotNull(INTEGRATION_TEST_DATA.testDatabase, 'Test database should be created');
      TestFramework.assertNotNull(INTEGRATION_TEST_DATA.testDatabaseConfig, 'Test config should be prepared');
      
      logger.info('Created integration test environment', { 
        folderId: INTEGRATION_TEST_DATA.testFolderId, 
        folderName: INTEGRATION_TEST_DATA.testFolderName,
        databaseIndexFile: INTEGRATION_TEST_DATA.testDatabase.indexFileId
      });
      
    } catch (error) {
      logger.error('Failed to create integration test environment', { error: error.message });
      throw error;
    }
  });
  
  return suite;
}

/**
 * Test file integration across FileOperations and FileService
 */
function createFileIntegrationTestSuite() {
  const suite = new TestSuite('File Integration Tests');
  
  suite.addTest('should integrate FileOperations and FileService seamlessly', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileIntegration');
    const fileOps = new FileOperations();
    const fileService = new FileService(fileOps, logger);
    const testFileName = 'integration_test_file.json';
    const testData = { message: 'File integration test', timestamp: new Date().toISOString() };
    
    // Act
    try {
      // Create file through FileService
      const fileId = fileService.createFile(testFileName, JSON.stringify(testData), INTEGRATION_TEST_DATA.testFolderId);
      INTEGRATION_TEST_DATA.createdFileIds.push(fileId);
      
      // Read file through FileOperations to verify integration
      const readData = JSON.parse(fileOps.readFile(fileId));
      
      // Update file through FileService
      const updatedData = Object.assign({}, testData, { updated: true });
      fileService.updateFile(fileId, JSON.stringify(updatedData));
      
      // Verify update through FileOperations
      const finalData = JSON.parse(fileOps.readFile(fileId));
      
      // Assert
      TestFramework.assertEquals(readData.message, testData.message, 'Initial data should match');
      TestFramework.assertTrue(finalData.updated, 'Updated data should be preserved');
      TestFramework.assertEquals(finalData.message, testData.message, 'Original data should be preserved');
      
    } catch (error) {
      throw new Error('FileOperations and FileService integration failed: ' + error.message);
    }
  });
  
  suite.addTest('should handle batch operations across file components', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('BatchIntegration');
    const fileOps = new FileOperations();
    const fileService = new FileService(fileOps, logger);
    const batchData = [
      { name: 'batch_file_1.json', content: '{"id": 1}' },
      { name: 'batch_file_2.json', content: '{"id": 2}' },
      { name: 'batch_file_3.json', content: '{"id": 3}' }
    ];
    
    // Act
    try {
      const createdFileIds = [];
      
      // Create multiple files
      batchData.forEach(item => {
        const fileId = fileService.createFile(item.name, item.content, INTEGRATION_TEST_DATA.testFolderId);
        createdFileIds.push(fileId);
        INTEGRATION_TEST_DATA.createdFileIds.push(fileId);
      });
      
      // Verify all files exist and have correct content
      const verificationResults = createdFileIds.map(fileId => {
        const content = fileOps.readFile(fileId);
        return JSON.parse(content);
      });
      
      // Assert
      TestFramework.assertEquals(verificationResults.length, 3, 'All batch files should be created');
      TestFramework.assertEquals(verificationResults[0].id, 1, 'First file should have correct content');
      TestFramework.assertEquals(verificationResults[1].id, 2, 'Second file should have correct content');
      TestFramework.assertEquals(verificationResults[2].id, 3, 'Third file should have correct content');
      
    } catch (error) {
      throw new Error('Batch operations integration failed: ' + error.message);
    }
  });
  
  return suite;
}

/**
 * Test Drive API edge cases and error handling
 */
function createDriveApiEdgeCasesTestSuite() {
  const suite = new TestSuite('Drive API Edge Cases');
  
  suite.addTest('should handle large file operations', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('DriveEdgeCases');
    const fileOps = new FileOperations();
    const fileService = new FileService(fileOps, logger);
    
    // Create a large JSON structure (not too large to avoid timeout)
    const largeData = {
      metadata: { created: new Date().toISOString(), test: 'large file' },
      data: []
    };
    
    // Add 1000 items to create a reasonably large file
    for (let i = 0; i < 1000; i++) {
      largeData.data.push({
        id: i,
        name: `Item ${i}`,
        description: `This is item number ${i} with some additional text to increase size`,
        timestamp: new Date().toISOString()
      });
    }
    
    const largeContent = JSON.stringify(largeData);
    const fileName = 'large_test_file.json';
    
    // Act
    try {
      const fileId = fileService.createFile(fileName, largeContent, INTEGRATION_TEST_DATA.testFolderId);
      INTEGRATION_TEST_DATA.createdFileIds.push(fileId);
      
      // Read back the large file
      const readContent = fileOps.readFile(fileId);
      const parsedData = JSON.parse(readContent);
      
      // Assert
      TestFramework.assertNotNull(fileId, 'Large file should be created successfully');
      TestFramework.assertEquals(parsedData.data.length, 1000, 'Large file should contain all data');
      TestFramework.assertEquals(parsedData.metadata.test, 'large file', 'Large file metadata should be preserved');
      TestFramework.assertTrue(readContent.length > 50000, 'File content should be significantly large');
      
    } catch (error) {
      throw new Error('Large file operations failed: ' + error.message);
    }
  });
  
  suite.addTest('should handle concurrent file operations', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('ConcurrentOps');
    const fileOps = new FileOperations();
    const fileService = new FileService(fileOps, logger);
    const concurrentData = [];
    
    // Prepare data for concurrent operations
    for (let i = 0; i < 5; i++) {
      concurrentData.push({
        name: `concurrent_file_${i}.json`,
        content: JSON.stringify({ id: i, operation: 'concurrent', timestamp: new Date().toISOString() })
      });
    }
    
    // Act
    try {
      const createdFileIds = [];
      
      // Simulate concurrent file creation (sequential due to GAS limitations)
      concurrentData.forEach((item, index) => {
        const fileId = fileService.createFile(item.name, item.content, INTEGRATION_TEST_DATA.testFolderId);
        createdFileIds.push(fileId);
        INTEGRATION_TEST_DATA.createdFileIds.push(fileId);
        
        // Small delay to simulate real-world timing
        Utilities.sleep(100);
      });
      
      // Verify all files were created successfully
      const verificationResults = createdFileIds.map((fileId, index) => {
        const content = fileOps.readFile(fileId);
        const parsed = JSON.parse(content);
        return { fileId, parsed, expectedId: index };
      });
      
      // Assert
      TestFramework.assertEquals(verificationResults.length, 5, 'All concurrent files should be created');
      verificationResults.forEach((result, index) => {
        TestFramework.assertEquals(result.parsed.id, index, `File ${index} should have correct ID`);
        TestFramework.assertEquals(result.parsed.operation, 'concurrent', `File ${index} should have correct operation type`);
      });
      
    } catch (error) {
      throw new Error('Concurrent operations failed: ' + error.message);
    }
  });
  
  suite.addTest('should handle file permission and access edge cases', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('PermissionEdgeCases');
    const fileOps = new FileOperations();
    const fileService = new FileService(fileOps, logger);
    const testFileName = 'permission_test_file.json';
    const testContent = JSON.stringify({ test: 'permission', access: 'edge case' });
    
    // Act
    try {
      // Create file
      const fileId = fileService.createFile(testFileName, testContent, INTEGRATION_TEST_DATA.testFolderId);
      INTEGRATION_TEST_DATA.createdFileIds.push(fileId);
      
      // Attempt to access file metadata
      const file = DriveApp.getFileById(fileId);
      const fileName = file.getName();
      const fileSize = file.getSize();
      const lastUpdated = file.getLastUpdated();
      
      // Verify file is accessible and has expected properties
      const readContent = fileOps.readFile(fileId);
      
      // Assert
      TestFramework.assertEquals(fileName, testFileName, 'File name should be accessible');
      TestFramework.assertTrue(fileSize > 0, 'File size should be greater than 0');
      TestFramework.assertNotNull(lastUpdated, 'Last updated timestamp should be available');
      TestFramework.assertEquals(readContent, testContent, 'File content should be readable');
      
    } catch (error) {
      throw new Error('Permission and access edge cases failed: ' + error.message);
    }
  });
  
  return suite;
}

/**
 * Test end-to-end database operations
 */
function createEndToEndDatabaseTestSuite() {
  const suite = new TestSuite('End-to-End Database Operations');
  
  suite.addTest('should perform complete CRUD operations across all components', function() {
    // Arrange
    const database = INTEGRATION_TEST_DATA.testDatabase;
    const collectionName = INTEGRATION_TEST_DATA.testCollectionNames[0];
    const testDoc = INTEGRATION_TEST_DATA.testDocuments[0];
    
    // Act & Assert - Create
    try {
      const collection = database.createCollection(collectionName);
      TestFramework.assertNotNull(collection, 'Collection should be created');
      
      // Track collection file for cleanup
      if (collection.driveFileId) {
        INTEGRATION_TEST_DATA.createdFileIds.push(collection.driveFileId);
      }
      
      // Insert document
      const insertResult = collection.insertOne(testDoc);
      TestFramework.assertNotNull(insertResult, 'Document should be inserted');
      
      // Read document
      const foundDoc = collection.findOne({ _id: testDoc._id });
      TestFramework.assertNotNull(foundDoc, 'Document should be found');
      TestFramework.assertEquals(foundDoc.name, testDoc.name, 'Document data should match');
      
      // Update document
      const updateResult = collection.updateOne(
        { _id: testDoc._id }, 
        { $set: { name: 'Updated Name', updated: true } }
      );
      TestFramework.assertTrue(updateResult.modifiedCount > 0, 'Document should be updated');
      
      // Verify update
      const updatedDoc = collection.findOne({ _id: testDoc._id });
      TestFramework.assertEquals(updatedDoc.name, 'Updated Name', 'Document should have updated name');
      TestFramework.assertTrue(updatedDoc.updated, 'Document should have updated flag');
      
      // Delete document
      const deleteResult = collection.deleteOne({ _id: testDoc._id });
      TestFramework.assertTrue(deleteResult.deletedCount > 0, 'Document should be deleted');
      
      // Verify deletion
      const deletedDoc = collection.findOne({ _id: testDoc._id });
      TestFramework.assertNull(deletedDoc, 'Document should no longer exist');
      
    } catch (error) {
      throw new Error('End-to-end CRUD operations failed: ' + error.message);
    }
  });
  
  suite.addTest('should handle multiple collections with cross-collection operations', function() {
    // Arrange
    const database = INTEGRATION_TEST_DATA.testDatabase;
    const collection1Name = INTEGRATION_TEST_DATA.testCollectionNames[1];
    const collection2Name = INTEGRATION_TEST_DATA.testCollectionNames[2];
    
    // Act
    try {
      // Create multiple collections
      const collection1 = database.createCollection(collection1Name);
      const collection2 = database.createCollection(collection2Name);
      
      // Track collection files for cleanup
      if (collection1.driveFileId) {
        INTEGRATION_TEST_DATA.createdFileIds.push(collection1.driveFileId);
      }
      if (collection2.driveFileId) {
        INTEGRATION_TEST_DATA.createdFileIds.push(collection2.driveFileId);
      }
      
      // Insert related documents
      const doc1 = { _id: 'ref1', type: 'parent', value: 100 };
      const doc2 = { _id: 'ref2', type: 'child', parentId: 'ref1', value: 50 };
      
      collection1.insertOne(doc1);
      collection2.insertOne(doc2);
      
      // Verify both collections contain their documents
      const foundDoc1 = collection1.findOne({ _id: 'ref1' });
      const foundDoc2 = collection2.findOne({ _id: 'ref2' });
      
      // Assert
      TestFramework.assertNotNull(foundDoc1, 'Document in collection1 should exist');
      TestFramework.assertNotNull(foundDoc2, 'Document in collection2 should exist');
      TestFramework.assertEquals(foundDoc1.type, 'parent', 'Parent document should have correct type');
      TestFramework.assertEquals(foundDoc2.parentId, 'ref1', 'Child document should reference parent');
      
      // Verify collections list contains both collections
      const allCollections = database.listCollections();
      TestFramework.assertTrue(allCollections.includes(collection1Name), 'Collection1 should be listed');
      TestFramework.assertTrue(allCollections.includes(collection2Name), 'Collection2 should be listed');
      
    } catch (error) {
      throw new Error('Multi-collection operations failed: ' + error.message);
    }
  });
  
  return suite;
}

/**
 * Test master index coordination across components
 */
function createMasterIndexCoordinationTestSuite() {
  const suite = new TestSuite('Master Index Coordination');
  
  suite.addTest('should coordinate database and master index operations', function() {
    // Arrange
    const database = INTEGRATION_TEST_DATA.testDatabase;
    const masterIndex = new MasterIndex({ 
      masterIndexKey: INTEGRATION_TEST_DATA.testDatabaseConfig.masterIndexKey 
    });
    const testCollectionName = 'coordinationTestCollection';
    
    // Act
    try {
      // Create collection through database
      const collection = database.createCollection(testCollectionName);
      
      // Track collection file for cleanup
      if (collection.driveFileId) {
        INTEGRATION_TEST_DATA.createdFileIds.push(collection.driveFileId);
      }
      
      // Verify master index is updated
      const miCollections = masterIndex.getCollections();
      
      // Assert
      TestFramework.assertTrue(
        miCollections.hasOwnProperty(testCollectionName),
        'Master index should contain new collection'
      );
      TestFramework.assertEquals(
        miCollections[testCollectionName].fileId,
        collection.driveFileId,
        'File IDs should match between database and master index'
      );
      TestFramework.assertEquals(
        miCollections[testCollectionName].name,
        testCollectionName,
        'Collection names should match'
      );
      
    } catch (error) {
      throw new Error('Master index coordination failed: ' + error.message);
    }
  });
  
  suite.addTest('should handle concurrent access to master index', function() {
    // Arrange
    const masterIndex1 = new MasterIndex({ 
      masterIndexKey: INTEGRATION_TEST_DATA.testDatabaseConfig.masterIndexKey 
    });
    const masterIndex2 = new MasterIndex({ 
      masterIndexKey: INTEGRATION_TEST_DATA.testDatabaseConfig.masterIndexKey 
    });
    const testData = { test: 'concurrent', timestamp: new Date().toISOString() };
    
    // Act
    try {
      // Simulate concurrent operations (sequential due to GAS limitations)
      const collection1Data = {
        name: 'concurrentCollection1',
        fileId: 'file1',
        documentCount: 1,
        created: new Date().toISOString()
      };
      
      const collection2Data = {
        name: 'concurrentCollection2',
        fileId: 'file2',
        documentCount: 2,
        created: new Date().toISOString()
      };
      
      // Add collections through different master index instances
      masterIndex1.addCollection(collection1Data.name, collection1Data);
      Utilities.sleep(100); // Small delay to simulate timing
      masterIndex2.addCollection(collection2Data.name, collection2Data);
      
      // Verify both collections are present
      const collections = masterIndex1.getCollections();
      
      // Assert
      TestFramework.assertTrue(
        collections.hasOwnProperty('concurrentCollection1'),
        'First concurrent collection should exist'
      );
      TestFramework.assertTrue(
        collections.hasOwnProperty('concurrentCollection2'),
        'Second concurrent collection should exist'
      );
      
    } catch (error) {
      throw new Error('Concurrent master index access failed: ' + error.message);
    }
  });
  
  return suite;
}

/**
 * Cleanup function for Integration tests
 */
function createIntegrationCleanupTestSuite() {
  const suite = new TestSuite('Integration Cleanup - Remove Test Resources');
  
  suite.addTest('should clean up all integration test resources', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('Integration-Cleanup');
    let cleanedFiles = 0;
    let failedFiles = 0;
    let cleanedFolders = 0;
    let failedFolders = 0;
    
    // Act - Clean up created test files
    INTEGRATION_TEST_DATA.createdFileIds.forEach(fileId => {
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
    INTEGRATION_TEST_DATA.createdFolderIds.forEach(folderId => {
      try {
        const folder = DriveApp.getFolderById(folderId);
        folder.setTrashed(true);
        cleanedFolders++;
      } catch (error) {
        failedFolders++;
        logger.warn('Failed to delete folder', { folderId, error: error.message });
      }
    });
    
    // Clean up test master index entries
    try {
      const masterIndexKey = INTEGRATION_TEST_DATA.testDatabaseConfig?.masterIndexKey;
      if (masterIndexKey) {
        PropertiesService.getScriptProperties().deleteProperty(masterIndexKey);
        logger.info('Cleaned up integration test master index', { key: masterIndexKey });
      }
      
      // Clean up other test keys
      const testKeys = ['GASDB_MASTER_INDEX_INTEGRATION_TEST', 'GASDB_MASTER_INDEX_TEST_INTEGRATION'];
      testKeys.forEach(key => {
        try {
          PropertiesService.getScriptProperties().deleteProperty(key);
          logger.info('Cleaned up test property', { key: key });
        } catch (error) {
          // Ignore errors - property might not exist
        }
      });
    } catch (error) {
      logger.warn('Failed to clean up master index', { error: error.message });
    }
    
    // Assert
    logger.info('Integration cleanup summary', { 
      cleanedFiles: cleanedFiles, 
      failedFiles: failedFiles,
      cleanedFolders: cleanedFolders,
      failedFolders: failedFolders,
      totalFiles: INTEGRATION_TEST_DATA.createdFileIds.length,
      totalFolders: INTEGRATION_TEST_DATA.createdFolderIds.length
    });
    
    TestFramework.assertEquals(failedFiles, 0, 'All test files should be cleaned up successfully');
    TestFramework.assertEquals(failedFolders, 0, 'All test folders should be cleaned up successfully');
  });
  
  return suite;
}

/**
 * Run all Integration tests
 * This function orchestrates all test suites for Integration testing
 */
function runIntegrationTests() {
  try {
    GASDBLogger.info('Starting Integration Test Execution');
    
    // Register all test suites using global convenience functions
    registerTestSuite(createIntegrationSetupTestSuite());
    registerTestSuite(createFileIntegrationTestSuite());
    registerTestSuite(createDriveApiEdgeCasesTestSuite());
    registerTestSuite(createEndToEndDatabaseTestSuite());
    registerTestSuite(createMasterIndexCoordinationTestSuite());
    registerTestSuite(createIntegrationCleanupTestSuite());
    
    // Run all tests
    const results = runAllTests();
    
    GASDBLogger.info('Integration Test Execution Complete');
    
    return results;
    
  } catch (error) {
    GASDBLogger.error('Failed to execute Integration tests', { error: error.message, stack: error.stack });
    throw error;
  }
}
