// Orchestrator and setup/teardown for DocumentOperations tests

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

function registerDocumentOperationsTests() {
  const testFramework = new TestFramework();
  testFramework.registerTestSuite(createDocumentOperationsConstructorTestSuite());
  testFramework.registerTestSuite(createDocumentOperationsInsertTestSuite());
  testFramework.registerTestSuite(createDocumentOperationsFindTestSuite());
  testFramework.registerTestSuite(createDocumentOperationsUpdateTestSuite());
  testFramework.registerTestSuite(createDocumentOperationsDeleteTestSuite());
  testFramework.registerTestSuite(createDocumentOperationsUtilityTestSuite());
  testFramework.registerTestSuite(createDocumentOperationsQueryEnhancementTestSuite());
  return testFramework;
}

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
    results.push(testFramework.runTestSuite('DocumentOperations Query Enhancement'));
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
