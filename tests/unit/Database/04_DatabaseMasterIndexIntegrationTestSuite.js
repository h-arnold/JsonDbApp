/**
 * 04_DatabaseMasterIndexIntegrationTestSuite.js - Database Master Index Integration Test Suite
 *
 * Exports the test suite for database and master index integration.
 */


function createDatabaseMasterIndexIntegrationTestSuite() {
  const suite = new TestSuite('Database Master Index Integration');

  suite.addTest('should integrate with master index on initialisation', function() {
    // Arrange - use a unique master index key for this test to avoid conflicts
    const uniqueMasterIndexKey = 'GASDB_MASTER_INDEX_TEST_INIT_' + new Date().getTime();
    // Arrange - configure and create fresh database
    const config = Object.assign({}, DATABASE_TEST_DATA.testConfig, { masterIndexKey: uniqueMasterIndexKey });
    const database = new Database(config);
    database.createDatabase();
    // Pre-populate MasterIndex
    const masterIndex = new MasterIndex({ masterIndexKey: uniqueMasterIndexKey });
    masterIndex.addCollection('existingCollection', {
      name: 'existingCollection',
      fileId: 'mock-file-id',
      documentCount: 2
    });
    // Act - initialise from MasterIndex
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
    // First-time setup: create MasterIndex before initialising
    database.createDatabase();
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
