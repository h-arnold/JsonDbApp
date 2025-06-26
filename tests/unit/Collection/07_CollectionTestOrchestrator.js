/**
 * CollectionTest.js - Collection Class Tests
 *
 * Comprehensive tests for the Collection class including:
 * - MongoDB-compatible API
 * - Lazy loading and memory management
 * - File persistence and dirty tracking
 * - Integration with CollectionMetadata and DocumentOperations
 *
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
  testMasterIndex: null,

  // Master index data structure (similar to CollectionCoordinator tests)
  masterIndexData: {
    "version": 1,
    "lastUpdated": new Date().toISOString(),
    "collections": {},
    "modificationHistory": {}
  },

  // Collection metadata structure
  collectionMetadataData: {
    "__type": "CollectionMetadata",
    "created": new Date().toISOString(),
    "lastUpdated": new Date().toISOString(),
    "documentCount": 0,
    "name": "test_collection",
    "fileId": "placeholder-file-id", // Will be replaced with actual file ID
    "modificationToken": "initial-token-" + new Date().getTime(),
    "lockStatus": null
  }
};

/**
 * Setup collection test environment
 */
/**
 * Sets up the test environment for Collection-related unit tests.
 * 
 * This function performs the following:
 * - Creates a test folder in Google Drive and stores its ID in COLLECTION_TEST_DATA.
 * - Initializes FileOperations and FileService instances for file handling.
 * - Creates and initializes a MasterIndex instance with deep-cloned test data.
 * - Configures a DatabaseConfig object for the test database.
 * - Constructs a mock database object with the necessary properties and methods.
 * - Logs the creation of the test folder.
 * 
 * @throws {Error} Throws an error if folder creation or setup fails.
 */
function setupCollectionTestEnvironment() {
  const logger = JDbLogger.createComponentLogger("Collection-Setup");

  try {
    const folder = DriveApp.createFolder(COLLECTION_TEST_DATA.testFolderName);
    COLLECTION_TEST_DATA.testFolderId = folder.getId();
    COLLECTION_TEST_DATA.createdFolderIds.push(
      COLLECTION_TEST_DATA.testFolderId
    );

    // Create FileService instance with proper dependencies
    const fileOps = new FileOperations(logger);
    COLLECTION_TEST_DATA.testFileService = new FileService(fileOps, logger);

    // Create real MasterIndex instance with initial data (following CollectionCoordinator pattern)
    COLLECTION_TEST_DATA.testMasterIndex = new MasterIndex();
    
    // Initialize master index with the proper data structure
    const masterIndexData = ObjectUtils.deepClone(COLLECTION_TEST_DATA.masterIndexData);
    COLLECTION_TEST_DATA.testMasterIndex._data = masterIndexData;

    // Create DatabaseConfig for proper database structure
    const dbConfig = new DatabaseConfig({
      name: 'testDB',
      rootFolderId: COLLECTION_TEST_DATA.testFolderId
    });

    // Create proper database object that matches real Database structure
    COLLECTION_TEST_DATA.testDatabase = {
      name: 'testDB',
      config: dbConfig,
      _masterIndex: COLLECTION_TEST_DATA.testMasterIndex,
      _fileOps: fileOps,
      _fileService: COLLECTION_TEST_DATA.testFileService,
      getMasterIndex: () => COLLECTION_TEST_DATA.testMasterIndex,
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
  const logger = JDbLogger.createComponentLogger("Collection-Cleanup");
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
  COLLECTION_TEST_DATA.testMasterIndex = null;
  COLLECTION_TEST_DATA.testDatabase = null;
  COLLECTION_TEST_DATA.testFileService = null;

  logger.info("Collection test cleanup completed", {
    cleanedFiles,
    failedFiles,
    cleanedFolders,
    failedFolders,
  });
}

/**
 * Helper function to create a test collection file
 * @param {string} [collectionName] - Optional collection name, defaults to timestamped name
 */
function createTestCollectionFile(collectionName) {
  const folder = DriveApp.getFolderById(COLLECTION_TEST_DATA.testFolderId);
  const defaultName = "test_collection_" + new Date().getTime();
  const actualCollectionName = collectionName || defaultName;
  const fileName = actualCollectionName + ".json";

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

  // Create and register CollectionMetadata with MasterIndex (following CollectionCoordinator pattern)
  if (COLLECTION_TEST_DATA.testMasterIndex) {
    const metadataData = ObjectUtils.deepClone(COLLECTION_TEST_DATA.collectionMetadataData);
    metadataData.fileId = fileId; // Use actual file ID
    metadataData.name = actualCollectionName; // Use the specified collection name
    
    // Create CollectionMetadata instance using ObjectUtils deserialization
    const collectionMetadata = ObjectUtils.deserialise(ObjectUtils.serialise(metadataData));
    
    // Register collection with master index
    COLLECTION_TEST_DATA.testMasterIndex.addCollection(
      actualCollectionName,
      collectionMetadata
    );
  }

  return fileId;
}

/**
 * Helper function to ensure a collection is registered in MasterIndex
 * @param {string} collectionName - Collection name to register
 * @param {string} fileId - File ID for the collection
 */
function ensureCollectionRegistered(collectionName, fileId) {
  if (COLLECTION_TEST_DATA.testMasterIndex) {
    try {
      // Check if collection already exists
      COLLECTION_TEST_DATA.testMasterIndex.getCollection(collectionName);
      // Already exists, nothing to do
    } catch (e) {
      // Collection doesn't exist, register it
      const metadataData = ObjectUtils.deepClone(COLLECTION_TEST_DATA.collectionMetadataData);
      metadataData.fileId = fileId;
      metadataData.name = collectionName;
      
      const collectionMetadata = ObjectUtils.deserialise(ObjectUtils.serialise(metadataData));
      COLLECTION_TEST_DATA.testMasterIndex.addCollection(collectionName, collectionMetadata);
    }
  }
}

/**
 * Helper function to create a properly registered test collection instance
 * @param {string} collectionName - Collection name
 * @returns {Collection} Properly registered Collection instance
 */
function createTestCollection(collectionName) {
  // Create the file and register in MasterIndex with the same name
  const fileId = createTestCollectionFile(collectionName);
  
  // Create Collection instance with the same name
  return new Collection(
    collectionName,
    fileId,
    COLLECTION_TEST_DATA.testDatabase,
    COLLECTION_TEST_DATA.testFileService
  );
}
/**
 * Run all Collection tests
 * This function orchestrates all test suites for Collection
 */
function runCollectionTests() {
  try {
    JDbLogger.info("Starting Collection Test Execution");

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
    JDbLogger.error("Failed to execute Collection tests", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  } finally {
    JDbLogger.info("Collection Test Execution Complete");
  }
}
