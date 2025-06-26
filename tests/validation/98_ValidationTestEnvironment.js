/**
 * ValidationTestEnvironment.js - Setup and teardown for validation tests
 * Provides MasterIndex and Collection JSON prepopulated with validation dataset
 */

const VALIDATION_TEST_ENV = {
  testFolderId: null,
  testFolderName: 'GASDB_Validation_Test_Folder_' + new Date().getTime(),
  masterIndexId: null,
  collectionFileId: null,
  collectionName: 'validationTest',
  initialData: null
};

/**
 * Set up the validation test environment using Drive files and mock data
 */
function setupValidationTestEnvironment() {
  const logger = JDbLogger.createComponentLogger('Validation-Setup');
  // Create a dedicated Drive folder
  const folder = DriveApp.createFolder(VALIDATION_TEST_ENV.testFolderName);
  VALIDATION_TEST_ENV.testFolderId = folder.getId();

  // Generate initial collection datasets
  VALIDATION_TEST_ENV.initialDataMap = {
    persons: ValidationMockData.getPersons(),
    orders: ValidationMockData.getOrders(),
    inventory: ValidationMockData.getInventory()
  };

  // Prepare master index
  const masterIndexObj = {
    version: 1,
    lastUpdated: new Date().toISOString(),
    collections: {},
    modificationHistory: {}
  };

  // Create masterIndex.json file (placeholder)
  const masterFile = folder.createFile('masterIndex.json', JSON.stringify(masterIndexObj));
  VALIDATION_TEST_ENV.masterIndexId = masterFile.getId();

  // Create each collection file and register in master index
  Object.keys(VALIDATION_TEST_ENV.initialDataMap).forEach(key => {
    const dataArray = VALIDATION_TEST_ENV.initialDataMap[key];
    const collectionObj = {
      collection: key,
      metadata: {
        version: 1,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        documentCount: dataArray.length,
        modificationToken: 'init-token-' + new Date().getTime() + '-' + key
      },
      documents: {}
    };
    dataArray.forEach(doc => {
      collectionObj.documents[doc._id] = ObjectUtils.serialise(doc);
    });
    const file = folder.createFile(key + '.json', JSON.stringify(collectionObj));
    VALIDATION_TEST_ENV.collectionFileIds = VALIDATION_TEST_ENV.collectionFileIds || {};
    VALIDATION_TEST_ENV.collectionFileIds[key] = file.getId();
    // register in master index
    masterIndexObj.collections[key] = { fileId: file.getId() };
  });

  // Update masterIndex with actual collection fileIds
  masterFile.setContent(JSON.stringify(masterIndexObj));

  logger.info('Validation environment set up with collections:', Object.keys(VALIDATION_TEST_ENV.initialDataMap));
}

/**
 * Clean up test environment: delete created Drive folder and clear properties
 */
function cleanupValidationTestEnvironment() {
  const logger = JDbLogger.createComponentLogger('Validation-Cleanup');
  try {
    if (VALIDATION_TEST_ENV.testFolderId) {
      DriveApp.getFolderById(VALIDATION_TEST_ENV.testFolderId).setTrashed(true);
      logger.info('Deleted validation test folder');
    }
  } catch (err) {
    logger.error('Error cleaning up validation environment:', err);
  }
}

/**
 * Retrieve current environment state for debugging
 * @returns {Object}
 */
function getValidationTestState() {
  return JSON.parse(JSON.stringify(VALIDATION_TEST_ENV));
}

/* exported setupValidationTestEnvironment, cleanupValidationTestEnvironment, getValidationTestState */
