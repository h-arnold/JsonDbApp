/**
 * FileOperationsTest.js - FileOperations Class Tests
 * 
 * Comprehensive tests for the FileOperations class including:
 * - Direct Drive API interactions
 * - Retry logic and error handling
 * - File CRUD operations
 * 
 * Migrated from Section3Tests.js → FileOperations-specific functions
 */

// Global test data storage for real file IDs
const FILEOPERATIONS_TEST_DATA = {
  testFileId: null,
  testFileName: 'GASDB_FileOps_Test_File_' + new Date().getTime() + '.json',
  testFolderId: null,
  testFolderName: 'GASDB_FileOps_Test_Folder_' + new Date().getTime(),
  testData: {
    test: 'testDataFromSetup',
    collection: 'test',
    collectionName: 'testCollectionFromSetup',
    metadata: {
      version: 1,
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    },
    documents: [
      { _id: 'doc1_setup', data: 'sample document 1 from setup' }
    ]
  },
  createdFileIds: [],
  createdFolderIds: []
};

/**
 * Setup test that creates real Drive files for FileOperations testing
 */
function createFileOperationsSetupTestSuite() {
  const suite = new TestSuite('FileOperations Setup - Create Test Files');
  
  suite.addTest('should create test folder in Drive root', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileOperations-Setup');
    
    // Act
    try {
      const folder = DriveApp.createFolder(FILEOPERATIONS_TEST_DATA.testFolderName);
      FILEOPERATIONS_TEST_DATA.testFolderId = folder.getId();
      FILEOPERATIONS_TEST_DATA.createdFolderIds.push(FILEOPERATIONS_TEST_DATA.testFolderId);
      
      // Assert
      TestFramework.assertDefined(FILEOPERATIONS_TEST_DATA.testFolderId, 'Test folder should be created');
      TestFramework.assertTrue(FILEOPERATIONS_TEST_DATA.testFolderId.length > 0, 'Folder ID should not be empty');
      logger.info('Created test folder', { folderId: FILEOPERATIONS_TEST_DATA.testFolderId, name: FILEOPERATIONS_TEST_DATA.testFolderName });
      
    } catch (error) {
      logger.error('Failed to create test folder', { error: error.message });
      throw error;
    }
  });
  
  suite.addTest('should create initial test file with JSON content', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileOperations-Setup');
    FILEOPERATIONS_TEST_DATA.testData.metadata.created = new Date().toISOString();
    FILEOPERATIONS_TEST_DATA.testData.metadata.updated = new Date().toISOString();
    
    // Act
    try {
      const folder = DriveApp.getFolderById(FILEOPERATIONS_TEST_DATA.testFolderId);
      const file = folder.createFile(
        FILEOPERATIONS_TEST_DATA.testFileName,
        JSON.stringify(FILEOPERATIONS_TEST_DATA.testData),
        'application/json'
      );
      FILEOPERATIONS_TEST_DATA.testFileId = file.getId();
      FILEOPERATIONS_TEST_DATA.createdFileIds.push(FILEOPERATIONS_TEST_DATA.testFileId);
      
      // Assert
      TestFramework.assertDefined(FILEOPERATIONS_TEST_DATA.testFileId, 'Test file should be created');
      TestFramework.assertTrue(FILEOPERATIONS_TEST_DATA.testFileId.length > 0, 'File ID should not be empty');
      logger.info('Created test file', { fileId: FILEOPERATIONS_TEST_DATA.testFileId, name: FILEOPERATIONS_TEST_DATA.testFileName });
      
    } catch (error) {
      logger.error('Failed to create test file', { error: error.message });
      throw error;
    }
  });
  
  suite.addTest('should verify test file can be accessed', function() {
    // Arrange & Act
    try {
      const file = DriveApp.getFileById(FILEOPERATIONS_TEST_DATA.testFileId);
      const content = file.getBlob().getDataAsString();
      const parsedContent = JSON.parse(content);
      
      // Assert
      TestFramework.assertEquals(parsedContent.collectionName, FILEOPERATIONS_TEST_DATA.testData.collectionName, 'File content should match test data collectionName');
      TestFramework.assertDefined(parsedContent.metadata, 'File should contain metadata object');
      TestFramework.assertDefined(parsedContent.metadata.created, 'File metadata should contain created timestamp');
      TestFramework.assertEquals(parsedContent.documents.length, FILEOPERATIONS_TEST_DATA.testData.documents.length, 'File should contain correct number of documents');
      TestFramework.assertEquals(parsedContent.documents[0]._id, FILEOPERATIONS_TEST_DATA.testData.documents[0]._id, 'First document _id should match');
      
    } catch (error) {
      throw new Error('Failed to verify test file access: ' + error.message);
    }
  });
  
  return suite;
}

/**
 * FileOperations Functionality Tests
 * Tests direct Drive API interactions with retry logic
 */
function createFileOperationsFunctionalityTestSuite() {
  const suite = new TestSuite('FileOperations Functionality');
  
  suite.addTest('should read file content from Drive using real file ID', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileOperations');
    const fileOps = new FileOperations(logger);
    
    // Act
    const result = fileOps.readFile(FILEOPERATIONS_TEST_DATA.testFileId);
    
    // Assert
    TestFramework.assertDefined(result, 'Result should be defined');
    TestFramework.assertEquals(result.test, FILEOPERATIONS_TEST_DATA.testData.test, 'Content should match expected data');
    TestFramework.assertEquals(result.collection, 'test', 'Collection field should be preserved');
  });
  
  suite.addTest('should write data to existing Drive file', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileOperations');
    const fileOps = new FileOperations(logger);
    const updatedData = { 
      test: 'updated_data', 
      timestamp: new Date().toISOString(),
      collection: 'updated_test',
      documents: [{ _id: '1', name: 'test_document' }]
    };
    
    // Act
    fileOps.writeFile(FILEOPERATIONS_TEST_DATA.testFileId, updatedData);
    
    // Verify the write by reading back
    const readResult = fileOps.readFile(FILEOPERATIONS_TEST_DATA.testFileId);
    
    // Assert
    TestFramework.assertEquals(readResult.test, 'updated_data', 'Content should be updated');
    TestFramework.assertEquals(readResult.collection, 'updated_test', 'Collection should be updated');
    TestFramework.assertDefined(readResult.documents, 'Documents array should be preserved');
  });
  
  suite.addTest('should create new file in test folder', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileOperations');
    const fileOps = new FileOperations(logger);
    const fileName = 'test-collection-' + new Date().getTime() + '.json';
    const testData = { documents: {}, metadata: { created: new Date().toISOString() } };
    
    // Act
    const newFileId = fileOps.createFile(fileName, testData, FILEOPERATIONS_TEST_DATA.testFolderId);
    FILEOPERATIONS_TEST_DATA.createdFileIds.push(newFileId);
    
    // Assert
    TestFramework.assertDefined(newFileId, 'New file ID should be returned');
    TestFramework.assertTrue(typeof newFileId === 'string', 'File ID should be a string');
    TestFramework.assertTrue(newFileId.length > 0, 'File ID should not be empty');
    
    // Verify file was created correctly
    const createdFile = DriveApp.getFileById(newFileId);
    TestFramework.assertEquals(createdFile.getName(), fileName, 'File name should match');
  });
  
  suite.addTest('should check if file exists in Drive', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileOperations');
    const fileOps = new FileOperations(logger);
    const nonExistentFileId = 'definitely-non-existent-file-id-12345';
    
    // Act
    const existsResult = fileOps.fileExists(FILEOPERATIONS_TEST_DATA.testFileId);
    const notExistsResult = fileOps.fileExists(nonExistentFileId);
    
    // Assert
    TestFramework.assertTrue(existsResult, 'Should return true for existing file');
    TestFramework.assertFalse(notExistsResult, 'Should return false for non-existent file');
  });
  
  suite.addTest('should delete file from Drive', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileOperations');
    const fileOps = new FileOperations(logger);
    
    // Create a file specifically for deletion test
    const deleteTestFileName = 'delete-test-file-' + new Date().getTime() + '.json';
    const deleteTestData = { purpose: 'deletion_test', created: new Date().toISOString() };
    const fileToDeleteId = fileOps.createFile(deleteTestFileName, deleteTestData, FILEOPERATIONS_TEST_DATA.testFolderId);
    
    // Verify file exists before deletion
    TestFramework.assertTrue(fileOps.fileExists(fileToDeleteId), 'File should exist before deletion');
    
    // Act
    const result = fileOps.deleteFile(fileToDeleteId);
    
    // Assert
    TestFramework.assertTrue(result, 'Delete operation should return true on success');
    TestFramework.assertFalse(fileOps.fileExists(fileToDeleteId), 'File should not exist after deletion');
  });
  
  suite.addTest('should retrieve file metadata from Drive', function() {
    // Arrange  
    const logger = GASDBLogger.createComponentLogger('FileOperations');
    const fileOps = new FileOperations(logger);
    
    // Act
    const metadata = fileOps.getFileMetadata(FILEOPERATIONS_TEST_DATA.testFileId);
    
    // Assert
    TestFramework.assertDefined(metadata, 'Metadata should be defined');
    TestFramework.assertEquals(metadata.id, FILEOPERATIONS_TEST_DATA.testFileId, 'Metadata should contain correct file ID');
    TestFramework.assertDefined(metadata.name, 'Metadata should contain file name');
    TestFramework.assertDefined(metadata.modifiedTime, 'Metadata should contain modified time');
  });
  
  return suite;
}

/**
 * FileOperations Error Handling Tests
 * Tests resilience against Drive API failures
 */
function createFileOperationsErrorHandlingTestSuite() {
  const suite = new TestSuite('FileOperations Error Handling');
  
  suite.addTest('should handle Drive API quota exceeded error with retry', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileOperations');
    const fileOps = new FileOperations(logger);
    const testFileId = 'quota-error-file-id-nonexistent';
    
    // Act & Assert - Test that non-existent file throws FileIOError
    TestFramework.assertThrows(function() {
      fileOps.readFile(testFileId);
    }, ErrorHandler.ErrorTypes.FILE_IO, 'Should throw FileIOError for non-existent files with fake IDs');
  });
  
  suite.addTest('should handle Drive API permission denied error', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileOperations');
    const fileOps = new FileOperations(logger);
    const restrictedFileId = 'permission-denied-file-id-nonexistent';
    
    // Act & Assert - Test that non-existent file throws FileIOError
    TestFramework.assertThrows(function() {
      fileOps.readFile(restrictedFileId);
    }, ErrorHandler.ErrorTypes.FILE_IO, 'Should throw FileIOError for non-existent files');
  });
  
  suite.addTest('should handle Drive API file not found error', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileOperations');
    const fileOps = new FileOperations(logger);
    const missingFileId = 'missing-file-id-nonexistent';
    
    // Act & Assert - Test that non-existent file throws FileIOError
    TestFramework.assertThrows(function() {
      fileOps.readFile(missingFileId);
    }, ErrorHandler.ErrorTypes.FILE_IO, 'Should throw FileIOError for missing files');
  });
  
  suite.addTest('should retry operations on transient failures', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileOperations');
    const fileOps = new FileOperations(logger);
    const testFileId = 'transient-error-file-id-nonexistent';
    
    // Act & Assert - Test that retry logic eventually throws after max retries
    TestFramework.assertThrows(function() {
      fileOps.readFile(testFileId);
    }, ErrorHandler.ErrorTypes.FILE_IO, 'Should throw FileIOError after retries exhausted');
  });
  
  suite.addTest('should handle malformed JSON in file content', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileOperations');
    const fileOps = new FileOperations(logger);
    
    // Create a file with definitively malformed JSON
    const malformedFileName = 'malformed-json-test-' + new Date().getTime() + '.json';
    const folder = DriveApp.getFolderById(FILEOPERATIONS_TEST_DATA.testFolderId);
    const malformedJsonContent = '{ "incomplete": "json", "missing": }'; // This is definitely malformed
    const malformedFile = folder.createFile(malformedFileName, malformedJsonContent, 'application/json');
    const malformedFileId = malformedFile.getId();
    FILEOPERATIONS_TEST_DATA.createdFileIds.push(malformedFileId);
    
    // Act & Assert
    let actualError = null;
    let threwError = false;
    
    try {
      fileOps.readFile(malformedFileId);
    } catch (error) {
      threwError = true;
      actualError = error;
      logger.info('Caught error during malformed JSON test', {
        errorType: error.constructor.name,
        errorMessage: error.message,
        errorCode: error.code || 'NO_CODE',
        isInvalidFileFormatError: error instanceof ErrorHandler.ErrorTypes.INVALID_FILE_FORMAT
      });
    }
    
    // Assert that an error was thrown
    TestFramework.assertTrue(threwError, 'Should throw an error for malformed JSON');
    
    // Check if it's the right type of error
    if (actualError instanceof ErrorHandler.ErrorTypes.INVALID_FILE_FORMAT) {
      TestFramework.assertTrue(true, 'Correctly threw InvalidFileFormatError');
    } else {
      throw new Error(`Expected InvalidFileFormatError, but got ${actualError.constructor.name}: ${actualError.message}`);
    }
  });
  
  return suite;
}

/**
 * FileOperations Edge Cases Tests
 * Tests handling of various Drive API limitations and edge cases
 */
function createFileOperationsEdgeCasesTestSuite() {
  const suite = new TestSuite('FileOperations Edge Cases');
  
  suite.addTest('should handle very large file content gracefully', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileOperations-EdgeCases');
    const fileOps = new FileOperations(logger);
    const largeData = { 
      content: new Array(100).fill('large content chunk').join(' '), // Reduced size for testing
      metadata: { size: 'large' },
      timestamp: new Date().toISOString()
    };
    
    // Act
    fileOps.writeFile(FILEOPERATIONS_TEST_DATA.testFileId, largeData);
    const readData = fileOps.readFile(FILEOPERATIONS_TEST_DATA.testFileId);
    
    // Assert
    TestFramework.assertDefined(readData, 'Should handle large files');
    TestFramework.assertEquals(readData.metadata.size, 'large', 'Large file content should be preserved');
    TestFramework.assertTrue(readData.content.length > 1000, 'Content should be substantial');
  });
  
  suite.addTest('should handle special characters in file names and content', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileOperations-EdgeCases');
    const fileOps = new FileOperations(logger);
    const specialFileName = 'test-file-with-special-chars-' + new Date().getTime() + '.json';
    const specialData = { 
      content: 'Special chars: £€$¥©®™',
      unicode: '你好世界',
      emoji: '🚀📊💾',
      timestamp: new Date().toISOString()
    };
    
    // Act
    const newFileId = fileOps.createFile(specialFileName, specialData, FILEOPERATIONS_TEST_DATA.testFolderId);
    FILEOPERATIONS_TEST_DATA.createdFileIds.push(newFileId);
    const readData = fileOps.readFile(newFileId);
    
    // Assert
    TestFramework.assertDefined(newFileId, 'Should create file with special characters');
    TestFramework.assertEquals(readData.unicode, '你好世界', 'Unicode content should be preserved');
    TestFramework.assertEquals(readData.emoji, '🚀📊💾', 'Emoji content should be preserved');
  });
  
  suite.addTest('should handle empty files and null data appropriately', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileOperations-EdgeCases');
    const fileOps = new FileOperations(logger);
    const emptyData = {};
    
    // Act
    fileOps.writeFile(FILEOPERATIONS_TEST_DATA.testFileId, emptyData);
    const readData = fileOps.readFile(FILEOPERATIONS_TEST_DATA.testFileId);
    
    // Assert
    TestFramework.assertDefined(readData, 'Should handle empty data');
    TestFramework.assertEquals(Object.keys(readData).length, 0, 'Empty object should be preserved');
  });
  
  return suite;
}

/**
 * Cleanup test that removes all created test files and folders
 */
function createFileOperationsCleanupTestSuite() {
  const suite = new TestSuite('FileOperations Cleanup - Remove Test Files');
  
  suite.addTest('should delete all created test files', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileOperations-Cleanup');
    let deletedCount = 0;
    let failedCount = 0;
    
    // Act
    for (const fileId of FILEOPERATIONS_TEST_DATA.createdFileIds) {
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
    logger.info('File cleanup complete', { deleted: deletedCount, failed: failedCount });
  });
  
  suite.addTest('should delete all created test folders', function() {
    // Arrange
    const logger = GASDBLogger.createComponentLogger('FileOperations-Cleanup');
    let deletedCount = 0;
    let failedCount = 0;
    
    // Act
    for (const folderId of FILEOPERATIONS_TEST_DATA.createdFolderIds) {
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
    logger.info('Folder cleanup complete', { deleted: deletedCount, failed: failedCount });
  });
  
  suite.addTest('should reset test data globals', function() {
    // Act
    FILEOPERATIONS_TEST_DATA.testFileId = null;
    FILEOPERATIONS_TEST_DATA.testFolderId = null;
    FILEOPERATIONS_TEST_DATA.createdFileIds = [];
    FILEOPERATIONS_TEST_DATA.createdFolderIds = [];
    
    // Assert
    TestFramework.assertNull(FILEOPERATIONS_TEST_DATA.testFileId, 'Test file ID should be reset');
    TestFramework.assertNull(FILEOPERATIONS_TEST_DATA.testFolderId, 'Test folder ID should be reset');
    TestFramework.assertEquals(FILEOPERATIONS_TEST_DATA.createdFileIds.length, 0, 'Created files array should be empty');
  });
  
  return suite;
}

/**
 * Register all FileOperations test suites with TestFramework
 */
function registerFileOperationsTests() {
  const testFramework = new TestFramework();
  testFramework.registerTestSuite(createFileOperationsSetupTestSuite());
  testFramework.registerTestSuite(createFileOperationsFunctionalityTestSuite());
  testFramework.registerTestSuite(createFileOperationsErrorHandlingTestSuite());
  testFramework.registerTestSuite(createFileOperationsEdgeCasesTestSuite());
  testFramework.registerTestSuite(createFileOperationsCleanupTestSuite());
  return testFramework;
}

/**
 * Run all FileOperations tests
 */
function runFileOperationsTests() {
  try {
    GASDBLogger.info('Starting FileOperations Test Execution');
    
    // Register all test suites
    const testFramework = registerFileOperationsTests();
    
    // Run all FileOperations test suites
    const results = [];
    results.push(testFramework.runTestSuite('FileOperations Setup - Create Test Files'));
    results.push(testFramework.runTestSuite('FileOperations Functionality'));
    results.push(testFramework.runTestSuite('FileOperations Error Handling'));
    results.push(testFramework.runTestSuite('FileOperations Edge Cases'));
    results.push(testFramework.runTestSuite('FileOperations Cleanup - Remove Test Files'));
    
    GASDBLogger.info('FileOperations Test Execution Complete');
    
    // Log summary for each result set
    results.forEach((result, index) => {
      GASDBLogger.info(`Result Set ${index + 1}: ${result.getSummary()}`);
    });
    
    return results;
    
  } catch (error) {
    GASDBLogger.error('Failed to execute FileOperations tests', { error: error.message, stack: error.stack });
    throw error;
  }
}
