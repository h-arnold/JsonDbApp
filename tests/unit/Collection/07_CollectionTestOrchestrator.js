/**
 * CollectionTest.js - Collection Class Tests
 *
 * Comprehensive tests for the Collection class including:
 * - MongoDB-compatible API
 * - Lazy loading and memory management
 * - File persistence and dirty tracking
 * - Integration with CollectionMetadata and DocumentOperations
 *
 * Following TDD Red-Green-Refactor cycle for Section 5 implementation
 */

// Global test data storage for Collection tests
const COLLECTION_TEST_DATA = {
  testFolderId: null,
  testFolderName: "GASDB_Test_Collection_" + new Date().getTime(),
  testFileId: null,
  testFileName: "test_collection.json",
  testCollectionName: "test_collection",
  createdFileIds: [], // Track all files created for cleanup
  createdFolderIds: [], // Track all folders created for cleanup
  testCollection: null,
  testFileService: null,
  testDatabase: null,
};

/**
 * Setup collection test environment
 */
function setupCollectionTestEnvironment() {
  const logger = GASDBLogger.createComponentLogger("Collection-Setup");

  try {
    const folder = DriveApp.createFolder(COLLECTION_TEST_DATA.testFolderName);
    COLLECTION_TEST_DATA.testFolderId = folder.getId();
    COLLECTION_TEST_DATA.createdFolderIds.push(
      COLLECTION_TEST_DATA.testFolderId
    );

    // Create FileService instance with proper dependencies
    const fileOps = new FileOperations(logger);
    COLLECTION_TEST_DATA.testFileService = new FileService(fileOps, logger);

    // Create mock database object
    COLLECTION_TEST_DATA.testDatabase = {
      _markDirty: function () {
        /* mock implementation */
      },
    };

    logger.info("Created test folder for Collection", {
      folderId: COLLECTION_TEST_DATA.testFolderId,
      name: COLLECTION_TEST_DATA.testFolderName,
    });
  } catch (error) {
    logger.error("Failed to create test folder for Collection", {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Clean up collection test environment
 */
function cleanupCollectionTestEnvironment() {
  const logger = GASDBLogger.createComponentLogger("Collection-Cleanup");
  let cleanedFiles = 0;
  let failedFiles = 0;
  let cleanedFolders = 0;
  let failedFolders = 0;

  // Clean up created test files
  COLLECTION_TEST_DATA.createdFileIds.forEach((fileId) => {
    try {
      const file = DriveApp.getFileById(fileId);
      file.setTrashed(true);
      cleanedFiles++;
    } catch (error) {
      failedFiles++;
      logger.warn("Failed to delete file", { fileId, error: error.message });
    }
  });

  // Clean up created test folders
  COLLECTION_TEST_DATA.createdFolderIds.forEach((folderId) => {
    try {
      const folder = DriveApp.getFolderById(folderId);
      folder.setTrashed(true);
      cleanedFolders++;
    } catch (error) {
      failedFolders++;
      logger.warn("Failed to delete folder", {
        folderId,
        error: error.message,
      });
    }
  });

  // Reset test data
  COLLECTION_TEST_DATA.createdFileIds = [];
  COLLECTION_TEST_DATA.createdFolderIds = [];
  COLLECTION_TEST_DATA.testCollection = null;
  COLLECTION_TEST_DATA.testFileId = null;

  logger.info("Collection test cleanup completed", {
    cleanedFiles,
    failedFiles,
    cleanedFolders,
    failedFolders,
  });
}

/**
 * Helper function to create a test collection file
 */
function createTestCollectionFile() {
  const folder = DriveApp.getFolderById(COLLECTION_TEST_DATA.testFolderId);
  const fileName = "test_collection_" + new Date().getTime() + ".json";

  // Create proper test data with ISO date strings
  const testData = {
    documents: {},
    metadata: {
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      documentCount: 0,
    },
  };

  const file = folder.createFile(fileName, JSON.stringify(testData, null, 2));
  const fileId = file.getId();
  COLLECTION_TEST_DATA.createdFileIds.push(fileId);
  return fileId;
}
/**
 * Run all Collection tests
 * This function orchestrates all test suites for Collection
 */
function runCollectionTests() {
  try {
    GASDBLogger.info("Starting Collection Test Execution");

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
    GASDBLogger.error("Failed to execute Collection tests", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  } finally {
    GASDBLogger.info("Collection Test Execution Complete");
  }
}
