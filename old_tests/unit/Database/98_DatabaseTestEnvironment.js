/**
 * 98_DatabaseTestEnvironment.js - Environment and Test Data for Database Tests
 *
 * Contains setup and cleanup functions, and global test data for Database test suites.
 */

// Global test data storage for Database tests
const DATABASE_TEST_DATA = {
  testDatabaseId: null,
  testDatabaseName: 'GASDB_Test_Database_' + Date.now(),
  testIndexFileId: null,
  testIndexFileName: 'GASDB_Test_Index_' + Date.now() + '.json',
  testFolderId: null,
  testFolderName: 'GASDB_Test_Database_' + Date.now(),
  baseCollectionNames: ['testCollection1', 'testCollection2', 'tempCollection'],
  testCollectionNames: [],
  createdFileIds: [], // Track all files created for clean-up
  createdFolderIds: [], // Track all folders created for clean-up
  testConfig: null,
  testDatabase: null
};

/**
 * Setup database test environment
 */
function setupDatabaseTestEnvironment() {
  const logger = JDbLogger.createComponentLogger('Database-Setup');
  
  try {
    const folder = DriveApp.createFolder(DATABASE_TEST_DATA.testFolderName);
    DATABASE_TEST_DATA.testFolderId = folder.getId();
    DATABASE_TEST_DATA.createdFolderIds.push(DATABASE_TEST_DATA.testFolderId);
    
    // Prepare test configuration
    DATABASE_TEST_DATA.testConfig = {
      rootFolderId: DATABASE_TEST_DATA.testFolderId,
      autoCreateCollections: true,
      lockTimeout: 30000,
      cacheEnabled: true,
      logLevel: 'INFO',
  masterIndexKey: 'GASDB_MASTER_INDEX_TEST_DB',
  backupOnInitialise: false
    };
    const indexKey = DATABASE_TEST_DATA.testConfig.masterIndexKey;
    ScriptProperties.deleteProperty(indexKey);
    ScriptProperties.deleteProperty('GASDB_MASTER_INDEX_TEST_INTEGRATION');
    const suffix = '_' + Date.now();
    DATABASE_TEST_DATA.testCollectionNames = DATABASE_TEST_DATA.baseCollectionNames.map(name => name + suffix);
    
    logger.info('Created test folder for Database', { 
      folderId: DATABASE_TEST_DATA.testFolderId, 
      name: DATABASE_TEST_DATA.testFolderName,
      config: DATABASE_TEST_DATA.testConfig
    });
    
  } catch (error) {
    logger.error('Failed to create test folder for Database', { error: error.message });
    throw error;
  }
}

/**
 * Clean up database test environment
 */
function cleanupDatabaseTestEnvironment() {
  const logger = JDbLogger.createComponentLogger('Database-Cleanup');
  let cleanedFiles = 0;
  let failedFiles = 0;
  let cleanedFolders = 0;
  let failedFolders = 0;
  
  // Clean up created test files
  DATABASE_TEST_DATA.createdFileIds.forEach(fileId => {
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
  DATABASE_TEST_DATA.createdFolderIds.forEach(folderId => {
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
    const masterIndexKey = DATABASE_TEST_DATA.testConfig?.masterIndexKey;
    if (masterIndexKey) {
      ScriptProperties.deleteProperty(masterIndexKey);
    }
    
    // Clean up other test keys
    const testKeys = ['GASDB_MASTER_INDEX_TEST_DB', 'GASDB_MASTER_INDEX_TEST_INTEGRATION'];
    testKeys.forEach(key => {
      ScriptProperties.deleteProperty(key);
    });
    
    // Reset test data arrays and database reference at the very end only
    DATABASE_TEST_DATA.createdFileIds = [];
    DATABASE_TEST_DATA.createdFolderIds = [];
    DATABASE_TEST_DATA.testDatabase = null;
    
  } catch (error) {
    logger.warn('Some cleanup operations failed', { error: error.message });
  }
  
  logger.info('Database test cleanup completed', { 
    cleanedFiles, 
    failedFiles, 
    cleanedFolders, 
    failedFolders 
  });
}
