/**
 * 01_DatabaseInitializationTestSuite.js - Database Initialisation Test Suite
 *
 * Exports the test suite for Database class initialisation.
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
  const configWithBackup = Object.assign({}, DATABASE_TEST_DATA.testConfig, { backupOnInitialise: true });
  const database = new Database(configWithBackup);
    // Act - First-time setup: create MasterIndex then initialise database
    try {
      database.createDatabase();
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
    // Use a fresh masterIndexKey for this test to avoid collisions
    const uniqueKey = DATABASE_TEST_DATA.testConfig.masterIndexKey + '_EXIST_' + new Date().getTime();
    // First, create a database and add a collection to ensure it exists in MasterIndex
    const setupConfig = Object.assign({}, DATABASE_TEST_DATA.testConfig, { masterIndexKey: uniqueKey });
    const setupDatabase = new Database(setupConfig);
    // First-time setup: create MasterIndex then initialise
    setupDatabase.createDatabase();
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
    const config = Object.assign({}, DATABASE_TEST_DATA.testConfig, { masterIndexKey: uniqueKey });
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
