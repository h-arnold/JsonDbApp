/**
 * CollectionCoordinatorTestEnvironment.js - Test environment setup for CollectionCoordinator tests
 * 
 * Provides real GAS API-based test environment with setup/teardown routines
 * Creates actual Drive files, Collections, MasterIndex, and test data
 * No mocks - uses real components for integration testing
 */

// Global test data storage for CollectionCoordinator tests
const COLLECTION_COORDINATOR_TEST_DATA = {
  testFolderId: null,
  testFolderName: 'GASDB_CollectionCoordinator_Test_Folder_' + new Date().getTime(),
  testCollectionFileId: null,
  testCollectionFileName: 'GASDB_CollectionCoordinator_Test_Collection_' + new Date().getTime() + '.json',
  testCollection: null,
  testMasterIndex: null,
  testDatabase: null,
  testStartTime: null,
  testEnvironmentReady: false,
  createdFileIds: [],
  createdFolderIds: [],
  
  // Test collection data structure (from generated test data)
  testCollectionData: {
    "collection": "coordinatorTest",
    "metadata": {
      "version": 1,
      "created": "2025-06-24T12:31:19.185Z",
      "updated": "2025-06-24T12:31:19.185Z",
      "documentCount": 3,
      "modificationToken": "initial-token-1750768279185"
    },
    "documents": {
      "coord-test-1": {
        "_id": "coord-test-1",
        "name": "Test Document 1",
        "category": "testing",
        "value": 100,
        "active": true,
        "created": "2025-06-24T12:31:19.185Z"
      },
      "coord-test-2": {
        "_id": "coord-test-2",
        "name": "Test Document 2",
        "category": "coordination",
        "value": 200,
        "active": false,
        "created": "2025-06-24T12:31:19.185Z"
      },
      "coord-test-3": {
        "_id": "coord-test-3",
        "name": "Test Document 3",
        "category": "testing",
        "value": 300,
        "active": true,
        "created": "2025-06-24T12:31:19.185Z"
      }
    }
  },

  // Master index data structure (from generated test data)
  masterIndexData: {
    "version": 1,
    "lastUpdated": "2025-06-24T12:31:21.006Z",
    "collections": {},
    "modificationHistory": {}
  },

  // Collection metadata structure (from generated test data)
  collectionMetadataData: {
    "__type": "CollectionMetadata",
    "created": "2025-06-24T12:31:19.185Z",
    "lastUpdated": "2025-06-24T12:31:21.890Z",
    "documentCount": 3,
    "name": "coordinatorTest",
    "fileId": "placeholder-file-id", // Will be replaced with actual file ID
    "modificationToken": "initial-token-1750768279185",
    "lockStatus": null
  },

  // Additional test documents from MockQueryData for complex scenarios
  additionalTestDocuments: null,

  // Coordination test configurations
  coordinationConfigs: {
    default: {
      coordinationEnabled: true,
      lockTimeoutMs: 2000,
      retryAttempts: 3,
      retryDelayMs: 100,
      conflictResolutionStrategy: 'reload'
    },
    disabled: {
      coordinationEnabled: false
    },
    aggressive: {
      coordinationEnabled: true,
      lockTimeoutMs: 500,
      retryAttempts: 5,
      retryDelayMs: 50,
      conflictResolutionStrategy: 'reload'
    }
  }
};

/**
 * Set up the CollectionCoordinator test environment with real GAS APIs
 * Creates Drive folder, collection file, Collection instance, MasterIndex, and test data
 */
function setupCollectionCoordinatorTestEnvironment() {
  const logger = GASDBLogger.createComponentLogger('CollectionCoordinator-Setup');
  
  try {
    logger.info('Setting up CollectionCoordinator test environment');
    COLLECTION_COORDINATOR_TEST_DATA.testStartTime = new Date();

    // Create test folder in Drive
    const testFolder = DriveApp.createFolder(COLLECTION_COORDINATOR_TEST_DATA.testFolderName);
    COLLECTION_COORDINATOR_TEST_DATA.testFolderId = testFolder.getId();
    COLLECTION_COORDINATOR_TEST_DATA.createdFolderIds.push(testFolder.getId());
    
    logger.debug('Created test folder', { 
      folderId: COLLECTION_COORDINATOR_TEST_DATA.testFolderId,
      folderName: COLLECTION_COORDINATOR_TEST_DATA.testFolderName
    });

    // Create test collection file with initial data
    const collectionContent = JSON.stringify(COLLECTION_COORDINATOR_TEST_DATA.testCollectionData, null, 2);
    const collectionFile = testFolder.createFile(
      COLLECTION_COORDINATOR_TEST_DATA.testCollectionFileName,
      collectionContent,
      'application/json'
    );
    
    COLLECTION_COORDINATOR_TEST_DATA.testCollectionFileId = collectionFile.getId();
    COLLECTION_COORDINATOR_TEST_DATA.createdFileIds.push(collectionFile.getId());
    
    logger.debug('Created test collection file', {
      fileId: COLLECTION_COORDINATOR_TEST_DATA.testCollectionFileId,
      fileName: COLLECTION_COORDINATOR_TEST_DATA.testCollectionFileName
    });

    // Create FileOperations and FileService instances
    const fileOps = new FileOperations(logger);
    const fileService = new FileService(fileOps, logger);

    // Create real MasterIndex instance with initial data
    COLLECTION_COORDINATOR_TEST_DATA.testMasterIndex = new MasterIndex();
    
    // Initialize master index with the proper data structure
    const masterIndexData = ObjectUtils.deepClone(COLLECTION_COORDINATOR_TEST_DATA.masterIndexData);
    COLLECTION_COORDINATOR_TEST_DATA.testMasterIndex._data = masterIndexData;
    
    // Create DatabaseConfig for proper database structure
    const dbConfig = new DatabaseConfig({
      name: 'testDB',
      rootFolderId: COLLECTION_COORDINATOR_TEST_DATA.testFolderId
    });
    
    // Create a proper database mock that matches real Database structure
    const testDatabase = {
      name: 'testDB',
      config: dbConfig,
      _masterIndex: COLLECTION_COORDINATOR_TEST_DATA.testMasterIndex,
      _fileOps: fileOps,
      _fileService: fileService,
      getMasterIndex: () => COLLECTION_COORDINATOR_TEST_DATA.testMasterIndex
    };
    
    // Create real Collection instance
    COLLECTION_COORDINATOR_TEST_DATA.testCollection = new Collection(
      'coordinatorTest',
      COLLECTION_COORDINATOR_TEST_DATA.testCollectionFileId,
      testDatabase,
      fileService
    );

    // Load the collection data
    COLLECTION_COORDINATOR_TEST_DATA.testCollection._ensureLoaded();

    // Create and register CollectionMetadata using the proper structure
    const metadataData = ObjectUtils.deepClone(COLLECTION_COORDINATOR_TEST_DATA.collectionMetadataData);
    metadataData.fileId = COLLECTION_COORDINATOR_TEST_DATA.testCollectionFileId; // Use actual file ID
    
    // Create CollectionMetadata instance using ObjectUtils deserialization
    const collectionMetadata = ObjectUtils.deserialise(ObjectUtils.serialise(metadataData));
    
    // Register collection with master index using the proper CollectionMetadata instance
    COLLECTION_COORDINATOR_TEST_DATA.testMasterIndex.addCollection(
      'coordinatorTest',
      collectionMetadata
    );

    // Load additional test documents from MockQueryData for complex scenarios
    COLLECTION_COORDINATOR_TEST_DATA.additionalTestDocuments = MockQueryData.getTestUsers().slice(0, 2);

    COLLECTION_COORDINATOR_TEST_DATA.testEnvironmentReady = true;
    logger.info('CollectionCoordinator test environment setup complete', {
      collectionName: 'coordinatorTest',
      documentCount: COLLECTION_COORDINATOR_TEST_DATA.testCollectionData.metadata.documentCount,
      additionalDocuments: COLLECTION_COORDINATOR_TEST_DATA.additionalTestDocuments.length
    });

  } catch (error) {
    logger.error('Failed to setup CollectionCoordinator test environment', { 
      error: error.message, 
      stack: error.stack 
    });
    
    // Clean up on failure
    cleanupCollectionCoordinatorTestEnvironment();
    throw new Error('CollectionCoordinator test environment setup failed: ' + error.message);
  }
}

/**
 * Clean up the CollectionCoordinator test environment
 * Removes all created Drive files and folders, clears ScriptProperties
 */
function cleanupCollectionCoordinatorTestEnvironment() {
  const logger = GASDBLogger.createComponentLogger('CollectionCoordinator-Cleanup');
  
  try {
    logger.info('Cleaning up CollectionCoordinator test environment');

    // Clean up created files
    COLLECTION_COORDINATOR_TEST_DATA.createdFileIds.forEach(fileId => {
      try {
        const file = DriveApp.getFileById(fileId);
        file.setTrashed(true);
        logger.debug('Deleted test file', { fileId });
      } catch (e) {
        logger.warn('Could not delete test file', { fileId, error: e.message });
      }
    });

    // Clean up created folders
    COLLECTION_COORDINATOR_TEST_DATA.createdFolderIds.forEach(folderId => {
      try {
        const folder = DriveApp.getFolderById(folderId);
        folder.setTrashed(true);
        logger.debug('Deleted test folder', { folderId });
      } catch (e) {
        logger.warn('Could not delete test folder', { folderId, error: e.message });
      }
    });

    // Clear master index from ScriptProperties
    if (COLLECTION_COORDINATOR_TEST_DATA.testMasterIndex) {
      try {
        // Clear the master index data
        PropertiesService.getScriptProperties().deleteProperty('GASDB_MASTER_INDEX');
        logger.debug('Cleared master index from ScriptProperties');
      } catch (e) {
        logger.warn('Could not clear master index', { error: e.message });
      }
    }

    // Reset test data
    COLLECTION_COORDINATOR_TEST_DATA.testFolderId = null;
    COLLECTION_COORDINATOR_TEST_DATA.testCollectionFileId = null;
    COLLECTION_COORDINATOR_TEST_DATA.testCollection = null;
    COLLECTION_COORDINATOR_TEST_DATA.testMasterIndex = null;
    COLLECTION_COORDINATOR_TEST_DATA.testDatabase = null;
    COLLECTION_COORDINATOR_TEST_DATA.testEnvironmentReady = false;
    COLLECTION_COORDINATOR_TEST_DATA.createdFileIds = [];
    COLLECTION_COORDINATOR_TEST_DATA.createdFolderIds = [];
    COLLECTION_COORDINATOR_TEST_DATA.additionalTestDocuments = null;

    logger.info('CollectionCoordinator test environment cleanup complete');

  } catch (error) {
    logger.error('Error during CollectionCoordinator test environment cleanup', { 
      error: error.message, 
      stack: error.stack 
    });
    // Continue with cleanup despite errors
  }
}

/**
 * Reset collection state to initial test data
 * Useful for isolating tests that modify collection data
 */
function resetCollectionCoordinatorCollectionState() {
  if (!COLLECTION_COORDINATOR_TEST_DATA.testEnvironmentReady) {
    throw new Error('Test environment not ready');
  }

  try {
    const logger = GASDBLogger.createComponentLogger('CollectionCoordinator-Reset');
    logger.debug('Resetting collection state to initial test data');

    // Reset the collection file content
    const file = DriveApp.getFileById(COLLECTION_COORDINATOR_TEST_DATA.testCollectionFileId);
    const resetContent = JSON.stringify(COLLECTION_COORDINATOR_TEST_DATA.testCollectionData, null, 2);
    file.setContent(resetContent);

    // Force reload the collection
    COLLECTION_COORDINATOR_TEST_DATA.testCollection._isDirty = true;
    COLLECTION_COORDINATOR_TEST_DATA.testCollection._ensureLoaded();

    // Update master index with reset metadata
    const collectionMetadata = COLLECTION_COORDINATOR_TEST_DATA.testCollection._metadata;
    COLLECTION_COORDINATOR_TEST_DATA.testMasterIndex.updateCollectionMetadata(
      'coordinatorTest',
      {
        documentCount: collectionMetadata.documentCount,
        modificationToken: collectionMetadata.getModificationToken()
      }
    );

    logger.debug('Collection state reset complete');

  } catch (error) {
    const logger = GASDBLogger.createComponentLogger('CollectionCoordinator-Reset');
    logger.error('Failed to reset collection state', { error: error.message });
    throw error;
  }
}

/**
 * Create a CollectionCoordinator instance with specified configuration
 * @param {string} configName - Name of configuration from coordinationConfigs
 * @returns {CollectionCoordinator} Configured coordinator instance
 */
function createTestCollectionCoordinator(configName = 'default') {
  if (!COLLECTION_COORDINATOR_TEST_DATA.testEnvironmentReady) {
    throw new Error('Test environment not ready');
  }

  const config = COLLECTION_COORDINATOR_TEST_DATA.coordinationConfigs[configName];
  if (!config) {
    throw new Error(`Unknown coordination config: ${configName}`);
  }

  return new CollectionCoordinator(
    COLLECTION_COORDINATOR_TEST_DATA.testCollection,
    COLLECTION_COORDINATOR_TEST_DATA.testMasterIndex,
    config
  );
}

/**
 * Simulate a conflicting modification to test conflict detection
 * Modifies the master index metadata to create a token mismatch
 */
function simulateCollectionConflict() {
  if (!COLLECTION_COORDINATOR_TEST_DATA.testEnvironmentReady) {
    throw new Error('Test environment not ready');
  }

  // Update master index with a different modification token
  const conflictToken = 'conflict-token-' + new Date().getTime();
  COLLECTION_COORDINATOR_TEST_DATA.testMasterIndex.updateCollectionMetadata(
    'coordinatorTest',
    {
      modificationToken: conflictToken
    }
  );
}

/**
 * Add additional test documents to the collection for complex scenarios
 * Uses documents from MockQueryData
 */
function addAdditionalTestDocuments() {
  if (!COLLECTION_COORDINATOR_TEST_DATA.testEnvironmentReady) {
    throw new Error('Test environment not ready');
  }

  const additionalDocs = COLLECTION_COORDINATOR_TEST_DATA.additionalTestDocuments;
  additionalDocs.forEach(doc => {
    COLLECTION_COORDINATOR_TEST_DATA.testCollection.insertOne(doc);
  });
}

/**
 * Get current test environment state for debugging
 * @returns {Object} Current state of test environment
 */
function getCollectionCoordinatorTestState() {
  return {
    environmentReady: COLLECTION_COORDINATOR_TEST_DATA.testEnvironmentReady,
    testFolderId: COLLECTION_COORDINATOR_TEST_DATA.testFolderId,
    testCollectionFileId: COLLECTION_COORDINATOR_TEST_DATA.testCollectionFileId,
    collectionName: COLLECTION_COORDINATOR_TEST_DATA.testCollection?.name,
    documentCount: COLLECTION_COORDINATOR_TEST_DATA.testCollection?._metadata?.documentCount,
    masterIndexCollections: COLLECTION_COORDINATOR_TEST_DATA.testMasterIndex?.getCollections(),
    additionalDocuments: COLLECTION_COORDINATOR_TEST_DATA.additionalTestDocuments?.length || 0
  };
}

/**
 * Validate test environment is properly set up
 * @throws {Error} If environment validation fails
 */
function validateCollectionCoordinatorTestEnvironment() {
  const errors = [];

  if (!COLLECTION_COORDINATOR_TEST_DATA.testEnvironmentReady) {
    errors.push('Test environment not marked as ready');
  }

  if (!COLLECTION_COORDINATOR_TEST_DATA.testFolderId) {
    errors.push('Test folder not created');
  }

  if (!COLLECTION_COORDINATOR_TEST_DATA.testCollectionFileId) {
    errors.push('Test collection file not created');
  }

  if (!COLLECTION_COORDINATOR_TEST_DATA.testCollection) {
    errors.push('Test collection not created');
  }

  if (!COLLECTION_COORDINATOR_TEST_DATA.testMasterIndex) {
    errors.push('Test master index not created');
  }

  // Verify Drive resources exist
  try {
    DriveApp.getFileById(COLLECTION_COORDINATOR_TEST_DATA.testCollectionFileId);
  } catch (e) {
    errors.push('Test collection file not accessible in Drive');
  }

  try {
    DriveApp.getFolderById(COLLECTION_COORDINATOR_TEST_DATA.testFolderId);
  } catch (e) {
    errors.push('Test folder not accessible in Drive');
  }

  // Verify collection is registered in master index
  const collections = COLLECTION_COORDINATOR_TEST_DATA.testMasterIndex?.getCollections();
  if (!collections || !collections.coordinatorTest) {
    errors.push('Test collection not registered in master index');
  }

  if (errors.length > 0) {
    throw new Error('CollectionCoordinator test environment validation failed: ' + errors.join(', '));
  }
}
