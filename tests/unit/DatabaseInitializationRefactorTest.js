/**
 * DatabaseInitializationRefactorTest.js - Tests for refactored Database initialization
 * 
 * Tests the new Database initialization workflow where MasterIndex is the single source of truth.
 * This file contains tests for the new createDatabase(), refactored initialise(), and recoverDatabase() methods.
 */

// Test data for the refactored Database tests
const DB_REFACTOR_TEST_DATA = {
  testFolderId: null,
  testFolderName: 'GASDB_Refactor_Test_' + new Date().getTime(),
  createdFileIds: [],
  createdFolderIds: [],
  testConfig: null,
  masterIndexKeys: [] // Track test master index keys for cleanup
};

/**
 * Setup test environment for Database refactoring tests
 */
function setupDatabaseRefactorTestEnvironment() {
  const logger = JDbLogger.createComponentLogger('DatabaseRefactor-Setup');
  
  try {
    const folder = DriveApp.createFolder(DB_REFACTOR_TEST_DATA.testFolderName);
    DB_REFACTOR_TEST_DATA.testFolderId = folder.getId();
    DB_REFACTOR_TEST_DATA.createdFolderIds.push(DB_REFACTOR_TEST_DATA.testFolderId);
    
    DB_REFACTOR_TEST_DATA.testConfig = {
      rootFolderId: DB_REFACTOR_TEST_DATA.testFolderId,
      autoCreateCollections: true,
      lockTimeout: 30000,
      logLevel: 'INFO',
      masterIndexKey: 'GASDB_REFACTOR_TEST_' + new Date().getTime()
    };
    
    DB_REFACTOR_TEST_DATA.masterIndexKeys.push(DB_REFACTOR_TEST_DATA.testConfig.masterIndexKey);
    
    logger.info('Created test environment for Database refactoring tests', { 
      folderId: DB_REFACTOR_TEST_DATA.testFolderId,
      masterIndexKey: DB_REFACTOR_TEST_DATA.testConfig.masterIndexKey
    });
    
  } catch (error) {
    logger.error('Failed to create test environment', { error: error.message });
    throw error;
  }
}

/**
 * Clean up test environment for Database refactoring tests
 */
function cleanupDatabaseRefactorTestEnvironment() {
  const logger = JDbLogger.createComponentLogger('DatabaseRefactor-Cleanup');
  
  // Clean up files
  DB_REFACTOR_TEST_DATA.createdFileIds.forEach(fileId => {
    try {
      DriveApp.getFileById(fileId).setTrashed(true);
    } catch (error) {
      logger.warn('Failed to delete file', { fileId, error: error.message });
    }
  });
  
  // Clean up folders
  DB_REFACTOR_TEST_DATA.createdFolderIds.forEach(folderId => {
    try {
      DriveApp.getFolderById(folderId).setTrashed(true);
    } catch (error) {
      logger.warn('Failed to delete folder', { folderId, error: error.message });
    }
  });
  
  // Clean up master index keys
  DB_REFACTOR_TEST_DATA.masterIndexKeys.forEach(key => {
    try {
      PropertiesService.getScriptProperties().deleteProperty(key);
    } catch (error) {
      // Ignore errors - property might not exist
    }
  });
  
  // Reset test data
  DB_REFACTOR_TEST_DATA.createdFileIds = [];
  DB_REFACTOR_TEST_DATA.createdFolderIds = [];
  DB_REFACTOR_TEST_DATA.masterIndexKeys = [];
  
  logger.info('Cleaned up Database refactoring test environment');
}

/**
 * Test suite for createDatabase() method
 */

// Test suite for createDatabase() method, with NO setup routine (ensures no MasterIndex exists before test)
function createDatabaseCreateNoSetupTestSuite() {
  const suite = new TestSuite('Database createDatabase() Method (No Setup)');

  suite.setAfterEach(function() {
    // Clean up MasterIndex key after each test
    DB_REFACTOR_TEST_DATA.masterIndexKeys.forEach(key => {
      try {
        PropertiesService.getScriptProperties().deleteProperty(key);
      } catch (error) {}
    });
    DB_REFACTOR_TEST_DATA.masterIndexKeys = [];
  });

  suite.addTest('should create database with fresh MasterIndex', function() {
    // Arrange
    const config = Object.assign({}, DB_REFACTOR_TEST_DATA.testConfig);
    config.masterIndexKey = 'GASDB_CREATE_TEST_' + new Date().getTime();
    DB_REFACTOR_TEST_DATA.masterIndexKeys.push(config.masterIndexKey);

    // Ensure MasterIndex does not exist
    PropertiesService.getScriptProperties().deleteProperty(config.masterIndexKey);

    const database = new Database(config);

    // Act
    try {
      database.createDatabase();

      // Assert
      const masterIndex = new MasterIndex({ masterIndexKey: config.masterIndexKey });
      TestFramework.assertTrue(masterIndex.isInitialised(), 'MasterIndex should be initialised');
      const collections = masterIndex.getCollections();
      TestFramework.assertEquals(Object.keys(collections).length, 0, 'Should start with empty collections');
    } catch (error) {
      throw new Error('Database.createDatabase() not implemented: ' + error.message);
    }
  });

  return suite;
}

// Test suite for createDatabase() error case (MasterIndex exists)
function createDatabaseCreateExistsTestSuite() {
  const suite = new TestSuite('Database createDatabase() Method (Exists)');

  suite.setAfterEach(function() {
    DB_REFACTOR_TEST_DATA.masterIndexKeys.forEach(key => {
      try {
        PropertiesService.getScriptProperties().deleteProperty(key);
      } catch (error) {}
    });
    DB_REFACTOR_TEST_DATA.masterIndexKeys = [];
  });

  suite.addTest('should throw error if MasterIndex already exists', function() {
    // Arrange
    const config = Object.assign({}, DB_REFACTOR_TEST_DATA.testConfig);
    config.masterIndexKey = 'GASDB_CREATE_EXISTS_TEST_' + new Date().getTime();
    DB_REFACTOR_TEST_DATA.masterIndexKeys.push(config.masterIndexKey);

    // Pre-populate MasterIndex
    PropertiesService.getScriptProperties().deleteProperty(config.masterIndexKey);
    const existingMasterIndex = new MasterIndex({ masterIndexKey: config.masterIndexKey });
    existingMasterIndex.addCollection('existingCollection', {
      name: 'existingCollection',
      fileId: 'existing-file-id',
      documentCount: 1
    });

    const database = new Database(config);

    // Act & Assert
    TestFramework.assertThrows(() => {
      database.createDatabase();
    }, Error, 'Should throw error when MasterIndex already exists');
  });

  return suite;
}

/**
 * Test suite for refactored initialise() method
 */
function createDatabaseinitialiseRefactorTestSuite() {
  const suite = new TestSuite('Database initialise() Refactor');

  suite.setBeforeEach(function() {
    setupDatabaseRefactorTestEnvironment();
  });
  suite.setAfterEach(function() {
    cleanupDatabaseRefactorTestEnvironment();
  });

  suite.addTest('should initialise from MasterIndex only', function() {
    // Arrange
    const config = Object.assign({}, DB_REFACTOR_TEST_DATA.testConfig);
    config.masterIndexKey = 'GASDB_INIT_ONLY_TEST_' + new Date().getTime();
    DB_REFACTOR_TEST_DATA.masterIndexKeys.push(config.masterIndexKey);

    // Pre-populate MasterIndex with collections
    const masterIndex = new MasterIndex({ masterIndexKey: config.masterIndexKey });
    masterIndex.addCollection('collection1', {
      name: 'collection1',
      fileId: 'file-id-1',
      documentCount: 5
    });
    masterIndex.addCollection('collection2', {
      name: 'collection2', 
      fileId: 'file-id-2',
      documentCount: 3
    });

    const database = new Database(config);

    // Act
    try {
      database.initialise();

      // Assert
      const collections = database.listCollections();
      TestFramework.assertEquals(collections.length, 2, 'Should load collections from MasterIndex');
      TestFramework.assertTrue(collections.includes('collection1'), 'Should include collection1');
      TestFramework.assertTrue(collections.includes('collection2'), 'Should include collection2');

    } catch (error) {
      throw new Error('Database.initialise() refactor not implemented: ' + error.message);
    }
  });

  suite.addTest('should throw error if MasterIndex is missing', function() {
    // Arrange
    const config = Object.assign({}, DB_REFACTOR_TEST_DATA.testConfig);
    config.masterIndexKey = 'GASDB_INIT_MISSING_TEST_' + new Date().getTime();
    DB_REFACTOR_TEST_DATA.masterIndexKeys.push(config.masterIndexKey);

    // Ensure MasterIndex does not exist
    PropertiesService.getScriptProperties().deleteProperty(config.masterIndexKey);

    const database = new Database(config);

    // Act & Assert - This should fail initially (RED phase)
    TestFramework.assertThrows(() => {
      database.initialise();
    }, Error, 'Should throw error when MasterIndex is missing');
  });

  suite.addTest('should throw error if MasterIndex is corrupted', function() {
    // Arrange
    const config = Object.assign({}, DB_REFACTOR_TEST_DATA.testConfig);
    config.masterIndexKey = 'GASDB_INIT_CORRUPT_TEST_' + new Date().getTime();
    DB_REFACTOR_TEST_DATA.masterIndexKeys.push(config.masterIndexKey);

    // Set corrupted MasterIndex data
    PropertiesService.getScriptProperties().setProperty(config.masterIndexKey, 'invalid-json-data');

    const database = new Database(config);

    // Act & Assert - This should fail initially (RED phase)
    TestFramework.assertThrows(() => {
      database.initialise();
    }, Error, 'Should throw error when MasterIndex is corrupted');
  });

  return suite;
}

/**
 * Test suite for recoverDatabase() method
 */
function createDatabaseRecoverMethodTestSuite() {
  const suite = new TestSuite('Database recoverDatabase() Method');

  suite.setBeforeEach(function() {
    setupDatabaseRefactorTestEnvironment();
  });
  suite.setAfterEach(function() {
    cleanupDatabaseRefactorTestEnvironment();
  });

  suite.addTest('should recover database from backup index file', function() {
    // Arrange
    const config = Object.assign({}, DB_REFACTOR_TEST_DATA.testConfig);
    config.masterIndexKey = 'GASDB_RECOVER_TEST_' + new Date().getTime();
    DB_REFACTOR_TEST_DATA.masterIndexKeys.push(config.masterIndexKey);

    // Create backup index file with collections
    const backupIndexData = {
      collections: {
        'recoveredCollection1': {
          name: 'recoveredCollection1',
          fileId: 'recovered-file-id-1',
          documentCount: 4
        },
        'recoveredCollection2': {
          name: 'recoveredCollection2',
          fileId: 'recovered-file-id-2', 
          documentCount: 7
        }
      },
      lastUpdated: new Date(),
      version: 1
    };

    const fileService = new FileService(new FileOperations(), JDbLogger.createComponentLogger('Test'));
    const backupFileId = fileService.createFile('backup_index.json', backupIndexData, config.rootFolderId);
    DB_REFACTOR_TEST_DATA.createdFileIds.push(backupFileId);

    const database = new Database(config);

    // Act - This should fail initially (RED phase)
    try {
      database.recoverDatabase(backupFileId);

      // Assert
      const masterIndex = new MasterIndex({ masterIndexKey: config.masterIndexKey });
      const collections = masterIndex.getCollections();

      TestFramework.assertEquals(Object.keys(collections).length, 2, 'Should recover collections to MasterIndex');
      TestFramework.assertTrue(collections.hasOwnProperty('recoveredCollection1'), 'Should recover collection1');
      TestFramework.assertTrue(collections.hasOwnProperty('recoveredCollection2'), 'Should recover collection2');

    } catch (error) {
      throw new Error('Database.recoverDatabase() not implemented: ' + error.message);
    }
  });

  suite.addTest('should throw error if backup file is invalid', function() {
    // Arrange
    const config = Object.assign({}, DB_REFACTOR_TEST_DATA.testConfig);
    config.masterIndexKey = 'GASDB_RECOVER_INVALID_TEST_' + new Date().getTime();
    DB_REFACTOR_TEST_DATA.masterIndexKeys.push(config.masterIndexKey);

    // Create invalid backup file
    const fileService = new FileService(new FileOperations(), JDbLogger.createComponentLogger('Test'));
    const invalidBackupFileId = fileService.createFile('invalid_backup.json', { invalid: 'data' }, config.rootFolderId);
    DB_REFACTOR_TEST_DATA.createdFileIds.push(invalidBackupFileId);

    const database = new Database(config);

    // Act & Assert - This should fail initially (RED phase)
    TestFramework.assertThrows(() => {
      database.recoverDatabase(invalidBackupFileId);
    }, Error, 'Should throw error for invalid backup file');
  });

  return suite;
}

/**
 * Test suite for updated collection methods (no fallback logic)
 */
function createCollectionMethodsNoFallbackTestSuite() {
  const suite = new TestSuite('Collection Methods No Fallback');

  suite.setBeforeEach(function() {
    setupDatabaseRefactorTestEnvironment();
  });
  suite.setAfterEach(function() {
    cleanupDatabaseRefactorTestEnvironment();
  });

  suite.addTest('should access collection from MasterIndex only', function() {
    // Arrange
    const config = Object.assign({}, DB_REFACTOR_TEST_DATA.testConfig);
    config.masterIndexKey = 'GASDB_COLLECTION_ONLY_TEST_' + new Date().getTime();
    DB_REFACTOR_TEST_DATA.masterIndexKeys.push(config.masterIndexKey);

    const database = new Database(config);
    database.createDatabase();

    // Add collection to MasterIndex
    const masterIndex = new MasterIndex({ masterIndexKey: config.masterIndexKey });
    masterIndex.addCollection('testCollection', {
      name: 'testCollection',
      fileId: 'test-file-id',
      documentCount: 2
    });

    database.initialise();

    // Act - This should fail initially (RED phase)
    try {
      const collection = database.collection('testCollection');

      // Assert
      TestFramework.assertNotNull(collection, 'Should access collection from MasterIndex');
      TestFramework.assertEquals(collection.name, 'testCollection', 'Collection name should match');

    } catch (error) {
      throw new Error('Database.collection() fallback removal not implemented: ' + error.message);
    }
  });

  suite.addTest('should throw error if collection not in MasterIndex', function() {
    // Arrange
    const config = Object.assign({}, DB_REFACTOR_TEST_DATA.testConfig);
    config.masterIndexKey = 'GASDB_COLLECTION_NOT_FOUND_TEST_' + new Date().getTime();
    config.autoCreateCollections = false; // Disable auto-create
    DB_REFACTOR_TEST_DATA.masterIndexKeys.push(config.masterIndexKey);

    const database = new Database(config);
    database.createDatabase();
    database.initialise();

    // Act & Assert - This should fail initially (RED phase)
    TestFramework.assertThrows(() => {
      database.collection('nonExistentCollection');
    }, Error, 'Should throw error when collection not in MasterIndex and no fallback');
  });

  return suite;
}

/**
 * Run all Database refactoring tests
 */

function runDatabaseRefactorTests() {
  try {
    JDbLogger.info('Starting Database Refactoring Test Execution');

    // Only run setup/teardown for suites that require Drive/Folder setup
    // Suites that test MasterIndex creation/absence do not use setupDatabaseRefactorTestEnvironment

    // Register all test suites
    registerTestSuite(createDatabaseCreateNoSetupTestSuite());
    registerTestSuite(createDatabaseCreateExistsTestSuite());
    registerTestSuite(createDatabaseinitialiseRefactorTestSuite());
    registerTestSuite(createDatabaseRecoverMethodTestSuite());
    registerTestSuite(createCollectionMethodsNoFallbackTestSuite());

    // Run all tests
    const results = runAllTests();
    return results;

  } catch (error) {
    JDbLogger.error('Failed to execute Database refactoring tests', { error: error.message });
    throw error;
  } finally {
    JDbLogger.info('Database Refactoring Test Execution Complete');
  }
}