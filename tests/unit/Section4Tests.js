/**
 * Section 4 Tests: Database and Collection Management
 * 
 * This file contains all tests for Section 4 implementation:
 * - Database class implementation
 * - DatabaseConfig implementation 
 * - Collection creation and management
 * - Index file structure and synchronization
 * 
 * Following TDD: These tests should initially fail (Red phase)
 * Test flow: Setup -> Tests -> Cleanup
 */

// Global test data storage for Section 4
const SECTION4_TEST_DATA = {
  testDatabaseId: null,
  testDatabaseName: 'GASDB_Test_Database_' + new Date().getTime(),
  testIndexFileId: null,
  testIndexFileName: 'GASDB_Test_Index_' + new Date().getTime() + '.json',
  testFolderId: null,
  testFolderName: 'GASDB_Test_Section4_' + new Date().getTime(),
  testCollectionNames: ['testCollection1', 'testCollection2', 'tempCollection'],
  createdFileIds: [], // Track all files created for cleanup
  createdFolderIds: [], // Track all folders created for cleanup
  testConfig: null,
  testDatabase: null
};

/**
 * Setup function for creating test environment
 * Called by beforeAll hooks in test suites that need it
 */
function setupSection4TestEnvironment() {
  const logger = GASDBLogger.createComponentLogger('Section4Setup');
  
  // Create test folder
  const folder = DriveApp.createFolder(SECTION4_TEST_DATA.testFolderName);
  SECTION4_TEST_DATA.testFolderId = folder.getId();
  SECTION4_TEST_DATA.createdFolderIds.push(SECTION4_TEST_DATA.testFolderId);
  
  logger.info('Created test folder', { 
    folderId: SECTION4_TEST_DATA.testFolderId,
    folderName: SECTION4_TEST_DATA.testFolderName
  });
  
  // Prepare test configuration
  SECTION4_TEST_DATA.testConfig = {
    rootFolderId: SECTION4_TEST_DATA.testFolderId,
    autoCreateCollections: true,
    lockTimeout: 30000,
    cacheEnabled: true,
    logLevel: 'INFO',
    masterIndexKey: 'GASDB_MASTER_INDEX_TEST_S4'
  };
  
  logger.info('Test environment setup complete');
}

/**
 * Cleanup function for removing test environment
 * Called by afterAll hooks in test suites that need it
 */
function cleanupSection4TestEnvironment() {
  const logger = GASDBLogger.createComponentLogger('Section4Cleanup');
  let cleanedFiles = 0;
  let failedFiles = 0;
  let cleanedFolders = 0;
  let failedFolders = 0;
  
  // Clean up created test files
  SECTION4_TEST_DATA.createdFileIds.forEach(fileId => {
    try {
      if (fileId) {
        const file = DriveApp.getFileById(fileId);
        file.setTrashed(true);
        cleanedFiles++;
        logger.info('Cleaned up test file', { fileId: fileId });
      }
    } catch (error) {
      failedFiles++;
      logger.warn('Failed to clean up test file', { fileId: fileId, error: error.message });
    }
  });
  
  // Clean up created test folders
  SECTION4_TEST_DATA.createdFolderIds.forEach(folderId => {
    try {
      if (folderId) {
        const folder = DriveApp.getFolderById(folderId);
        folder.setTrashed(true);
        cleanedFolders++;
        logger.info('Cleaned up test folder', { folderId: folderId });
      }
    } catch (error) {
      failedFolders++;
      logger.warn('Failed to clean up test folder', { folderId: folderId, error: error.message });
    }
  });
  
  // Clean up test master index entries
  try {
    const masterIndexKey = SECTION4_TEST_DATA.testConfig?.masterIndexKey;
    if (masterIndexKey) {
      PropertiesService.getScriptProperties().deleteProperty(masterIndexKey);
      logger.info('Cleaned up test master index', { key: masterIndexKey });
    }
    
    // Clean up other test keys
    const testKeys = ['GASDB_MASTER_INDEX_TEST_S4', 'GASDB_MASTER_INDEX_TEST_INTEGRATION'];
    testKeys.forEach(key => {
      try {
        PropertiesService.getScriptProperties().deleteProperty(key);
        logger.info('Cleaned up test property', { key: key });
      } catch (error) {
        // Ignore errors - property might not exist
      }
    });
  } catch (error) {
    logger.warn('Failed to clean up master index', { error: error.message });
  }
  
  logger.info('Cleanup summary', { 
    cleanedFiles: cleanedFiles, 
    failedFiles: failedFiles,
    cleanedFolders: cleanedFolders,
    failedFolders: failedFolders,
    totalFiles: SECTION4_TEST_DATA.createdFileIds.length,
    totalFolders: SECTION4_TEST_DATA.createdFolderIds.length
  });
}

/**
 * Test DatabaseConfig class functionality
 * Tests configuration object creation and validation
 */
function testDatabaseConfigFunctionality() {
  const suite = new TestSuite('DatabaseConfig Functionality');
  
  // Setup test environment once before all tests
  suite.setBeforeAll(function() {
    setupSection4TestEnvironment();
  });
  
  // Cleanup after all tests
  suite.setAfterAll(function() {
    cleanupSection4TestEnvironment();
  });
  
  suite.addTest('should create DatabaseConfig with default values', function() {
    // Act - This should fail initially (TDD Red phase)
    try {
      const config = new DatabaseConfig();
      
      // Assert - These assertions will fail until DatabaseConfig is implemented
      AssertionUtilities.assertNotNull(config, 'DatabaseConfig should be created');
      AssertionUtilities.assertDefined(config.rootFolderId, 'Root folder ID should be defined');
      AssertionUtilities.assertTrue(config.autoCreateCollections, 'Auto create collections should be true by default');
      AssertionUtilities.assertEquals(config.lockTimeout, 30000, 'Default lock timeout should be 30 seconds');
      AssertionUtilities.assertTrue(config.cacheEnabled, 'Cache should be enabled by default');
      AssertionUtilities.assertEquals(config.logLevel, 'INFO', 'Default log level should be INFO');
    } catch (error) {
      throw new Error('DatabaseConfig not implemented: ' + error.message);
    }
  });
  
  suite.addTest('should create DatabaseConfig with custom values', function() {
    // Arrange
    const customConfig = {
      rootFolderId: SECTION4_TEST_DATA.testFolderId,
      autoCreateCollections: false,
      lockTimeout: 60000,
      cacheEnabled: false,
      logLevel: 'DEBUG'
    };
    
    // Act - This should fail initially (TDD Red phase)
    try {
      const config = new DatabaseConfig(customConfig);
      
      // Assert
      AssertionUtilities.assertEquals(config.rootFolderId, customConfig.rootFolderId, 'Root folder ID should match');
      AssertionUtilities.assertFalse(config.autoCreateCollections, 'Auto create should be disabled');
      AssertionUtilities.assertEquals(config.lockTimeout, 60000, 'Lock timeout should be custom value');
      AssertionUtilities.assertFalse(config.cacheEnabled, 'Cache should be disabled');
      AssertionUtilities.assertEquals(config.logLevel, 'DEBUG', 'Log level should be DEBUG');
    } catch (error) {
      throw new Error('DatabaseConfig constructor not implemented: ' + error.message);
    }
  });
  
  suite.addTest('should validate configuration parameters', function() {
    // Act & Assert - Test invalid configurations
    try {
      // This should fail initially because DatabaseConfig doesn't exist
      const validConfig = new DatabaseConfig({ lockTimeout: 30000, logLevel: 'INFO' });
      
      // Test invalid lock timeout
      AssertionUtilities.assertThrows(() => {
        new DatabaseConfig({ lockTimeout: -1000 });
      }, Error, 'Should throw error for negative lock timeout');
      
      // Test invalid log level
      AssertionUtilities.assertThrows(() => {
        new DatabaseConfig({ logLevel: 'INVALID' });
      }, Error, 'Should throw error for invalid log level');
      
    } catch (error) {
      throw new Error('DatabaseConfig validation not implemented: ' + error.message);
    }
  });
  
  return suite;
}

/**
 * Test Database class initialization
 * Tests database creation with various configurations
 */
function testDatabaseInitialization() {
  const suite = new TestSuite('Database Initialization');
  
  // Ensure test environment is set up
  suite.setBeforeAll(function() {
    if (!SECTION4_TEST_DATA.testConfig) {
      setupSection4TestEnvironment();
    }
  });
  
  suite.addTest('should create Database with default configuration', function() {
    // Act - This should fail initially (TDD Red phase)
    try {
      const database = new Database();
      
      // Assert
      AssertionUtilities.assertNotNull(database, 'Database should be created');
      AssertionUtilities.assertNotNull(database.config, 'Database should have config');
      AssertionUtilities.assertNotNull(database.collections, 'Database should have collections map');
      AssertionUtilities.assertNull(database.indexFileId, 'Index file ID should be null initially');
    } catch (error) {
      throw new Error('Database class not implemented: ' + error.message);
    }
  });
  
  suite.addTest('should create Database with custom configuration', function() {
    // Arrange
    const config = SECTION4_TEST_DATA.testConfig;
    
    // Act - This should fail initially (TDD Red phase)
    try {
      const database = new Database(config);
      SECTION4_TEST_DATA.testDatabase = database;
      
      // Assert
      AssertionUtilities.assertNotNull(database, 'Database should be created');
      AssertionUtilities.assertEquals(database.config.rootFolderId, config.rootFolderId, 'Config should match');
      AssertionUtilities.assertEquals(database.config.autoCreateCollections, config.autoCreateCollections, 'Auto create setting should match');
    } catch (error) {
      throw new Error('Database constructor not implemented: ' + error.message);
    }
  });
  
  suite.addTest('should initialize database and create index file', function() {
    // Arrange
    const database = SECTION4_TEST_DATA.testDatabase || new Database(SECTION4_TEST_DATA.testConfig);
    
    // Act - This should fail initially (TDD Red phase)
    try {
      database.initialize();
      
      // Assert
      AssertionUtilities.assertNotNull(database.indexFileId, 'Index file should be created');
      AssertionUtilities.assertTrue(database.indexFileId.length > 10, 'Index file ID should be valid');
      
      // Track created file for cleanup
      SECTION4_TEST_DATA.testIndexFileId = database.indexFileId;
      SECTION4_TEST_DATA.createdFileIds.push(database.indexFileId);
      
    } catch (error) {
      throw new Error('Database.initialize() not implemented: ' + error.message);
    }
  });
  
  suite.addTest('should handle initialization with existing index file', function() {
    // Arrange - Create a mock existing index file
    const existingIndexData = {
      collections: {
        'existingCollection': {
          name: 'existingCollection',
          fileId: 'mock-file-id',
          created: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          documentCount: 5
        }
      },
      lastUpdated: new Date().toISOString()
    };
    
    // Act & Assert - This should fail initially (TDD Red phase)
    try {
      const database = new Database(SECTION4_TEST_DATA.testConfig);
      
      // Simulate loading existing data
      database.initialize();
      
      // Should be able to load existing collections
      const collections = database.listCollections();
      AssertionUtilities.assertTrue(Array.isArray(collections), 'Should return array of collection names');
      
    } catch (error) {
      throw new Error('Database initialization with existing data not implemented: ' + error.message);
    }
  });
  
  return suite;
}

/**
 * Test collection creation and management
 * Tests collection lifecycle operations
 */
function testCollectionManagement() {
  const suite = new TestSuite('Collection Management');
  
  // Ensure test environment is set up
  suite.setBeforeAll(function() {
    if (!SECTION4_TEST_DATA.testConfig) {
      setupSection4TestEnvironment();
    }
  });
  
  suite.addTest('should create new collection', function() {
    // Arrange
    const database = SECTION4_TEST_DATA.testDatabase || new Database(SECTION4_TEST_DATA.testConfig);
    const collectionName = SECTION4_TEST_DATA.testCollectionNames[0];
    
    // Act - This should fail initially (TDD Red phase)
    try {
      const collection = database.createCollection(collectionName);
      
      // Assert
      AssertionUtilities.assertNotNull(collection, 'Collection should be created');
      AssertionUtilities.assertEquals(collection.name, collectionName, 'Collection name should match');
      AssertionUtilities.assertNotNull(collection.driveFileId, 'Collection should have drive file ID');
      
      // Track created file for cleanup
      SECTION4_TEST_DATA.createdFileIds.push(collection.driveFileId);
      
    } catch (error) {
      throw new Error('Database.createCollection() not implemented: ' + error.message);
    }
  });
  
  suite.addTest('should access existing collection', function() {
    // Arrange
    const database = SECTION4_TEST_DATA.testDatabase || new Database(SECTION4_TEST_DATA.testConfig);
    const collectionName = SECTION4_TEST_DATA.testCollectionNames[0];
    
    // Act - This should fail initially (TDD Red phase)
    try {
      const collection = database.collection(collectionName);
      
      // Assert
      AssertionUtilities.assertNotNull(collection, 'Collection should be accessible');
      AssertionUtilities.assertEquals(collection.name, collectionName, 'Collection name should match');
      
    } catch (error) {
      throw new Error('Database.collection() not implemented: ' + error.message);
    }
  });
  
  suite.addTest('should auto-create collection when configured', function() {
    // Arrange
    const database = SECTION4_TEST_DATA.testDatabase || new Database(SECTION4_TEST_DATA.testConfig);
    const collectionName = SECTION4_TEST_DATA.testCollectionNames[1];
    
    // Act - This should fail initially (TDD Red phase)
    try {
      // This should auto-create since autoCreateCollections is true
      const collection = database.collection(collectionName);
      
      // Assert
      AssertionUtilities.assertNotNull(collection, 'Collection should be auto-created');
      AssertionUtilities.assertEquals(collection.name, collectionName, 'Collection name should match');
      
      // Track created file for cleanup
      if (collection.driveFileId) {
        SECTION4_TEST_DATA.createdFileIds.push(collection.driveFileId);
      }
      
    } catch (error) {
      throw new Error('Database auto-create collection not implemented: ' + error.message);
    }
  });
  
  suite.addTest('should list all collections', function() {
    // Arrange
    const database = SECTION4_TEST_DATA.testDatabase || new Database(SECTION4_TEST_DATA.testConfig);
    
    // Act - This should fail initially (TDD Red phase)
    try {
      const collections = database.listCollections();
      
      // Assert
      AssertionUtilities.assertTrue(Array.isArray(collections), 'Should return array');
      AssertionUtilities.assertTrue(collections.length >= 0, 'Should have collections or empty array');
      
      // Should contain previously created collections
      const collectionName1 = SECTION4_TEST_DATA.testCollectionNames[0];
      const collectionName2 = SECTION4_TEST_DATA.testCollectionNames[1];
      
      if (collections.length > 0) {
        // If collections exist, they should be in the list
        const hasTestCollection = collections.some(name => 
          name === collectionName1 || name === collectionName2
        );
        AssertionUtilities.assertTrue(hasTestCollection, 'Should contain created test collections');
      }
      
    } catch (error) {
      throw new Error('Database.listCollections() not implemented: ' + error.message);
    }
  });
  
  suite.addTest('should delete collection', function() {
    // Arrange
    const database = SECTION4_TEST_DATA.testDatabase || new Database(SECTION4_TEST_DATA.testConfig);
    const collectionName = SECTION4_TEST_DATA.testCollectionNames[2]; // tempCollection
    
    // First create a collection to delete
    try {
      const collection = database.createCollection(collectionName);
      if (collection && collection.driveFileId) {
        SECTION4_TEST_DATA.createdFileIds.push(collection.driveFileId);
      }
    } catch (error) {
      // Expected to fail in Red phase
    }
    
    // Act - This should fail initially (TDD Red phase)
    try {
      const result = database.dropCollection(collectionName);
      
      // Assert
      AssertionUtilities.assertTrue(result, 'Drop collection should return true');
      
      // Verify collection is no longer listed
      const collections = database.listCollections();
      const collectionExists = collections.includes(collectionName);
      AssertionUtilities.assertFalse(collectionExists, 'Collection should no longer exist');
      
    } catch (error) {
      throw new Error('Database.dropCollection() not implemented: ' + error.message);
    }
  });
  
  suite.addTest('should handle collection name validation', function() {
    // Arrange
    const database = SECTION4_TEST_DATA.testDatabase || new Database(SECTION4_TEST_DATA.testConfig);
    
    // Act & Assert - This should fail initially (TDD Red phase)
    try {
      // Test invalid collection names
      AssertionUtilities.assertThrows(() => {
        database.createCollection('');
      }, Error, 'Should throw error for empty collection name');
      
      AssertionUtilities.assertThrows(() => {
        database.createCollection(null);
      }, Error, 'Should throw error for null collection name');
      
      AssertionUtilities.assertThrows(() => {
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
 * Tests central index file management and synchronization
 */
function testIndexFileStructure() {
  const suite = new TestSuite('Index File Structure');
  
  // Ensure test environment is set up
  suite.setBeforeAll(function() {
    if (!SECTION4_TEST_DATA.testConfig) {
      setupSection4TestEnvironment();
    }
  });
  
  suite.addTest('should create index file with correct structure', function() {
    // Arrange
    const database = SECTION4_TEST_DATA.testDatabase || new Database(SECTION4_TEST_DATA.testConfig);
    
    // Act - This should fail initially (TDD Red phase)
    try {
      database.initialize();
      
      // Read the index file to verify structure
      const indexData = database.loadIndex();
      
      // Assert
      AssertionUtilities.assertNotNull(indexData, 'Index data should exist');
      AssertionUtilities.assertDefined(indexData.collections, 'Index should have collections property');
      AssertionUtilities.assertDefined(indexData.lastUpdated, 'Index should have lastUpdated property');
      AssertionUtilities.assertTrue(typeof indexData.collections === 'object', 'Collections should be an object');
      
    } catch (error) {
      throw new Error('Index file structure not implemented: ' + error.message);
    }
  });
  
  suite.addTest('should update index file when collections change', function() {
    // Arrange
    const database = SECTION4_TEST_DATA.testDatabase || new Database(SECTION4_TEST_DATA.testConfig);
    const collectionName = 'indexTestCollection';
    
    // Act - This should fail initially (TDD Red phase)
    try {
      // Create a collection
      const collection = database.createCollection(collectionName);
      
      // Load index and verify it was updated
      const indexData = database.loadIndex();
      
      // Assert
      AssertionUtilities.assertTrue(indexData.collections.hasOwnProperty(collectionName), 'Index should contain new collection');
      
      const collectionData = indexData.collections[collectionName];
      AssertionUtilities.assertEquals(collectionData.name, collectionName, 'Collection name should match');
      AssertionUtilities.assertNotNull(collectionData.fileId, 'Collection should have file ID');
      AssertionUtilities.assertDefined(collectionData.created, 'Collection should have created timestamp');
      AssertionUtilities.assertDefined(collectionData.lastModified, 'Collection should have lastModified timestamp');
      
      // Track created file for cleanup
      if (collection && collection.driveFileId) {
        SECTION4_TEST_DATA.createdFileIds.push(collection.driveFileId);
      }
      
    } catch (error) {
      throw new Error('Index file updates not implemented: ' + error.message);
    }
  });
  
  suite.addTest('should synchronize with master index', function() {
    // Arrange
    const database = SECTION4_TEST_DATA.testDatabase || new Database(SECTION4_TEST_DATA.testConfig);
    const collectionName = 'masterIndexSyncTest';
    
    // Act - This should fail initially (TDD Red phase)
    try {
      // Create a collection - this should update both index file and master index
      const collection = database.createCollection(collectionName);
      
      // Verify master index was updated
      const masterIndex = new MasterIndex({ masterIndexKey: SECTION4_TEST_DATA.testConfig.masterIndexKey });
      const masterCollections = masterIndex.getCollections();
      
      // Assert
      AssertionUtilities.assertTrue(masterCollections.hasOwnProperty(collectionName), 'Master index should contain new collection');
      
      const masterCollectionData = masterCollections[collectionName];
      AssertionUtilities.assertEquals(masterCollectionData.name, collectionName, 'Master index collection name should match');
      AssertionUtilities.assertNotNull(masterCollectionData.fileId, 'Master index should have file ID');
      
      // Track created file for cleanup
      if (collection && collection.driveFileId) {
        SECTION4_TEST_DATA.createdFileIds.push(collection.driveFileId);
      }
      
    } catch (error) {
      throw new Error('Master index synchronization not implemented: ' + error.message);
    }
  });
  
  suite.addTest('should handle index file corruption gracefully', function() {
    // Arrange
    const database = SECTION4_TEST_DATA.testDatabase || new Database(SECTION4_TEST_DATA.testConfig);
    
    // Act & Assert - This should fail initially (TDD Red phase)
    try {
      // Simulate corrupted index file by writing invalid JSON
      if (database.indexFileId) {
        // First corrupt the index file by writing invalid JSON
        const file = DriveApp.getFileById(database.indexFileId);
        const corruptedContent = '{ "collections": { invalid json content }';
        file.setContent(corruptedContent);
        
        console.log('Corrupted index file with content:', corruptedContent);
        console.log('Index file ID:', database.indexFileId);
        
        // This test verifies error handling for corrupted files
        // The implementation should detect and handle corrupted index files
        let threwError = false;
        let actualError = null;
        
        try {
          database.loadIndex();
        } catch (error) {
          threwError = true;
          actualError = error;
          console.log('loadIndex() threw error:', error.message);
          console.log('Error type:', error.constructor.name);
        }
        
        if (!threwError) {
          throw new Error('Expected loadIndex() to throw an error for corrupted file, but it did not');
        }
        
        // Verify that an appropriate error was thrown
        AssertionUtilities.assertTrue(threwError, 'Should have thrown an error');
        AssertionUtilities.assertNotNull(actualError, 'Should have an actual error');
      } else {
        throw new Error('Database has no index file to corrupt');
      }
      
    } catch (error) {
      throw new Error('Index file corruption handling not implemented: ' + error.message);
    }
  });
  
  return suite;
}

/**
 * Test database and master index integration
 * Tests coordination between database and master index
 */
function testDatabaseMasterIndexIntegration() {
  const suite = new TestSuite('Database Master Index Integration');
  
  // Ensure test environment is set up
  suite.setBeforeAll(function() {
    if (!SECTION4_TEST_DATA.testConfig) {
      setupSection4TestEnvironment();
    }
  });
  
  suite.addTest('should integrate with master index on initialization', function() {
    // Arrange
    const config = {
      ...SECTION4_TEST_DATA.testConfig,
      masterIndexKey: 'GASDB_MASTER_INDEX_TEST_INTEGRATION'
    };
    
    // Act - This should fail initially (TDD Red phase)
    try {
      const database = new Database(config);
      database.initialize();
      
      // Verify master index is accessible
      const masterIndex = new MasterIndex({ masterIndexKey: config.masterIndexKey });
      const collections = masterIndex.getCollections();
      
      // Assert
      AssertionUtilities.assertTrue(typeof collections === 'object', 'Master index should be accessible');
      
    } catch (error) {
      throw new Error('Database master index integration not implemented: ' + error.message);
    }
  });
  
  suite.addTest('should coordinate collection operations with master index', function() {
    // Arrange
    const database = SECTION4_TEST_DATA.testDatabase || new Database(SECTION4_TEST_DATA.testConfig);
    const collectionName = 'coordinationTest';
    
    // Act - This should fail initially (TDD Red phase)
    try {
      // Create collection - should update both database and master index
      const collection = database.createCollection(collectionName);
      
      // Verify coordination
      const masterIndex = new MasterIndex({ masterIndexKey: SECTION4_TEST_DATA.testConfig.masterIndexKey });
      const masterCollection = masterIndex.getCollection(collectionName);
      
      // Assert
      AssertionUtilities.assertNotNull(masterCollection, 'Master index should have collection');
      AssertionUtilities.assertEquals(masterCollection.name, collectionName, 'Names should match');
      AssertionUtilities.assertEquals(masterCollection.fileId, collection.driveFileId, 'File IDs should match');
      
      // Track created file for cleanup
      if (collection && collection.driveFileId) {
        SECTION4_TEST_DATA.createdFileIds.push(collection.driveFileId);
      }
      
    } catch (error) {
      throw new Error('Database master index coordination not implemented: ' + error.message);
    }
  });
  
  return suite;
}

/**
 * Run all Section 4 tests
 * This function orchestrates all test suites for Section 4
 */
function runSection4Tests() {
  try {
    GASDBLogger.info('Starting Section 4 Test Execution - Database and Collection Management');
    
    const testRunner = new TestRunner();
    
    // Add all test suites - setup/teardown handled by beforeAll/afterAll hooks
    testRunner.addTestSuite(testDatabaseConfigFunctionality());
    testRunner.addTestSuite(testDatabaseInitialization());
    testRunner.addTestSuite(testCollectionManagement());
    testRunner.addTestSuite(testIndexFileStructure());
    testRunner.addTestSuite(testDatabaseMasterIndexIntegration());
    
    // Run all tests
    const results = testRunner.runAllTests();
    
    GASDBLogger.info('Section 4 Test Execution Complete');
    
    return results;
    
  } catch (error) {
    GASDBLogger.error('Failed to execute Section 4 tests', { error: error.message, stack: error.stack });
    throw error;
  }
}
