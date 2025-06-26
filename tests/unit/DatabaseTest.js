/**
 * DatabaseTest.js - Database Class Tests
 * 
 * Comprehensive tests for the Database class including:
 * - Database class creation and initialisation
 * - Collection lifecycle operations
 * - Index file management
 * - Master index integration
 * 
 * Migrated from Section4Tests.js → testDatabaseInitialization(), testCollectionManagement(), 
 * testIndexFileStructure(), testDatabaseMasterIndexIntegration()
 */

// Global test data storage for Database tests
const DATABASE_TEST_DATA = {
  testDatabaseId: null,
  testDatabaseName: 'GASDB_Test_Database_' + new Date().getTime(),
  testIndexFileId: null,
  testIndexFileName: 'GASDB_Test_Index_' + new Date().getTime() + '.json',
  testFolderId: null,
  testFolderName: 'GASDB_Test_Database_' + new Date().getTime(),
  testCollectionNames: ['testCollection1', 'testCollection2', 'tempCollection'],
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
      masterIndexKey: 'GASDB_MASTER_INDEX_TEST_DB'
    };
    
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
      PropertiesService.getScriptProperties().deleteProperty(masterIndexKey);
      logger.info('Cleaned up test master index', { key: masterIndexKey });
    }
    
    // Clean up other test keys
    const testKeys = ['GASDB_MASTER_INDEX_TEST_DB', 'GASDB_MASTER_INDEX_TEST_INTEGRATION'];
    testKeys.forEach(key => {
      try {
        PropertiesService.getScriptProperties().deleteProperty(key);
        logger.info('Cleaned up test property', { key: key });
      } catch (error) {
        // Ignore errors - property might not exist
      }
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

/**
 * Test Database class initialisation
 */
function createDatabaseInitializationTestSuite() {
  const suite = new TestSuite('Database Initialisation');
  
  suite.addTest('should create Database with default configuration', function() {
    // Act - This should fail initially (TDD Red phase)
    try {
      const database = new Database();
      
      // Assert
      TestFramework.assertNotNull(database, 'Database should be created');
      TestFramework.assertNotNull(database.config, 'Database should have config');
      TestFramework.assertNotNull(database.collections, 'Database should have collections map');
      TestFramework.assertNull(database.indexFileId, 'Index file ID should be null initially');
    } catch (error) {
      throw new Error('Database class not implemented: ' + error.message);
    }
  });
  
  suite.addTest('should create Database with custom configuration', function() {
    // Arrange
    const config = DATABASE_TEST_DATA.testConfig;
    
    // Act - This should fail initially (TDD Red phase)
    try {
      const database = new Database(config);
      DATABASE_TEST_DATA.testDatabase = database;
      
      // Assert
      TestFramework.assertNotNull(database, 'Database should be created');
      TestFramework.assertEquals(database.config.rootFolderId, config.rootFolderId, 'Config should match');
      TestFramework.assertEquals(database.config.autoCreateCollections, config.autoCreateCollections, 'Auto create setting should match');
    } catch (error) {
      throw new Error('Database constructor not implemented: ' + error.message);
    }
  });
  
  suite.addTest('should initialise database and create index file', function() {
    // Arrange
    const database = DATABASE_TEST_DATA.testDatabase || new Database(DATABASE_TEST_DATA.testConfig);
    
    // Act - This should fail initially (TDD Red phase)
    try {
      database.initialise();
      
      // Assert
      TestFramework.assertNotNull(database.indexFileId, 'Index file should be created');
      TestFramework.assertTrue(database.indexFileId.length > 10, 'Index file ID should be valid');
      
      // Track created file for clean-up
      DATABASE_TEST_DATA.testIndexFileId = database.indexFileId;
      DATABASE_TEST_DATA.createdFileIds.push(database.indexFileId);
      
      // Store the initialised database for reuse in other test suites
      DATABASE_TEST_DATA.testDatabase = database;
      
    } catch (error) {
      throw new Error('Database.initialise() not implemented: ' + error.message);
    }
  });
  
  suite.addTest('should handle initialisation with existing index file', function() {
    // Arrange - create a unique test collection for this specific test
    const testCollectionName = 'existingCollection_' + new Date().getTime();
    
    // First, create a database and add a collection to ensure it exists in MasterIndex
    const setupConfig = Object.assign({}, DATABASE_TEST_DATA.testConfig);
    const setupDatabase = new Database(setupConfig);
    setupDatabase.initialise();
    setupDatabase.createCollection(testCollectionName);
    
    // Track the created file for cleanup
    const setupCollections = setupDatabase.listCollections();
    if (setupCollections.includes(testCollectionName)) {
      // Find the collection object to get its fileId for cleanup
      const masterIndex = new MasterIndex({ masterIndexKey: setupConfig.masterIndexKey });
      const miCollections = masterIndex.getCollections();
      if (miCollections[testCollectionName] && miCollections[testCollectionName].fileId) {
        DATABASE_TEST_DATA.createdFileIds.push(miCollections[testCollectionName].fileId);
      }
    }
    
    // Act - create a new database instance that should load the existing collection
    const config = Object.assign({}, DATABASE_TEST_DATA.testConfig);
    const database = new Database(config);
    database.initialise();
    const collections = database.listCollections();
    
    // Assert
    TestFramework.assertTrue(
      collections.includes(testCollectionName), 
      'Database should handle existing index file and load collections'
    );
  });
  
  return suite;
}

/**
 * Test collection creation and management
 */
function createCollectionManagementTestSuite() {
  const suite = new TestSuite('Collection Management');
  
  suite.addTest('should create new collection', function() {
    // Arrange
    const database = DATABASE_TEST_DATA.testDatabase || new Database(DATABASE_TEST_DATA.testConfig);
    database.initialise();
    const collectionName = DATABASE_TEST_DATA.testCollectionNames[0];
    
    // Act - This should fail initially (TDD Red phase)
    try {
      const collection = database.createCollection(collectionName);
      
      // Assert
      TestFramework.assertNotNull(collection, 'Collection should be created');
      TestFramework.assertEquals(collection.name, collectionName, 'Collection name should match');
      TestFramework.assertNotNull(collection.driveFileId, 'Collection should have drive file ID');
      
      // Track created file for clean-up
      DATABASE_TEST_DATA.createdFileIds.push(collection.driveFileId);
      
    } catch (error) {
      throw new Error('Database.createCollection() not implemented: ' + error.message);
    }
  });
  
  suite.addTest('should access existing collection', function() {
    // Arrange
    const database = DATABASE_TEST_DATA.testDatabase || new Database(DATABASE_TEST_DATA.testConfig);
    database.initialise();
    const collectionName = DATABASE_TEST_DATA.testCollectionNames[0];
    
    // Act - This should fail initially (TDD Red phase)
    try {
      const collection = database.collection(collectionName);
      
      // Assert
      TestFramework.assertNotNull(collection, 'Collection should be accessible');
      TestFramework.assertEquals(collection.name, collectionName, 'Collection name should match');
      
    } catch (error) {
      throw new Error('Database.collection() not implemented: ' + error.message);
    }
  });
  
  suite.addTest('should auto-create collection when configured', function() {
    // Arrange
    const database = DATABASE_TEST_DATA.testDatabase || new Database(DATABASE_TEST_DATA.testConfig);
    database.initialise();
    const collectionName = DATABASE_TEST_DATA.testCollectionNames[1];
    
    // Act - This should fail initially (TDD Red phase)
    try {
      // This should auto-create since autoCreateCollections is true
      const collection = database.collection(collectionName);
      
      // Assert
      TestFramework.assertNotNull(collection, 'Collection should be auto-created');
      TestFramework.assertEquals(collection.name, collectionName, 'Collection name should match');
      
      // Track created file for clean-up
      if (collection.driveFileId) {
        DATABASE_TEST_DATA.createdFileIds.push(collection.driveFileId);
      }
      
    } catch (error) {
      throw new Error('Database auto-create collection not implemented: ' + error.message);
    }
  });
  
  suite.addTest('should list all collections', function() {
    // Arrange
    const database = DATABASE_TEST_DATA.testDatabase || new Database(DATABASE_TEST_DATA.testConfig);
    database.initialise();
    
    // Act - This should fail initially (TDD Red phase)
    try {
      const collections = database.listCollections();
      
      // Assert
      TestFramework.assertTrue(Array.isArray(collections), 'Should return array');
      TestFramework.assertTrue(collections.length >= 0, 'Should have collections or empty array');
      
      // Should contain previously created collections
      const collectionName1 = DATABASE_TEST_DATA.testCollectionNames[0];
      const collectionName2 = DATABASE_TEST_DATA.testCollectionNames[1];
      
      if (collections.length > 0) {
        // If collections exist, they should be in the list
        const hasTestCollection = collections.some(name => 
          name === collectionName1 || name === collectionName2
        );
        TestFramework.assertTrue(hasTestCollection, 'Should contain created test collections');
      }
      
    } catch (error) {
      throw new Error('Database.listCollections() not implemented: ' + error.message);
    }
  });
  
  suite.addTest('should delete collection', function() {
    // Arrange
    const database = DATABASE_TEST_DATA.testDatabase || new Database(DATABASE_TEST_DATA.testConfig);
    database.initialise();
    const collectionName = DATABASE_TEST_DATA.testCollectionNames[2]; // tempCollection
    
    // First create a collection to delete
    try {
      const collection = database.createCollection(collectionName);
      if (collection && collection.driveFileId) {
        DATABASE_TEST_DATA.createdFileIds.push(collection.driveFileId);
      }
    } catch (error) {
      // Expected to fail in Red phase
    }
    
    // Act - This should fail initially (TDD Red phase)
    try {
      const result = database.dropCollection(collectionName);
      
      // Assert
      TestFramework.assertTrue(result, 'Drop collection should return true');
      
      // Verify collection is no longer listed
      const collections = database.listCollections();
      const collectionExists = collections.includes(collectionName);
      TestFramework.assertFalse(collectionExists, 'Collection should no longer exist');
      
    } catch (error) {
      throw new Error('Database.dropCollection() not implemented: ' + error.message);
    }
  });
  
  suite.addTest('should throw error if collection does not exist and autoCreateCollections is false', function() {
    // Arrange
    const config = Object.assign({}, DATABASE_TEST_DATA.testConfig, { autoCreateCollections: false });
    const database = new Database(config);
    database.initialise();

    // Act & Assert
    TestFramework.assertThrows(() => {
      database.collection('nonExistentCollection');
    }, Error, 'Should throw error when collection does not exist with autoCreateCollections disabled');
  });
  
  suite.addTest('should handle collection name validation', function() {
    // Arrange
    const database = DATABASE_TEST_DATA.testDatabase || new Database(DATABASE_TEST_DATA.testConfig);
    database.initialise();
    
    // Act & Assert - This should fail initially (TDD Red phase)
    try {
      // Test invalid collection names
      TestFramework.assertThrows(() => {
        database.createCollection('');
      }, Error, 'Should throw error for empty collection name');
      
      TestFramework.assertThrows(() => {
        database.createCollection(null);
      }, Error, 'Should throw error for null collection name');
      
      TestFramework.assertThrows(() => {
        database.createCollection('invalid/name');
      }, Error, 'Should throw error for collection name with invalid characters');
      
    } catch (error) {
      throw new Error('Collection name validation not implemented: ' + error.message);
    }
  });
  
  return suite;
}

/**
 * Test index file structure and operations
 */
function createIndexFileStructureTestSuite() {
  const suite = new TestSuite('Index File Structure');
  
  suite.addTest('should create index file with correct structure', function() {
    // Arrange
    const database = DATABASE_TEST_DATA.testDatabase || new Database(DATABASE_TEST_DATA.testConfig);
    
    // Act - This should fail initially (TDD Red phase)
    try {
      database.initialise();
      
      // Read the index file to verify structure
      const indexData = database.loadIndex();
      
      // Assert
      TestFramework.assertNotNull(indexData, 'Index data should exist');
      TestFramework.assertDefined(indexData.collections, 'Index should have collections property');
      TestFramework.assertDefined(indexData.lastUpdated, 'Index should have lastUpdated property');
      TestFramework.assertTrue(typeof indexData.collections === 'object', 'Collections should be an object');
      
    } catch (error) {
      throw new Error('Index file structure not implemented: ' + error.message);
    }
  });
  
  suite.addTest('should update index file when collections change', function() {
    // Arrange
    const database = DATABASE_TEST_DATA.testDatabase || new Database(DATABASE_TEST_DATA.testConfig);
    database.initialise();
    const collectionName = 'indexTestCollection';
    
    // Act - This should fail initially (TDD Red phase)
    try {
      // Create a collection
      const collection = database.createCollection(collectionName);
      
      // Load index and verify it was updated
      const indexData = database.loadIndex();
      
      // Assert
      TestFramework.assertTrue(indexData.collections.hasOwnProperty(collectionName), 'Index should contain new collection');
      
      const collectionData = indexData.collections[collectionName];
      TestFramework.assertEquals(collectionData.name, collectionName, 'Collection name should match');
      TestFramework.assertNotNull(collectionData.fileId, 'Collection should have file ID');
      TestFramework.assertDefined(collectionData.created, 'Collection should have created timestamp');
      TestFramework.assertDefined(collectionData.lastModified, 'Collection should have lastModified timestamp');
      
      // Track created file for clean-up
      if (collection && collection.driveFileId) {
        DATABASE_TEST_DATA.createdFileIds.push(collection.driveFileId);
      }
      
    } catch (error) {
      throw new Error('Index file updates not implemented: ' + error.message);
    }
  });
  
  suite.addTest('should synchronise with master index', function() {
    // Arrange
    const database = DATABASE_TEST_DATA.testDatabase || new Database(DATABASE_TEST_DATA.testConfig);
    database.initialise();
    const collectionName = 'masterIndexSyncTest';

    // Act
    database.createCollection(collectionName);
    const masterIndex = new MasterIndex({ masterIndexKey: DATABASE_TEST_DATA.testConfig.masterIndexKey });
    const miCollections = masterIndex.getCollections();

    // Assert
    TestFramework.assertTrue(
      miCollections.hasOwnProperty(collectionName),
      'MasterIndex should include new collection created by Database'
    );
  });

  suite.addTest('should backup MasterIndex to the Drive-based index file', function() {
    // Arrange
    const database = DATABASE_TEST_DATA.testDatabase || new Database(DATABASE_TEST_DATA.testConfig);
    database.initialise();

    // Act
    const backedUp = database.backupIndexToDrive();

    // Assert
    TestFramework.assertTrue(backedUp, 'backupIndexToDrive should return true on success');
  });
  
  return suite;
}

/**
 * Test database and master index integration
 */
function createDatabaseMasterIndexIntegrationTestSuite() {
  const suite = new TestSuite('Database Master Index Integration');

  suite.addTest('should integrate with master index on initialisation', function() {
    // Arrange - use a unique master index key for this test to avoid conflicts
    const uniqueMasterIndexKey = 'GASDB_MASTER_INDEX_TEST_INIT_' + new Date().getTime();
    const existingData = {
      collections: {
        existingCollection: { name: 'existingCollection', fileId: 'mock-file-id', documentCount: 2 }
      }
    };
    PropertiesService.getScriptProperties().setProperty(uniqueMasterIndexKey, JSON.stringify(existingData));
    const config = Object.assign({}, DATABASE_TEST_DATA.testConfig);
    config.masterIndexKey = uniqueMasterIndexKey;

    // Act
    const database = new Database(config);
    database.initialise();
    const collections = database.listCollections();

    // Assert
    TestFramework.assertTrue(
      collections.includes('existingCollection'),
      'Database should load collections from MasterIndex on initialise'
    );
    
    // Clean up the unique master index key
    try {
      PropertiesService.getScriptProperties().deleteProperty(uniqueMasterIndexKey);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  suite.addTest('should co-ordinate collection operations with master index', function() {
    // Arrange - use a fresh database instance with unique master index key for this test
    const uniqueConfig = Object.assign({}, DATABASE_TEST_DATA.testConfig);
    uniqueConfig.masterIndexKey = 'GASDB_MASTER_INDEX_TEST_COORDINATION_' + new Date().getTime();
    
    const database = new Database(uniqueConfig);
    database.initialise();
    const collectionName = 'coordinationTest';

    // Act
    const collObj = database.createCollection(collectionName);
    const masterIndex = new MasterIndex({ masterIndexKey: uniqueConfig.masterIndexKey });
    const miCollections = masterIndex.getCollections();

    // Assert
    TestFramework.assertTrue(
      miCollections.hasOwnProperty(collectionName),
      'MasterIndex should have new collection from Database.createCollection'
    );
    TestFramework.assertEquals(
      collObj.driveFileId,
      miCollections[collectionName].fileId,
      'Drive file IDs should match between Database and MasterIndex'
    );
    
    // Clean up the unique master index key
    try {
      PropertiesService.getScriptProperties().deleteProperty(uniqueConfig.masterIndexKey);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  return suite;
}

/**
 * Run all Database tests
 * This function orchestrates all test suites for Database
 */
function runDatabaseTests() {
  try {
    JDbLogger.info('Starting Database Test Execution');
    
    // Setup test environment once for all suites
    setupDatabaseTestEnvironment();
    
    try {
      // Register all test suites using global convenience functions
      registerTestSuite(createDatabaseInitializationTestSuite());
      registerTestSuite(createCollectionManagementTestSuite());
      registerTestSuite(createIndexFileStructureTestSuite());
      registerTestSuite(createDatabaseMasterIndexIntegrationTestSuite());
      
      // Run all tests
      const results = runAllTests();
      
      return results;
      
    } finally {
      // Always clean up test environment
      cleanupDatabaseTestEnvironment();
    }
    
  } catch (error) {
    JDbLogger.error('Failed to execute Database tests', { error: error.message, stack: error.stack });
    throw error;
  } finally {
    JDbLogger.info('Database Test Execution Complete');
  }
}
