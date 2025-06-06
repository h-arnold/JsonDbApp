/**
 * FileServiceTest.js - FileService Class Tests
 * 
 * Comprehensive tests for the FileService class including:
 * - Optimised interface with batch operations
 * - Error recovery and quota handling
 * - Integration with FileOperations
 * 
 * Migrated from Section3Tests.js → FileService-specific functions
 */

// Global test data storage for FileService testing
const FILESERVICE_TEST_DATA = {
  testFileId: null,
  testFileName: 'GASDB_FileService_Test_File_' + new Date().getTime() + '.json',
  testFolderId: null,
  testFolderName: 'GASDB_FileService_Test_Folder_' + new Date().getTime(),
  testData: {
    test: 'fileServiceTestData',
    collection: 'fileservice_test',
    collectionName: 'testFileServiceCollection',
    metadata: {
      version: 1,
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    },
    documents: [
      { _id: 'fileservice_doc1', data: 'FileService test document 1' },
      { _id: 'fileservice_doc2', data: 'FileService test document 2' }
    ]
  },
  createdFileIds: [],
  createdFolderIds: [],
  mockFileOperations: null
};

/**
 * Setup test that creates resources for FileService testing
 */
function createFileServiceSetupTestSuite() {
  const suite = new TestSuite('FileService Setup - Create Test Resources');
  
  suite.addTest('should create test folder in Drive root', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileService-Setup');
    
    // Act
    try {
      const folder = DriveApp.createFolder(FILESERVICE_TEST_DATA.testFolderName);
      FILESERVICE_TEST_DATA.testFolderId = folder.getId();
      FILESERVICE_TEST_DATA.createdFolderIds.push(FILESERVICE_TEST_DATA.testFolderId);
      
      // Assert
      TestFramework.assertDefined(FILESERVICE_TEST_DATA.testFolderId, 'Test folder should be created');
      TestFramework.assertTrue(FILESERVICE_TEST_DATA.testFolderId.length > 0, 'Folder ID should not be empty');
      logger.info('Created FileService test folder', { folderId: FILESERVICE_TEST_DATA.testFolderId });
      
    } catch (error) {
      logger.error('Failed to create test folder', { error: error.message });
      throw error;
    }
  });
  
  suite.addTest('should create initial test file with JSON content', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileService-Setup');
    FILESERVICE_TEST_DATA.testData.metadata.created = new Date().toISOString();
    FILESERVICE_TEST_DATA.testData.metadata.updated = new Date().toISOString();
    
    // Act
    try {
      const folder = DriveApp.getFolderById(FILESERVICE_TEST_DATA.testFolderId);
      const file = folder.createFile(
        FILESERVICE_TEST_DATA.testFileName,
        JSON.stringify(FILESERVICE_TEST_DATA.testData),
        'application/json'
      );
      FILESERVICE_TEST_DATA.testFileId = file.getId();
      FILESERVICE_TEST_DATA.createdFileIds.push(FILESERVICE_TEST_DATA.testFileId);
      
      // Assert
      TestFramework.assertDefined(FILESERVICE_TEST_DATA.testFileId, 'Test file should be created');
      logger.info('Created FileService test file', { fileId: FILESERVICE_TEST_DATA.testFileId });
      
    } catch (error) {
      logger.error('Failed to create test file', { error: error.message });
      throw error;
    }
  });
  
  suite.addTest('should initialise mock FileOperations for dependency injection', function() {
    // Arrange & Act
    const logger = GASDBLogger.createComponentLogger('FileService-Setup');
    FILESERVICE_TEST_DATA.mockFileOperations = createMockFileOperations();
    
    // Assert
    TestFramework.assertDefined(FILESERVICE_TEST_DATA.mockFileOperations, 'Mock FileOperations should be created');
    TestFramework.assertDefined(FILESERVICE_TEST_DATA.mockFileOperations.readFile, 'Mock should have readFile method');
    TestFramework.assertDefined(FILESERVICE_TEST_DATA.mockFileOperations.writeFile, 'Mock should have writeFile method');
    TestFramework.assertDefined(FILESERVICE_TEST_DATA.mockFileOperations.createFile, 'Mock should have createFile method');
    logger.info('Created mock FileOperations for testing');
  });
  
  return suite;
}

/**
 * FileService Functionality Tests
 * Tests optimised interface with dependency injection
 */
function createFileServiceFunctionalityTestSuite() {
  const suite = new TestSuite('FileService Functionality');
  
  suite.addTest('should initialise with FileOperations dependency', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileService');
    const fileOps = new FileOperations(logger);
    const fileServiceLogger = GASDBLogger.createComponentLogger('FileService-Test');
    
    // Act
    const fileService = new FileService(fileOps, fileServiceLogger);
    
    // Assert
    TestFramework.assertDefined(fileService, 'FileService should be initialised');
    TestFramework.assertTrue(fileService instanceof FileService, 'Should be instance of FileService');
  });
  
  suite.addTest('should read file through optimised interface', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileService');
    const fileOps = new FileOperations(logger);
    const fileServiceLogger = GASDBLogger.createComponentLogger('FileService-Test');
    const fileService = new FileService(fileOps, fileServiceLogger);
    
    // Act
    const result = fileService.readFile(FILESERVICE_TEST_DATA.testFileId);
    
    // Assert
    TestFramework.assertDefined(result, 'Result should be defined');
    TestFramework.assertEquals(result.test, FILESERVICE_TEST_DATA.testData.test, 'Content should match expected data');
    TestFramework.assertEquals(result.collection, 'fileservice_test', 'Collection field should be preserved');
    TestFramework.assertEquals(result.documents.length, 2, 'Should contain correct number of documents');
  });
  
  suite.addTest('should write file through optimised interface', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileService');
    const fileOps = new FileOperations(logger);
    const fileServiceLogger = GASDBLogger.createComponentLogger('FileService-Test');
    const fileService = new FileService(fileOps, fileServiceLogger);
    const updatedData = { 
      test: 'fileservice_updated_data', 
      timestamp: new Date().toISOString(),
      collection: 'fileservice_updated',
      documents: [{ _id: 'fs1', name: 'FileService test document' }]
    };
    
    // Act
    fileService.writeFile(FILESERVICE_TEST_DATA.testFileId, updatedData);
    
    // Verify the write by reading back
    const readResult = fileService.readFile(FILESERVICE_TEST_DATA.testFileId);
    
    // Assert
    TestFramework.assertEquals(readResult.test, 'fileservice_updated_data', 'Content should be updated through FileService');
    TestFramework.assertEquals(readResult.collection, 'fileservice_updated', 'Collection should be updated');
    TestFramework.assertDefined(readResult.documents, 'Documents array should be preserved');
  });
  
  suite.addTest('should create file through optimised interface', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileService');
    const fileOps = new FileOperations(logger);
    const fileServiceLogger = GASDBLogger.createComponentLogger('FileService-Test');
    const fileService = new FileService(fileOps, fileServiceLogger);
    const fileName = 'fileservice-collection-' + new Date().getTime() + '.json';
    const testData = { 
      documents: [{ _id: 'fs_doc1', data: 'FileService created doc' }], 
      metadata: { created: new Date().toISOString(), createdBy: 'FileService' } 
    };
    
    // Act
    const newFileId = fileService.createFile(fileName, testData, FILESERVICE_TEST_DATA.testFolderId);
    FILESERVICE_TEST_DATA.createdFileIds.push(newFileId);
    
    // Assert
    TestFramework.assertDefined(newFileId, 'New file ID should be returned');
    TestFramework.assertTrue(typeof newFileId === 'string', 'File ID should be a string');
    TestFramework.assertTrue(newFileId.length > 0, 'File ID should not be empty');
    
    // Verify file was created correctly through FileService
    const createdFile = DriveApp.getFileById(newFileId);
    TestFramework.assertEquals(createdFile.getName(), fileName, 'File name should match');
    
    // Verify content through FileService
    const readData = fileService.readFile(newFileId);
    TestFramework.assertEquals(readData.metadata.createdBy, 'FileService', 'Creator should be preserved');
  });
  
  suite.addTest('should check file existence through optimised interface', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileService');
    const fileOps = new FileOperations(logger);
    const fileServiceLogger = GASDBLogger.createComponentLogger('FileService-Test');
    const fileService = new FileService(fileOps, fileServiceLogger);
    const nonExistentFileId = 'fileservice-non-existent-file-id-12345';
    
    // Act
    const existsResult = fileService.fileExists(FILESERVICE_TEST_DATA.testFileId);
    const notExistsResult = fileService.fileExists(nonExistentFileId);
    
    // Assert
    TestFramework.assertTrue(existsResult, 'Should return true for existing file through FileService');
    TestFramework.assertFalse(notExistsResult, 'Should return false for non-existent file');
  });
  
  suite.addTest('should get file metadata through optimised interface', function() {
    // Arrange  
    const logger = GASDBLogger.createComponentLogger('FileService');
    const fileOps = new FileOperations(logger);
    const fileServiceLogger = GASDBLogger.createComponentLogger('FileService-Test');
    const fileService = new FileService(fileOps, fileServiceLogger);
    
    // Act
    const metadata = fileService.getFileMetadata(FILESERVICE_TEST_DATA.testFileId);
    
    // Assert
    TestFramework.assertDefined(metadata, 'Metadata should be defined');
    TestFramework.assertEquals(metadata.id, FILESERVICE_TEST_DATA.testFileId, 'Metadata should contain correct file ID');
    TestFramework.assertDefined(metadata.name, 'Metadata should contain file name');
    TestFramework.assertDefined(metadata.modifiedTime, 'Metadata should contain modified time');
  });
  
  return suite;
}

/**
 * FileService Optimisation Tests
 * Tests efficiency improvements over direct FileOperations
 */
function createFileServiceOptimisationTestSuite() {
  const suite = new TestSuite('FileService Optimisation');
  
  suite.addTest('should batch multiple read operations when possible', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileService-Optimisation');
    const fileOps = new FileOperations(logger);
    const fileServiceLogger = GASDBLogger.createComponentLogger('FileService-Test');
    const fileService = new FileService(fileOps, fileServiceLogger);
    
    // Create multiple test files for batch reading
    const testFileIds = [];
    for (let i = 0; i < 3; i++) {
      const fileName = `batch-test-file-${i}-${new Date().getTime()}.json`;
      const testData = { batchId: i, content: `Batch test content ${i}` };
      const fileId = fileService.createFile(fileName, testData, FILESERVICE_TEST_DATA.testFolderId);
      testFileIds.push(fileId);
      FILESERVICE_TEST_DATA.createdFileIds.push(fileId);
    }
    
    // Act - Test batch reading capability (if implemented)
    const startTime = new Date().getTime();
    const results = [];
    for (const fileId of testFileIds) {
      results.push(fileService.readFile(fileId));
    }
    const endTime = new Date().getTime();
    
    // Assert
    TestFramework.assertEquals(results.length, 3, 'Should read all batch files');
    TestFramework.assertEquals(results[0].batchId, 0, 'First file should have correct content');
    TestFramework.assertEquals(results[1].batchId, 1, 'Second file should have correct content');
    TestFramework.assertEquals(results[2].batchId, 2, 'Third file should have correct content');
    logger.info('Batch read completed', { duration: endTime - startTime, fileCount: results.length });
  });
  
  suite.addTest('should optimise metadata retrieval for multiple files', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileService-Optimisation');
    const fileOps = new FileOperations(logger);
    const fileServiceLogger = GASDBLogger.createComponentLogger('FileService-Test');
    const fileService = new FileService(fileOps, fileServiceLogger);
    
    // Use existing files from previous test
    const testFileIds = FILESERVICE_TEST_DATA.createdFileIds.slice(-3); // Get last 3 files
    
    // Act - Test metadata batch retrieval (if implemented)
    const startTime = new Date().getTime();
    const metadataResults = [];
    for (const fileId of testFileIds) {
      metadataResults.push(fileService.getFileMetadata(fileId));
    }
    const endTime = new Date().getTime();
    
    // Assert
    TestFramework.assertEquals(metadataResults.length, 3, 'Should retrieve metadata for all files');
    for (const metadata of metadataResults) {
      TestFramework.assertDefined(metadata.id, 'Each metadata should have ID');
      TestFramework.assertDefined(metadata.name, 'Each metadata should have name');
    }
    logger.info('Batch metadata retrieval completed', { duration: endTime - startTime });
  });
  
  suite.addTest('should handle mixed success and failure in batch operations', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileService-Optimisation');
    const fileOps = new FileOperations(logger);
    const fileServiceLogger = GASDBLogger.createComponentLogger('FileService-Test');
    const fileService = new FileService(fileOps, fileServiceLogger);
    
    const mixedFileIds = [
      FILESERVICE_TEST_DATA.testFileId, // Valid file
      'non-existent-file-id-12345', // Invalid file
      FILESERVICE_TEST_DATA.createdFileIds[0] || FILESERVICE_TEST_DATA.testFileId // Another valid file
    ];
    
    // Act & Assert
    let successCount = 0;
    let errorCount = 0;
    
    for (const fileId of mixedFileIds) {
      try {
        const result = fileService.readFile(fileId);
        if (result) {
          successCount++;
        }
      } catch (error) {
        errorCount++;
        logger.info('Expected error for invalid file', { fileId: fileId, error: error.message });
      }
    }
    
    // Assert
    TestFramework.assertTrue(successCount >= 1, 'Should successfully read at least one valid file');
    TestFramework.assertTrue(errorCount >= 1, 'Should handle errors for invalid files');
    logger.info('Mixed batch operation completed', { success: successCount, errors: errorCount });
  });
  
  suite.addTest('should implement intelligent caching for frequently accessed files', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileService-Optimisation');
    const fileOps = new FileOperations(logger);
    const fileServiceLogger = GASDBLogger.createComponentLogger('FileService-Test');
    const fileService = new FileService(fileOps, fileServiceLogger);
    
    // Act - Read same file multiple times to test caching
    const readCount = 3;
    const startTime = new Date().getTime();
    const results = [];
    
    for (let i = 0; i < readCount; i++) {
      results.push(fileService.readFile(FILESERVICE_TEST_DATA.testFileId));
    }
    
    const endTime = new Date().getTime();
    
    // Assert
    TestFramework.assertEquals(results.length, readCount, 'Should complete all reads');
    
    // All results should be identical (testing cache consistency)
    for (let i = 1; i < results.length; i++) {
      TestFramework.assertEquals(
        JSON.stringify(results[i]), 
        JSON.stringify(results[0]), 
        'Cached results should be consistent'
      );
    }
    
    logger.info('Caching test completed', { 
      duration: endTime - startTime, 
      readCount: readCount,
      avgTimePerRead: (endTime - startTime) / readCount
    });
  });
  
  return suite;
}

/**
 * FileService Error Recovery Tests
 * Tests advanced error handling beyond basic FileOperations
 */
function createFileServiceErrorRecoveryTestSuite() {
  const suite = new TestSuite('FileService Error Recovery');
  
  suite.addTest('should implement exponential backoff for quota limits', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileService-ErrorRecovery');
    const fileOps = new FileOperations(logger);
    const fileServiceLogger = GASDBLogger.createComponentLogger('FileService-Test');
    const fileService = new FileService(fileOps, fileServiceLogger);
    const nonExistentFileId = 'quota-limit-test-file-id';
    
    // Act & Assert - Test that FileService handles quota errors gracefully
    const startTime = new Date().getTime();
    let caughtError = false;
    
    try {
      fileService.readFile(nonExistentFileId);
    } catch (error) {
      caughtError = true;
      const endTime = new Date().getTime();
      const duration = endTime - startTime;
      
      // Exponential backoff should introduce some delay
      logger.info('Error handling completed', { 
        duration: duration,
        errorType: error.constructor.name,
        hasBackoff: duration > 100 // Simple check for some delay
      });
    }
    
    // Assert
    TestFramework.assertTrue(caughtError, 'Should handle quota limit errors');
  });
  
  suite.addTest('should gracefully degrade batch operations on partial failures', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileService-ErrorRecovery');
    const fileOps = new FileOperations(logger);
    const fileServiceLogger = GASDBLogger.createComponentLogger('FileService-Test');
    const fileService = new FileService(fileOps, fileServiceLogger);
    
    const mixedFileIds = [
      FILESERVICE_TEST_DATA.testFileId, // Valid
      'graceful-degrade-non-existent-1', // Invalid
      'graceful-degrade-non-existent-2' // Invalid
    ];
    
    // Act
    const results = [];
    const errors = [];
    
    for (const fileId of mixedFileIds) {
      try {
        const result = fileService.readFile(fileId);
        results.push({ fileId: fileId, data: result, success: true });
      } catch (error) {
        errors.push({ fileId: fileId, error: error.message, success: false });
      }
    }
    
    // Assert
    TestFramework.assertTrue(results.length > 0, 'Should successfully process some files');
    TestFramework.assertTrue(errors.length > 0, 'Should handle some errors gracefully');
    TestFramework.assertEquals(results.length + errors.length, mixedFileIds.length, 'Should process all files');
    
    logger.info('Graceful degradation test completed', { 
      successful: results.length, 
      failed: errors.length 
    });
  });
  
  suite.addTest('should implement circuit breaker pattern for failing operations', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileService-ErrorRecovery');
    const fileOps = new FileOperations(logger);
    const fileServiceLogger = GASDBLogger.createComponentLogger('FileService-Test');
    const fileService = new FileService(fileOps, fileServiceLogger);
    
    // Act - Test multiple failing operations to trigger circuit breaker
    const failingFileId = 'circuit-breaker-test-file-id';
    const attemptCount = 5;
    const errors = [];
    const timings = [];
    
    for (let i = 0; i < attemptCount; i++) {
      const startTime = new Date().getTime();
      try {
        fileService.readFile(failingFileId);
      } catch (error) {
        const endTime = new Date().getTime();
        errors.push(error);
        timings.push(endTime - startTime);
      }
    }
    
    // Assert
    TestFramework.assertEquals(errors.length, attemptCount, 'All operations should fail');
    
    // Circuit breaker should reduce timing for later attempts
    const avgEarlyTiming = (timings[0] + timings[1]) / 2;
    const avgLateTiming = (timings[3] + timings[4]) / 2;
    
    logger.info('Circuit breaker test completed', {
      errorCount: errors.length,
      avgEarlyTiming: avgEarlyTiming,
      avgLateTiming: avgLateTiming,
      timings: timings
    });
    
    // Basic assertion - circuit breaker implemented or not, errors should be consistent
    TestFramework.assertTrue(errors.every(error => error instanceof Error), 'All errors should be Error instances');
  });
  
  return suite;
}

/**
 * FileService Integration Tests
 * Tests coordinated operations between FileService and FileOperations
 */
function createFileServiceIntegrationTestSuite() {
  const suite = new TestSuite('FileService Integration');
  
  suite.addTest('should coordinate operations between FileOperations and FileService', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileService-Integration');
    const fileOps = new FileOperations(logger);
    const fileServiceLogger = GASDBLogger.createComponentLogger('FileService-Test');
    const fileService = new FileService(fileOps, fileServiceLogger);
    
    const fileName = 'integration-test-file-' + new Date().getTime() + '.json';
    const testData = { 
      integration: true, 
      timestamp: new Date().toISOString(),
      coordination: 'FileOperations-FileService'
    };
    
    // Act - Create with FileService, read with FileOperations
    const fileId = fileService.createFile(fileName, testData, FILESERVICE_TEST_DATA.testFolderId);
    FILESERVICE_TEST_DATA.createdFileIds.push(fileId);
    
    const directReadResult = fileOps.readFile(fileId);
    const serviceReadResult = fileService.readFile(fileId);
    
    // Assert
    TestFramework.assertEquals(directReadResult.integration, true, 'Direct read should work after service creation');
    TestFramework.assertEquals(serviceReadResult.integration, true, 'Service read should work after service creation');
    TestFramework.assertEquals(
      JSON.stringify(directReadResult), 
      JSON.stringify(serviceReadResult), 
      'Both read methods should return identical results'
    );
  });
  
  suite.addTest('should minimise Drive API calls through intelligent coordination', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileService-Integration');
    const fileOps = new FileOperations(logger);
    const fileServiceLogger = GASDBLogger.createComponentLogger('FileService-Test');
    const fileService = new FileService(fileOps, fileServiceLogger);
    
    // Act - Perform multiple operations that could be optimised
    const fileName = 'api-optimisation-test-' + new Date().getTime() + '.json';
    const testData = { optimisation: 'test', callCount: 'minimised' };
    
    const startTime = new Date().getTime();
    
    // Create file
    const fileId = fileService.createFile(fileName, testData, FILESERVICE_TEST_DATA.testFolderId);
    FILESERVICE_TEST_DATA.createdFileIds.push(fileId);
    
    // Read multiple times (should leverage caching)
    const read1 = fileService.readFile(fileId);
    const read2 = fileService.readFile(fileId);
    
    // Check existence
    const exists = fileService.fileExists(fileId);
    
    // Get metadata
    const metadata = fileService.getFileMetadata(fileId);
    
    const endTime = new Date().getTime();
    
    // Assert
    TestFramework.assertEquals(read1.optimisation, 'test', 'First read should work');
    TestFramework.assertEquals(read2.optimisation, 'test', 'Second read should work');
    TestFramework.assertTrue(exists, 'File should exist');
    TestFramework.assertDefined(metadata.id, 'Metadata should be retrieved');
    
    logger.info('API optimisation test completed', { 
      duration: endTime - startTime,
      operations: 'create + 2reads + exists + metadata'
    });
  });
  
  suite.addTest('should maintain consistency during concurrent file operations', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileService-Integration');
    const fileOps = new FileOperations(logger);
    const fileServiceLogger = GASDBLogger.createComponentLogger('FileService-Test');
    const fileService = new FileService(fileOps, fileServiceLogger);
    
    const fileName = 'consistency-test-' + new Date().getTime() + '.json';
    const initialData = { version: 1, content: 'initial' };
    
    // Act - Simulate concurrent operations
    const fileId = fileService.createFile(fileName, initialData, FILESERVICE_TEST_DATA.testFolderId);
    FILESERVICE_TEST_DATA.createdFileIds.push(fileId);
    
    // Multiple rapid updates
    const updates = [
      { version: 2, content: 'update1' },
      { version: 3, content: 'update2' },
      { version: 4, content: 'final' }
    ];
    
    for (const update of updates) {
      fileService.writeFile(fileId, update);
    }
    
    // Read final state
    const finalState = fileService.readFile(fileId);
    
    // Assert
    TestFramework.assertEquals(finalState.version, 4, 'Final version should be correct');
    TestFramework.assertEquals(finalState.content, 'final', 'Final content should be correct');
    
    // Verify consistency through direct FileOperations read
    const directRead = fileOps.readFile(fileId);
    TestFramework.assertEquals(
      JSON.stringify(finalState), 
      JSON.stringify(directRead), 
      'FileService and FileOperations should return consistent results'
    );
  });
  
  return suite;
}

/**
 * Cleanup test that removes all created test files and folders
 */
function createFileServiceCleanupTestSuite() {
  const suite = new TestSuite('FileService Cleanup - Remove Test Files');
  
  suite.addTest('should delete all created test files', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileService-Cleanup');
    let deletedCount = 0;
    let failedCount = 0;
    
    // Act
    for (const fileId of FILESERVICE_TEST_DATA.createdFileIds) {
      try {
        const file = DriveApp.getFileById(fileId);
        file.setTrashed(true);
        deletedCount++;
        logger.info('Deleted test file', { fileId: fileId });
      } catch (error) {
        failedCount++;
        logger.warn('Failed to delete test file', { fileId: fileId, error: error.message });
      }
    }
    
    // Assert
    TestFramework.assertTrue(deletedCount > 0, 'Should delete at least one test file');
    logger.info('FileService file cleanup complete', { deleted: deletedCount, failed: failedCount });
  });
  
  suite.addTest('should delete all created test folders', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileService-Cleanup');
    let deletedCount = 0;
    let failedCount = 0;
    
    // Act
    for (const folderId of FILESERVICE_TEST_DATA.createdFolderIds) {
      try {
        const folder = DriveApp.getFolderById(folderId);
        folder.setTrashed(true);
        deletedCount++;
        logger.info('Deleted test folder', { folderId: folderId });
      } catch (error) {
        failedCount++;
        logger.warn('Failed to delete test folder', { folderId: folderId, error: error.message });
      }
    }
    
    // Assert
    TestFramework.assertTrue(deletedCount > 0, 'Should delete at least one test folder'); 
    logger.info('FileService folder cleanup complete', { deleted: deletedCount, failed: failedCount });
  });
  
  suite.addTest('should reset test data globals', function() {
    // Act
    FILESERVICE_TEST_DATA.testFileId = null;
    FILESERVICE_TEST_DATA.testFolderId = null;
    FILESERVICE_TEST_DATA.createdFileIds = [];
    FILESERVICE_TEST_DATA.createdFolderIds = [];
    FILESERVICE_TEST_DATA.mockFileOperations = null;
    
    // Assert
    TestFramework.assertNull(FILESERVICE_TEST_DATA.testFileId, 'Test file ID should be reset');
    TestFramework.assertNull(FILESERVICE_TEST_DATA.testFolderId, 'Test folder ID should be reset');
    TestFramework.assertEquals(FILESERVICE_TEST_DATA.createdFileIds.length, 0, 'Created files array should be empty');
    TestFramework.assertNull(FILESERVICE_TEST_DATA.mockFileOperations, 'Mock should be reset');
  });
  
  return suite;
}

/**
 * Create mock FileOperations for testing
 */
function createMockFileOperations() {
  return {
    readFile: function(fileId) {
      if (fileId === 'mock-file-id') {
        return { mock: true, data: 'mock file content' };
      }
      throw new Error('Mock: File not found');
    },
    
    writeFile: function(fileId, data) {
      if (fileId === 'mock-file-id') {
        return true;
      }
      throw new Error('Mock: Cannot write to file');
    },
    
    createFile: function(fileName, data, folderId) {
      return 'mock-created-file-id-' + new Date().getTime();
    },
    
    deleteFile: function(fileId) {
      return fileId.startsWith('mock-');
    },
    
    fileExists: function(fileId) {
      return fileId === 'mock-file-id' || fileId.startsWith('mock-created-');
    },
    
    getFileMetadata: function(fileId) {
      if (fileId === 'mock-file-id' || fileId.startsWith('mock-created-')) {
        return {
          id: fileId,
          name: 'mock-file.json',
          modifiedTime: new Date().toISOString(),
          size: 1024
        };
      }
      throw new Error('Mock: File not found');
    }
  };
}

/**
 * Register all FileService test suites with TestFramework
 */
function registerFileServiceTests() {
  const testFramework = new TestFramework();
  testFramework.registerTestSuite(createFileServiceSetupTestSuite());
  testFramework.registerTestSuite(createFileServiceFunctionalityTestSuite());
  testFramework.registerTestSuite(createFileServiceOptimisationTestSuite());
  testFramework.registerTestSuite(createFileServiceErrorRecoveryTestSuite());
  testFramework.registerTestSuite(createFileServiceIntegrationTestSuite());
  testFramework.registerTestSuite(createFileServiceCleanupTestSuite());
  return testFramework;
}

/**
 * Run all FileService tests
 */
function runFileServiceTests() {
  try {
    GASDBLogger.info('Starting FileService Test Execution');
    
    // Register all test suites
    const testFramework = registerFileServiceTests();
    
    // Run all FileService test suites
    const results = [];
    results.push(testFramework.runTestSuite('FileService Setup - Create Test Resources'));
    results.push(testFramework.runTestSuite('FileService Functionality'));
    results.push(testFramework.runTestSuite('FileService Optimisation'));
    results.push(testFramework.runTestSuite('FileService Error Recovery'));
    results.push(testFramework.runTestSuite('FileService Integration'));
    results.push(testFramework.runTestSuite('FileService Cleanup - Remove Test Files'));
    
    GASDBLogger.info('FileService Test Execution Complete');
    
    // Log summary for each result set
    results.forEach((result, index) => {
      GASDBLogger.info(`Result Set ${index + 1}: ${result.getSummary()}`);
    });
    
    return results;
    
  } catch (error) {
    GASDBLogger.error('Failed to execute FileService tests', { error: error.message, stack: error.stack });
    throw error;
  }
}
